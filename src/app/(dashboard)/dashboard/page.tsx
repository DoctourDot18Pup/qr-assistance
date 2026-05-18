import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "admin")   redirect("/admin");
  if (role === "teacher") redirect("/teacher");
  if (role === "student") redirect("/student");

  redirect("/login");
}
