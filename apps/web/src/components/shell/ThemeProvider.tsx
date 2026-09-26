"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// v2 key: the default changed from dark to light, and old visitors should see the new default.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={["light", "dark"]}
      storageKey="bugproof-theme-v2"
    >
      {children}
    </NextThemesProvider>
  );
}
