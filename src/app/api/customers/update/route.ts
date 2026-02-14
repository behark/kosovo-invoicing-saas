import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { updateCustomer } from "@/lib/customers/customersRepo";
import { buildCustomerDetailRoute, ROUTES } from "@/lib/routes";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

function normalizeOptionalString(value: FormDataEntryValue | null): string | undefined {
  const str = String(value ?? "").trim();
  if (!str) return undefined;
  return str;
}

function normalizeOptionalStringToNull(value: FormDataEntryValue | null): string | null {
  return normalizeOptionalString(value) ?? null;
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) {
    return buildRedirect(request, ROUTES.login);
  }

  const formData = await request.formData();

  const customerId = String(formData.get("customerId") ?? "").trim();
  if (!customerId) {
    return buildRedirect(request, `${ROUTES.appCustomers}?error=invalid_customer`);
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return buildRedirect(request, `${buildCustomerDetailRoute(customerId)}?error=invalid_name`);
  }

  const email = normalizeOptionalString(formData.get("email"));
  if (email && !email.includes("@")) {
    return buildRedirect(request, `${buildCustomerDetailRoute(customerId)}?error=invalid_email`);
  }

  try {
    const result = await updateCustomer(session.workspaceId, customerId, {
      name,
      email: email ?? null,
      vatNumber: normalizeOptionalStringToNull(formData.get("vatNumber")),
      addressLine1: normalizeOptionalStringToNull(formData.get("addressLine1")),
      addressLine2: normalizeOptionalStringToNull(formData.get("addressLine2")),
      city: normalizeOptionalStringToNull(formData.get("city")),
      state: normalizeOptionalStringToNull(formData.get("state")),
      postalCode: normalizeOptionalStringToNull(formData.get("postalCode")),
      country: normalizeOptionalStringToNull(formData.get("country"))
    });

    if (!result.updated) {
      return buildRedirect(request, `${ROUTES.appCustomers}?error=not_found`);
    }
  } catch {
    return buildRedirect(request, `${buildCustomerDetailRoute(customerId)}?error=unknown`);
  }

  return buildRedirect(request, `${buildCustomerDetailRoute(customerId)}?success=updated`);
}
