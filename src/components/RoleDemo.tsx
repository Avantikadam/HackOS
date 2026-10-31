import { useRef, useState } from "react";
import { CAST } from "./characters/Character";
import { CharacterSpot } from "./characters/CharacterSpot";
import { Button, Card, Chip, ProgressBar } from "./ui";
import { CheckIcon, ClockIcon, DotIcon } from "./ui";
import { QrCode } from "./story/QrCode";
import { EVENT } from "./story/data";

type RoleId = "organizer" | "venue" | "participant";

const TABS: { id: RoleId; label: string; blurb: string }[] = [
  { id: "organizer", label: "Organizer", blurb: "Event status and approvals" },
  { id: "venue", label: "Venue", blurb: "Quotation and confirmation" },
  { id: "participant", label: "Participant", blurb: "Team, pass and submission" },
];

/* ------------------------------------------------------------------ */
/* Organizer view                                                     */
/* ------------------------------------------------------------------ */

function OrganizerView() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
          <div>
            <p className="text-[0.92rem] font-semibold text-ink">{EVENT.name}</p>
            <p className="text-[0.74rem] text-ink-muted">
              {EVENT.dates} · {EVENT.venue}
            </p>
          </div>
          <Chip tone="sage" icon={<CheckIcon className="h-3.5 w-3.5" />}>
            On track
          </Chip>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-line/70 sm:grid-cols-4">
          {[
            { k: "Registered", v: "1,284" },
            { k: "Teams", v: "167" },
            { k: "Checked in", v: "1,142" },
            { k: "Submissions", v: "148" },
          ].map((s) => (
            <div key={s.k} className="bg-white px-3.5 py-3">
              <dt className="text-[0.66rem] font-bold uppercase tracking-[0.13em] text-ink-muted">
                {s.k}
              </dt>
              <dd className="tabular mt-1 font-display text-[1.25rem] font-semibold leading-none text-ink">
                {s.v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="px-4 py-4">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
            Approvals
          </p>
          <ul className="mt-3 space-y-2.5">
            {[
              { label: "Venue quotation accepted", state: "verified" as const },
              { label: "Representative authorized", state: "verified" as const },
              { label: "Mentor approvals (3 pending)", state: "pending" as const },
              { label: "Judging panel finalized", state: "review" as const },
            ].map((row) => (
              <li key={row.label} className="flex items-center gap-3">
                <span
                  className={
                    row.state === "verified"
                      ? "grid h-6 w-6 place-items-center rounded-full bg-sage-tint text-sage"
                      : row.state === "review"
                        ? "grid h-6 w-6 place-items-center rounded-full bg-cobalt-tint text-cobalt-deep"
                        : "grid h-6 w-6 place-items-center rounded-full bg-amber-tint text-[#8a5a10]"
                  }
                >
                  {row.state === "verified" ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : row.state === "review" ? (
                    <ClockIcon className="h-3.5 w-3.5" />
                  ) : (
                    <DotIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="flex-1 text-[0.85rem] font-medium text-ink">{row.label}</span>
                <Chip
                  tone={
                    row.state === "verified" ? "sage" : row.state === "review" ? "cobalt" : "amber"
                  }
                >
                  {row.state === "verified"
                    ? "Done"
                    : row.state === "review"
                      ? "In review"
                      : "Pending"}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line/80 px-4 py-3">
          <p className="text-[0.9rem] font-semibold text-ink">Next milestones</p>
          <p className="text-[0.74rem] text-ink-muted">Owner shown for each task</p>
        </div>
        <ol className="px-4 py-3">
          {[
            { t: "Close registration", d: "Thu 12 Feb", who: "Ada", tone: "cobalt" as const },
            { t: "Publish judging panel", d: "Fri 14 Feb", who: "Kenji", tone: "sage" as const },
            { t: "Hall walk-through", d: "Fri 14 Feb · 15:00", who: "Noor", tone: "amber" as const },
            { t: "Results review", d: "Sun 16 Feb", who: "Ada", tone: "coral" as const },
          ].map((m) => (
            <li key={m.t} className="flex items-center gap-3 border-b border-line/60 py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block text-[0.85rem] font-medium text-ink">{m.t}</span>
                <span className="tabular block text-[0.73rem] text-ink-muted">{m.d}</span>
              </span>
              <Chip tone={m.tone}>{m.who}</Chip>
            </li>
          ))}
        </ol>
        <div className="border-t border-line/80 px-4 py-4">
          <div className="flex items-center justify-between text-[0.78rem]">
            <span className="font-medium text-ink-soft">Registration fill</span>
            <span className="tabular font-semibold text-ink">82%</span>
          </div>
          <ProgressBar value={82} label="Registration fill rate" className="mt-2" />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Venue view                                                         */
/* ------------------------------------------------------------------ */

const QUOTE = [
  { item: "Hall B rental · 3 days", qty: "3 × $1,400", amount: "$4,200" },
  { item: "AV & projection package", qty: "1", amount: "$600" },
  { item: "Power backup line", qty: "1", amount: "$350" },
  { item: "F&B counters", qty: "3", amount: "$900" },
];

function VenueView() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
          <div>
            <p className="text-[0.92rem] font-semibold text-ink">Quotation Q-2291</p>
            <p className="text-[0.74rem] text-ink-muted">
              {EVENT.venue} · issued 02 Feb 2026
            </p>
          </div>
          <Chip tone="sage" icon={<CheckIcon className="h-3.5 w-3.5" />}>
            Accepted
          </Chip>
        </div>

        <table className="w-full text-left">
          <caption className="sr-only">Venue quotation line items</caption>
          <thead>
            <tr className="border-b border-line/80">
              <th scope="col" className="px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-ink-muted">
                Item
              </th>
              <th scope="col" className="px-4 py-2 text-right text-[0.68rem] font-bold uppercase tracking-[0.13em] text-ink-muted">
                Qty
              </th>
              <th scope="col" className="px-4 py-2 text-right text-[0.68rem] font-bold uppercase tracking-[0.13em] text-ink-muted">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {QUOTE.map((row) => (
              <tr key={row.item} className="border-b border-line/60">
                <td className="px-4 py-2.5 text-[0.85rem] text-ink">{row.item}</td>
                <td className="tabular px-4 py-2.5 text-right text-[0.8rem] text-ink-muted">
                  {row.qty}
                </td>
                <td className="tabular px-4 py-2.5 text-right text-[0.85rem] font-semibold text-ink">
                  {row.amount}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-parchment/60">
              <td className="px-4 py-3 text-[0.85rem] font-bold text-ink" colSpan={2}>
                Total
              </td>
              <td className="tabular px-4 py-3 text-right font-display text-[1.1rem] font-semibold text-ink">
                $6,050
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/80 px-4 py-3">
          <p className="text-[0.76rem] text-ink-muted">Deposit paid $1,210 · balance on event day</p>
          <Button variant="secondary" size="sm">
            Download PDF
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="overflow-hidden">
          <div className="border-b border-line/80 px-4 py-3">
            <p className="text-[0.9rem] font-semibold text-ink">Confirmation</p>
            <p className="text-[0.74rem] text-ink-muted">Hall B · 14–16 Feb 2026</p>
          </div>
          <ul className="divide-y divide-line/70">
            {[
              { k: "Status", v: "Confirmed" },
              { k: "Capacity held", v: "1,200 seats" },
              { k: "Load-in", v: "Fri 14 Feb · 07:00" },
              { k: "Organizer contact", v: "Ada · events@northside.edu" },
            ].map((r) => (
              <li key={r.k} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-[0.78rem] text-ink-muted">{r.k}</span>
                <span className="text-[0.82rem] font-semibold text-ink">{r.v}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
            Availability held
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { d: "Fri 14", s: "Full day" },
              { d: "Sat 15", s: "Full day" },
              { d: "Sun 16", s: "Half day" },
            ].map((slot) => (
              <div
                key={slot.d}
                className="rounded-xl border border-sage/25 bg-sage-tint/60 px-2.5 py-2.5 text-center"
              >
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-sage">
                  {slot.d}
                </p>
                <p className="mt-0.5 text-[0.72rem] font-medium text-ink-soft">{slot.s}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.73rem] text-ink-muted">
            Hall A stays free for other bookings on Sunday.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Participant view                                                   */
/* ------------------------------------------------------------------ */

function ParticipantView() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="overflow-hidden">
        <div className="border-b border-line/80 px-4 py-3">
          <p className="text-[0.9rem] font-semibold text-ink">My pass</p>
          <p className="text-[0.74rem] text-ink-muted">Pass 0442 · Isha Raman</p>
        </div>
        <div className="flex flex-col items-center gap-4 px-4 py-5 sm:flex-row">
          <div className="shrink-0 rounded-xl border border-line bg-white p-2.5">
            <QrCode value="HACKOS-PASS-0442-ISHA" size={112} label="Participant scan code preview" />
          </div>
          <div className="min-w-0 flex-1">
            <Chip tone="sage" icon={<CheckIcon className="h-3.5 w-3.5" />}>
              Checked in · 09:42
            </Chip>
            <p className="mt-2.5 text-[0.8rem] text-ink-soft">
              Show this at the Hall B door. It works even if the venue network is down.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
            <div>
              <p className="text-[0.92rem] font-semibold text-ink">Paper Boats</p>
              <p className="text-[0.74rem] text-ink-muted">Health Access · PS-11 claimed</p>
            </div>
            <Chip tone="amber">2 / 4 members</Chip>
          </div>
          <ul className="divide-y divide-line/70">
            {[
              { n: "Isha Raman", r: "Team lead", s: "Checked in" },
              { n: "Devansh Rao", r: "Member", s: "Checked in" },
              { n: "Open slot", r: "Looking for: data / design", s: "Invite sent" },
            ].map((m) => (
              <li key={m.n} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 text-[0.85rem] font-medium text-ink">
                  {m.n}
                  <span className="ml-2 text-[0.73rem] font-normal text-ink-muted">{m.r}</span>
                </span>
                <Chip tone={m.s === "Checked in" ? "sage" : "cobalt"}>{m.s}</Chip>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-4 py-3">
            <div>
              <p className="text-[0.9rem] font-semibold text-ink">Submission</p>
              <p className="text-[0.74rem] text-ink-muted">QuietQare · closes Sun 13:00</p>
            </div>
            <Chip tone="coral" icon={<ClockIcon className="h-3.5 w-3.5" />}>
              Draft
            </Chip>
          </div>
          <ul className="divide-y divide-line/70">
            {[
              { k: "Repository", v: "Linked" },
              { k: "Demo video", v: "Missing" },
              { k: "Slide deck", v: "Linked" },
              { k: "Track", v: "Health Access" },
            ].map((r) => (
              <li key={r.k} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-[0.78rem] text-ink-muted">{r.k}</span>
                <span
                  className={
                    r.v === "Missing"
                      ? "text-[0.82rem] font-semibold text-coral"
                      : "text-[0.82rem] font-semibold text-ink"
                  }
                >
                  {r.v}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line/80 bg-parchment/50 px-4 py-3">
            <Button size="sm">Continue submission</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo shell                                                         */
/* ------------------------------------------------------------------ */

const VIEWS: Record<RoleId, { node: React.ReactNode; character: "ada" | "noor" | "isha" }> = {
  organizer: { node: <OrganizerView />, character: "ada" },
  venue: { node: <VenueView />, character: "noor" },
  participant: { node: <ParticipantView />, character: "isha" },
};

export function RoleDemo() {
  const [role, setRole] = useState<RoleId>("organizer");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const order = TABS.map((t) => t.id);
    const i = order.indexOf(role);
    let next = -1;
    if (event.key === "ArrowRight") next = (i + 1) % order.length;
    if (event.key === "ArrowLeft") next = (i - 1 + order.length) % order.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = order.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const id = order[next];
    setRole(id);
    tabRefs.current[id]?.focus();
  };

  const active = VIEWS[role];

  return (
    <section id="product" className="scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-14">
          <div>
            <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-cobalt">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral" />
              Product preview
            </p>
            <h2 className="mt-5 font-display text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.028em] text-ink sm:text-[2.6rem]">
              See the workspace from each seat.
            </h2>
            <p className="mt-5 max-w-[34rem] text-[1.02rem] leading-[1.65] text-ink-soft">
              Organizers, venue providers and participants each get a view built for the job in
              front of them — all reading the same event.
            </p>
          </div>

          <div className="flex justify-start lg:justify-end">
            <CharacterSpot
              key={role}
              config={CAST[active.character]}
              message={
                role === "organizer"
                  ? "I approve, publish, and export from one screen."
                  : role === "venue"
                    ? "Quotations and confirmations stay in one thread."
                    : "My team, my pass, my submission — all here."
              }
              height="h-40 sm:h-44"
              gesture="wave"
              align="right"
              className="items-end"
            />
          </div>
        </div>

        <div className="mt-10 rounded-[1.75rem] border border-line/90 bg-parchment/70 p-3 shadow-card sm:p-5">
          <div
            role="tablist"
            aria-label="Choose a role to preview"
            onKeyDown={onKeyDown}
            className="flex flex-wrap gap-1.5 rounded-full border border-line/80 bg-white p-1.5 sm:inline-flex"
          >
            {TABS.map((tab) => {
              const selected = tab.id === role;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[tab.id] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setRole(tab.id)}
                  className={`flex-1 whitespace-nowrap rounded-full px-4 py-2.5 text-[0.88rem] font-semibold transition-all duration-200 ease-out sm:flex-none ${
                    selected
                      ? "bg-cobalt text-white shadow-[0_8px_18px_-12px_rgba(31,78,216,0.9)]"
                      : "text-ink-soft hover:bg-parchment hover:text-ink"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 hidden text-[0.76rem] font-normal sm:inline ${
                      selected ? "text-white/75" : "text-ink-muted"
                    }`}
                  >
                    {tab.blurb}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`panel-${role}`}
            aria-labelledby={`tab-${role}`}
            tabIndex={0}
            className="mt-3 rounded-2xl bg-ivory p-3 sm:mt-5 sm:p-5"
          >
            {active.node}
            <p className="mt-4 flex items-center gap-2 text-[0.74rem] text-ink-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
              Product preview — sample data. Not connected to a live system.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
