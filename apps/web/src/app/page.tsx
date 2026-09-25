export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
          aria-hidden="true"
        />
        Powered by IBM Bob 2.0
      </span>

      <h1 className="text-5xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl">
        BugProof
      </h1>

      <p className="mt-4 font-mono text-lg text-[var(--accent)]">
        No fix without proof.
      </p>

      <p className="mt-6 max-w-xl text-balance text-[var(--muted)]">
        IBM Bob reproduces a bug with a failing test, finds the culprit commit, fixes it, and
        publishes a Proof of Fix &mdash; live, on Mission Control.
      </p>

      <p className="mt-10 text-xs text-[var(--muted)]">Work in progress.</p>
    </main>
  );
}
