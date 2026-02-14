import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth/session";
import { deleteCustomer } from "@/lib/customers/customersRepo";
import { ROUTES } from "@/lib/routes";

function buildRedirect(request: Request, path: string): NextResponse {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) {
    return buildRedirect(request, ROUTES.login);
  }

  if (session.workspaceRole === "member") {
    return buildRedirect(request, `${ROUTES.appCustomers}?error=forbidden`);
  }

  const formData = await request.formData();
  const customerId = String(formData.get("customerId") ?? "").trim();

  if (!customerId) {
    return buildRedirect(request, `${ROUTES.appCustomers}?error=invalid_customer`);
  }

  try {
    const result = await deleteCustomer(session.workspaceId, customerId);

    if (!result.deleted) {
      return buildRedirect(request, `${ROUTES.appCustomers}?error=not_found`);
    }
  } catch (error) {
    const maybePg = error as { code?: string };
    if (maybePg.code === "23503") {
      return buildRedirect(request, `${ROUTES.appCustomers}?error=in_use`);
    }

    return buildRedirect(request, `${ROUTES.appCustomers}?error=unknown`);
  }

  return buildRedirect(request, `${ROUTES.appCustomers}?success=deleted`);
}
