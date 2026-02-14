import "server-only";

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  expires?: Date;
};

const DEFAULT_SESSION_COOKIE_NAME = "saas_session";

export function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME ?? DEFAULT_SESSION_COOKIE_NAME;
}

export function buildSessionCookie(
  token: string,
  expiresAt: Date
): { name: string; value: string; options: CookieOptions } {
  const secure = process.env.NODE_ENV === "production";

  return {
    name: getSessionCookieName(),
    value: token,
    options: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      expires: expiresAt
    }
  };
}

export function buildClearedSessionCookie(): {
  name: string;
  value: string;
  options: CookieOptions;
} {
  const secure = process.env.NODE_ENV === "production";

  return {
    name: getSessionCookieName(),
    value: "",
    options: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      expires: new Date(0)
    }
  };
}
