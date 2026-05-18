import { AuthSessionProvider } from "@/components/shell/session-provider";
import { Sidebar } from "@/components/shell/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <div className="flex min-h-screen bg-[#E8E0CC]">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">{children}</div>
      </div>
    </AuthSessionProvider>
  );
}
