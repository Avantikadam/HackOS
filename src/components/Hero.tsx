import { CAST } from "./characters/Character";
import { CharacterSpot } from "./characters/CharacterSpot";
import { ButtonLink, Chip, Reveal } from "./ui";
import { ArrowRight, CheckIcon } from "./ui";

const ROLES = [
  "Organizers",
  "Venue providers",
  "Participants",
  "Team leads",
  "Judges",
  "Platform admins",
];

function Panel({
  children,
  className = "",
  drift = false,
  tilt = "",
}: {
  children: React.ReactNode;
  className?: string;
  drift?: boolean;
  tilt?: string;
}) {
  return (
    <div
      className={`min-w-0 flex-1 rounded-2xl border border-line bg-white/95 p-3 text-left shadow-card transition-transform duration-300 ease-out hover:-translate-y-0.5 ${
        drift ? "drift-slow" : ""
      } ${tilt} ${className}`}
    >
      {children}
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* warm editorial backdrop: soft arcs, no neon */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-parchment" />
        <div className="absolute -right-52 top-[-6rem] h-[40rem] w-[40rem] rounded-full bg-cobalt-tint/45" />
      </div>

      <div className="mx-auto grid w-full max-w-[88rem] grid-cols-1 items-center gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pb-24 lg:pt-20">
        {/* ---------------- copy ---------------- */}
        <div className="max-w-[36rem]">
          <Reveal>
            <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-cobalt">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral" />
              Hackathon operations platform
            </p>
          </Reveal>

          <Reveal delay={70}>
            <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.03em] text-ink sm:text-[3.4rem] lg:text-[4.05rem]">
              Run the hackathon.
              <span className="block text-cobalt">Not the spreadsheet chaos.</span>
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-6 max-w-[32rem] text-[1.08rem] leading-[1.65] text-ink-soft sm:text-[1.16rem]">
              HACKOS brings registrations, venue coordination, check-in, submissions, and
              judging into one clear event workspace.
            </p>
          </Reveal>

          <Reveal delay={200}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/signup" variant="primary" size="lg" className="w-full sm:w-auto">
                Sign Up
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink
                href="#plan"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Plan a hackathon
              </ButtonLink>
              <ButtonLink
                href="#how-it-works"
                variant="quiet"
                size="lg"
                className="w-full sm:w-auto"
              >
                See how it works
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={260}>
            <ul className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.84rem] text-ink-muted">
              <li className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-sage" />
                No setup fee to explore
              </li>
              <li className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-sage" />
                Works on a phone at the door
              </li>
              <li className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-sage" />
                Offline-tolerant check-in
              </li>
            </ul>
          </Reveal>
        </div>

        {/* ---------------- composition ---------------- */}
        <Reveal variant="scale" delay={120} className="relative">
          <div className="relative">
            {/* stage */}
            <div className="rule-dot relative overflow-hidden rounded-[2rem] border border-line bg-parchment p-3 shadow-card sm:p-4">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-linen/90 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 h-20 w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/70"
              />

              <div className="relative flex flex-col gap-3">
                {/* floating interface elements — top row */}
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <Panel>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-ink-muted">
                        Registrations
                      </p>
                      <Chip tone="sage" className="!px-2 !py-0.5 !text-[0.62rem]">
                        Open
                      </Chip>
                    </div>
                    <p className="tabular mt-1 font-display text-[1.5rem] font-semibold leading-none text-ink">
                      1,284
                    </p>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-linen">
                      <div className="h-full w-[82%] rounded-full bg-cobalt" />
                    </div>
                    <p className="mt-1.5 text-[0.68rem] text-ink-muted">82% of 1,560 capacity</p>
                  </Panel>

                  <Panel drift tilt="sm:mt-6">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-ink-muted">
                      Venue
                    </p>
                    <p className="mt-1 text-[0.82rem] font-semibold leading-snug text-ink">
                      Nexa Convention Hall
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[0.72rem] font-semibold text-sage">
                      <CheckIcon className="h-3.5 w-3.5" />
                      Approval recorded
                    </p>
                  </Panel>
                </div>

                {/* characters */}
                <div className="flex items-end justify-center gap-1 px-1 sm:gap-3">
                  <CharacterSpot
                    config={CAST.ada}
                    height="h-32 sm:h-44 lg:h-52"
                    pointerTrack
                    gesture="nod"
                    message="I keep the venue approval and authorization records in one place."
                  />
                  <CharacterSpot
                    config={CAST.mira}
                    height="h-40 sm:h-56 lg:h-64"
                    pointerTrack
                    gesture="wave"
                    message="My team registered, picked a problem statement, and we're building."
                    className="z-10"
                  />
                  <CharacterSpot
                    config={CAST.theo}
                    height="h-32 sm:h-44 lg:h-52"
                    pointerTrack
                    gesture="wave"
                    message="I invite teammates and track who's still missing."
                  />
                </div>

                {/* floating interface elements — bottom row */}
                <div className="flex items-end justify-between gap-2 sm:gap-3">
                  <Panel drift tilt="sm:-rotate-1">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                          <g fill="#fbf6ee">
                            <rect x="4" y="4" width="6" height="6" rx="1.2" />
                            <rect x="14" y="4" width="6" height="6" rx="1.2" />
                            <rect x="4" y="14" width="6" height="6" rx="1.2" />
                            <rect x="13" y="13" width="3" height="3" />
                            <rect x="17.5" y="13" width="3" height="3" />
                            <rect x="13" y="17.5" width="3" height="3" />
                            <rect x="17.5" y="17.5" width="3" height="3" />
                          </g>
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[0.78rem] font-semibold text-ink">
                          Isha · Pass 0442
                        </p>
                        <p className="text-[0.68rem] font-semibold text-sage">
                          Checked in · 09:42
                        </p>
                      </div>
                    </div>
                  </Panel>

                  <Panel tilt="sm:rotate-1">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.13em] text-ink-muted">
                      Judging
                    </p>
                    <p className="mt-1 text-[0.8rem] font-semibold text-ink">Round 2 of 3</p>
                    <div className="mt-2 flex gap-1" aria-hidden="true">
                      {[100, 100, 62, 28, 0].map((w, i) => (
                        <span key={i} className="h-1.5 flex-1 rounded-full bg-linen">
                          <span
                            className="block h-full rounded-full bg-coral"
                            style={{ width: `${w}%` }}
                          />
                        </span>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-[0.74rem] text-ink-muted">
              Illustrations are interactive — hover, tap, or focus a character to hear from them.
            </p>
          </div>
        </Reveal>
      </div>

      {/* role strip */}
      <div className="mx-auto w-full max-w-[88rem] px-5 pb-14 sm:px-8">
        <Reveal>
          <div className="flex flex-col gap-4 rounded-2xl border border-line/90 bg-white/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
              One workspace for
            </p>
            <ul className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <li key={role}>
                  <Chip tone="neutral" className="!text-[0.78rem]">
                    {role}
                  </Chip>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
