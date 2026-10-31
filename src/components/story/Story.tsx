import { useEffect, useState } from "react";
import { CAST } from "../characters/Character";
import { CharacterSpot } from "../characters/CharacterSpot";
import { useInView } from "../../hooks/useMotion";
import { cn } from "../../utils/cn";
import { Reveal } from "../ui";
import {
  CheckinPanel,
  JudgingPanel,
  ResultsPanel,
  SetupPanel,
  TeamsPanel,
  VerifyPanel,
} from "./stagePanels";

interface StageDef {
  id: string;
  n: string;
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  character: "ada" | "noor" | "theo" | "isha" | "kenji" | "mira";
  message: string;
  panel: React.ReactNode;
  fullWidth?: boolean;
}

const STAGES: StageDef[] = [
  {
    id: "stage-verify",
    n: "01",
    kicker: "Trust first",
    title: "Verify the organizers and venue",
    description:
      "Before an event goes live, HACKOS reviews the organization, its authorized representative, and the venue. Every check is written down, so nobody has to ask who approved what.",
    bullets: [
      "Organization profile and domain review",
      "Named representative with authority to act",
      "Venue capacity, power, connectivity and access checks",
    ],
    character: "ada",
    message: "Verification is a record of what we checked — not a promise.",
    panel: <VerifyPanel />,
  },
  {
    id: "stage-setup",
    n: "02",
    kicker: "One setup",
    title: "Set up the event",
    description:
      "Dates, tracks, schedules, team-size rules and registration limits are configured once. Participants, judges and venue staff all read the same event truth.",
    bullets: [
      "Tracks and problem statements in one list",
      "Team-size and eligibility rules enforced at registration",
      "Live registration progress against real capacity",
    ],
    character: "noor",
    message: "I confirm hall slots from my phone, in one thread.",
    panel: <SetupPanel />,
    fullWidth: true,
  },
  {
    id: "stage-teams",
    n: "03",
    kicker: "Community",
    title: "Bring teams together",
    description:
      "Participants build a profile, form or join a team, send invitations, and claim a problem statement. Organizers see who is still looking for a teammate.",
    bullets: [
      "Profiles with skills, institution and track interest",
      "Team invitations with accept or decline states",
      "Problem statements claimed first-come, first-served",
    ],
    character: "theo",
    message: "We filled our last slot two days before kickoff.",
    panel: <TeamsPanel />,
  },
  {
    id: "stage-checkin",
    n: "04",
    kicker: "At the door",
    title: "Check everyone in",
    description:
      "Scan participant QR passes, even without internet. Check-in records are saved locally and synchronized when connectivity returns.",
    bullets: [
      "QR-based check-in",
      "Offline scanning and local queue",
      "Automatic or manual synchronization",
    ],
    character: "isha",
    message: "My pass worked before the Wi-Fi did.",
    panel: <CheckinPanel />,
    fullWidth: true,
  },
  {
    id: "stage-judging",
    n: "05",
    kicker: "Fair scoring",
    title: "Collect submissions and judge fairly",
    description:
      "Submissions land in one place with timestamps. Judges score against a fixed weighted rubric, and every score keeps its judge, round and history.",
    bullets: [
      "Repo, deck and demo links in one submission record",
      "Weighted rubric shared with judges before round one",
      "Score history you can show anyone who asks",
    ],
    character: "kenji",
    message: "I score against the same rubric as every other judge.",
    panel: <JudgingPanel />,
  },
  {
    id: "stage-results",
    n: "06",
    kicker: "CLOSE THE LOOP",
    title: "Publish results and close the loop",
    description:
      "Publish results, issue certificates and download event reports in one place.",
    bullets: [],
    character: "mira",
    message: "Our results were public before we left the hall.",
    panel: <ResultsPanel />,
    fullWidth: true,
  },
];

