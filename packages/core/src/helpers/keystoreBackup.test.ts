import {
  BACKUP_PASSPHRASE_MIN_LENGTH,
  assertUploadable,
  backupPassphraseIssue,
  isEncryptedKeystore,
  isValidBackupPassphrase,
  uploadBlockedReason,
} from "./keystoreBackup";

/*
 * Jest globals, matching the rest of this package.
 *
 * The encoding shapes below are the REAL ones @polkadot/keyring emits, taken
 * from pair/encode.js: no passphrase returns the concatenated secret key and
 * records "none", a passphrase runs scrypt then xsalsa20-poly1305. Inventing
 * plausible-looking shapes here would make these tests agree with my assumptions
 * rather than with the library, which is exactly how the bug survived review.
 */

/** What toJson(undefined) produces: unencrypted. */
const UNENCRYPTED = {
  encoding: { type: ["none"], content: ["pkcs8", "sr25519"], version: "3" },
};

/** What toJson("passphrase") produces. */
const ENCRYPTED = {
  encoding: {
    type: ["scrypt", "xsalsa20-poly1305"],
    content: ["pkcs8", "sr25519"],
    version: "3",
  },
};

describe("isEncryptedKeystore - the reported bug (blocker B1)", () => {
  it("rejects the artifact produced when no passphrase is given", () => {
    // pair/encode.js: `if (!passphrase) return encoded;` - the raw secret key.
    expect(isEncryptedKeystore(UNENCRYPTED)).toBe(false);
  });

  it("accepts a genuinely encrypted keystore", () => {
    expect(isEncryptedKeystore(ENCRYPTED)).toBe(true);
  });

  it("does not treat the mere presence of scrypt as encryption", () => {
    // scrypt is key DERIVATION. Without a cipher, nothing was encrypted. A check
    // for "scrypt appears somewhere" would pass this and upload a plaintext key.
    expect(isEncryptedKeystore({ encoding: { type: ["scrypt"] } })).toBe(false);
  });

  it("rejects malformed and empty shapes rather than assuming the best", () => {
    for (const v of [
      null,
      undefined,
      {},
      { encoding: null },
      { encoding: {} },
      { encoding: { type: [] } },
    ]) {
      expect({
        input: JSON.stringify(v) ?? "undefined",
        ok: isEncryptedKeystore(v as never),
      }).toEqual({ input: JSON.stringify(v) ?? "undefined", ok: false });
    }
  });

  it("handles the SCALAR encoding form, not just the array form", () => {
    // @polkadot/keyring types this as `EncryptedJsonEncoding |
    // EncryptedJsonEncoding[]`, so a bare string is legal. The first version of
    // this module accepted arrays only and an earlier version of this very test
    // asserted the scalar case was correctly rejected - a test that agreed with
    // my assumption instead of with the library. tsc caught it.
    expect(
      isEncryptedKeystore({ encoding: { type: "xsalsa20-poly1305" } })
    ).toBe(true);
    expect(isEncryptedKeystore({ encoding: { type: "none" } })).toBe(false);
    expect(isEncryptedKeystore({ encoding: { type: "scrypt" } })).toBe(false);
  });

  it("is case-insensitive, since the encoding strings are not ours", () => {
    expect(
      isEncryptedKeystore({ encoding: { type: ["XSalsa20-Poly1305"] } })
    ).toBe(true);
    expect(isEncryptedKeystore({ encoding: { type: ["NONE"] } })).toBe(false);
  });

  it("refuses when 'none' appears alongside a cipher", () => {
    // Contradictory, so fail closed. An upload is not worth guessing over.
    expect(
      isEncryptedKeystore({ encoding: { type: ["none", "xsalsa20-poly1305"] } })
    ).toBe(false);
  });
});

describe("assertUploadable - the last line of defence", () => {
  it("throws on an unencrypted keystore, loudly", () => {
    // The bug was silent. A throw surfaces as an error toast, so the user learns
    // their account is NOT backed up instead of believing it is.
    expect(() => assertUploadable(UNENCRYPTED)).toThrow(/not encrypted/i);
  });

  it("throws when there is no keystore at all", () => {
    expect(() => assertUploadable(null)).toThrow(/nothing to upload/i);
  });

  it("passes an encrypted keystore through silently", () => {
    expect(() => assertUploadable(ENCRYPTED)).not.toThrow();
    expect(uploadBlockedReason(ENCRYPTED)).toBeNull();
  });

  it("explains itself in the message, not just by failing", () => {
    expect(uploadBlockedReason(UNENCRYPTED)).toContain("passphrase");
  });
});

describe("backupPassphraseIssue - blocker B2", () => {
  it("rejects the 5-digit unlock PIN, which is the thing to prevent", () => {
    // unLockAccountValidations allows exactly 5 digits: 100,000 possibilities,
    // brute-forceable offline in hours. Fine for a local PIN, not for a file in
    // someone else's cloud.
    expect(backupPassphraseIssue("12345")).not.toBeNull();
    expect(isValidBackupPassphrase("12345")).toBe(false);
  });

  it("rejects digits alone even when long", () => {
    // A length-only rule would wave this through, and a 12-digit number is still
    // a small keyspace next to a 12-character passphrase.
    expect(backupPassphraseIssue("123456789012")).toMatch(/digits/i);
  });

  it("rejects empty and missing", () => {
    for (const v of [undefined, null, ""]) {
      expect(isValidBackupPassphrase(v)).toBe(false);
    }
  });

  it("states the minimum length rather than just refusing", () => {
    const issue = backupPassphraseIssue("short1!");
    expect(issue).toContain(String(BACKUP_PASSPHRASE_MIN_LENGTH));
  });

  it("accepts a reasonable passphrase", () => {
    expect(backupPassphraseIssue("correct horse battery")).toBeNull();
    expect(isValidBackupPassphrase("Tr0ubadour-Anchor")).toBe(true);
  });

  it("accepts at exactly the boundary, not one short of it", () => {
    const ok = "a".repeat(BACKUP_PASSPHRASE_MIN_LENGTH);
    const tooShort = "a".repeat(BACKUP_PASSPHRASE_MIN_LENGTH - 1);
    expect(isValidBackupPassphrase(ok)).toBe(true);
    expect(isValidBackupPassphrase(tooShort)).toBe(false);
  });
});
