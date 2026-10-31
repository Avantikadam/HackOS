import { useState } from "react";
import { Button, Card, Chip, Reveal } from "./ui";
import { ArrowRight, CheckIcon } from "./ui";
import { CAST } from "./characters/Character";
import { CharacterSpot } from "./characters/CharacterSpot";

const SIZES = ["Under 200", "200 – 800", "800 – 2,000", "Over 2,000"];

export function CTA() {
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [size, setSize] = useState(SIZES[1]);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid work email so we can reply.");
      return;
    }
    if (org.trim().length < 2) {
      setError("Tell us the organization running the event.");
      return;
    }
    setError("");
    setStatus("sending");
    window.setTimeout(() => setStatus("done"), 900);
  };

  return (
    <section id="plan" className="scroll-mt-24 pb-20 pt-4 lg:pb-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-parchment px-5 py-12 shadow-card sm:px-10 lg:px-14 lg:py-16">
            <div aria-hidden="true" className="rule-dot pointer-events-none absolute inset-0 opacity-60" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cobalt-tint/70"
            />

            <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
              <div>
                <Chip tone="coral">Plan a hackathon</Chip>
                <h2 className="mt-5 font-display text-[2.15rem] font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[2.9rem]">
                  One platform. Every hackathon. Zero operational chaos.
                </h2>
                <p className="mt-5 max-w-[32rem] text-[1.05rem] leading-[1.65] text-ink-soft">
                  Tell us the dates, the venue and the size of your event. We will set up the
                  workspace and walk your team through the first run.
                </p>

                <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[0.86rem] text-ink-soft">
                  {[
                    "Free workspace for your first event",
                    "No card required to explore",
                    "Onboarding call for campus teams",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckIcon className="h-4 w-4 text-sage" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-9 hidden lg:block">
                  <CharacterSpot
                    config={CAST.theo}
                    message="Bring your team — we will handle the rest of the weekend."
                    height="h-40"
                    gesture="wave"
                    align="left"
                    className="items-start"
                  />
                </div>
              </div>

              <Card className="p-5 sm:p-7">
                {status === "done" ? (
                  <div>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-sage-tint text-sage">
                      <CheckIcon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-display text-[1.4rem] font-semibold text-ink">
                      Request noted
                    </h3>
                    <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">
                      Thanks{org ? `, ${org.trim()}` : ""}. This page is a design demo, so nothing
                      was sent — but this is the point where a HACKOS organizer would reply within
                      one working day.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setStatus("idle");
                          setEmail("");
                          setOrg("");
                        }}
                      >
                        Edit the request
                      </Button>
                      <Button variant="quiet" onClick={() => setStatus("idle")}>
                        Back to the form
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate>
                    <h3 className="font-display text-[1.35rem] font-semibold text-ink">
                      Request access
                    </h3>
                    <p className="mt-1.5 text-[0.82rem] text-ink-muted">
                      Demo form — it validates and simulates a reply, but sends nothing.
                    </p>

                    <div className="mt-6 space-y-4">
                      <div>
                        <label
                          htmlFor="cta-email"
                          className="block text-[0.78rem] font-semibold text-ink"
                        >
                          Work email
                        </label>
                        <input
                          id="cta-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@university.edu"
                          autoComplete="email"
                          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-ivory px-3.5 text-[0.92rem] text-ink placeholder:text-ink-muted/70 focus:border-cobalt focus:bg-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="cta-org"
                          className="block text-[0.78rem] font-semibold text-ink"
                        >
                          Organization
                        </label>
                        <input
                          id="cta-org"
                          type="text"
                          value={org}
                          onChange={(e) => setOrg(e.target.value)}
                          placeholder="Northside Institute of Technology"
                          autoComplete="organization"
                          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-ivory px-3.5 text-[0.92rem] text-ink placeholder:text-ink-muted/70 focus:border-cobalt focus:bg-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="cta-size"
                          className="block text-[0.78rem] font-semibold text-ink"
                        >
                          Expected participants
                        </label>
                        <select
                          id="cta-size"
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          className="mt-1.5 h-11 w-full appearance-none rounded-xl border border-line bg-ivory px-3.5 text-[0.92rem] text-ink focus:border-cobalt focus:bg-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
                        >
                          {SIZES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {error && (
                      <p role="alert" className="mt-4 text-[0.82rem] font-medium text-coral">
                        {error}
                      </p>
                    )}

                    <Button type="submit" size="lg" className="mt-6 w-full" disabled={status === "sending"}>
                      {status === "sending" ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                          />
                          Sending…
                        </>
                      ) : (
                        <>
                          Plan a hackathon
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <p className="mt-3 text-center text-[0.74rem] text-ink-muted">
                      Or explore first —{" "}
                      <a href="#how-it-works" className="font-semibold text-cobalt underline">
                        see how it works
                      </a>
                      .
                    </p>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
