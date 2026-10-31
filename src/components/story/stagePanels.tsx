import { useEffect, useState } from "react";
import { useInView, usePrefersReducedMotion } from "../../hooks/useMotion";
import { cn } from "../../utils/cn";
import { Button, Card, Chip, ProgressBar, StatusRow } from "../ui";
import { ArrowRight, CheckIcon, ClockIcon } from "../ui";
import { QrCode } from "./QrCode";
import {
  EVENT,
  PARTICIPANTS,
  PROBLEM_STATEMENTS,
  PROJECTS,
  RUBRIC,
  SCHEDULE,
  SCORE_HISTORY,
  TEAMS,
  VENUE_CHECKS,
  VERIFICATION_RECORD,
} from "./data";

/* ------------------------------------------------------------------ */
/* shared bits                                                        */
/* ------------------------------------------------------------------ */

export const STAGE_IMAGES = {
  venue:
    "https://images.pexels.com/photos/35064539/pexels-photo-35064539.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1100",
  teams:
    "https://images.pexels.com/photos/8199634/pexels-photo-8199634.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1100",
};

function PanelHead({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line/80 px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[0.92rem] font-semibold text-ink leading-tight">{title}</p>
        {meta && <p className="text-[0.76rem] text-ink-muted leading-normal mt-0.5">{meta}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Avatar({
  init,
  tone,
  size = "md",
}: {
  init: string;
  tone: "cobalt" | "sage" | "coral" | "amber";
  size?: "sm" | "md";
}) {
  const tones = {
    cobalt: "bg-cobalt-tint text-cobalt-deep",
    sage: "bg-sage-tint text-sage",
    coral: "bg-coral-tint text-coral",
    amber: "bg-amber-tint text-[#8a5a10]",
  };
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center rounded-full font-bold",
        tones[tone],
        size === "sm" ? "h-7 w-7 text-[0.62rem]" : "h-9 w-9 text-[0.72rem]",
      )}
    >
      {init}
    </span>
  );
}

