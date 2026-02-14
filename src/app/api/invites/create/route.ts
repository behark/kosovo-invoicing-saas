import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { createWorkspaceInvite, type WorkspaceInviteRole } from "@/lib/invites/invitesRepo";
import { ROUTES } from "@/lib/routes";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRequiredString(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function isInviteRole(value: string): value is WorkspaceInviteRole {
  return value === "member" || value === "admin";
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) {
    return buildRedirect(request, ROUTES.login);
  }

  if (session.workspaceRole === "member") {
    return buildRedirect(request, `${ROUTES.appSettings}?error=forbidden`);
  }

  const formData = await request.formData();

  const email = normalizeEmail(formData.get("email"));
  if (!email || !email.includes("@")) {
    return buildRedirect(request, `${ROUTES.appSettings}?error=invite_invalid_email`);
  }

  const roleRaw = normalizeRequiredString(formData.get("role")) || "member";
  if (!isInviteRole(roleRaw)) {
    return buildRedirect(request, `${ROUTES.appSettings}?error=invite_invalid_role`);
  }

  if (roleRaw === "admin" && session.workspaceRole !== "owner") {
    return buildRedirect(request, `${ROUTES.appSettings}?error=forbidden`);
  }

  try {
    await createWorkspaceInvite(session.workspaceId, {
      email,
      role: roleRaw
    });
  } catch {
    return buildRedirect(request, `${ROUTES.appSettings}?error=unknown`);
  }

  return buildRedirect(request, `${ROUTES.appSettings}?success=invite_created`);
}
