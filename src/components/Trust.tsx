import { Card, Chip, Reveal } from "./ui";
import { CheckIcon, ClockIcon, DotIcon, LockIcon } from "./ui";

const STATUSES = [
  {
    label: "Email verified",
    detail: "The organizer's domain is confirmed before the account can publish an event.",
    icon: <CheckIcon className="h-4 w-4" />,
    tone: "sage" as const,
  },
  {
    label: "Organization reviewed",
    detail: "Institution or company details are checked against public records.",
    icon: <CheckIcon className="h-4 w-4" />,
    tone: "sage" as const,
  },
  {
    label: "Representative authorized",
    detail: "A named person is recorded as the event lead, with the authority to act.",
    icon: <CheckIcon className="h-4 w-4" />,
    tone: "sage" as const,
  },
  {
    label: "Venue approval recorded",
    detail: "Capacity, power, connectivity and access checks are stored with the venue.",
    icon: <CheckIcon className="h-4 w-4" />,
    tone: "sage" as const,
  },
  {
    label: "Agreement accepted",
    detail: "The organizer accepts the platform terms and the venue's quotation terms.",
    icon: <CheckIcon className="h-4 w-4" />,
    tone: "sage" as const,
  },
  {
    label: "Event dates confirmed",
    detail: "Dates are locked once the venue and organizer both confirm in writing.",
    icon: <ClockIcon className="h-4 w-4" />,
    tone: "cobalt" as const,
  },
];

const AUDIT = [
  { who: "HACKOS review", what: "Organization reviewed", when: "02 Feb 2026 · 11:20" },
  { who: "Noor Haddad", what: "Venue approval recorded", when: "03 Feb 2026 · 16:05" },
  { who: "Ada", what: "Agreement accepted (v3)", when: "04 Feb 2026 · 09:41" },
  { who: "Ada", what: "Event dates confirmed", when: "04 Feb 2026 · 09:44" },
];

export function Trust() {
  return (
    <section id="trust" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
          <Reveal>
            <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-cobalt">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral" />
              Trust & accountability
            </p>
            <h2 className="mt-5 font-display text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.028em] text-ink sm:text-[2.6rem]">
              Statuses record what was checked — nothing more.
            </h2>
            <p className="mt-5 max-w-[36rem] text-[1.05rem] leading-[1.68] text-ink-soft">
              HACKOS is an operations platform, not a certifying body. A green status means a
              specific check happened on a specific date and is stored with the event. It is not
              an endorsement, a warranty, or a promise that an event will take place.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {STATUSES.map((s, i) => (
                <Reveal key={s.label} delay={i * 55}>
                  <Card className="h-full p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
                          s.tone === "sage"
                            ? "border-sage/20 bg-sage-tint text-sage"
                            : "border-cobalt/20 bg-cobalt-tint text-cobalt-deep"
                        }`}
                      >
                        {s.icon}
                      </span>
                      <div>
                        <p className="text-[0.9rem] font-semibold text-ink">{s.label}</p>
                        <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-muted">
                          {s.detail}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal variant="scale" delay={120}>
            <div className="lg:sticky lg:top-28">
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
                  <div>
                    <p className="text-[0.9rem] font-semibold text-ink">Audit trail</p>
                    <p className="text-[0.74rem] text-ink-muted">HackNorthside 2026</p>
                  </div>
                  <Chip tone="neutral" icon={<LockIcon className="h-3.5 w-3.5" />}>
                    Read-only
                  </Chip>
                </div>
                <ol className="px-4 py-3">
                  {AUDIT.map((row, i) => (
                    <li key={row.what} className="relative flex gap-3.5 pb-5 last:pb-0">
                      {i < AUDIT.length - 1 && (
                        <span aria-hidden="true" className="absolute left-[0.6rem] top-5 h-full w-px bg-line" />
                      )}
                      <span
                        aria-hidden="true"
                        className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-cobalt"
                      />
                      <div className="min-w-0">
                        <p className="text-[0.86rem] font-semibold text-ink">{row.what}</p>
                        <p className="text-[0.75rem] text-ink-muted">
                          {row.who} · {row.when}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="border-t border-line/80 bg-parchment/60 px-4 py-3 text-[0.74rem] leading-relaxed text-ink-muted">
                  Every entry keeps the actor, the timestamp and the version of the document that
                  was accepted.
                </p>
              </Card>

              <Card className="mt-4 border-coral/25 bg-coral-tint/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-coral/25 bg-white text-coral">
                    <DotIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[0.9rem] font-semibold text-ink">What a status does not mean</p>
                    <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-soft">
                      A verified venue or a confirmed date does not guarantee that your event will
                      happen. Delivery, cancellations, refunds and disputes stay between the
                      organizer and the venue — HACKOS keeps the record of what was agreed.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
