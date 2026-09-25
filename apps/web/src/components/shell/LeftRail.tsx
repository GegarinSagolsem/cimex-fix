"use client";

import { usePathname } from "next/navigation";
import type { Case } from "@bugproof/shared";
import { CaseRailItem } from "@/components/shell/CaseRailItem";

export function LeftRail({ cases }: { cases: Case[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Cases"
      className="hidden w-72 shrink-0 flex-col gap-2 overflow-y-auto border-r border-[var(--border)] p-3 lg:flex"
    >
      {cases.map((c) => (
        <CaseRailItem key={c.id} case={c} active={pathname === `/cases/${c.id}`} />
      ))}
    </nav>
  );
}
