import { requirePage } from "@/shared/lib/auth/guard";
import { SessionKeepAlive } from "@/shared/lib/session-keepalive";

/** Editor routes retain authentication and keep-alive without the dashboard's page chrome. */
export default async function ContentEditorLayout({ children }: { children: React.ReactNode }) {
    await requirePage();
    return <><SessionKeepAlive />{children}</>;
}
