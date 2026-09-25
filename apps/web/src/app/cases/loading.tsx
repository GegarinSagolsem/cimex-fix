import { CaseGridSkeleton } from "@/components/cases/CaseGridSkeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-lg font-semibold">Cases</h1>
      <CaseGridSkeleton />
    </div>
  );
}
