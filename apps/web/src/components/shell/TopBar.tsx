import Link from "next/link";
import type { Case } from "@bugproof/shared";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { MainNav } from "@/components/shell/MainNav";

export function TopBar({ cases }: { cases: Case[] }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:gap-4 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          BugProof
        </Link>
        <MainNav />
      </div>
      <div className="flex items-center gap-2">
        <CommandPalette cases={cases} />
        <ThemeToggle />
      </div>
    </header>
  );
}
