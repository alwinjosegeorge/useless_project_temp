import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, PillButton, SectionHead } from "@/components/meemee/bits";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "World's Best Fish — Leaderboard | MEEMEE" },
      {
        name: "description",
        content:
          "The global MEEMEE ranking of the world's best fish, ordered by a scoring system we invented ourselves.",
      },
      { property: "og:title", content: "World's Best Fish — MEEMEE Leaderboard" },
      { property: "og:description", content: "Five fish. One ranking. Zero oversight." },
    ],
  }),
  component: Leaderboard,
});

const rows = [
  { pos: "01", name: "Meemee", score: 97, note: "Suspiciously consistent" },
  { pos: "02", name: "Bubbles", score: 91, note: "Loud swimmer" },
  { pos: "03", name: "Nemo-ish", score: 87, note: "Legally distinct" },
  { pos: "04", name: "Fin Diesel", score: 84, note: "Family first" },
  { pos: "05", name: "Gill Clinton", score: 79, note: "Very diplomatic" },
];

const categories = [
  { title: "Fastest Fish", holder: "Bubbles", note: "Unclear where he's going" },
  { title: "Best Direction", holder: "Meemee", note: "Turns left with conviction" },
  { title: "Best Obstacle Avoidance", holder: "Nemo-ish", note: "Avoids everything, including us" },
  { title: "Most Dramatic Swim", holder: "Fin Diesel", note: "Nine takes, one lap" },
];

function Leaderboard() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
      <Eyebrow>Global standings · Season 01</Eyebrow>
      <h1 className="display-xl mt-4 text-[clamp(2.5rem,9vw,5rem)]">World's best fish</h1>

      <div className="mt-10 space-y-3">
        {rows.map((r, i) => (
          <div
            key={r.pos}
            className={`lift-hover animate-enter-up grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border px-5 py-4 sm:px-7 sm:py-5 ${
              i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="font-display text-lg tabular-nums opacity-70 sm:text-2xl">{r.pos}</span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl uppercase sm:text-2xl">{r.name}</p>
              <p className={`truncate text-xs ${i === 0 ? "opacity-75" : "text-muted-foreground"}`}>
                {r.note}
              </p>
            </div>
            <span className="font-display text-2xl tabular-nums sm:text-3xl">{r.score}</span>
          </div>
        ))}
      </div>

      <div className="mt-20">
        <SectionHead
          eyebrow="Special honours"
          title="Categories nobody requested"
          note="Awarded annually, retroactively, and arbitrarily."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {categories.map((c, i) => (
            <div
              key={c.title}
              className="paper-card lift-hover animate-enter-up p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Eyebrow>{c.title}</Eyebrow>
              <p className="display-xl mt-3 text-2xl">{c.holder}</p>
              <p className="hand mt-2 text-primary">{c.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <PillButton to="/train">Climb The Ranking</PillButton>
        <PillButton to="/certificate" variant="outline">
          Get Certificate
        </PillButton>
      </div>
    </section>
  );
}
