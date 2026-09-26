import { dataSource } from "@/lib/data";
import { AppShell } from "@/components/shell/AppShell";

export default async function ImpactLayout({ children }: { children: React.ReactNode }) {
  const cases = await dataSource.listCases();
  return <AppShell cases={cases}>{children}</AppShell>;
}
