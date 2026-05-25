import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isAuth = await verifySession(cookieStore);
  if (!isAuth) redirect("/login");

  return <DashboardLayout>{children}</DashboardLayout>;
}
