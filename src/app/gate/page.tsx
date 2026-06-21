import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_SESSION_COOKIE, verifyGateSession } from "../../lib/gate-auth";
import { GateForm } from "./GateForm";
import styles from "./page.module.css";

// The name screen every unauthenticated visitor is rewritten to. Rendered fresh
// per request so an already-let-in guest who lands here directly is bounced on.
export const dynamic = "force-dynamic";

export default async function GatePage() {
  const cookieStore = await cookies();
  const session = await verifyGateSession(
    cookieStore.get(GATE_SESSION_COOKIE)?.value
  );
  // Reaching /gate with a valid cookie means the guest is already in — send them
  // home rather than asking for a name they've already given.
  if (session) {
    redirect("/");
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Angela &amp; Brooks</p>
        <h1 className={styles.title}>You&rsquo;re invited</h1>
        <p className={styles.lede}>
          Enter the name on your invitation to come in.
        </p>
        <GateForm />
      </div>
    </div>
  );
}
