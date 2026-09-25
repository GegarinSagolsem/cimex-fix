import Link from "next/link";
import type { Case } from "@bugproof/shared";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { CommandPalette } from "@/components/shell/CommandPalette";

export function TopBar({ cases }: { cases: Case[] }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-4">
      <Link href="/cases" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
        BugProof
      </Link>
      <div className="flex items-center gap-2">
        <CommandPalette cases={cases} />
        <ThemeToggle />
      </div>
    </header>
  );
}
