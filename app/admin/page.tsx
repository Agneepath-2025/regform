import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminDashboard from "./dashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