function Bar({
  value,
  max,
  delay,
  tone,
  label,
}: {
  value: number;
  max: number;
  delay: number;
  tone: string;
  label: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.45 });
  const pct = Math.max(6, (value / max) * 100);
  return (
    <div ref={ref} className="flex h-full flex-1 flex-col justify-end items-center gap-1.5">
      <span className="tabular text-[0.66rem] font-semibold text-ink-muted">{label}</span>
      <div className="flex w-full flex-1 items-end">
        <div
          className="w-full rounded-t-md transition-[height] duration-700 ease-out"
          style={{
            height: inView ? `${pct}%` : "4%",
            transitionDelay: `${delay}ms`,
            backgroundColor: tone,
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · Verify the organizers and venue                                */
/* ------------------------------------------------------------------ */

export function VerifyPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
      <Card className="overflow-hidden">
        <PanelHead
          title="Verification record"
          meta={EVENT.org}
          action={<Chip tone="sage">5 of 6 verified</Chip>}
        />
        <div className="divide-y divide-line/70">
          {VERIFICATION_RECORD.map((row) => (
            <StatusRow key={row.label} {...row} />
          ))}
        </div>
        <p className="border-t border-line/80 bg-parchment/60 px-4 py-3 sm:px-5 text-[0.74rem] leading-relaxed text-ink-muted">
          Statuses record what HACKOS checked and when. They do not guarantee that an event
          will take place.
        </p>
      </Card>

      <div className="flex flex-col gap-4">
        <figure className="overflow-hidden rounded-2xl border border-line/90 bg-linen shadow-soft">
          <img
            src={STAGE_IMAGES.venue}
            alt="A large auditorium with tiered seating and a stage, used as the HACKOS event venue."
            loading="lazy"
            decoding="async"
            width={1100}
            height={700}
            referrerPolicy="no-referrer"
            className="h-48 w-full object-cover sm:h-56"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line/80 bg-white px-4 py-3 sm:px-5">
            <div>
              <p className="text-[0.88rem] font-semibold text-ink">{EVENT.venue}</p>
              <p className="text-[0.76rem] text-ink-muted leading-tight mt-0.5">Hall B · 1,200 seated · 3 days</p>
            </div>
            <Chip tone="sage" icon={<CheckIcon className="h-3.5 w-3.5" />}>
              Approved
            </Chip>
          </figcaption>
        </figure>

        <Card className="p-4 sm:p-5">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
            What was checked
          </p>
          <ul className="mt-3.5 space-y-2.5">
            {VENUE_CHECKS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[0.84rem] text-ink-soft leading-snug">
                <span className="mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-sage-tint text-sage">
                  <CheckIcon className="h-2.5 w-2.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Set up the event                                               */
/* ------------------------------------------------------------------ */

export function SetupPanel() {
  const summaryMetrics = [
    { label: "Team size", value: EVENT.teamSize },
    { label: "Tracks", value: "4 tracks" },
    { label: "Registration deadline", value: "Closes 12 Feb 2026" },
    { label: "Judging rounds", value: "3 rounds + final" },
  ];

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Wide Event Summary Panel */}
      <Card className="overflow-hidden w-full border border-line/90 bg-white shadow-soft">
        <PanelHead
          title={EVENT.name}
          meta={`${EVENT.dates} · ${EVENT.venue}`}
          action={<Chip tone="sage">Configuration locked</Chip>}
        />

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-line/70 border-b border-line/80 bg-white">
          {summaryMetrics.map((item) => (
            <div key={item.label} className="p-4 sm:p-5">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
                {item.label}
              </p>
              <p className="mt-1.5 text-[0.98rem] font-semibold text-ink leading-snug">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Registration Progress */}
        <div className="p-5 sm:p-6 bg-parchment/20">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[0.84rem]">
            <span className="font-semibold text-ink">Registration progress</span>
            <span className="tabular font-medium text-ink-muted">
              {EVENT.registered.toLocaleString("en-US")} / {EVENT.capacity.toLocaleString("en-US")} registered (82%)
            </span>
          </div>
          <ProgressBar
            value={82}
            label="Registration progress"
            tone="cobalt"
            className="mt-2.5"
          />
          <p className="mt-2 text-[0.76rem] text-ink-muted">
            276 seats remaining · Team size and capacity rules enforced at registration
          </p>
        </div>
      </Card>

      {/* 2. Separate Schedule Section */}
      <Card className="overflow-hidden w-full border border-line/90 bg-white shadow-soft">
        <PanelHead
          title="Event schedule"
          meta="Venue local time · Milestone checkpoints"
          action={<Chip tone="neutral">5 milestones</Chip>}
        />
        <div className="p-5 sm:p-6">
          <ol className="relative border-l border-line/80 ml-3.5 space-y-5">
            {SCHEDULE.map((slot) => (
              <li key={slot.title} className="relative pl-6">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[0.5625rem] top-1 grid h-4.5 w-4.5 place-items-center rounded-full border-2 bg-white",
                    slot.done ? "border-sage bg-sage text-white" : "border-cobalt text-cobalt",
                  )}
                >
                  {slot.done ? (
                    <CheckIcon className="h-2.5 w-2.5" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
                  )}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <p
                    className={cn(
                      "text-[0.95rem] font-semibold leading-snug",
                      slot.done ? "text-ink-soft" : "text-ink",
                    )}
                  >
                    {slot.title}
                  </p>
                  <span className="tabular text-[0.78rem] font-medium text-ink-muted shrink-0">
                    {slot.day} · {slot.time}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · Bring teams together                                           */
/* ------------------------------------------------------------------ */

export function TeamsPanel() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Team formation banner */}
      <figure className="overflow-hidden rounded-2xl border border-line/90 bg-linen shadow-soft w-full">
        <img
          src={STAGE_IMAGES.teams}
          alt="Three students working together at a table with laptops and notebooks."
          loading="lazy"
          decoding="async"
          width={1100}
          height={700}
          referrerPolicy="no-referrer"
          className="h-32 w-full object-cover sm:h-40"
        />
        <figcaption className="flex items-center justify-between gap-3 border-t border-line/80 bg-white px-4 py-3 sm:px-5">
          <p className="min-w-0 text-[0.84rem] font-semibold text-ink truncate sm:overflow-visible sm:whitespace-normal">
            Teams form before the doors open
          </p>
          <Chip tone="cobalt" className="shrink-0 text-[0.72rem] px-2.5 py-0.5">
            42 still looking
          </Chip>
        </figcaption>
      </figure>

      {/* 2. Three Team Cards across the full width */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 items-stretch">
        {TEAMS.map((team) => (
          <Card
            key={team.name}
            className="p-4 sm:p-4.5 flex flex-col justify-between h-full border border-line/90 bg-white shadow-soft"
          >
            <div>
              {/* Card Title & Team Size Badge aligned at same vertical baseline */}
              <div className="flex items-center justify-between gap-2 min-h-[1.75rem]">
                <p className="text-[0.92rem] font-semibold leading-tight text-ink truncate">
                  {team.name}
                </p>
                <Chip
                  tone={team.state === "full" ? "sage" : "amber"}
                  className="shrink-0 text-[0.72rem] px-2 py-0.5"
                >
                  {team.members}/{team.size}
                </Chip>
              </div>

              {/* Track Name */}
              <p className="mt-1.5 text-[0.76rem] font-medium text-ink-muted leading-tight">
                {team.track}
              </p>

              {/* Member indicator circles */}
              <div className="mt-3.5 flex -space-x-1.5" aria-hidden="true">
                {Array.from({ length: team.size }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 border-white shadow-xs transition-colors",
                      i < team.members ? "bg-cobalt/80" : "bg-linen",
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Description aligned at the bottom of the card */}
            <div className="mt-4 pt-2.5 border-t border-line/60">
              <p className="text-[0.76rem] font-medium text-ink-soft leading-snug">
                {team.looking}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* 3. Participants and Problem Statements side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-[0.92fr_1.08fr] gap-4 items-start">
        {/* Participants Panel */}
        <Card className="overflow-hidden border border-line/90 bg-white shadow-soft">
          <PanelHead title="Participants" meta="1,284 registered · 6 institutions" />
          <ul className="divide-y divide-line/70">
            {PARTICIPANTS.map((p) => (
              <li key={p.name} className="flex items-center gap-3 px-4 py-3 sm:px-5 min-h-[3.75rem]">
                <Avatar init={p.init} tone={p.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.86rem] font-semibold text-ink leading-tight">{p.name}</p>
                  <p className="text-[0.75rem] text-ink-muted mt-0.5">{p.status}</p>
                </div>
                <div className="shrink-0 flex justify-end min-w-[3.25rem]">
                  {p.status === "Checked in" ? (
                    <Chip tone="sage" icon={<CheckIcon className="h-3 w-3" />} className="text-[0.72rem] px-2 py-0.5">
                      In
                    </Chip>
                  ) : (
                    <span className="text-[0.72rem] font-medium text-ink-muted/70 px-2 py-0.5">
                      {p.status === "Team lead" ? "Lead" : p.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line/80 bg-parchment/50 px-4 py-3 sm:px-5">
            <p className="text-[0.76rem] text-ink-soft">
              <span className="font-semibold text-ink">Invitations</span> — 128 sent · 94 accepted
              · 12 pending
            </p>
          </div>
        </Card>

        {/* Problem Statements Panel */}
        <Card className="overflow-hidden border border-line/90 bg-white shadow-soft">
          <PanelHead
            title="Problem statements"
            meta="Claim one per team · first come, first served"
          />
          <ul className="divide-y divide-line/70">
            {PROBLEM_STATEMENTS.map((ps) => (
              <li
                key={ps.code}
                className={cn(
                  "flex items-start gap-3 px-4 py-3.5 transition-colors sm:px-5 min-h-[3.75rem]",
                  ps.selected && "bg-sage-tint/30",
                )}
              >
                {/* Selection indicator */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 mt-0.5",
                    ps.selected ? "border-sage bg-sage text-white" : "border-line bg-white",
                  )}
                >
                  {ps.selected && <CheckIcon className="h-3 w-3" />}
                </span>

                {/* Problem Statement Code: clearly separated column */}
                <span className="tabular shrink-0 w-12 text-[0.74rem] font-bold text-ink-muted mt-0.5">
                  {ps.code}
                </span>

                {/* Description: wraps cleanly without truncation or collision */}
                <div className="min-w-0 flex-1 pr-1.5">
                  <p className="text-[0.86rem] font-medium text-ink leading-snug break-words">
                    {ps.title}
                  </p>
                </div>

                {/* Team Claimed Badge: clearly separated column */}
                <div className="shrink-0 mt-0.5">
                  <Chip
                    tone={ps.claimed === "Unclaimed" ? "neutral" : "cobalt"}
                    className="text-[0.72rem] px-2 py-0.5 whitespace-nowrap"
                  >
                    {ps.claimed}
                  </Chip>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line/80 bg-parchment/50 px-4 py-3 sm:px-5">
            <p className="text-[0.76rem] text-ink-soft">
              <span className="font-semibold text-ink">Allocation</span> — 18 claimed · 6 open · 1 per team
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · Check everyone in                                              */
/* ------------------------------------------------------------------ */

type SyncState = "queued" | "syncing" | "synced";

export function CheckinPanel() {
  const reduced = usePrefersReducedMotion();
  const [sync, setSync] = useState<SyncState>("queued");
  const count = 1142;

  const run = () => {
    setSync("queued");
  };

  useEffect(() => {
    if (sync !== "queued") return;
    const t = window.setTimeout(() => setSync("syncing"), reduced ? 120 : 1600);
    return () => window.clearTimeout(t);
  }, [sync, reduced]);

  useEffect(() => {
    if (sync !== "syncing") return;
    const t = window.setTimeout(
      () => {
        setSync("synced");
      },
      reduced ? 120 : 1300,
    );
    return () => window.clearTimeout(t);
  }, [sync, reduced]);

  const attendees = [
    { name: "Isha Raman", time: "09:42", state: sync === "synced" ? "Synced" : "Saved on device" },
    { name: "Mira Okafor", time: "09:41", state: "Synced" },
    { name: "Theo Alvarez", time: "09:39", state: "Synced" },
    { name: "Devansh Rao", time: "09:38", state: "Synced" },
    { name: "Lena Fischer", time: "09:37", state: "Synced" },
  ];

  return (
    <Card className="overflow-hidden w-full border border-line/90 bg-white shadow-soft">
      {/* Top Header: Desk Status & Offline Synchronization Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 bg-parchment/30 px-5 py-3.5 sm:px-7">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-2.5 w-2.5 place-items-center">
            {sync !== "synced" && (
              <span
                aria-hidden="true"
                className="pulse-ring absolute h-2.5 w-2.5 rounded-full bg-amber"
              />
            )}
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                sync === "synced" ? "bg-sage" : "bg-amber",
              )}
            />
          </span>
          <span className="text-[0.88rem] font-semibold text-ink">
            Check-in desk · Hall B
          </span>
          <span className="tabular text-[0.78rem] text-ink-muted">
            ({count.toLocaleString("en-US")} checked in)
          </span>
        </div>

        {/* Clear offline synchronization indicator */}
        <Chip
          tone={sync === "synced" ? "sage" : "amber"}
          icon={sync === "synced" ? <CheckIcon className="h-3.5 w-3.5" /> : <ClockIcon className="h-3.5 w-3.5" />}
        >
          {sync === "synced" ? "All records synchronized" : "Saved on device · Waiting to sync"}
        </Chip>
      </div>

      {/* Main Content: QR Pass Preview on left/top, Participant List on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-line/70">
        {/* QR Pass Preview */}
        <div className="p-5 sm:p-6 flex flex-col justify-between bg-parchment/15">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Participant pass preview
            </p>

            <div className="mt-4 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left lg:flex-col lg:items-center lg:text-center gap-4">
              <div className="relative shrink-0 rounded-2xl border border-line bg-white p-3 shadow-xs">
                <QrCode value="HACKOS-PASS-0442-ISHA" size={132} label="Participant scan code preview" />
                {sync === "syncing" && (
                  <span
                    aria-hidden="true"
                    className="qr-scan pointer-events-none absolute left-3 right-3 top-3 h-8 rounded-md bg-cobalt/15"
                  />
                )}
              </div>

              <div className="min-w-0">
                <p className="font-display text-[1.15rem] font-semibold text-ink">Isha Raman</p>
                <p className="text-[0.78rem] text-ink-muted mt-0.5">Pass 0442 · Team Paper Boats</p>
                <p className="text-[0.76rem] text-ink-soft mt-1">Hall B · Row 12 · Seat 44</p>
                <div className="mt-2.5">
                  <Chip tone="sage" icon={<CheckIcon className="h-3 w-3" />}>
                    Checked in · Scanned 09:42
                  </Chip>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-line/70">
            <p className="text-[0.73rem] text-ink-muted leading-relaxed">
              Passes work offline. Scans queue on device and synchronize when connectivity returns.
            </p>
          </div>
        </div>

        {/* Short Participant List: Participant name | Check-in time | Sync status */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="grid grid-cols-12 gap-2 border-b border-line/70 bg-parchment/40 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
              <span className="col-span-6 sm:col-span-5">Participant name</span>
              <span className="col-span-3 sm:col-span-3">Check-in time</span>
              <span className="col-span-3 sm:col-span-4 text-right">Sync status</span>
            </div>

            <ul className="divide-y divide-line/70">
              {attendees.map((row) => (
                <li key={row.name} className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 hover:bg-parchment/20 transition-colors">
                  <span className="col-span-6 sm:col-span-5 text-[0.88rem] font-semibold text-ink leading-tight">
                    {row.name}
                  </span>
                  <span className="col-span-3 sm:col-span-3 tabular text-[0.78rem] font-medium text-ink-muted">
                    {row.time}
                  </span>
                  <div className="col-span-3 sm:col-span-4 flex justify-end">
                    <Chip
                      tone={row.state === "Synced" ? "sage" : "amber"}
                      icon={row.state === "Synced" ? <CheckIcon className="h-3 w-3" /> : <ClockIcon className="h-3 w-3" />}
                      className="shrink-0 text-[0.7rem] sm:text-[0.74rem] px-2.5 py-0.5"
                    >
                      {row.state}
                    </Chip>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/80 bg-parchment/30 px-5 py-3 sm:px-6">
            <p className="text-[0.75rem] text-ink-muted">
              Scan participant QR passes, even without internet.
            </p>
            <Button variant="secondary" size="sm" onClick={run}>
              Simulate scan
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 5 · Collect submissions and judge fairly                           */
/* ------------------------------------------------------------------ */

export function JudgingPanel() {
  return (
    <div className="flex flex-col gap-4">
      {/* 3 Project Cards across the full width */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {PROJECTS.map((p) => (
          <Card key={p.name} className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-[1.08rem] font-semibold leading-tight text-ink">
                  {p.name}
                </p>
                <Chip tone={p.state === "Scored" ? "sage" : "cobalt"} className="shrink-0">
                  {p.state}
                </Chip>
              </div>
              <p className="mt-1.5 text-[0.78rem] font-medium text-ink-muted">{p.team}</p>
              <p className="mt-0.5 text-[0.76rem] text-ink-muted">{p.track}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-2.5">
              <span className="tabular text-[0.74rem] text-ink-muted">
                Submitted {p.submitted}
              </span>
              {p.score !== null ? (
                <span className="tabular text-[0.92rem] font-bold text-cobalt">
                  {p.score.toFixed(1)}
                </span>
              ) : (
                <span className="tabular text-[0.76rem] text-ink-muted italic">pending</span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Rubric on left, Score History & Judge Progress on right */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden flex flex-col justify-between">
          <div>
            <PanelHead title="Rubric" meta="Weighted average · 0 to 10" />
            <ul className="divide-y divide-line/70">
              {RUBRIC.map((row) => (
                <li key={row.label} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.88rem] font-medium text-ink leading-snug">{row.label}</span>
                    <span className="text-[0.74rem] text-ink-muted">Weight {row.weight}</span>
                  </span>
                  <span className="h-2 w-24 sm:w-28 shrink-0 overflow-hidden rounded-full bg-linen">
                    <span
                      className="block h-full rounded-full bg-sage"
                      style={{ width: `${(row.value / 10) * 100}%` }}
                    />
                  </span>
                  <span className="tabular w-9 shrink-0 text-right text-[0.88rem] font-bold text-ink">
                    {row.value.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line/80 bg-parchment/40 px-4 py-3 sm:px-5">
            <p className="text-[0.74rem] text-ink-muted">
              Weights are locked before Round 1 begins and visible to all participants.
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <PanelHead
              title="Score history"
              meta="GridGossip · averaged across judges"
              action={<Chip tone="neutral">3 rounds</Chip>}
            />
            <div className="flex h-36 items-end gap-3 px-4 pb-4 pt-3 sm:px-5">
              {SCORE_HISTORY.map((s, i) => (
                <Bar
                  key={s.round}
                  value={s.value}
                  max={10}
                  delay={i * 110}
                  tone={i === SCORE_HISTORY.length - 1 ? "#1f4ed8" : "#9db4ee"}
                  label={s.round}
                />
              ))}
            </div>
            <p className="border-t border-line/80 px-4 py-2.5 text-[0.74rem] text-ink-muted sm:px-5">
              Every score keeps its judge, timestamp, and rubric breakdown.
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Judge progress
              </p>
              <p className="tabular text-[0.82rem] font-semibold text-ink">12 / 18 projects</p>
            </div>
            <ProgressBar value={67} label="Judging progress" tone="coral" className="mt-2.5" />
            <ul className="mt-3.5 space-y-2.5">
              {[
                { name: "Kenji Sato", role: "Lead judge", done: true },
                { name: "Amara Bello", role: "Industry mentor", done: true },
                { name: "Ravi Menon", role: "Faculty", done: false },
              ].map((j) => (
                <li key={j.name} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-[0.84rem] font-medium text-ink">
                    {j.name}
                    <span className="ml-2 text-[0.74rem] font-normal text-ink-muted">{j.role}</span>
                  </span>
                  <Chip tone={j.done ? "sage" : "amber"} className="shrink-0">
                    {j.done ? "Submitted" : "In progress"}
                  </Chip>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6 · Publish results and close the loop                             */
/* ------------------------------------------------------------------ */

export function ResultsPanel() {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  const stats = [
    { label: "Participants checked in", value: "1,142" },
    { label: "Teams submitted", value: "148 / 167" },
    { label: "Judging rounds", value: "3" },
  ];

  const handleAction = (msg: string) => {
    setActiveMessage(msg);
    setTimeout(() => setActiveMessage(null), 3200);
  };

  return (
    <Card className="overflow-hidden w-full border border-line/90 bg-white shadow-soft">
      {/* 3 Full-width Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line/70">
        {stats.map((s) => (
          <div key={s.label} className="p-6 sm:p-8">
            <p className="text-[0.76rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
              {s.label}
            </p>
            <p className="tabular mt-3 font-display text-[2.25rem] sm:text-[2.85rem] font-semibold leading-none text-ink whitespace-nowrap">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* 3 Simple Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-line/80 bg-parchment/40 px-6 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleAction("Results portal opened")}
            className="w-full sm:w-auto"
          >
            View results
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => handleAction("Report download initiated")}
            className="w-full sm:w-auto"
          >
            Download report
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => handleAction("Attendance records exported")}
            className="w-full sm:w-auto"
          >
            Attendance records
          </Button>
        </div>

        {activeMessage && (
          <p className="text-[0.84rem] font-medium text-sage flex items-center gap-1.5 transition-all">
            <CheckIcon className="h-4 w-4" />
            {activeMessage}
          </p>
        )}
      </div>
    </Card>
  );
}
