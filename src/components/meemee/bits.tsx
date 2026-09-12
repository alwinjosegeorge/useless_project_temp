import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import coachFin from "@/assets/coach-fin.png";

export function Bubbles({ count = 12, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => {
        const size = 6 + ((i * 7) % 22);
        return (
          <span
            key={i}
            className="animate-rise absolute rounded-full border border-current opacity-40"
            style={{
              width: size,
              height: size,
              left: `${(i * 8.5 + 4) % 96}%`,
              bottom: `-${size}px`,
              animationDelay: `${(i % 7) * 0.9}s`,
              animationDuration: `${6 + (i % 5)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function PillButton({
  children,
  to,
  variant = "primary",
}: {
  children: ReactNode;
  to?: "/" | "/train" | "/leaderboard" | "/certificate" | "/profile" | "/result" | "/olympics" | "/iq-test";
  variant?: "primary" | "outline" | "ghost";
}) {
  const base =
    "press inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-colors";
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-foreground/25 text-foreground hover:border-primary hover:text-primary",
    ghost: "border border-border bg-card text-foreground hover:bg-accent",
  }[variant];

  if (to) {
    return (
      <Link to={to} className={`${base} ${styles}`}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function StatBar({
  label,
  value,
  delay = 0,
  tone = "primary",
}: {
  label: string;
  value: number;
  delay?: number;
  tone?: "primary" | "ink";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-display text-sm tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`animate-fill-bar h-full rounded-full ${
            tone === "primary" ? "bg-primary" : "bg-foreground"
          }`}
          style={{ width: `${value}%`, animationDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

export function CoachFin({
  message = "Use your fins, Meemee.",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`paper-card p-5 ${className}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <div className="animate-swim grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent">
          <img src={coachFin} alt="Coach Fin" width={816} height={816} loading="lazy" className="h-9 w-9 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow">Coach Fin · AI Instructor</p>
          <p className="truncate text-sm font-semibold">Live coaching session</p>
        </div>
      </div>

      <p className="mt-4 rounded-2xl rounded-tl-sm bg-primary px-4 py-3 text-sm leading-snug text-primary-foreground">
        “{message}”
      </p>

      <div className="mt-3 space-y-2">
        {[
          "Why are you going backwards?",
          "Please avoid the rock.",
          "That was emotionally difficult to watch.",
          "Excellent swimming.",
        ].map((m) => (
          <p
            key={m}
            className="rounded-2xl border border-border bg-background px-4 py-2 text-xs text-muted-foreground"
          >
            {m}
          </p>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        <span className="eyebrow">Coach is thinking</span>
      </div>
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="display-xl mt-3 text-4xl sm:text-5xl">{title}</h2>
      {note ? <p className="mt-3 text-sm text-muted-foreground sm:text-base">{note}</p> : null}
    </div>
  );
}
