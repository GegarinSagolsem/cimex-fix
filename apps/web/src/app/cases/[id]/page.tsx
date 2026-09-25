import { notFound } from "next/navigation";
import { dataSource } from "@/lib/data";
import { LiveCase } from "@/components/case-detail/LiveCase";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await dataSource.getCase(id);

  if (!detail) notFound();

  return <LiveCase id={id} initial={detail} />;
}
