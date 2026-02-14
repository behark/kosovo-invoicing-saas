import "server-only";

import { dbQuery } from "@/lib/db";

export type WorkspaceInvoiceProfile = {
  id: string;
  name: string;
  companyName: string | null;
  companyVat: string | null;
  companyEmail: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyPostalCode: string | null;
  companyCountry: string | null;
};

type WorkspaceRow = {
  id: string;
  name: string;
  company_name: string | null;
  company_vat: string | null;
  company_email: string | null;
  company_address_line1: string | null;
  company_address_line2: string | null;
  company_city: string | null;
  company_state: string | null;
  company_postal_code: string | null;
  company_country: string | null;
};

export async function getWorkspaceInvoiceProfile(
  workspaceId: string
): Promise<WorkspaceInvoiceProfile | null> {
  const rows = await dbQuery<WorkspaceRow>(
    `
    SELECT
      id,
      name,
      company_name,
      company_vat,
      company_email,
      company_address_line1,
      company_address_line2,
      company_city,
      company_state,
      company_postal_code,
      company_country
    FROM workspaces
    WHERE id = $1
    LIMIT 1
    `,
    [workspaceId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name,
    companyVat: row.company_vat,
    companyEmail: row.company_email,
    companyAddressLine1: row.company_address_line1,
    companyAddressLine2: row.company_address_line2,
    companyCity: row.company_city,
    companyState: row.company_state,
    companyPostalCode: row.company_postal_code,
    companyCountry: row.company_country
  };
}

export type UpdateWorkspaceCompanyProfileInput = {
  workspaceName: string;
  companyName: string | null;
  companyVat: string | null;
  companyEmail: string | null;
  companyAddressLine1: string | null;
  companyAddressLine2: string | null;
  companyCity: string | null;
  companyState: string | null;
  companyPostalCode: string | null;
  companyCountry: string | null;
};

export async function updateWorkspaceCompanyProfile(
  workspaceId: string,
  input: UpdateWorkspaceCompanyProfileInput
): Promise<{ updated: boolean }> {
  const rows = await dbQuery<{ id: string }>(
    `
    UPDATE workspaces
    SET
      name = $1,
      company_name = $2,
      company_vat = $3,
      company_email = $4,
      company_address_line1 = $5,
      company_address_line2 = $6,
      company_city = $7,
      company_state = $8,
      company_postal_code = $9,
      company_country = $10
    WHERE id = $11
    RETURNING id
    `,
    [
      input.workspaceName,
      input.companyName,
      input.companyVat,
      input.companyEmail,
      input.companyAddressLine1,
      input.companyAddressLine2,
      input.companyCity,
      input.companyState,
      input.companyPostalCode,
      input.companyCountry,
      workspaceId
    ]
  );

  return { updated: rows.length > 0 };
}
