import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { deleteInvoice } from "@/lib/invoices/invoicesRepo";
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
    return buildRedirect(request, `${ROUTES.appInvoices}?error=forbidden`);
  }

  const formData = await request.formData();
  const invoiceId = normalizeRequiredString(formData.get("invoiceId"));

  if (!invoiceId) {
    return buildRedirect(request, `${ROUTES.appInvoices}?error=invalid`);
  }

  try {
    const result = await deleteInvoice(session.workspaceId, invoiceId);
    if (!result.deleted) {
      return buildRedirect(request, `${ROUTES.appInvoices}?error=not_found`);
    }
  } catch {
    return buildRedirect(request, `${ROUTES.appInvoices}?error=unknown`);
  }

  return buildRedirect(request, `${ROUTES.appInvoices}?success=deleted`);
}
