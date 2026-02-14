import Link from "next/link";

import { API_ROUTES } from "@/lib/apiRoutes";
import { getSessionContext } from "@/lib/auth/session";
import { listWorkspaceInvites } from "@/lib/invites/invitesRepo";
import { buildInviteSignupRoute, ROUTES } from "@/lib/routes";
import { getWorkspaceInvoiceProfile } from "@/lib/workspaces/workspacesRepo";

type SettingsPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

function getSettingsPageErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) return null;

  if (errorCode === "forbidden") return "You do not have permission to change workspace settings.";
  if (errorCode === "invalid_name") return "Workspace name is required.";
  if (errorCode === "invite_invalid_email") return "Please enter a valid invite email address.";
  if (errorCode === "invite_invalid_role") return "Please choose a valid invite role.";
  if (errorCode === "invite_invalid") return "Invalid invite.";
  if (errorCode === "invite_not_found") return "Invite not found.";
  if (errorCode === "schema_outdated") return "Database schema is outdated. Please run migrations.";

  return "Something went wrong. Please try again.";
}

function getSettingsPageSuccessMessage(successCode: string | undefined): string | null {
  if (!successCode) return null;
  if (successCode === "updated") return "Settings saved.";
  if (successCode === "invite_created") return "Invite created.";
  if (successCode === "invite_revoked") return "Invite revoked.";
  return null;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getSessionContext();
  if (!session) {
    return null;
  }

  const canEdit = session.workspaceRole !== "member";
  const isOwner = session.workspaceRole === "owner";
  const errorMessage = getSettingsPageErrorMessage(searchParams?.error);
  const successMessage = getSettingsPageSuccessMessage(searchParams?.success);

  let profile = null as Awaited<ReturnType<typeof getWorkspaceInvoiceProfile>>;
  let profileLoadFailed = false;

  try {
    profile = await getWorkspaceInvoiceProfile(session.workspaceId);
  } catch {
    profileLoadFailed = true;
  }

  if (profileLoadFailed || !profile) {
    return (
      <section>
        <h1 className="sectionTitle">Settings</h1>
        <div className="card cardPad" style={{ marginTop: 16 }}>
          <p className="muted" style={{ lineHeight: 1.7 }}>
            Unable to load workspace settings. If you just updated the code, run database migrations.
          </p>
          <div className="heroCtas">
            <Link className="btn btnSecondary" href={ROUTES.appBilling}>
              Go to billing
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const roleOptions = isOwner
    ? [
      { value: "member", label: "Member" },
      { value: "admin", label: "Admin" }
    ]
    : [{ value: "member", label: "Member" }];

  const roleOptionNodes = roleOptions.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));

  const appUrl = process.env.APP_URL ?? "";

  let invites = [] as Awaited<ReturnType<typeof listWorkspaceInvites>>;
  let invitesLoadFailed = false;

  if (canEdit) {
    try {
      invites = await listWorkspaceInvites(session.workspaceId);
    } catch {
      invitesLoadFailed = true;
    }
  }

  const inviteRows = invites.map((invite) => {
    const invitePath = buildInviteSignupRoute(invite.token);
    const inviteLink = appUrl ? `${appUrl}${invitePath}` : invitePath;
    const isExpired = invite.expiresAt.getTime() <= Date.now();
    const expiresLabel = invite.expiresAt.toISOString().slice(0, 10);

    return (
      <tr key={invite.id}>
        <td className="td">
          <div style={{ fontWeight: 800 }}>{invite.email}</div>
          <div className="muted" style={{ marginTop: 4, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {`Role: ${invite.role}`}
            {`\nExpires: ${expiresLabel}${isExpired ? " (expired)" : ""}`}
          </div>
        </td>
        <td className="td" style={{ maxWidth: 420 }}>
          <div className="muted" style={{ lineHeight: 1.6, wordBreak: "break-word" }}>
            {inviteLink}
          </div>
          <div style={{ marginTop: 8 }}>
            <Link className="btn btnSecondary btnSmall" href={invitePath}>
              Open
            </Link>
          </div>
        </td>
        <td className="td">
          <form method="post" action={API_ROUTES.invitesRevoke}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button className="btn btnSecondary btnSmall" type="submit">
              Revoke
            </button>
          </form>
        </td>
      </tr>
    );
  });

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14 }}>
        <div>
          <h1 className="sectionTitle">Settings</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Your company profile is used on invoices.
          </p>
        </div>
        <div className="heroCtas" style={{ marginTop: 0 }}>
          <Link className="btn btnSecondary" href={ROUTES.appBilling}>
            Billing
          </Link>
        </div>
      </div>

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

      {!canEdit ? (
        <div className="alert" style={{ marginTop: 14 }}>
          You can view settings, but only admins/owners can edit.
        </div>
      ) : null}

      <div className="card cardPad" style={{ marginTop: 16 }}>
        <h2 className="sectionTitle" style={{ fontSize: 18 }}>
          Workspace
        </h2>

        <form method="post" action={API_ROUTES.workspacesUpdate} style={{ marginTop: 14 }}>
          <div className="formRow">
            <label className="label" htmlFor="workspaceName">
              Workspace name
            </label>
            <input
              className="input"
              id="workspaceName"
              name="workspaceName"
              type="text"
              defaultValue={profile.name}
              required
              disabled={!canEdit}
            />
          </div>

          <h2 className="sectionTitle" style={{ fontSize: 18, marginTop: 18 }}>
            Company details
          </h2>

          <div className="formRow">
            <label className="label" htmlFor="companyName">
              Company name (optional)
            </label>
            <input
              className="input"
              id="companyName"
              name="companyName"
              type="text"
              defaultValue={profile.companyName ?? ""}
              disabled={!canEdit}
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="companyVat">
              VAT number (optional)
            </label>
            <input
              className="input"
              id="companyVat"
              name="companyVat"
              type="text"
              defaultValue={profile.companyVat ?? ""}
              disabled={!canEdit}
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="companyEmail">
              Company email (optional)
            </label>
            <input
              className="input"
              id="companyEmail"
              name="companyEmail"
              type="email"
              defaultValue={profile.companyEmail ?? ""}
              disabled={!canEdit}
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="companyAddressLine1">
              Address line 1 (optional)
            </label>
            <input
              className="input"
              id="companyAddressLine1"
              name="companyAddressLine1"
              type="text"
              defaultValue={profile.companyAddressLine1 ?? ""}
              disabled={!canEdit}
            />
          </div>

          <div className="formRow">
            <label className="label" htmlFor="companyAddressLine2">
              Address line 2 (optional)
            </label>
            <input
              className="input"
              id="companyAddressLine2"
              name="companyAddressLine2"
              type="text"
              defaultValue={profile.companyAddressLine2 ?? ""}
              disabled={!canEdit}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="formRow">
              <label className="label" htmlFor="companyCity">
                City (optional)
              </label>
              <input
                className="input"
                id="companyCity"
                name="companyCity"
                type="text"
                defaultValue={profile.companyCity ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="formRow">
              <label className="label" htmlFor="companyState">
                State/Region (optional)
              </label>
              <input
                className="input"
                id="companyState"
                name="companyState"
                type="text"
                defaultValue={profile.companyState ?? ""}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="formRow">
              <label className="label" htmlFor="companyPostalCode">
                Postal code (optional)
              </label>
              <input
                className="input"
                id="companyPostalCode"
                name="companyPostalCode"
                type="text"
                defaultValue={profile.companyPostalCode ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="formRow">
              <label className="label" htmlFor="companyCountry">
                Country (optional)
              </label>
              <input
                className="input"
                id="companyCountry"
                name="companyCountry"
                type="text"
                defaultValue={profile.companyCountry ?? ""}
                disabled={!canEdit}
              />
            </div>
          </div>

          {canEdit ? (
            <div className="formActions" style={{ justifyContent: "flex-start" }}>
              <button className="btn btnPrimary" type="submit">
                Save settings
              </button>
            </div>
          ) : null}
        </form>
      </div>

      {canEdit ? (
        <div className="card cardPad" style={{ marginTop: 16 }}>
          <h2 className="sectionTitle" style={{ fontSize: 18 }}>
            Team invites
          </h2>
          <p className="muted" style={{ marginTop: 6, lineHeight: 1.7 }}>
            Create an invite link and share it with a teammate. Email sending will be added later.
          </p>

          {invitesLoadFailed ? (
            <div className="alert alertError" style={{ marginTop: 14 }}>
              Unable to load invites.
            </div>
          ) : null}

          <form method="post" action={API_ROUTES.invitesCreate} style={{ marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div className="formRow">
                <label className="label" htmlFor="inviteEmail">
                  Email
                </label>
                <input
                  className="input"
                  id="inviteEmail"
                  name="email"
                  type="email"
                  required
                  disabled={!canEdit}
                />
              </div>
              <div className="formRow">
                <label className="label" htmlFor="inviteRole">
                  Role
                </label>
                <select className="input" id="inviteRole" name="role" required disabled={!canEdit}>
                  {roleOptionNodes}
                </select>
              </div>
            </div>

            <div className="formActions" style={{ justifyContent: "flex-start" }}>
              <button className="btn btnPrimary" type="submit" disabled={!canEdit}>
                Create invite
              </button>
            </div>
          </form>

          {invites.length === 0 ? (
            <p className="muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
              No invites yet.
            </p>
          ) : (
            <div className="card" style={{ overflow: "hidden", marginTop: 14 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Invite</th>
                    <th className="th">Link</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody>{inviteRows}</tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
