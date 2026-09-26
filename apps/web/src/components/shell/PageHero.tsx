/** Sky header panel for the app pages, matching the landing hero. */
export function PageHero({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="panel-sky flex flex-col gap-6 rounded-3xl p-6 text-white sm:p-8 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em]">{label}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sm sm:text-base">{description}</p>}
      </div>
      {children && <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">{children}</div>}
    </section>
  );
}

/** Solid stat tile for a PageHero; solid (not translucent) so its text keeps full contrast. */
export function HeroStat({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <p
      className={`flex min-w-[8.5rem] flex-col rounded-2xl px-4 py-3 ${
        highlight ? "bg-[var(--highlight)] text-[var(--highlight-fg)]" : "bg-[var(--surface)] text-[var(--text)]"
      }`}
    >
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className={`text-xs ${highlight ? "" : "text-[var(--muted)]"}`}>{label}</span>
    </p>
  );
}
