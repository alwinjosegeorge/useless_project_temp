import { createFileRoute } from "@tanstack/react-router";
import { Bubbles, Eyebrow, PillButton, StatBar } from "@/components/meemee/bits";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Swimming Report — 87 / 100 | MEEMEE" },
      {
        name: "description",
        content:
          "Meemee's full swimming report: skill, speed, direction, obstacle avoidance and unshakeable fish confidence.",
      },
      { property: "og:title", content: "Swimming Report — 87 / 100" },
      { property: "og:description", content: "Technically unnecessary. Surprisingly impressive." },
    ],
  }),
  component: Result,
});

const bars = [
  { label: "Swimming Skill", value: 82 },
  { label: "Speed", value: 74 },
  { label: "Direction", value: 91 },
  { label: "Obstacle Avoidance", value: 63 },
  { label: "Fish Confidence", value: 100 },
];

function Result() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
      <Eyebrow>Session complete · Level 01</Eyebrow>
      <h1 className="display-xl mt-4 text-[clamp(2.5rem,9vw,5rem)]">Swimming Report</h1>

      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-primary p-8 text-primary-foreground">
          <Bubbles className="text-primary-foreground/45" count={10} />
          <div className="relative">
            <Eyebrow>
              <span className="text-primary-foreground/70">Final score</span>
            </Eyebrow>
            <p className="display-xl mt-4 text-[clamp(4rem,18vw,7rem)]">87</p>
            <p className="font-display text-lg opacity-70">out of 100</p>
            <div className="mt-8 inline-flex rounded-full bg-primary-foreground px-5 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
              Rank · Professional Fish
            </div>
            <p className="hand mt-6 text-primary-foreground">
              Technically unnecessary. Surprisingly impressive.
            </p>
          </div>
        </div>

        <div className="paper-card p-6 sm:p-8">
          <Eyebrow>Performance breakdown</Eyebrow>
          <div className="mt-6 space-y-5">
            {bars.map((b, i) => (
              <StatBar key={b.label} label={b.label} value={b.value} delay={i * 130} />
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Evaluated by Coach Fin using criteria nobody has verified.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <PillButton to="/train">Train Again</PillButton>
        <PillButton to="/leaderboard" variant="outline">
          View Leaderboard
        </PillButton>
        <PillButton to="/certificate" variant="ghost">
          Get Certificate
        </PillButton>
      </div>
    </section>
  );
}
