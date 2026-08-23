// lib/get-server-user.ts
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "owner" | "admin" | "manager" | "staff" | "supplier" | "pending";
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("retailmind_token")?.value;
    if (!token) return null;

    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.userId || !decoded.role) return null;

    let actualRole = decoded.role;
    if (decoded.email === "admin@retailmind.com" || decoded.email === "ahmednajahi2003@gmail.com") {
      actualRole = "super_admin";
    }

    return {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: actualRole,
    };
  } catch (err) {
    return null;
  }
}
