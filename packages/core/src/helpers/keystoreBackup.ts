/**
 * Rules for exporting a trading-account keystore to somewhere we do not control.
 *
 * THE BUG THIS FIXES (PRE-MAINNET-BLOCKER B1)
 * "Back up to Google Drive" could upload the trading account's secret key in
 * plaintext.
 *
 * `useBackupTradingAccount` calls `tradeAccount.toJson(password)`. In
 * @polkadot/keyring, `pair/encode.js` is:
 *
 *     const encoded = u8aConcat(PAIR_HDR, secretKey, PAIR_DIV, publicKey);
 *     if (!passphrase) {
 *       return encoded;          // <- raw secret key, no encryption
 *     }
 *     ...scryptEncode / naclEncrypt...
 *
 * So a missing passphrase does not produce a weakly encrypted file. It produces
 * an UNENCRYPTED one, and the resulting JSON is uploaded as-is.
 *
 * WHICH PATH WAS AFFECTED, precisely
 * There are two routes to a backup:
 *
 *   locked account   -> UnlockAccount prompts -> onBackupGoogleDrive({account, password})
 *   unlocked account -> onBackupGoogleDrive({account})            <- no password
 *
 * Only the second is unsafe, so this was never "every backup". But it is the
 * COMMON case rather than an edge case: a pair is unlocked for the rest of its
 * lifetime once unlocked, and a freshly created account starts unlocked. So the
 * ordinary "create a trading account, back it up" flow took the unsafe path, and
 * so did any second backup after an earlier unlock.
 *
 * WHY THE GUARD LIVES HERE AND NOT ONLY AT THE CALL SITE
 * Fixing the call sites fixes today. `assertUploadable` fixes tomorrow: it
 * inspects the ACTUAL JSON about to be uploaded and refuses if it is not
 * encrypted, so a future call site that forgets the passphrase gets a loud
 * failure instead of silently publishing a private key. The difference between
 * this bug being embarrassing and being an incident was entirely that it failed
 * silently.
 *
 * WHY A SEPARATE PASSPHRASE RULE (B2)
 * `unLockAccountValidations` requires exactly 5 digits. 100,000 possibilities.
 * That is defensible for a local unlock PIN on a key that never leaves the
 * browser, because an attacker needs the browser first. It is not defensible for
 * a file sitting in cloud storage, which can be attacked offline, in parallel,
 * with no rate limit and no way for us to notice. scrypt raises the cost per
 * guess but 100,000 guesses is hours on one core.
 *
 * A backup passphrase is therefore a DIFFERENT secret with different rules, and
 * conflating the two is what let a 5-digit PIN become the only thing protecting
 * an off-site file.
 *
 * Import-free so both rules are testable without a keyring or a browser.
 */

/** Minimum length for a passphrase protecting an off-site keystore. */
export const BACKUP_PASSPHRASE_MIN_LENGTH = 12;

/**
 * The shape we care about from `KeyringPair$Json`.
 *
 * Deliberately structural rather than importing the keyring type: this module
 * stays import-free, and the only field that matters is the encoding.
 */
export type KeystoreLike = {
  encoding?: {
    /**
     * Both shapes, because @polkadot/keyring's own type is
     * `EncryptedJsonEncoding | EncryptedJsonEncoding[]` - a bare string is
     * legal, not only an array.
     *
     * Caught by tsc when this module was first wired up. The original version
     * accepted arrays only, which failed CLOSED and so was safe, but would have
     * refused a legitimately encrypted keystore if the library ever emitted the
     * scalar form. Worth recording because the first test file asserted the
     * scalar case returned false and called that correct - a test agreeing with
     * my assumption rather than with the library.
     */
    type?: readonly string[] | string[] | string;
  } | null;
} | null;

/**
 * Does this keystore JSON actually carry encrypted key material?
 *
 * @polkadot/keyring records the applied transformations in `encoding.type`. An
 * unencrypted export contains "none"; an encrypted one contains a cipher such as
 * "xsalsa20-poly1305" alongside "scrypt". So the test is not "is a password set
 * somewhere" - which is what we assumed and got wrong - but "does the artifact
 * itself say it was encrypted".
 */
export const isEncryptedKeystore = (json: KeystoreLike): boolean => {
  const raw = json?.encoding?.type;
  // Normalise the scalar form before testing, so a single "xsalsa20-poly1305"
  // is recognised and a single "none" is still rejected.
  const types =
    typeof raw === "string" ? [raw] : Array.isArray(raw) ? [...raw] : [];
  if (types.length === 0) return false;
  const lower = types.map((t) => String(t).toLowerCase());
  // "none" anywhere means fail closed, even alongside a cipher: a contradictory
  // encoding is not something to resolve by guessing when a private key is the
  // thing being uploaded.
  if (lower.includes("none")) return false;
  return lower.some((t) => t.includes("xsalsa20") || t.includes("poly1305"));
};

/** Human-readable reason a keystore is not safe to upload, or null if it is. */
export const uploadBlockedReason = (json: KeystoreLike): string | null => {
  if (!json) return "No keystore was produced, so there is nothing to upload.";
  if (!isEncryptedKeystore(json)) {
    return (
      "Refusing to upload: this keystore is not encrypted. A passphrase is " +
      "required before a trading account can be stored outside this browser."
    );
  }
  return null;
};

/**
 * Throw unless this keystore is safe to hand to third-party storage.
 *
 * The last line of defence, immediately before upload. Deliberately a throw
 * rather than a silent skip: a backup that quietly does not happen is its own
 * bug, and the user needs to know their account is not backed up.
 */
export const assertUploadable = (json: KeystoreLike): void => {
  const reason = uploadBlockedReason(json);
  if (reason) throw new Error(reason);
};

/**
 * Is this passphrase strong enough for an off-site keystore?
 *
 * Length plus variety rather than a single length rule. The specific failure to
 * prevent is someone reusing their 5-digit unlock PIN here, which a bare length
 * check would already stop, but a 12-character run of digits is barely better,
 * so digits-only is rejected outright at any length.
 */
export const backupPassphraseIssue = (
  passphrase?: string | null
): string | null => {
  if (typeof passphrase !== "string" || passphrase.length === 0) {
    return "Enter a passphrase to encrypt this backup.";
  }
  if (passphrase.length < BACKUP_PASSPHRASE_MIN_LENGTH) {
    return `Use at least ${BACKUP_PASSPHRASE_MIN_LENGTH} characters. This is the only thing protecting the file once it leaves your device.`;
  }
  if (/^\d+$/.test(passphrase)) {
    return "Digits alone are too easy to guess offline. Add letters or symbols.";
  }
  return null;
};

/** Convenience predicate over `backupPassphraseIssue`. */
export const isValidBackupPassphrase = (passphrase?: string | null): boolean =>
  backupPassphraseIssue(passphrase) === null;
