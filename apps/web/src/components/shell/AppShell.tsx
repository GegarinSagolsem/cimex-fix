import type { Case } from "@bugproof/shared";
import { TopBar } from "@/components/shell/TopBar";
import { LeftRail } from "@/components/shell/LeftRail";

export function AppShell({
  cases,
  children,
}: {
  cases: Case[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <TopBar cases={cases} />
      <div className="flex min-h-0 flex-1">
        <LeftRail cases={cases} />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
