import { useEffect, useState } from "react";
import { useActiveSection, useScrollY } from "../hooks/useMotion";
import { cn } from "../utils/cn";
import { ButtonLink } from "./ui";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "For organizers", href: "#organizers" },
  { label: "For venues", href: "#venues" },
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-ivory shadow-soft"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M8 6.5 5.5 12l2.5 5.5M16 6.5 18.5 12 16 17.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="1.9" fill="#e2603f" />
        </svg>
      </span>
      <span className="font-display text-[1.32rem] font-semibold tracking-[-0.02em] text-ink">
        HACKOS
      </span>
    </span>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const scrollY = useScrollY();
  const active = useActiveSection(["product", "how-it-works", "organizers", "venues"]);
  const condensed = scrollY > 16;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300 ease-out",
        condensed
          ? "border-line/90 bg-ivory/95 shadow-[0_8px_24px_-22px_rgba(19,28,49,0.55)] backdrop-blur-sm"
          : "border-transparent bg-ivory",
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-[4.5rem] w-full max-w-[88rem] items-center justify-between gap-6 px-5 sm:px-8"
      >
        <a href="#top" className="rounded-xl" aria-label="HACKOS — back to top">
          <Wordmark />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-[0.92rem] font-medium transition-colors duration-200",
                    isActive ? "text-cobalt" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3.5 -bottom-0.5 h-[2px] rounded-full bg-coral transition-transform duration-300 ease-out",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-2.5 lg:flex">
          <ButtonLink href="/login" variant="quiet" size="md">
            Log In
          </ButtonLink>
          <ButtonLink href="/signup" variant="primary" size="md">
            Sign Up
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ButtonLink href="/signup" variant="primary" size="sm" className="h-9 px-3.5 text-[0.84rem]">
            Sign Up
          </ButtonLink>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[0.84rem] font-semibold text-ink transition-colors hover:border-ink/30"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              )}
            </svg>
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-line bg-ivory px-5 pb-6 pt-4 sm:px-8 lg:hidden"
      >
        <ul className="flex flex-col gap-1">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-[1rem] font-medium text-ink transition-colors hover:bg-parchment"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-2.5">
          <ButtonLink href="/signup" variant="primary" size="lg" onClick={() => setOpen(false)}>
            Sign Up
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="lg" onClick={() => setOpen(false)}>
            Log In
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
