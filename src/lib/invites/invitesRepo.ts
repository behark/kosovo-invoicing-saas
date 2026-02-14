import "server-only";

import crypto from "node:crypto";

import { dbQuery } from "@/lib/db";
import type { WorkspaceRole } from "@/lib/auth/session";

export type WorkspaceInviteRole = Exclude<WorkspaceRole, "owner">;

export type WorkspaceInvite = {
  id: string;
  email: string;
  role: WorkspaceInviteRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
};

type InviteRow = {
  id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expires_at: Date;
  created_at: Date;
};

function mapInvite(row: InviteRow): WorkspaceInvite {
  return {
    id: row.id,
    email: row.email,
    role: row.role as WorkspaceInviteRole,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

export async function listWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const rows = await dbQuery<InviteRow>(
    `
    SELECT id, email, role, token, expires_at, created_at
    FROM invites
    WHERE workspace_id = $1
      AND accepted_at IS NULL
    ORDER BY created_at DESC
    `,
    [workspaceId]
  );

  return rows.map(mapInvite);
}

export async function createWorkspaceInvite(
  workspaceId: string,
  input: {
    email: string;
    role: WorkspaceInviteRole;
    expiresInDays?: number;
  }
): Promise<WorkspaceInvite> {
  const expiresInDays = input.expiresInDays ?? 7;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = crypto.randomBytes(24).toString("hex");

    try {
      const rows = await dbQuery<InviteRow>(
        `
        INSERT INTO invites (workspace_id, email, role, token, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, role, token, expires_at, created_at
        `,
        [workspaceId, input.email, input.role, token, expiresAt]
      );

      const row = rows[0];
      if (!row) {
        throw new Error("Failed to create invite");
      }

      return mapInvite(row);
    } catch (error) {
      const maybePg = error as { code?: string };
      if (maybePg.code === "23505") {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate unique invite token");
}

export async function revokeWorkspaceInvite(
  workspaceId: string,
  inviteId: string
): Promise<{ deleted: boolean }> {
  const rows = await dbQuery<{ id: string }>(
    `
    DELETE FROM invites
    WHERE id = $1
      AND workspace_id = $2
    RETURNING id
    `,
    [inviteId, workspaceId]
  );

  return { deleted: rows.length > 0 };
}

type InviteLookupRow = {
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  expires_at: Date;
  accepted_at: Date | null;
};

export async function getWorkspaceInviteByToken(token: string): Promise<{
  workspaceId: string;
  email: string;
  role: WorkspaceInviteRole;
  expiresAt: Date;
  acceptedAt: Date | null;
} | null> {
  const rows = await dbQuery<InviteLookupRow>(
    `
    SELECT workspace_id, email, role, expires_at, accepted_at
    FROM invites
    WHERE token = $1
    LIMIT 1
    `,
    [token]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role as WorkspaceInviteRole,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at
  };
}
