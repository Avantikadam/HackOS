import { CAST } from "./characters/Character";
import { CharacterSpot } from "./characters/CharacterSpot";
import { ButtonLink, Card, Chip, Reveal } from "./ui";
import { CheckIcon } from "./ui";

const ORGANIZER_GAINS = [
  "Registrations with real capacity limits",
  "Team formation, invitations and waitlists",
  "QR check-in that survives a dead network",
  "Submissions, rubric scoring and score history",
  "Results, certificates and audit exports",
];

const ORGANIZER_STOPS = [
  "Chasing a spreadsheet across five people",
  "Re-typing venue emails into a schedule",
  "Reconstructing who scored what, and when",
];

const VENUE_GAINS = [
  "One availability calendar per hall",
  "Structured requests instead of DMs",
  "Quotations and approvals in the same thread",
  "Load-in, event and load-out slots in writing",
  "A recorded approval trail per booking",
];

export function Audience() {
  return (
    <section className="border-y border-line/70 bg-ivory py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8">
        <Reveal className="max-w-[42rem]">
          <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-cobalt">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral" />
            Who it is for
          </p>
          <h2 className="mt-5 font-display text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.028em] text-ink sm:text-[2.6rem]">
            Built for the people who actually run the show.
          </h2>
        </Reveal>

        <div className="mt-14 space-y-16 lg:space-y-24">
          {/* ---------------- organizers ---------------- */}
          <div id="organizers" className="grid scroll-mt-28 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <Reveal variant="x">
              <Chip tone="cobalt">For organizers</Chip>
              <h3 className="mt-4 font-display text-[1.65rem] font-semibold leading-[1.14] tracking-[-0.02em] text-ink sm:text-[2rem]">
                Campus clubs, innovation cells and event companies.
              </h3>
              <p className="mt-4 max-w-[34rem] text-[1rem] leading-[1.68] text-ink-soft">
                You already know how to run a hackathon. HACKOS takes the operational load —
                registrations, desks, scoring, reports — so your team can spend the weekend with
                participants instead of a laptop.
              </p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {ORGANIZER_GAINS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.9rem] text-ink">
                    <span className="mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-sage-tint text-sage">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="#plan">Plan a hackathon</ButtonLink>
                <ButtonLink href="#how-it-works" variant="secondary">
                  Walk the workflow
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal variant="scale" delay={90} className="lg:justify-self-end">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-4">
                <CharacterSpot
                  config={CAST.ada}
                  message="Approvals, exports and results — one screen, one record."
                  height="h-52 sm:h-60"
                  gesture="nod"
                  align="left"
                  className="items-start"
                />
                <Card className="flex-1 p-4">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                    What you stop doing
                  </p>
                  <ul className="mt-3 space-y-3">
                    {ORGANIZER_STOPS.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[0.85rem] text-ink-soft">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </Reveal>
          </div>

          {/* ---------------- venues ---------------- */}
          <div id="venues" className="grid scroll-mt-28 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
            <Reveal variant="scale" delay={60} className="lg:order-2">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-4">
                <CharacterSpot
                  config={CAST.noor}
                  message="I publish hall availability and confirm bookings in writing."
                  height="h-52 sm:h-60"
                  gesture="wave"
                  align="left"
                  className="items-start"
                />
                <Card className="flex-1 overflow-hidden">
                  <div className="border-b border-line/80 px-4 py-3">
                    <p className="text-[0.88rem] font-semibold text-ink">Nexa Convention Hall</p>
                    <p className="text-[0.74rem] text-ink-muted">3 halls · 2,400 seats total</p>
                  </div>
                  <ul className="divide-y divide-line/70">
                    {[
                      { d: "Fri 14 Feb", s: "Hall B · booked" },
                      { d: "Sat 15 Feb", s: "Hall B · booked" },
                      { d: "Sun 16 Feb", s: "Hall A · open" },
                    ].map((row) => (
                      <li key={row.d} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="text-[0.8rem] font-medium text-ink">{row.d}</span>
                        <Chip tone={row.s.includes("open") ? "neutral" : "sage"}>{row.s}</Chip>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </Reveal>

            <Reveal variant="x" delay={40} className="lg:order-1">
              <Chip tone="sage">For venues</Chip>
              <h3 className="mt-4 font-display text-[1.65rem] font-semibold leading-[1.14] tracking-[-0.02em] text-ink sm:text-[2rem]">
                Halls, auditoriums and innovation spaces.
              </h3>
              <p className="mt-4 max-w-[34rem] text-[1rem] leading-[1.68] text-ink-soft">
                Publish what is free, answer requests with a proper quotation, and keep a written
                record of every approval. No more discovering a double booking the morning of
                load-in.
              </p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {VENUE_GAINS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[0.9rem] text-ink">
                    <span className="mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-sage-tint text-sage">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="#plan" variant="secondary">
                  List your venue
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
