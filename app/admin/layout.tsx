import * as React from "react";
import { redirect }         from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser }      from "@/lib/admin/auth";
import { AdminSidebar }      from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin — Card Stash" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth guard — redirect non-admins to home
  const adminUser = await getAdminUser();
  if (!adminUser) redirect("/");

  // Fetch admin's username for the sidebar
  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("username")
    .eq("id", adminUser.id)
    .single();

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <AdminSidebar username={profile?.username ?? adminUser.email ?? "admin"} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