function Stage({
  stage,
  index,
  reversed,
  onActive,
}: {
  stage: StageDef;
  index: number;
  reversed: boolean;
  onActive: (index: number) => void;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.22, once: false });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  if (stage.fullWidth) {
    return (
      <article
        id={stage.id}
        ref={ref}
        className="scroll-mt-28 w-full"
      >
        <Reveal variant="up" delay={40} className="w-full">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[48rem]">
              <div className="flex items-center gap-3">
                <span className="tabular font-display text-[0.95rem] font-semibold text-cobalt">
                  {stage.n}
                </span>
                <span aria-hidden="true" className="h-px w-8 bg-line" />
                <span className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
                  {stage.kicker}
                </span>
              </div>
              <h3 className="mt-4 font-display text-[1.7rem] font-semibold leading-[1.12] tracking-[-0.02em] text-ink sm:text-[2.05rem]">
                {stage.title}
              </h3>
              <p className="mt-3 text-[1.05rem] leading-[1.65] text-ink-soft">
                {stage.description}
              </p>
              {stage.bullets && stage.bullets.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2.5">
                  {stage.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-[0.88rem] font-medium text-ink">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral"
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hidden lg:block shrink-0">
              <CharacterSpot
                config={CAST[stage.character]}
                message={stage.message}
                height="h-36 sm:h-40"
                gesture="wave"
                align="right"
                bubbleSide="left"
              />
            </div>
          </div>

          <div className="mt-7 w-full">
            {stage.panel}
          </div>
        </Reveal>
      </article>
    );
  }

  return (
    <article
      id={stage.id}
      ref={ref}
      className={cn(
        "grid scroll-mt-28 gap-10 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr] lg:gap-10 xl:gap-12",
        stage.id === "stage-teams" ? "lg:items-center" : "items-start",
      )}
    >
      <div className={cn("flex flex-col", reversed && "lg:order-2")}>
        <Reveal variant="x" delay={40} className="w-full text-left">
          <div className="flex items-center gap-3">
            <span className="tabular font-display text-[0.95rem] font-semibold text-cobalt">
              {stage.n}
            </span>
            <span aria-hidden="true" className="h-px w-8 bg-line" />
            <span className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
              {stage.kicker}
            </span>
          </div>
          <h3 className="mt-3.5 font-display text-[1.7rem] font-semibold leading-[1.12] tracking-[-0.02em] text-ink sm:text-[2.05rem]">
            {stage.title}
          </h3>
          <p className="mt-3.5 max-w-[32rem] text-[0.98rem] leading-[1.65] text-ink-soft">
            {stage.description}
          </p>
          <ul className="mt-5 space-y-2.5">
            {stage.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[0.88rem] text-ink leading-snug">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral"
                />
                <span className="flex-1">{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={160} className="mt-6 flex flex-col items-center justify-center w-full">
          <CharacterSpot
            config={CAST[stage.character]}
            message={stage.message}
            height="h-40 sm:h-44"
            gesture={index % 2 === 0 ? "wave" : "nod"}
            bubbleSide="bottom"
            align="center"
          />
        </Reveal>
      </div>

      <Reveal
        variant="scale"
        delay={90}
        className={cn("w-full min-w-0", reversed && "lg:order-1")}
      >
        {stage.panel}
      </Reveal>
    </article>
  );
}

function Rail({ active }: { active: number }) {
  return (
    <div className="hidden xl:block">
      <div className="sticky top-28">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
          The workflow
        </p>
        <ol className="mt-5 space-y-1">
          {STAGES.map((stage, i) => {
            const isActive = i === active;
            return (
              <li key={stage.id}>
                <a
                  href={`#${stage.id}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-200",
                    isActive ? "bg-white shadow-soft" : "hover:bg-white/70",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.62rem] font-bold transition-colors duration-300",
                      isActive
                        ? "border-cobalt bg-cobalt text-white"
                        : "border-line bg-white text-ink-muted group-hover:border-ink/30",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-[0.83rem] font-medium leading-tight transition-colors",
                      isActive ? "text-ink" : "text-ink-muted",
                    )}
                  >
                    {stage.title}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 rounded-2xl border border-line/90 bg-white/70 p-4">
          <p className="text-[0.78rem] leading-relaxed text-ink-soft">
            Six stages, one workspace. Nothing here needs a spreadsheet, a WhatsApp group, or a
            second login.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Story() {
  const [active, setActive] = useState(0);

  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-line/70 bg-ivory py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8">
        <Reveal className="max-w-[44rem]">
          <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-cobalt">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral" />
            How it works
          </p>
          <h2 className="mt-5 font-display text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.028em] text-ink sm:text-[2.75rem]">
            The whole hackathon journey, in six connected stages.
          </h2>
          <p className="mt-5 text-[1.05rem] leading-[1.65] text-ink-soft">
            Scroll through the journey HACKOS was built for. Every panel below is a product
            preview with sample data — nothing is connected to a live event.
          </p>
        </Reveal>

        <div className="mt-14 lg:mt-20 xl:grid xl:grid-cols-[15rem_1fr] xl:gap-14">
          <Rail active={active} />
          <div className="space-y-20 lg:space-y-28">
            {STAGES.map((stage, i) => (
              <Stage
                key={stage.id}
                stage={stage}
                index={i}
                reversed={i % 2 === 1}
                onActive={setActive}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
