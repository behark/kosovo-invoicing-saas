import "server-only";

type PaypalEnv = "sandbox" | "live";

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

type GlobalWithPaypalToken = typeof globalThis & {
  __paypalToken?: CachedToken;
};

const globalForPaypal = globalThis as GlobalWithPaypalToken;

function getPaypalEnv(): PaypalEnv {
  const raw = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();
  if (raw === "live") return "live";
  return "sandbox";
}

function getPaypalApiBase(): string {
  return getPaypalEnv() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  const raw = `${clientId}:${clientSecret}`;
  const encoded = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

async function fetchAccessToken(): Promise<CachedToken> {
  const clientId = getRequiredEnv("PAYPAL_CLIENT_ID");
  const clientSecret = getRequiredEnv("PAYPAL_CLIENT_SECRET");

  const response = await fetch(`${getPaypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal token request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  const skewMs = 60_000;
  const expiresAtMs = Date.now() + Math.max(0, json.expires_in * 1000 - skewMs);

  return {
    accessToken: json.access_token,
    expiresAtMs
  };
}

export async function getPaypalAccessToken(): Promise<string> {
  const cached = globalForPaypal.__paypalToken;
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.accessToken;
  }

  const token = await fetchAccessToken();
  globalForPaypal.__paypalToken = token;
  return token.accessToken;
}

export async function paypalFetch<T>(
  path: string,
  init: RequestInit
): Promise<{ data: T; status: number; headers: Headers }> {
  const accessToken = await getPaypalAccessToken();

  const response = await fetch(`${getPaypalApiBase()}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`
    }
  });

  const status = response.status;
  const headers = response.headers;

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal request failed (${status}): ${text}`);
  }

  const data = (await response.json()) as T;
  return { data, status, headers };
}
