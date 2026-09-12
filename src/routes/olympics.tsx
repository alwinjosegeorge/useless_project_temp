import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import meemee from "@/assets/meemee.png";
import { Bubbles, Eyebrow, PillButton, SectionHead } from "@/components/meemee/bits";
import { OlympicGameArena, OlympicEventId } from "@/components/meemee/OlympicGameArena";
import { DualFishArena } from "@/components/meemee/DualFishArena";
import { recordWinToLeaderboard } from "@/lib/neon";

export const Route = createFileRoute("/olympics")({
  head: () => ({
    meta: [
      { title: "Fish Olympics — World Fish Games | MEEMEE" },
      {
        name: "description",
        content:
          "The official MEEMEE Fish Olympics: five prestigious events, high aquatic drama, and zero athletic purpose.",
      },
      { property: "og:title", content: "Fish Olympics — MEEMEE" },
      {
        property: "og:description",
        content: "Five events. Global glory. Nobody asked for this.",
      },
    ],
  }),
  component: Olympics,
});

interface OlympicEvent {
  id: string;
  name: string;
  icon: string;
  tag: string;
  description: string;
  goldHolder: string;
  record: string;
  judgeNote: string;
  funReaction: string;
}

const events: OlympicEvent[] = [
  {
    id: "100m",
    name: "100m Swimming",
    icon: "🏊‍♂️",
    tag: "Speed & Grit",
    description:
      "Straight-line aquatic propulsion with great ambition and virtually no steering ability.",
    goldHolder: "Meemee",
    record: "14.2 sec",
    judgeNote: "Coach Fin called it 'suspiciously competent'.",
    funReaction: "Swam mostly straight. Ended up in lane 4.",
  },
  {
    id: "uturn",
    name: "Fastest U-Turn",
    icon: "🔄",
    tag: "Agility",
    description:
      "Instant 180° panic turn when approaching harmless rocks or friendly snails.",
    goldHolder: "Nemo-ish",
    record: "0.04 sec",
    judgeNote: "Unrivaled reflexes born entirely of unwarranted fear.",
    funReaction: "Turned around so fast he surprised himself.",
  },
  {
    id: "splash",
    name: "Most Dramatic Splash",
    icon: "💦",
    tag: "Artistic Theatrics",
    description:
      "Breaching surface tension with maximum emotional distress and cinematic turbulence.",
    goldHolder: "Fin Diesel",
    record: "9.9 / 10 Splash Score",
    judgeNote: "Ten out of ten human spectators had to wipe their glasses.",
    funReaction: "A performance worthy of an aquatic Oscar.",
  },
  {
    id: "bubbles",
    name: "Best Bubble Formation 🫧",
    icon: "🫧",
    tag: "Aerodynamic Art",
    description:
      "Producing pristine spherical oxygen spheres from the gills with majestic rhythm.",
    goldHolder: "Bubbles",
    record: "42 bubbles / sec",
    judgeNote: "Judges lost count at bubble 28 due to hypnosis.",
    funReaction: "Created a bubble so round it qualified for university.",
  },
  {
    id: "lazy",
    name: "Swimming While Doing Absolutely Nothing",
    icon: "🦥",
    tag: "Supreme Inertia",
    description:
      "Floating passively and letting current currents do 100% of the effort while maintaining sunglasses eye contact.",
    goldHolder: "Meemee",
    record: "6 hrs 40 min",
    judgeNote: "Technically stationary. Medically alive. Champion of inertia.",
    funReaction: "Zero fin movements recorded. Gold medal awarded anyway.",
  },
];

const medalTally = [
  { rank: "1", fish: "Meemee", gold: 2, silver: 1, bronze: 0, status: "Reigning Champion" },
  { rank: "2", fish: "Bubbles", gold: 1, silver: 1, bronze: 1, status: "Excessively energetic" },
  { rank: "3", fish: "Fin Diesel", gold: 1, silver: 0, bronze: 2, status: "Pure drama" },
  { rank: "4", fish: "Nemo-ish", gold: 1, silver: 0, bronze: 0, status: "Already fled the stadium" },
];

