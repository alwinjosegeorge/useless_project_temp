import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, PillButton, SectionHead } from "@/components/meemee/bits";
import { getLeaderboard, getRecentRaceMatches, LeaderboardEntry } from "@/lib/neon";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "World's Best Fish — Leaderboard | MEEMEE" },
      {
        name: "description",
        content:
          "The global MEEMEE ranking of the world's best fish, powered by Neon Serverless PostgreSQL.",
      },
      { property: "og:title", content: "World's Best Fish — MEEMEE Leaderboard" },
      { property: "og:description", content: "Five fish. One ranking. Zero oversight." },
    ],
  }),
  component: Leaderboard,
});

const defaultRows = [
  { pos: "01", name: "Meemee", score: "14.20s", note: "Suspiciously consistent · Gold Medal", medal: "gold" },
  { pos: "02", name: "Fin Diesel", score: "15.80s", note: "Family first · Silver Medal", medal: "silver" },
  { pos: "03", name: "Bubble McFast", score: "17.40s", note: "Loud swimmer · Bronze Medal", medal: "bronze" },
  { pos: "04", name: "Nemo-ish", score: "18.10s", note: "Legally distinct swimmer", medal: "participant" },
  { pos: "05", name: "Gill Clinton", score: "19.50s", note: "Very diplomatic turns", medal: "participant" },
];

const categories = [
  { title: "Fastest Fish", holder: "Bubbles", note: "Unclear where he's going" },
  { title: "Best Direction", holder: "Meemee", note: "Turns left with conviction" },
  { title: "Best Obstacle Avoidance", holder: "Nemo-ish", note: "Avoids everything, including us" },
  { title: "Most Dramatic Swim", holder: "Fin Diesel", note: "Nine takes, one lap" },
];

function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiveNeon, setIsLiveNeon] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [board, matches] = await Promise.all([
        getLeaderboard(10),
        getRecentRaceMatches(5),
      ]);
      if (board && board.length > 0) {
        setEntries(board);
        setIsLiveNeon(true);
      }
      if (matches && matches.length > 0) {
        setRecentMatches(matches);
      }
    } catch (e) {
      console.warn("Could not fetch Neon leaderboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const displayList =
    entries.length > 0
      ? entries.map((entry, idx) => ({
          pos: String(idx + 1).padStart(2, "0"),
          name: entry.fish_name,
          score: `${entry.record_time}s`,
          note: `${entry.event_name} · ${entry.medal ? `${entry.medal.toUpperCase()} Medal` : "Finisher"}`,
          medal: entry.medal,
        }))
      : defaultRows;

  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Global standings · Season 01</Eyebrow>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isLiveNeon ? "Neon PostgreSQL Connected" : "Neon Cloud Standby"}
          </span>
          <button
            type="button"
            onClick={fetchRecords}
            className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh Leaderboard from Neon"
          >
            🔄 {loading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      <h1 className="display-xl mt-4 text-[clamp(2.5rem,9vw,5rem)]">World's best fish</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Real-time lap times recorded from physical fish bowl training and 2-laptop multiplayer races.
      </p>

      <div className="mt-8 space-y-3">
        {displayList.map((r, i) => (
          <div
            key={r.pos}
            className={`lift-hover animate-enter-up grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border px-5 py-4 sm:px-7 sm:py-5 ${
              i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="font-display text-lg tabular-nums opacity-70 sm:text-2xl">{r.pos}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-display text-xl uppercase sm:text-2xl">{r.name}</p>
                {i === 0 && <span className="text-base">👑</span>}
                {i === 1 && <span className="text-base">🥈</span>}
                {i === 2 && <span className="text-base">🥉</span>}
              </div>
              <p className={`truncate text-xs ${i === 0 ? "opacity-75" : "text-muted-foreground"}`}>
                {r.note}
              </p>
            </div>
            <span className="font-display text-2xl tabular-nums sm:text-3xl">{r.score}</span>
          </div>
        ))}
      </div>

      {recentMatches.length > 0 && (
        <div className="mt-14 space-y-4">
          <SectionHead
            eyebrow="Multiplayer Match Log"
            title="Recent 2-Laptop Olympic Races"
            note="Live head-to-head match history saved in Neon PostgreSQL."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="paper-card p-4 border border-border bg-card flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-[0.65rem] text-primary font-bold uppercase">
                    {m.room_code}
                  </span>
                  <p className="font-display text-sm font-bold text-foreground mt-1">
                    {m.player1_name} vs {m.player2_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Winner: <span className="font-bold text-emerald-500">{m.winner_name}</span>
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[0.7rem] text-muted-foreground">
                  <span>⏱️ {m.duration_seconds}s</span>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
