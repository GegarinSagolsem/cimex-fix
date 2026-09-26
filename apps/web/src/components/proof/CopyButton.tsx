"use client";

import * as React from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copies `text`, or the page URL when no text is given. */
export function CopyButton({ text, label }: { text?: string; label: string }) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text ?? window.location.href);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1500);
  }

  const Icon = state === "copied" ? Check : text ? Copy : Link2;
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      <Icon aria-hidden="true" />
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </Button>
  );
}
