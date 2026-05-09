import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from "../../../lib/admin-auth";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

// If a valid session is already in place, skip the login and bounce to /admin.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );
  if (session) {
    redirect("/admin");
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Admin</p>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lede}>
          Brooks and Angela only. Use the credentials configured in Cloudflare
          secrets.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
