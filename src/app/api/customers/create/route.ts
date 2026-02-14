import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { createCustomer } from "@/lib/customers/customersRepo";
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

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) {
    return buildRedirect(request, ROUTES.login);
  }

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return buildRedirect(request, `${ROUTES.appCustomers}?error=invalid_name`);
  }

  const email = normalizeOptionalString(formData.get("email"));
  if (email && !email.includes("@")) {
    return buildRedirect(request, `${ROUTES.appCustomers}?error=invalid_email`);
  }

  try {
    await createCustomer(session.workspaceId, {
      name,
      email,
      vatNumber: normalizeOptionalString(formData.get("vatNumber")),
      addressLine1: normalizeOptionalString(formData.get("addressLine1")),
      addressLine2: normalizeOptionalString(formData.get("addressLine2")),
      city: normalizeOptionalString(formData.get("city")),
      state: normalizeOptionalString(formData.get("state")),
      postalCode: normalizeOptionalString(formData.get("postalCode")),
      country: normalizeOptionalString(formData.get("country"))
    });
  } catch {
    return buildRedirect(request, `${ROUTES.appCustomers}?error=unknown`);
  }

  return buildRedirect(request, `${ROUTES.appCustomers}?success=created`);
}
