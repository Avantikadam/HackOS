import { useCallback, useEffect, useRef, useState } from "react";
import { Character, type CharacterConfig, type Look } from "./Character";
import { useInView, usePrefersReducedMotion } from "../../hooks/useMotion";
import { cn } from "../../utils/cn";

/**
 * A character placed on a small stage. Characters only react to the pointer
 * while it is over their own stage, and the movement range is deliberately
 * small so nothing feels twitchy or distracting.
 */
export function CharacterSpot({
  config,
  message,
  className,
  height = "h-56",
  pointerTrack = false,
  gesture = "wave",
  bubbleSide = "top",
  align = "center",
}: {
  config: CharacterConfig;
  message: string;
  className?: string;
  height?: string;
  pointerTrack?: boolean;
  gesture?: "wave" | "nod";
  bubbleSide?: "top" | "bottom" | "left";
  align?: "center" | "left" | "right";
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [look, setLook] = useState<Look>({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  const { ref: viewRef, inView } = useInView<HTMLDivElement>({ threshold: 0.55 });
  const [gestured, setGestured] = useState(false);

  const onMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerTrack || reduced) return;
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      // clamp: characters never stare at the far corners of the page
      setLook({
        x: Math.max(-1, Math.min(1, nx * 2.1)),
        y: Math.max(-1, Math.min(1, ny * 2.1)),
      });
    },
    [pointerTrack, reduced],
  );

  const reset = useCallback(() => setLook({ x: 0, y: 0 }), []);

  useEffect(() => {
    if (!inView || gestured || reduced) return;
    // one-shot gesture shortly after the section appears
    const t = window.setTimeout(() => setGestured(true), 1700);
    return () => window.clearTimeout(t);
  }, [inView, gestured, reduced]);

  const activeGesture = inView && !gestured && !reduced ? gesture : "none";

  const bubblePos =
    bubbleSide === "bottom"
      ? "top-full left-1/2 mt-2 -translate-x-1/2"
      : bubbleSide === "left"
        ? "right-full top-1/2 mr-2 -translate-y-1/2"
        : "bottom-full left-1/2 mb-2 -translate-x-1/2";

  const alignClass =
    align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center";

  return (
    <div className={cn("relative flex flex-col", alignClass, className)}>
      <div
        ref={(node) => {
          stageRef.current = node;
          viewRef.current = node;
        }}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ aspectRatio: "220 / 300" }}
        className={cn("relative mx-auto w-full", height)}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setOpen(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setOpen(false);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          aria-expanded={open}
          className="block h-full w-full cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt"
          aria-label={`${config.name}, ${config.role}. ${open ? "Hide" : "Show"} a short note about ${config.role.toLowerCase()}s.`}
        >
          <Character
            config={config}
            look={look}
            gesture={activeGesture}
            title={`${config.name} — ${config.role} illustration`}
          />
          <span className="sr-only">{message}</span>
        </button>

        {/* speech bubble — pointer-events none so it never blocks the page */}
        <div
          aria-hidden={!open}
          className={cn(
            "pointer-events-none absolute z-30 w-max max-w-[14rem] rounded-2xl border border-line bg-white px-3.5 py-2.5 text-left shadow-lift transition-all duration-200 ease-out",
            bubblePos,
            open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
          )}
        >
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-line bg-white"
          />
          <p className="text-[0.78rem] font-semibold leading-snug text-ink">
            {config.name} · {config.role}
          </p>
          <p className="mt-0.5 text-[0.76rem] leading-snug text-ink-soft">{message}</p>
        </div>
      </div>

      <p className="mt-1 text-center text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {config.name}
      </p>
    </div>
  );
}
