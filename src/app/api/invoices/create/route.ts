import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { countInvoicesThisMonth, getWorkspaceSubscription } from "@/lib/billing/subscriptionsRepo";
import { createInvoice } from "@/lib/invoices/invoicesRepo";
import { parseAmountToCents } from "@/lib/money";
import { ROUTES } from "@/lib/routes";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function normalizeOptionalString(value: FormDataEntryValue | null): string | undefined {
  const str = String(value ?? "").trim();
  if (!str) return undefined;
  return str;
}

function normalizeRequiredString(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function normalizeInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) {
    return buildRedirect(request, ROUTES.login);
  }

  const subscription = await getWorkspaceSubscription(session.workspaceId);
  if (subscription?.planTier === "starter") {
    const count = await countInvoicesThisMonth(session.workspaceId);
    if (count >= 50) {
      return buildRedirect(request, `${ROUTES.appInvoices}?error=limit_reached`);
    }
  }

  const formData = await request.formData();

  const customerId = normalizeRequiredString(formData.get("customerId"));
  if (!customerId) {
    return buildRedirect(request, `${ROUTES.appInvoices}?error=no_customer`);
  }

  const issueDate = normalizeRequiredString(formData.get("issueDate"));
  if (!issueDate) {
    return buildRedirect(request, `${ROUTES.appInvoices}?error=invalid_issue_date`);
  }

  const dueDate = normalizeOptionalString(formData.get("dueDate"));
  const vatPercent = normalizeInt(normalizeRequiredString(formData.get("vatPercent")), 0);
  const notes = normalizeOptionalString(formData.get("notes"));

  const descriptions = formData.getAll("itemDescription").map((v) => String(v ?? "").trim());
  const quantities = formData.getAll("itemQuantity").map((v) => String(v ?? "").trim());
  const unitPrices = formData.getAll("itemUnitPrice").map((v) => String(v ?? "").trim());

  const items = [] as Array<{ description: string; quantity: number; unitPriceCents: number }>;

  const maxLen = Math.max(descriptions.length, quantities.length, unitPrices.length);

  for (let i = 0; i < maxLen; i += 1) {
    const description = descriptions[i] ?? "";
    if (!description) continue;

    const quantity = normalizeInt(quantities[i] ?? "1", 1);
    const unitPriceCents = parseAmountToCents(unitPrices[i] ?? "0") ?? 0;

    items.push({
      description,
      quantity: Math.max(1, quantity),
      unitPriceCents: Math.max(0, unitPriceCents)
    });
  }

  if (items.length === 0) {
    return buildRedirect(request, `${ROUTES.appInvoices}?error=no_items`);
  }

  try {
    const invoice = await createInvoice(session.workspaceId, {
      customerId,
      issueDate,
      dueDate,
      vatPercent,
      notes,
      items
    });

    return buildRedirect(request, `${ROUTES.appInvoices}/${invoice.id}`);
  } catch {
    return buildRedirect(request, `${ROUTES.appInvoices}?error=unknown`);
  }
}
