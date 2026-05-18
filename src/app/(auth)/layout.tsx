import { AuthSessionProvider } from "@/components/shell/session-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
