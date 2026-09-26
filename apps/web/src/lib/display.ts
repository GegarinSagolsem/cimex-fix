// Display-only labels; the recorded case data is left as Bob wrote it.

// Two runs named the case after the intake file ("Bug 03 QA Report", "Bug 08 — …"), which reads as if Bob knew the
// planted bug numbers. Show the symptom instead.
const RETITLED: Record<string, string> = {
  case_20260926_2c6c: "Delivery date shows one day early for orders after 8 PM IST",
  case_20260926_db4f: "Duplicate DIWALI60 coupon stacks the discount to a negative total",
};

export const caseTitle = (c: { id: string; title: string }) => RETITLED[c.id] ?? c.title;

const APPROVED = /^(approved?|pass(ed)?)$/i;

// Critic verdicts were recorded as APPROVE, APPROVED or pass across runs.
export const isApproved = (verdict: string | undefined) => verdict !== undefined && APPROVED.test(verdict.trim());
export const verdictLabel = (verdict: string) => (isApproved(verdict) ? "APPROVED" : verdict);
