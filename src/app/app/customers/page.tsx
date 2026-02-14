import Link from "next/link";

import { getSessionContext } from "@/lib/auth/session";
import { API_ROUTES } from "@/lib/apiRoutes";
import { listCustomers } from "@/lib/customers/customersRepo";
import { buildCustomerDetailRoute } from "@/lib/routes";

type CustomersPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

function getCustomersPageErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "invalid_name") return "Customer name is required.";
  if (errorCode === "invalid_email") return "Please enter a valid email address.";
  if (errorCode === "invalid_customer") return "Invalid customer.";
  if (errorCode === "forbidden") return "You do not have permission to do that.";
  if (errorCode === "not_found") return "Customer not found.";
  if (errorCode === "in_use") return "Customer cannot be deleted because it is used by an invoice.";

  return "Something went wrong. Please try again.";
}

function getCustomersPageSuccessMessage(successCode: string | undefined): string | null {
  if (!successCode) return null;
  if (successCode === "created") return "Customer created.";
  if (successCode === "deleted") return "Customer deleted.";
  return null;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const errorMessage = getCustomersPageErrorMessage(searchParams?.error);
  const successMessage = getCustomersPageSuccessMessage(searchParams?.success);
  const customers = await listCustomers(session.workspaceId);
  const canDeleteCustomers = session.workspaceRole !== "member";
  const rows = customers.map((customer) => (
    <tr key={customer.id}>
      <td className="td">
        <div style={{ fontWeight: 800 }}>{customer.name}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          {customer.email ?? ""}
        </div>
      </td>
      <td className="td">{customer.vatNumber ?? ""}</td>
      <td className="td">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            className="btn btnSecondary btnSmall"
            href={buildCustomerDetailRoute(customer.id)}
          >
            View / edit
          </Link>
          {canDeleteCustomers ? (
            <form method="post" action={API_ROUTES.customersDelete}>
              <input type="hidden" name="customerId" value={customer.id} />
              <button className="btn btnSecondary btnSmall" type="submit">
                Delete
              </button>
            </form>
          ) : null}
        </div>
      </td>
    </tr>
  ));

  return (
    <section>
      <h1 className="sectionTitle">Customers</h1>

      {errorMessage ? (
        <div className="alert alertError" style={{ marginTop: 14 }}>
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="alert alertSuccess" style={{ marginTop: 14 }}>
          {successMessage}
        </div>
      ) : null}

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <h2 className="sectionTitle" style={{ fontSize: 18 }}>
          Add customer
        </h2>

        <form method="post" action={API_ROUTES.customersCreate} style={{ marginTop: 14 }}>
          <div className="formRow">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input className="input" id="name" name="name" type="text" required />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="email">
              Email (optional)
            </label>
            <input className="input" id="email" name="email" type="email" />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="vatNumber">
              VAT number (optional)
            </label>
            <input className="input" id="vatNumber" name="vatNumber" type="text" />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="addressLine1">
              Address line 1 (optional)
            </label>
            <input className="input" id="addressLine1" name="addressLine1" type="text" />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="addressLine2">
              Address line 2 (optional)
            </label>
            <input className="input" id="addressLine2" name="addressLine2" type="text" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="formRow">
              <label className="label" htmlFor="city">
                City (optional)
              </label>
              <input className="input" id="city" name="city" type="text" />
            </div>
            <div className="formRow">
              <label className="label" htmlFor="state">
                State/Region (optional)
              </label>
              <input className="input" id="state" name="state" type="text" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="formRow">
              <label className="label" htmlFor="postalCode">
                Postal code (optional)
              </label>
              <input className="input" id="postalCode" name="postalCode" type="text" />
            </div>
            <div className="formRow">
              <label className="label" htmlFor="country">
                Country (optional)
              </label>
              <input className="input" id="country" name="country" type="text" />
            </div>
          </div>

          <div className="formActions" style={{ justifyContent: "flex-start" }}>
            <button className="btn btnPrimary" type="submit">
              Create customer
            </button>
          </div>
        </form>
      </div>

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <h2 className="sectionTitle" style={{ fontSize: 18 }}>
          Customer list
        </h2>
        {customers.length === 0 ? (
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
            No customers yet.
          </p>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th className="th">Customer</th>
                <th className="th">VAT</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
