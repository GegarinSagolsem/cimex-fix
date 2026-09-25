"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function DiffViewer({ patch }: { patch: string }) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    import("shiki").then(({ codeToHtml }) =>
      codeToHtml(patch, {
        lang: "diff",
        theme: resolvedTheme === "light" ? "github-light" : "github-dark",
      }).then((result) => {
        if (!cancelled) setHtml(result);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [patch, resolvedTheme]);

  if (!html) {
    return (
      <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-xs">
        {patch}
      </pre>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-md border border-[var(--border)] text-xs [&_pre]:!bg-transparent [&_pre]:p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
