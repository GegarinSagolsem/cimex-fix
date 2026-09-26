"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import type { Case } from "@bugproof/shared";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/cases/StatusChip";

export function CommandPalette({ cases }: { cases: Case[] }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(id: string) {
    setOpen(false);
    router.push(`/cases/${id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-[var(--muted)]" aria-label="Jump to case">
          <Search className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Jump to case</span>
          <kbd className="ml-2 hidden rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] sm:inline">
            ⌘K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <Command label="Jump to case" className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3">
            <Search className="size-4 text-[var(--muted)]" aria-hidden="true" />
            <Command.Input
              autoFocus
              placeholder="Search cases by title or issue..."
              className="h-11 w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-[var(--muted)]">
              No cases found.
            </Command.Empty>
            {cases.map((c) => (
              <Command.Item
                key={c.id}
                value={`${c.issue} ${c.title}`}
                onSelect={() => go(c.id)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-[var(--accent)]/10"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-xs text-[var(--muted)]">{c.issue}</span>
                  <span className="truncate">{c.title}</span>
                </span>
                <StatusChip status={c.status} />
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
