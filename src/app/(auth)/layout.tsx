import Link from "next/link";

import { APP_NAME } from "@/lib/brand";
import { ROUTES } from "@/lib/routes";

export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="authWrap">
      <div className="card authCard">
        <Link className="brand" href={ROUTES.home}>
          {APP_NAME}
        </Link>
        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </main>
  );
}
