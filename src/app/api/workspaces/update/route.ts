import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";
import { updateWorkspaceCompanyProfile } from "@/lib/workspaces/workspacesRepo";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function normalizeOptionalString(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  if (!str) return null;
  return str;
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

  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  if (!workspaceName || workspaceName.length < 2) {
    return buildRedirect(request, `${ROUTES.appSettings}?error=invalid_name`);
  }

  try {
    await updateWorkspaceCompanyProfile(session.workspaceId, {
      workspaceName,
      companyName: normalizeOptionalString(formData.get("companyName")),
      companyVat: normalizeOptionalString(formData.get("companyVat")),
      companyEmail: normalizeOptionalString(formData.get("companyEmail")),
      companyAddressLine1: normalizeOptionalString(formData.get("companyAddressLine1")),
      companyAddressLine2: normalizeOptionalString(formData.get("companyAddressLine2")),
      companyCity: normalizeOptionalString(formData.get("companyCity")),
      companyState: normalizeOptionalString(formData.get("companyState")),
      companyPostalCode: normalizeOptionalString(formData.get("companyPostalCode")),
      companyCountry: normalizeOptionalString(formData.get("companyCountry"))
    });
  } catch (error) {
    const maybePg = error as { code?: string };
    if (maybePg.code === "42703") {
      return buildRedirect(request, `${ROUTES.appSettings}?error=schema_outdated`);
    }

    return buildRedirect(request, `${ROUTES.appSettings}?error=unknown`);
  }

  return buildRedirect(request, `${ROUTES.appSettings}?success=updated`);
}
