import { NextResponse } from "next/server";

import { buildClearedSessionCookie } from "@/lib/auth/cookies";
import { deleteSessionByToken, getSessionTokenFromCookies } from "@/lib/auth/session";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const token = getSessionTokenFromCookies();
  if (token) {
    await deleteSessionByToken(token);
  }

  const response = buildRedirect(request, "/");
  const cookie = buildClearedSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
