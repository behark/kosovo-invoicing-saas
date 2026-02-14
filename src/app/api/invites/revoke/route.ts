import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { revokeWorkspaceInvite } from "@/lib/invites/invitesRepo";
import { ROUTES } from "@/lib/routes";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function normalizeRequiredString(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
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
  const inviteId = normalizeRequiredString(formData.get("inviteId"));

  if (!inviteId) {
    return buildRedirect(request, `${ROUTES.appSettings}?error=invite_invalid`);
  }

  try {
    const result = await revokeWorkspaceInvite(session.workspaceId, inviteId);
    if (!result.deleted) {
      return buildRedirect(request, `${ROUTES.appSettings}?error=invite_not_found`);
    }
  } catch {
    return buildRedirect(request, `${ROUTES.appSettings}?error=unknown`);
  }

  return buildRedirect(request, `${ROUTES.appSettings}?success=invite_revoked`);
}
