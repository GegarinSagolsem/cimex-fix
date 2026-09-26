"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/cases", label: "Cases" },
  { href: "/triage", label: "Triage" },
  { href: "/impact", label: "Impact" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg)] p-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-2.5 py-1 text-sm font-medium transition-colors sm:px-3",
              active
                ? "bg-[var(--highlight)] text-[var(--highlight-fg)]"
                : "text-[var(--muted)] hover:bg-[var(--border)]/60 hover:text-[var(--text)]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
