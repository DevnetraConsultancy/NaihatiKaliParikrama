import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Pandal editor",
  robots: { index: false, follow: false },
};

/** Password-protected editor for the pandal data (ADMIN_PASSWORD). */
export default function AdminPage() {
  return <AdminDashboard />;
}