function Olympics() {
  const [selectedEvent, setSelectedEvent] = useState<OlympicEvent>(events[0]!);
  const [activeGameId, setActiveGameId] = useState<OlympicEventId | null>(null);
  const [isDualFishOpen, setIsDualFishOpen] = useState(false);
  const [dualFishTab, setDualFishTab] = useState<"create" | "join">("create");
  const [inviteRoomCode, setInviteRoomCode] = useState("");
  const [playerMedals, setPlayerMedals] = useState({ gold: 2, silver: 1, bronze: 0 });
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [neonToast, setNeonToast] = useState<string | null>(null);

  // Auto-open 2-Player duel if joining via shared link (?room=XXXX or ?join=XXXX)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const room = params.get("room") || params.get("join") || params.get("duel");
      if (room) {
        setInviteRoomCode(room);
        setDualFishTab("join");
        setIsDualFishOpen(true);
      }
    }
  }, []);

  const handleAwardMedal = (_id: OlympicEventId, medal: "gold" | "silver" | "bronze") => {
    setPlayerMedals((prev) => ({
      ...prev,
      [medal]: prev[medal] + 1,
    }));

    const eventNames: Record<OlympicEventId, { name: string; time: number }> = {
      "100m": { name: "100m Olympic Sprint", time: 14.1 },
      "uturn": { name: "Fastest U-Turn Challenge", time: 0.04 },
      "splash": { name: "Dramatic Splash Arena", time: 9.8 },
      "bubbles": { name: "Best Bubble Formation", time: 12.5 },
      "lazy": { name: "Inertia Floating Sprint", time: 20.0 },
    };

    const ev = eventNames[_id] || { name: "Olympic Event", time: 15.0 };
    recordWinToLeaderboard("Meemee", ev.time, ev.name, medal).then(() => {
      setNeonToast(`🏅 ${medal.toUpperCase()} Medal in "${ev.name}" synced to Neon Leaderboard!`);
      setTimeout(() => setNeonToast(null), 4000);
    });
  };

  const runSimulation = (ev: OlympicEvent) => {
    setSimulating(true);
    setSimResult(null);
    setTimeout(() => {
      setSimulating(false);
      setSimResult(
        `🏆 Simulation Verdict: ${ev.goldHolder} took gold in "${ev.name}"! Note: ${ev.funReaction}`
      );
    }, 1200);
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Global Games · Season 2026</Eyebrow>
          <h1 className="display-xl mt-3 text-[clamp(2.5rem,9vw,5.5rem)]">
            Fish <span className="text-primary">Olympics</span> 🏆
          </h1>
          <p className="mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            Five prestigious events sanctioned by zero international sports federations.
          </p>
          <p className="hand mt-1 text-primary">The pinnacle of purposeless fish athletics.</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
          5 Playable Events
        </span>
      </div>

      {neonToast && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 animate-enter-up">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{neonToast}</span>
          </div>
          <span className="font-mono text-[0.65rem] opacity-75">Neon DB: leaderboard</span>
        </div>
      )}

      {/* MEDAL TALLY BANNER */}
      <div className="paper-card grid-paper mt-10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Eyebrow>Official Standings</Eyebrow>
            <h2 className="display-xl mt-2 text-2xl sm:text-3xl">Medal Tally</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Medals won dynamically in the 5 Olympic Mini-Games!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {medalTally.map((m, idx) => (
              <div
                key={m.fish}
                className={`paper-card p-3.5 transition-all ${
                  idx === 0 ? "border-primary bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold opacity-75">#{m.rank}</span>
                  <span className="text-xs">
                    🥇 {idx === 0 ? playerMedals.gold : m.gold}
                    {idx === 0 && playerMedals.silver > 0 ? ` 🥈${playerMedals.silver}` : ""}
                  </span>
                </div>
                <p className="font-display mt-2 text-lg font-bold uppercase">{m.fish}</p>
                <p className={`mt-1 truncate text-[0.65rem] ${idx === 0 ? "opacity-80" : "text-muted-foreground"}`}>
                  {m.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-FISH LIVE OLYMPIC DERBY (2 LAPTOPS & BOWLS SYNC) */}
      <div className="paper-card relative overflow-hidden mt-8 border-2 border-primary bg-primary/5 p-6 sm:p-8 shadow-paper">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              <Eyebrow>New Multiplayer Sport</Eyebrow>
            </div>
            <h2 className="display-xl mt-2 text-2xl sm:text-3xl text-foreground">
              2-Fish Live Derby: Dual Laptop Bowl Sync
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Place 2 laptops in front of 2 real fish bowls! Connect both laptops in real time via WebRTC Peer-to-Peer.
              Each fish's physical swimming in its bowl propels its racer live on both screens!
            </p>
            <p className="hand mt-2 text-primary font-semibold text-sm">
              "Two bowls. Two laptops. Global fish glory."
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start lg:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDualFishTab("create");
                setIsDualFishOpen(true);
              }}
              className="press flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift hover:scale-105 transition-transform"
            >
              <span>🎮</span>
              <span>Create Game (Host)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDualFishTab("join");
                setIsDualFishOpen(true);
              }}
              className="press flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-background px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-foreground shadow-paper hover:bg-accent hover:scale-105 transition-transform"
            >
              <span>🤝</span>
              <span>Join Game / Team</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 EVENTS GRID */}
      <div className="mt-16">
        <SectionHead
          eyebrow="The Disciplines"
          title="Five Olympic Events"
          note="Rigorous rules devised 15 minutes before the opening ceremony."
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev, i) => (
            <div
              key={ev.id}
              onClick={() => {
                setSelectedEvent(ev);
                setSimResult(null);
              }}
              className={`paper-card lift-hover animate-enter-up group flex cursor-pointer flex-col justify-between p-6 transition-all ${
                selectedEvent.id === ev.id
                  ? "border-2 border-primary ring-2 ring-primary/20"
                  : ""
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl">{ev.icon}</span>
                  <span className="rounded-full bg-accent px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-accent-foreground">
                    {ev.tag}
                  </span>
                </div>

                <h3 className="display-xl mt-4 text-xl sm:text-2xl">{ev.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {ev.description}
                </p>
              </div>

              <div className="mt-6 border-t border-border/70 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="eyebrow">Gold Record</span>
                  <span className="font-display font-bold text-primary">{ev.record}</span>
                </div>
                <p className="hand mt-2 text-sm text-foreground">
                  🥇 {ev.goldHolder}
                </p>
                <p className="mt-1 text-[0.7rem] text-muted-foreground italic">
                  "{ev.judgeNote}"
                </p>
                {ev.id === "100m" ? (
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDualFishTab("create");
                        setIsDualFishOpen(true);
                      }}
                      className="press flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift hover:scale-[1.02] transition-transform"
                    >
                      <span>⚔️</span>
                      <span>2-Player Race (Create / Join Team)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                        setActiveGameId(ev.id as OlympicEventId);
                      }}
                      className="press flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-card py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-accent"
                    >
                      <span>📹</span>
                      <span>Solo Time Trial</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(ev);
                      setActiveGameId(ev.id as OlympicEventId);
                    }}
                    className="press mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift transition-transform hover:bg-primary/90 active:scale-95"
                  >
                    <span>📹</span>
                    <span>Play With Camera</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* BONUS HERO CARD: MEEMEE'S REPUTATION */}
          <div className="paper-card relative overflow-hidden bg-primary p-6 text-primary-foreground sm:col-span-2 lg:col-span-1">
            <Bubbles count={8} className="text-primary-foreground/40" />
            <Eyebrow>
              <span className="text-primary-foreground/75">Flag Bearer</span>
            </Eyebrow>
            <h3 className="display-xl mt-3 text-2xl">Meemee</h3>
            <p className="mt-2 text-xs text-primary-foreground/80">
              Two gold medals won with sunglasses firmly attached throughout every heat.
            </p>
            <div className="relative mt-4 flex items-center justify-center">
              <img
                src={meemee}
                alt="Meemee Olympic Champion"
                className="animate-swim h-28 w-28 brightness-0 invert object-contain"
              />
            </div>
            <p className="hand mt-3 text-center text-sm text-primary-foreground">
              "I didn't even know it was a race."
            </p>
          </div>
        </div>
      </div>

      {/* EVENT SIMULATOR INTERACTIVE BOX */}
      <div className="paper-card mt-16 p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
          <div>
            <Eyebrow>Event Simulator · Live Arena</Eyebrow>
            <h3 className="display-xl mt-2 text-2xl sm:text-3xl">
              Simulate: {selectedEvent.name}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedEvent.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                Current Record: {selectedEvent.record} ({selectedEvent.goldHolder})
              </span>
              <span className="text-xs text-muted-foreground">
                Judges: Coach Fin & 3 skeptical starfish
              </span>
            </div>

            {simResult && (
              <div className="animate-enter-up mt-5 rounded-2xl border-2 border-primary/40 bg-accent/60 p-4 text-sm font-medium">
                <p className="font-display font-bold text-foreground">{simResult}</p>
                <p className="hand mt-1 text-base text-primary">
                  Official status: Certified pointless victory.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col lg:items-end">
            <button
              type="button"
              onClick={() => setActiveGameId(selectedEvent.id as OlympicEventId)}
              className="press flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift transition-all hover:bg-primary/90"
            >
              <span>📹</span>
              <span>Launch {selectedEvent.name} (Camera)</span>
            </button>
            <p className="text-[0.65rem] text-muted-foreground text-center sm:text-right">
              Powered 100% by real-time webcam motion & gesture tracking!
            </p>
          </div>
        </div>
      </div>

      {/* OLYMPIC GAME ARENA MODAL */}
      {activeGameId && (
        <OlympicGameArena
          isOpen={!!activeGameId}
          onClose={() => setActiveGameId(null)}
          eventId={activeGameId}
          onAwardMedal={handleAwardMedal}
        />
      )}

      {/* 2-FISH DUAL LAPTOP ARENA MODAL */}
      <DualFishArena
        isOpen={isDualFishOpen}
        onClose={() => setIsDualFishOpen(false)}
        onAwardMedal={(m) => handleAwardMedal("100m", m)}
        initialRoomCode={inviteRoomCode}
        initialTab={dualFishTab}
      />

      {/* FOOTER ACTIONS */}
      <div className="mt-12 flex flex-wrap gap-3">
        <PillButton to="/train">Train For Olympics</PillButton>
        <PillButton to="/leaderboard" variant="outline">
          View Leaderboard
        </PillButton>
        <PillButton to="/" variant="ghost">
          Back To Home
        </PillButton>
      </div>
    </section>
  );
}
