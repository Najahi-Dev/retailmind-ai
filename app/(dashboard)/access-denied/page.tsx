import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ROLE_HOME: Record<string, string> = {
  admin:    "/dashboard",
  manager:  "/dashboard",
  staff:    "/inventory",
  supplier: "/reorders/purchase-orders",
};

export default async function AccessDeniedPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const role = (user.publicMetadata?.role as string) ?? "staff";
  const homeUrl = ROLE_HOME[role] ?? "/sign-in";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* Lock icon */}
      <div style={{
        width: 80,
        height: 80,
        border: "2px solid #ffffff",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* 403 */}
      <div style={{
        fontSize: 96,
        fontWeight: 800,
        color: "#ffffff",
        lineHeight: 1,
        marginBottom: 16,
        fontFamily: "'Montserrat', sans-serif",
        letterSpacing: "-4px",
      }}>
        403
      </div>

      <h1 style={{
        fontSize: 24,
        fontWeight: 600,
        color: "#ffffff",
        marginBottom: 12,
        fontFamily: "'Montserrat', sans-serif",
      }}>
        Access Denied
      </h1>

      <p style={{
        color: "#888888",
        fontSize: 14,
        textAlign: "center",
        maxWidth: 360,
        lineHeight: 1.7,
        marginBottom: 40,
      }}>
        Your current role does not have permission
        to view this page. Contact your administrator
        if access is required.
      </p>

      {/* Role badge */}
      <div style={{
        padding: "6px 16px",
        border: "1px solid #333333",
        borderRadius: 100,
        fontSize: 12,
        color: "#888888",
        marginBottom: 40,
        letterSpacing: "0.5px",
      }}>
        Current role: {role}
      </div>

      {/* Button */}
      <Link href={homeUrl} style={{
        padding: "12px 32px",
        background: "#ffffff",
        borderRadius: 8,
        color: "#000000",
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none",
        fontFamily: "'Poppins', sans-serif",
      }}>
        Go to My Home Page
      </Link>
    </div>
  );
}