import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CoachFin, Eyebrow, PillButton } from "@/components/meemee/bits";
import { FishEmergency } from "@/components/meemee/FishEmergency";
import { CameraFishBowl } from "@/components/meemee/CameraFishBowl";
import { getTrainingProgress, saveTrainingProgress } from "@/lib/neon";

export const Route = createFileRoute("/train")({
  head: () => ({
    meta: [
      { title: "Swimming Training Pool — All 4 Levels | MEEMEE" },
      {
        name: "description",
        content:
          "The MEEMEE training aquarium: 4 curriculum levels, camera motion steering, obstacles, speed rings, and electric jellyfish.",
      },
      { property: "og:title", content: "Swimming Training — MEEMEE" },
      {
        property: "og:description",
        content: "Four interactive levels of increasingly unnecessary aquatic instruction.",
      },
    ],
  }),
  component: Train,
});

const levels = [
  {
    id: "01",
    name: "Just Swim",
    note: "The baseline expectation",
    goal: "Reach 20m swim distance. Calibrate 4-way optical camera guidance.",
    icon: "🌊",
  },
  {
    id: "02",
    name: "Avoid Things",
    note: "Rocks are not friends",
    goal: "Dodge rocks, pufferfish & snails to retrieve 3 glowing Sea Pearls.",
    icon: "🪨",
  },
  {
    id: "03",
    name: "Swim Faster",
    note: "Same water, more urgency",
    goal: "Ride deep-sea water currents and boost through all 3 speed rings in 30s.",
    icon: "⚡",
  },
  {
    id: "04",
    name: "Professional Fish",
    note: "Fully unnecessary mastery",
    goal: "Evade vertical patrolling electric jellyfish and capture all 4 Mastery Stars.",
    icon: "🎓",
  },
];

function Train() {
  const [currentLevel, setCurrentLevel] = useState("01");
  const [completedLevels, setCompletedLevels] = useState<Record<string, boolean>>({});
  const [neonSynced, setNeonSynced] = useState(false);

  // Fetch student fish progression from Neon database
  useEffect(() => {
    getTrainingProgress("Meemee").then((saved) => {
      if (saved && Object.keys(saved).length > 0) {
        setCompletedLevels(saved);
        setNeonSynced(true);
      }
    });
  }, []);

  const activeLevel = levels.find((l) => l.id === currentLevel) || levels[0]!;
  const clearedCount = Object.keys(completedLevels).length;

  const handleCompleteLevel = (levelId: string) => {
    setCompletedLevels((prev) => ({ ...prev, [levelId]: true }));
    const lvl = levels.find((l) => l.id === levelId);
    saveTrainingProgress("Meemee", levelId, lvl?.name || `Level ${levelId}`).then(() => {
      setNeonSynced(true);
    });
  };

  const handleNextLevel = () => {
    const currentIndex = levels.findIndex((l) => l.id === currentLevel);
    if (currentIndex < levels.length - 1) {
      setCurrentLevel(levels[currentIndex + 1]!.id);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <Eyebrow>Curriculum in progress</Eyebrow>
          <h1 className="display-xl mt-3 text-[clamp(2.25rem,8vw,4.5rem)]">Training Pool</h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {neonSynced ? "Neon Progression Synced" : "Neon Standby"}
            </span>
            <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-lift">
              Level {currentLevel} · {activeLevel.name}
            </span>
          </div>
          {clearedCount > 0 && (
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              🏆 {clearedCount} / 4 Levels Cleared (Saved to DB)
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-4">
          {/* CAMERA MOTION TRACKING FISH BOWL WITH 4 INTERACTIVE LEVELS */}
          <CameraFishBowl
            level={currentLevel}
            onCompleteLevel={handleCompleteLevel}
            onNextLevel={handleNextLevel}
          />

          {/* 4 CURRICULUM LEVEL SELECTOR CARDS */}
          <div className="grid gap-3 sm:grid-cols-2">
            {levels.map((l, i) => {
              const isActive = l.id === currentLevel;
              const isCompleted = !!completedLevels[l.id];

              return (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => setCurrentLevel(l.id)}
                  className={`lift-hover animate-enter-up cursor-pointer rounded-2xl border p-5 text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-deep ring-2 ring-primary/40 scale-[1.01]"
                      : isCompleted
                      ? "border-emerald-500/50 bg-emerald-500/10 hover:border-emerald-500"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent/40"
                  }`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{l.icon}</span>
                        <p className={`font-display text-xs tracking-[0.2em] ${isActive ? "opacity-90" : "opacity-70"}`}>
                          LEVEL {l.id}
                        </p>
                      </div>
                      <p className="truncate font-display text-xl uppercase mt-0.5">{l.name}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${
                        isActive
                          ? "bg-primary-foreground text-primary shadow-sm"
                          : isCompleted
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isActive ? "Active Now" : isCompleted ? "✓ Cleared" : "Play Level"}
                    </span>
                  </div>

                  <p className={`mt-2 text-sm ${isActive ? "opacity-90" : "text-muted-foreground"}`}>
                    {l.note}
                  </p>

                  <div
                    className={`mt-3 rounded-lg px-2.5 py-1.5 text-[0.7rem] ${
                      isActive
                        ? "bg-primary-foreground/15 text-primary-foreground font-medium"
                        : "bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    🎯 <span className="font-semibold">Goal:</span> {l.goal}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR COACH & GOALS */}
        <div className="space-y-4">
          <CoachFin />
          <FishEmergency />

          {/* DYNAMIC LEVEL GOAL CARD */}
          <div className="paper-card p-6">
            <Eyebrow>Level {currentLevel} Mission</Eyebrow>
            <div className="mt-2 flex items-start gap-2.5">
              <span className="text-2xl mt-0.5">{activeLevel.icon}</span>
              <div>
                <p className="font-display text-lg font-bold">{activeLevel.goal}</p>
                <p className="hand mt-2 text-primary font-bold">"{activeLevel.note}"</p>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Curriculum Progress</span>
                <span className="font-bold text-foreground">{clearedCount} / 4 Cleared</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${(clearedCount / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <PillButton to="/result" variant="outline">
            Finish Session
          </PillButton>
        </div>
      </div>
    </section>
  );
}
