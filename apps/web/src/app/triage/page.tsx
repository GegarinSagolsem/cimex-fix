import triageExamplesRaw from "../../../data/triage-examples.json";
import { TriagePanel, type TriageExampleChip } from "@/components/triage/TriagePanel";
import { PageHero } from "@/components/shell/PageHero";

function labelFor(input: string, index: number): string {
  const firstLine = input.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const heading = firstLine.replace(/^#+\s*/, "").trim();
  if (heading && !/^\d{4}-\d{2}-\d{2}T/.test(heading)) {
    return heading.length > 56 ? `${heading.slice(0, 53)}...` : heading;
  }
  return `Example ${index + 1}: server log`;
}

function loadExamples(): TriageExampleChip[] {
  if (!Array.isArray(triageExamplesRaw)) return [];
  return triageExamplesRaw.map((example, i) => ({
    label: labelFor(String(example.input ?? ""), i),
    text: String(example.input ?? ""),
  }));
}

export default function TriagePage() {
  const examples = loadExamples();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <PageHero
        label="Try it live"
        title="Triage with IBM Granite"
        description="Paste a messy bug report and watsonx.ai Granite turns it into a structured triage: severity, component, expected vs actual, steps to reproduce, and what's still missing."
      />
      <TriagePanel examples={examples} />
    </div>
  );
}
