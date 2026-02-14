import { NextResponse } from "next/server";

import { withTransaction } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { buildSessionCookie } from "@/lib/auth/cookies";
import { buildNewSession } from "@/lib/auth/session";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
};

export async function POST(request: Request) {
  const formData = await request.formData();

  const emailRaw = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@") || !password) {
    return buildRedirect(request, "/login?error=invalid");
  }

  const session = buildNewSession();

  const authenticated = await withTransaction(async (client) => {
    const userResult = await client.query<UserRow>(
      `
      SELECT id, email, name, password_hash, password_salt
      FROM users
      WHERE lower(email) = $1
      LIMIT 1
      `,
      [email]
    );

    const user = userResult.rows[0];
    if (!user) {
      return null;
    }

    const isValid = verifyPassword(password, user.password_salt, user.password_hash);
    if (!isValid) {
      return null;
    }

    await client.query(
      `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      `,
      [user.id, session.tokenHash, session.expiresAt]
    );

    return { userId: user.id };
  });

  if (!authenticated) {
    return buildRedirect(request, "/login?error=invalid");
  }

  const response = buildRedirect(request, "/app");
  const cookie = buildSessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
