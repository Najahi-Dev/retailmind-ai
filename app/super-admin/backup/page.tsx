import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import AdminBackupClient from "./AdminBackupClient";

export default async function SuperAdminBackupPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Ensure only super_admin can access the super admin backup section
  if (user.role !== "super_admin") {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Database Fleet & Backup</h1>
          <p className="text-indigo-200 mt-1">Manage system-wide data backups, restore datasets, and monitor database health.</p>
        </div>
      </div>
      
      {/* Reusing the Backup Client from the tenant settings but for Super Admin use */}
      <AdminBackupClient role={user.role} userEmail={user.email} />
    </div>
  );
}
