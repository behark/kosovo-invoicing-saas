import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { type InvoiceStatus, updateInvoiceStatus } from "@/lib/invoices/invoicesRepo";
import { ROUTES } from "@/lib/routes";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function normalizeRequiredString(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return value === "draft" || value === "sent" || value === "paid" || value === "overdue";
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) {
    return buildRedirect(request, ROUTES.login);
  }

  const formData = await request.formData();
  const invoiceId = normalizeRequiredString(formData.get("invoiceId"));
  const status = normalizeRequiredString(formData.get("status"));

  if (!invoiceId || !isInvoiceStatus(status)) {
    return buildRedirect(request, `${ROUTES.appInvoices}?error=invalid`);
  }

  if (session.workspaceRole === "member" && status !== "draft") {
    return buildRedirect(request, `${ROUTES.appInvoices}/${invoiceId}?error=forbidden`);
  }

  try {
    const result = await updateInvoiceStatus(session.workspaceId, invoiceId, status);
    if (!result.updated) {
      return buildRedirect(request, `${ROUTES.appInvoices}?error=not_found`);
    }
  } catch {
    return buildRedirect(request, `${ROUTES.appInvoices}/${invoiceId}?error=unknown`);
  }

  return buildRedirect(request, `${ROUTES.appInvoices}/${invoiceId}?success=status_updated`);
}
