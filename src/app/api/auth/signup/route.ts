import { NextResponse } from "next/server";

import { withTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { buildSessionCookie } from "@/lib/auth/cookies";
import { buildNewSession } from "@/lib/auth/session";
import type { WorkspaceRole } from "@/lib/auth/session";
import { getWorkspaceInviteByToken } from "@/lib/invites/invitesRepo";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function buildSignupRedirect(request: Request, params: {
  error?: string;
  inviteToken?: string;
}): NextResponse {
  const url = new URL("/signup", request.url);
  if (params.error) url.searchParams.set("error", params.error);
  if (params.inviteToken) url.searchParams.set("invite", params.inviteToken);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();

  if (!name || name.length < 2) {
    return buildSignupRedirect(request, { error: "invalid_name", inviteToken });
  }

  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    return buildSignupRedirect(request, { error: "invalid_email", inviteToken });
  }

  if (!password || password.length < 8) {
    return buildSignupRedirect(request, { error: "invalid_password", inviteToken });
  }

  const { hash, salt } = hashPassword(password);
  const session = buildNewSession();

  try {
    if (inviteToken) {
      const invite = await getWorkspaceInviteByToken(inviteToken);
      if (!invite) {
        return buildSignupRedirect(request, { error: "invite_invalid", inviteToken });
      }

      if (invite.acceptedAt) {
        return buildSignupRedirect(request, { error: "invite_used", inviteToken });
      }

      if (invite.expiresAt.getTime() <= Date.now()) {
        return buildSignupRedirect(request, { error: "invite_expired", inviteToken });
      }

      if (normalizeEmail(emailRaw) !== normalizeEmail(invite.email)) {
        return buildSignupRedirect(request, { error: "invite_email_mismatch", inviteToken });
      }

      await withTransaction(async (client) => {
        const inviteResult = await client.query<{
          workspace_id: string;
          role: WorkspaceRole;
          expires_at: Date;
          accepted_at: Date | null;
        }>(
          `
          SELECT workspace_id, role, expires_at, accepted_at
          FROM invites
          WHERE token = $1
          LIMIT 1
          FOR UPDATE
          `,
          [inviteToken]
        );

        const lockedInvite = inviteResult.rows[0];
        if (!lockedInvite) {
          throw new Error("Invite not found");
        }

        if (lockedInvite.accepted_at) {
          throw new Error("Invite already used");
        }

        if (lockedInvite.expires_at.getTime() <= Date.now()) {
          throw new Error("Invite expired");
        }

        const userResult = await client.query<{ id: string }>(
          `
          INSERT INTO users (email, name, password_hash, password_salt)
          VALUES ($1, $2, $3, $4)
          RETURNING id
          `,
          [normalizeEmail(emailRaw), name, hash, salt]
        );

        const userId = userResult.rows[0]?.id;
        if (!userId) {
          throw new Error("Failed to create user");
        }

        await client.query(
          `
          INSERT INTO workspace_members (workspace_id, user_id, role)
          VALUES ($1, $2, $3)
          ON CONFLICT (workspace_id, user_id) DO NOTHING
          `,
          [lockedInvite.workspace_id, userId, lockedInvite.role]
        );

        const inviteUpdate = await client.query<{ id: string }>(
          `
          UPDATE invites
          SET accepted_at = now()
          WHERE token = $1
            AND accepted_at IS NULL
          RETURNING id
          `,
          [inviteToken]
        );

        if (!inviteUpdate.rows[0]) {
          throw new Error("Failed to accept invite");
        }

        await client.query(
          `
          INSERT INTO sessions (user_id, token_hash, expires_at)
          VALUES ($1, $2, $3)
          `,
          [userId, session.tokenHash, session.expiresAt]
        );
      });
    } else {
      await withTransaction(async (client) => {
        const userResult = await client.query<{ id: string }>(
          `
        INSERT INTO users (email, name, password_hash, password_salt)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
          [email, name, hash, salt]
        );

        const userId = userResult.rows[0]?.id;
        if (!userId) {
          throw new Error("Failed to create user");
        }

        const workspaceName = `${name.split(" ")[0] ?? "My"} Workspace`;

        const workspaceResult = await client.query<{ id: string }>(
          `
        INSERT INTO workspaces (name, created_by)
        VALUES ($1, $2)
        RETURNING id
        `,
          [workspaceName, userId]
        );

        const workspaceId = workspaceResult.rows[0]?.id;
        if (!workspaceId) {
          throw new Error("Failed to create workspace");
        }

        await client.query(
          `
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES ($1, $2, 'owner')
        `,
          [workspaceId, userId]
        );

        await client.query(
          `
        INSERT INTO invoice_sequences (workspace_id, next_number)
        VALUES ($1, 1)
        ON CONFLICT (workspace_id) DO NOTHING
        `,
          [workspaceId]
        );

        await client.query(
          `
        INSERT INTO subscriptions (workspace_id, provider, plan_tier, status)
        VALUES ($1, 'paypal', 'starter', 'trialing')
        ON CONFLICT (workspace_id) DO NOTHING
        `,
          [workspaceId]
        );

        await client.query(
          `
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        `,
          [userId, session.tokenHash, session.expiresAt]
        );
      });
    }
  } catch (error) {
    const maybePg = error as { code?: string; constraint?: string };
    if (maybePg.code === "23505") {
      return buildSignupRedirect(request, { error: "email_taken", inviteToken });
    }

    const message = (error as { message?: string }).message ?? "";
    if (message === "Invite already used") {
      return buildSignupRedirect(request, { error: "invite_used", inviteToken });
    }
    if (message === "Invite expired") {
      return buildSignupRedirect(request, { error: "invite_expired", inviteToken });
    }
    if (message === "Invite not found") {
      return buildSignupRedirect(request, { error: "invite_invalid", inviteToken });
    }

    return buildSignupRedirect(request, { error: "unknown", inviteToken });
  }

  const response = buildRedirect(request, "/app");
  const cookie = buildSessionCookie(session.token, session.expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
