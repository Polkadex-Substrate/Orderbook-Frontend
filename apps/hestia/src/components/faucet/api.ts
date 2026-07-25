const BASE_URL = process.env.NEXT_PUBLIC_FAUCET_URL ?? "";
const API_KEY = process.env.NEXT_PUBLIC_FAUCET_API_KEY ?? "";

const requestHeaders = () => ({
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
});

/** With NEXT_PUBLIC_FAUCET_URL unset, fetch("/api/…") hits the Next app
 *  itself and 404s — a uselessly misleading error. Fail with the cause. */
function assertConfigured() {
  if (!BASE_URL)
    throw new Error(
      "Faucet backend is not configured (NEXT_PUBLIC_FAUCET_URL is empty). " +
        "Set it in apps/hestia/.env and rebuild."
    );
}

export type RegisterResult = {
  success: boolean;
  created: boolean;
  address: string;
  registeredAt: string;
};

export type DripResult = {
  success: boolean;
  asset: string;
  txHash: string;
  blockHash: string;
  amount: string;
  usedToday: number;
  remainingToday: number;
  dailyLimit: number;
};

export type DripSepoliaResult = {
  success: boolean;
  token: string;
  amount: string;
  address: string;
  txHash: string;
  explorerUrl: string;
};

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function faucetRegister(address: string): Promise<RegisterResult> {
  assertConfigured();
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function faucetDrip(
  address: string,
  asset: string
): Promise<DripResult> {
  assertConfigured();
  const response = await fetch(`${BASE_URL}/api/drip`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ address, asset }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function faucetDripSepolia(
  address: string,
  token: string
): Promise<DripSepoliaResult> {
  assertConfigured();
  const response = await fetch(`${BASE_URL}/api/drip/sepolia`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ address, token }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}
