import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

import { dbQuery } from "@/lib/db";
import { getSessionCookieName } from "./cookies";

export type WorkspaceRole = "owner" | "admin" | "member";

export type SessionContext = {
  sessionId: string;
  sessionExpiresAt: Date;
  userId: string;
  userEmail: string;
  userName: string;
  workspaceId: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole;
};

export type CreateSessionResult = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

const SESSION_TTL_DAYS = 30;

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildNewSession(): CreateSessionResult {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

type SessionQueryRow = {
  session_id: string;
  session_expires_at: Date;
  user_id: string;
  user_email: string;
  user_name: string;
  workspace_id: string;
  workspace_name: string;
  workspace_role: WorkspaceRole;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const token = cookies().get(getSessionCookieName())?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);

  const rows = await dbQuery<SessionQueryRow>(
    `
    SELECT
      s.id AS session_id,
      s.expires_at AS session_expires_at,
      u.id AS user_id,
      u.email AS user_email,
      u.name AS user_name,
      w.id AS workspace_id,
      w.name AS workspace_name,
      wm.role AS workspace_role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN workspace_members wm ON wm.user_id = u.id
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE s.token_hash = $1
      AND s.expires_at > now()
    ORDER BY wm.created_at ASC
    LIMIT 1
    `,
    [tokenHash]
  );

  if (rows.length === 0) return null;

  const row = rows[0];

  await dbQuery("UPDATE sessions SET last_seen_at = now() WHERE id = $1", [
    row.session_id
  ]);

  return {
    sessionId: row.session_id,
    sessionExpiresAt: row.session_expires_at,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    workspaceRole: row.workspace_role
  };
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await dbQuery("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export function getSessionTokenFromCookies(): string | null {
  return cookies().get(getSessionCookieName())?.value ?? null;
}
