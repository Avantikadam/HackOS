import type { ReactNode } from "react";
import { useInView } from "../hooks/useMotion";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
/* Scroll reveal wrapper                                              */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  className,
  delay = 0,
  variant = "up",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "x" | "scale";
  as?: "div" | "li" | "section" | "header" | "figure";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const variantClass =
    variant === "x" ? "reveal-x" : variant === "scale" ? "reveal-scale" : "reveal";

  return (
    <Tag
      ref={ref as never}
      className={cn(variantClass, className)}
      data-visible={inView ? "true" : "false"}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "quiet" | "coral";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 ease-out select-none disabled:opacity-55 disabled:cursor-not-allowed";

const buttonSizes = {
  md: "min-h-[44px] h-11 px-5 text-[0.94rem]",
  lg: "min-h-[48px] h-[3.25rem] px-7 text-[1rem]",
  sm: "min-h-[40px] h-9 px-4 text-[0.84rem]",
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-cobalt text-white shadow-[0_10px_22px_-14px_rgba(31,78,216,0.9)] hover:bg-cobalt-deep hover:shadow-[0_14px_26px_-14px_rgba(31,78,216,0.95)] active:translate-y-px active:shadow-none",
  secondary:
    "bg-white text-ink border border-line hover:border-ink/35 hover:bg-parchment active:translate-y-px",
  quiet: "text-ink-soft hover:text-cobalt hover:bg-cobalt-tint/60",
  coral:
    "bg-coral text-white shadow-[0_10px_22px_-14px_rgba(226,96,63,0.9)] hover:brightness-95 active:translate-y-px",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
      {...rest}
    >
      {children}
    </a>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces & chips                                                   */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article" | "form";
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-line/90 bg-white shadow-soft",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type Tone = "neutral" | "cobalt" | "sage" | "coral" | "amber";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-parchment text-ink-soft border-line",
  cobalt: "bg-cobalt-tint text-cobalt-deep border-cobalt/20",
  sage: "bg-sage-tint text-sage border-sage/20",
  coral: "bg-coral-tint text-coral border-coral/20",
  amber: "bg-amber-tint text-[#8a5a10] border-amber/25",
};

export function Chip({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.01em]",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cobalt",
        className,
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-coral" />
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Status row (used across the workflow story)                        */
/* ------------------------------------------------------------------ */

export function StatusRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: "verified" | "pending" | "review";
  detail: string;
}) {
  const map = {
    verified: {
      tone: "sage" as Tone,
      text: "Verified",
      icon: <CheckIcon className="h-3.5 w-3.5" />,
    },
    review: {
      tone: "cobalt" as Tone,
      text: "In review",
      icon: <ClockIcon className="h-3.5 w-3.5" />,
    },
    pending: {
      tone: "amber" as Tone,
      text: "Pending",
      icon: <DotIcon className="h-3.5 w-3.5" />,
    },
  }[state];

  return (
    <div className="flex items-start sm:items-center justify-between gap-3 border-b border-line/70 px-4 py-3.5 last:border-b-0 transition-colors hover:bg-parchment/30">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full border mt-0.5 sm:mt-0",
            toneClasses[map.tone],
          )}
        >
          {map.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.88rem] font-semibold text-ink leading-snug">{label}</p>
          <p className="text-[0.78rem] text-ink-muted leading-relaxed mt-0.5">{detail}</p>
        </div>
      </div>
      <Chip tone={map.tone} className="shrink-0 mt-0.5 sm:mt-0">
        {map.text}
      </Chip>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  label,
  tone = "cobalt",
  className,
  animate = true,
}: {
  value: number;
  label: string;
  tone?: "cobalt" | "sage" | "coral";
  className?: string;
  animate?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  const width = inView || !animate ? value : 0;

  return (
    <div ref={ref} className={className}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-linen"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "fill-grow h-full rounded-full",
            tone === "cobalt" && "bg-cobalt",
            tone === "sage" && "bg-sage",
            tone === "coral" && "bg-coral",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                              */
/* ------------------------------------------------------------------ */

const iconBase = "shrink-0";

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconBase, className)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m4.5 10.5 3.4 3.4 7.6-7.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconBase, className)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 6.4V10l2.6 1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function DotIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconBase, className)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={cn(iconBase, className)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 10h12m-4.5-4.5L15.5 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={cn(iconBase, className)} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="8.5" width="12" height="8" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7.2 8.5V6.8a2.8 2.8 0 0 1 5.6 0v1.7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
