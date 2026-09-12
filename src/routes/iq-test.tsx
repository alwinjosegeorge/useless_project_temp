import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import meemee from "@/assets/meemee.png";
import coachFin from "@/assets/coach-fin.png";
import { Bubbles, Eyebrow, PillButton } from "@/components/meemee/bits";
import { saveFishIQRecord, getTopFishIQRecords } from "@/lib/neon";

export const Route = createFileRoute("/iq-test")({
  head: () => ({
    meta: [
      { title: "💀 Fish IQ Test — Unofficial Examination | MEEMEE" },
      {
        name: "description",
        content:
          "The official MEEMEE Fish IQ Test: 4-quadrant fish motion decision pool, aquatic logic, and glass wall negotiation.",
      },
      { property: "og:title", content: "Fish IQ Test — MEEMEE" },
      {
        property: "og:description",
        content: "Testing fish intellect via 4-quadrant aquatic movement. Passing grade is legally dubious.",
      },
    ],
  }),
  component: FishIQTest,
});

interface Question {
  id: number;
  question: string;
  options: {
    letter: "A" | "B" | "C" | "D";
    text: string;
    verdict: string;
  }[];
  coachQuirk: string;
}

const questions: Question[] = [
  {
    id: 1,
    question: "If you are inside water, what should you do?",
    options: [
      {
        letter: "A",
        text: "Swim",
        verdict: "Standard protocol. A bit predictable.",
      },
      {
        letter: "B",
        text: "Swim faster",
        verdict: "Urgency detected. Water approves.",
      },
      {
        letter: "C",
        text: "Panic",
        verdict: "Emotionally valid aquatic reaction.",
      },
      {
        letter: "D",
        text: "All of the above",
        verdict: "Master-level fish logic. Panic while swimming rapidly.",
      },
    ],
    coachQuirk: "Coach Fin note: This was literally on the entrance exam.",
  },
  {
    id: 2,
    question: "You spot a shiny metal hook with a juicy worm attached. What is your diagnosis?",
    options: [
      {
        letter: "A",
        text: "A completely safe, free lunch falling from the sky",
        verdict: "Natural selection has entered the chat.",
      },
      {
        letter: "B",
        text: "Definitely not an existential trap",
        verdict: "Dangerous levels of optimism detected.",
      },
      {
        letter: "C",
        text: "The worm seems polite; let's bite it anyway",
        verdict: "Manners won't save you from a fishing boat.",
      },
      {
        letter: "D",
        text: "Suspicious, but calories are calories",
        verdict: "The philosopher fish approach.",
      },
    ],
    coachQuirk: "Coach Fin note: Please do not bite the pointy metal thing.",
  },
  {
    id: 3,
    question: "An invisible glass barrier prevents your forward movement. Standard protocol?",
    options: [
      {
        letter: "A",
        text: "Bonk into it 47 times until it learns respect",
        verdict: "Persistence over physics. Truly admirable.",
      },
      {
        letter: "B",
        text: "Assume the ocean ran out of rendering distance",
        verdict: "A gamer fish of supreme culture.",
      },
      {
        letter: "C",
        text: "Turn 180° and bonk into the opposite glass wall",
        verdict: "Symmetry in failure. Beautiful.",
      },
      {
        letter: "D",
        text: "Stare at your own reflection with deep distrust",
        verdict: "Meemee does this daily. Gold standard.",
      },
    ],
    coachQuirk: "Coach Fin note: The glass always wins.",
  },
  {
    id: 4,
    question: "What is the true duration of a fish's attention span?",
    options: [
      {
        letter: "A",
        text: "Exactly 3 seconds",
        verdict: "Scientifically repeated, totally unproven.",
      },
      {
        letter: "B",
        text: "Wait... what was the question?",
        verdict: "Accurate simulation of current brain state.",
      },
      {
        letter: "C",
        text: "Long enough to forget the rock you just hit",
        verdict: "Memory resets upon collision.",
      },
      {
        letter: "D",
        text: "Infinite, but only when food flakes hit surface",
        verdict: "Selective culinary genius.",
      },
    ],
    coachQuirk: "Coach Fin note: I forgot what we were testing.",
  },
  {
    id: 5,
    question: "A human taps aggressively on the tank glass. Your professional response?",
    options: [
      {
        letter: "A",
        text: "Deep, unbroken existential judgment",
        verdict: "Maintain unblinking eye contact through sunglasses.",
      },
      {
        letter: "B",
        text: "Adjust sunglasses and casually drift backward",
        verdict: "Impeccable aquatic swagger.",
      },
      {
        letter: "C",
        text: "Pretend to be a stationary plastic plant",
        verdict: "Master of camouflage. Zero effort.",
      },
      {
        letter: "D",
        text: "Escalate the emergency immediately",
        verdict: "Coach Fin has already logged the incident.",
      },
    ],
    coachQuirk: "Coach Fin note: Humans are weird. Ignore them.",
  },
  {
    id: 6,
    question: "What is the primary function of Coach Fin at the Academy?",
    options: [
      {
        letter: "A",
        text: "Escalating stationary fish emergencies",
        verdict: "Code 404 is his specialty.",
      },
      {
        letter: "B",
        text: "Reluctantly signing unverified certificates",
        verdict: "He signs them, but he doesn't enjoy it.",
      },
      {
        letter: "C",
        text: "Teaching creatures born in water how to swim",
        verdict: "The pinnacle of career overthinking.",
      },
      {
        letter: "D",
        text: "All of the above (and looking disappointed)",
        verdict: "100% correct. Coach Fin's life summarized.",
      },
    ],
    coachQuirk: "Coach Fin note: I did not approve this question.",
  },
];

// Audio feedback chime
function playDing() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(1568, now + 0.22);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // Audio optional
  }
}

// Subtle countdown tick for each second held
function playTick(freq = 440) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Audio optional
  }
}

function FishIQTest() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [completed, setCompleted] = useState(false);
  const [iqSaved, setIqSaved] = useState(false);
  const [topRecords, setTopRecords] = useState<any[]>([]);

  // Fetch top IQ records from Neon
  useEffect(() => {
    getTopFishIQRecords(5).then((records) => {
      if (records && records.length > 0) {
        setTopRecords(records);
      }
    });
  }, []);

  // Fish in-pool coordinates: x (15 - 85%), y (18 - 82%)
  const [fishPos, setFishPos] = useState({ x: 50, y: 50 });
  const [fishFacing, setFishFacing] = useState<1 | -1>(1);
  const [activeZone, setActiveZone] = useState<"A" | "B" | "C" | "D" | "CENTER">("CENTER");

  // 5-Second Dwell Confirmation State
  const [dwellInfo, setDwellInfo] = useState<{
    zone: "A" | "B" | "C" | "D" | null;
    progress: number;
    secondsLeft: number;
    isLocked: boolean;
  }>({
    zone: null,
    progress: 0,
    secondsLeft: 5.0,
    isLocked: false,
  });

  // Camera tracking
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const fishPosRef = useRef({ x: 50, y: 50 });
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const zoneTimerRef = useRef<{
    zone: "A" | "B" | "C" | "D";
    startTime: number;
    lastTickSec: number;
    locked: boolean;
  } | null>(null);

  const currentQ = questions[currentIdx]!;

  const handleSelect = useCallback(
    (letter: "A" | "B" | "C" | "D", isFishChoice = false) => {
      setSelectedOption(letter);
      setAnswers((prev) => ({ ...prev, [currentQ.id]: letter }));
      if (isFishChoice) {
        playDing();
      }
    },
    [currentQ.id]
  );

  // Swim fish directly towards a quadrant (dwells 5 seconds to lock in answer)
  const swimToZone = useCallback((zone: "A" | "B" | "C" | "D") => {
    const targets = {
      A: { x: 25, y: 28 }, // Top Left
      B: { x: 75, y: 28 }, // Top Right
      C: { x: 25, y: 72 }, // Down Left
      D: { x: 75, y: 72 }, // Down Right
    };
    targetPosRef.current = targets[zone];
  }, []);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn("Camera error:", err);
      const msg = err instanceof Error ? err.message : "Webcam permission denied or camera not found.";
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevFrameRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Optical Camera Differencing loop
  useEffect(() => {
    if (!cameraActive) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Draw mirrored
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -width, 0, width, height);
      ctx.restore();

      const currentFrame = ctx.getImageData(0, 0, width, height).data;

      if (prevFrameRef.current) {
        const prev = prevFrameRef.current;
        let motionPixels = 0;
        let sumX = 0;
        let sumY = 0;

        for (let i = 0; i < currentFrame.length; i += 4 * 2) {
          const rDiff = Math.abs(currentFrame[i]! - prev[i]!);
          const gDiff = Math.abs(currentFrame[i + 1]! - prev[i + 1]!);
          const bDiff = Math.abs(currentFrame[i + 2]! - prev[i + 2]!);
          if (rDiff + gDiff + bDiff > 45) {
            const pixelIndex = i / 4;
            sumX += pixelIndex % width;
            sumY += Math.floor(pixelIndex / width);
            motionPixels++;
          }
        }

        if (motionPixels > 30) {
          // Normalize centroid to pool % coordinates
          const avgX = sumX / motionPixels;
          const avgY = sumY / motionPixels;

          // Map from camera (0..width, 0..height) to pool (15..85%, 20..80%)
          const mappedX = 18 + (avgX / width) * 64;
          const mappedY = 20 + (avgY / height) * 60;
          targetPosRef.current = { x: mappedX, y: mappedY };
        }
      }

      prevFrameRef.current = new Uint8ClampedArray(currentFrame);
    }, 50);

    return () => clearInterval(interval);
  }, [cameraActive]);

  // 60FPS Fish movement and Quadrant Decision Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      let nextX = fishPosRef.current.x;
      let nextY = fishPosRef.current.y;

      if (targetPosRef.current) {
        const dx = targetPosRef.current.x - nextX;
        const dy = targetPosRef.current.y - nextY;
        const dist = Math.hypot(dx, dy);

        if (dist > 1) {
          nextX += (dx / dist) * Math.min(dist, 55 * dt);
          nextY += (dy / dist) * Math.min(dist, 55 * dt);
          setFishFacing(dx >= 0 ? 1 : -1);
        }
      } else {
        // Idle gentle buoyancy drift in pool
        const idleWave = Math.sin(now * 0.002) * 0.4;
        nextY += idleWave * (dt * 60);
      }

      // Keep inside bounds
      nextX = Math.max(14, Math.min(86, nextX));
      nextY = Math.max(16, Math.min(84, nextY));

      fishPosRef.current = { x: nextX, y: nextY };
      setFishPos({ x: nextX, y: nextY });

      // Evaluate 4 Quadrants:
      // Top-Left: x < 47 && y < 47 => Option A
      // Top-Right: x > 53 && y < 47 => Option B
      // Down-Left: x < 47 && y > 53 => Option C
      // Down-Right: x > 53 && y > 53 => Option D
      let quad: "A" | "B" | "C" | "D" | "CENTER" = "CENTER";
      if (nextX < 47 && nextY < 47) quad = "A";
      else if (nextX > 53 && nextY < 47) quad = "B";
      else if (nextX < 47 && nextY > 53) quad = "C";
      else if (nextX > 53 && nextY > 53) quad = "D";

      setActiveZone(quad);

      // 5-Second Dwell Confirmation Logic (5000ms)
      if (quad !== "CENTER") {
        if (!zoneTimerRef.current || zoneTimerRef.current.zone !== quad) {
          zoneTimerRef.current = {
            zone: quad,
            startTime: now,
            lastTickSec: 0,
            locked: false,
          };
          setDwellInfo({
            zone: quad,
            progress: 0,
            secondsLeft: 5.0,
            isLocked: false,
          });
        } else {
          const elapsed = now - zoneTimerRef.current.startTime;
          const currentSec = Math.floor(elapsed / 1000);

          if (
            currentSec > zoneTimerRef.current.lastTickSec &&
            currentSec < 5 &&
            !zoneTimerRef.current.locked
          ) {
            zoneTimerRef.current.lastTickSec = currentSec;
            playTick(420 + currentSec * 70);
          }

          if (elapsed >= 5000) {
            if (!zoneTimerRef.current.locked) {
              zoneTimerRef.current.locked = true;
              handleSelect(quad, true);
              setDwellInfo({
                zone: quad,
                progress: 100,
                secondsLeft: 0,
                isLocked: true,
              });
            }
          } else if (!zoneTimerRef.current.locked) {
            const progress = Math.min(100, (elapsed / 5000) * 100);
            const secondsLeft = Math.max(0, (5000 - elapsed) / 1000);
            setDwellInfo({
              zone: quad,
              progress,
              secondsLeft,
              isLocked: false,
            });
          }
        }
      } else {
        if (zoneTimerRef.current) {
          zoneTimerRef.current = null;
          setDwellInfo({
            zone: null,
            progress: 0,
            secondsLeft: 5.0,
            isLocked: false,
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [handleSelect]);

  // Reset fish to center when moving to next question
  const resetFishCenter = () => {
    fishPosRef.current = { x: 50, y: 50 };
    setFishPos({ x: 50, y: 50 });
    targetPosRef.current = { x: 50, y: 50 };
    zoneTimerRef.current = null;
    setActiveZone("CENTER");
    setDwellInfo({
      zone: null,
      progress: 0,
      secondsLeft: 5.0,
      isLocked: false,
    });
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      const nextQ = questions[currentIdx + 1]!;
      setSelectedOption(answers[nextQ.id] || null);
      resetFishCenter();
    } else {
      setCompleted(true);
      stopCamera();
      saveFishIQRecord({
        fishName: "Meemee",
        iqScore: 168,
        grade: "Certified Unnecessarily Genius",
        waterReflexes: 100,
        hookAvoidance: 50,
        glassResilience: "∞",
        coachNote:
          "Answered with complete disregard for traditional biological logic by swimming through all 4 quadrants.",
      }).then(() => {
        setIqSaved(true);
        getTopFishIQRecords(5).then(setTopRecords);
      });
    }
  };

  const handlePrevious = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
      const prevQ = questions[currentIdx - 1]!;
      setSelectedOption(answers[prevQ.id] || null);
      resetFishCenter();
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswers({});
    setCompleted(false);
    resetFishCenter();
  };

  return (
    <section className="mx-auto max-w-4xl px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Standardized Aquatic Assessment · Grade IV</Eyebrow>
          <h1 className="display-xl mt-3 text-[clamp(2.5rem,9vw,5.5rem)]">
            Fish <span className="text-primary">IQ Test</span> 💀
          </h1>
          <p className="mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            Answers are chosen by fish movement: <strong>Top-Left = A</strong>, <strong>Top-Right = B</strong>, <strong>Down-Left = C</strong>, <strong>Down-Right = D</strong>!
          </p>
          <p className="hand mt-1 text-primary">Passing grade is legally and biologically questionable.</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
          {completed ? "Completed" : `Question ${currentIdx + 1} of ${questions.length}`}
        </span>
      </div>

      {!completed ? (
        <div className="mt-10 space-y-6">
          {/* PROGRESS BAR */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* ========================================================= */}
          {/* 4-QUADRANT FISH DECISION AQUARIUM POOL */}
          {/* ========================================================= */}
          <div className="paper-card overflow-hidden border-2 border-primary/50 shadow-deep">
            {/* Top Bar with Camera Toggle & Live Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🐟</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-primary">
                      Fish Decision Pool
                    </span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      ⏱️ 5-Sec Hold to Lock In
                    </span>
                  </div>
                  <p className="text-[0.68rem] text-muted-foreground">
                    {activeZone !== "CENTER"
                      ? selectedOption === activeZone
                        ? `Option ${activeZone} is officially locked in! You can proceed to the next question.`
                        : `Meemee in Zone ${activeZone} — holding ${(5 - dwellInfo.secondsLeft).toFixed(1)}s / 5.0s to confirm...`
                      : "Swim Meemee to any corner and hold for 5 seconds to lock in your answer!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="press flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-primary-foreground shadow-lift hover:bg-primary/90"
                  >
                    <span>📹</span>
                    <span>Track Real Fish / Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="press flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    <span>🛑</span>
                    <span>Stop Camera</span>
                  </button>
                )}
              </div>
            </div>

            {/* AQUARIUM WITH 4 QUADRANTS */}
            <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-water text-water-foreground select-none">
              <div className="absolute inset-0 bg-gradient-to-b from-water via-water to-water-deep opacity-95" />
              <Bubbles count={10} className="text-water-foreground/30 pointer-events-none" />

              {/* Crosshair Dividers separating the 4 Quadrants */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-full w-[1px] border-r border-dashed border-water-foreground/30" />
                <div className="absolute left-0 right-0 h-[1px] border-b border-dashed border-water-foreground/30" />
                <div className="rounded-full bg-water-deep/80 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-water-foreground/80 border border-water-foreground/20 backdrop-blur-sm">
                  Center
                </div>
              </div>

              {/* ===================================== */}
              {/* ZONE A: TOP LEFT */}
              {/* ===================================== */}
              <div
                onClick={() => swimToZone("A")}
                className={`cursor-pointer absolute top-2 left-2 w-[48%] h-[46%] rounded-2xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between ${
                  activeZone === "A" || selectedOption === "A"
                    ? "border-emerald-400 bg-emerald-400/20 shadow-[0_0_25px_rgba(52,211,153,0.5)] ring-2 ring-emerald-300 scale-[1.01]"
                    : "border-water-foreground/20 bg-water-deep/40 hover:bg-water-deep/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-bold ${
                        selectedOption === "A"
                          ? "bg-emerald-400 text-emerald-950 shadow-sm"
                          : "bg-water-foreground/20 text-water-foreground"
                      }`}
                    >
                      A
                    </span>
                    {selectedOption === "A" && (
                      <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300 border border-emerald-400/40">
                        ✓ Locked
                      </span>
                    )}
                  </div>
                  <span className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider text-water-foreground/80">
                    ↖️ Top Left
                  </span>
                </div>

                <div className="my-auto py-1">
                  <p className="text-base sm:text-xl md:text-2xl font-bold font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-snug">
                    {currentQ.options[0]?.text}
                  </p>
                </div>

                {/* 5-SECOND DWELL COUNTDOWN BAR */}
                <div className="w-full">
                  {activeZone === "A" && selectedOption !== "A" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[0.68rem] sm:text-xs font-bold text-white drop-shadow">
                        <span className="flex items-center gap-1 text-emerald-200">
                          <span className="animate-spin text-xs">⏳</span>
                          <span>Holding 5s to Lock:</span>
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-black text-amber-300">
                          {dwellInfo.secondsLeft.toFixed(1)}s
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 border border-white/25">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.9)] transition-all duration-75"
                          style={{ width: `${dwellInfo.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedOption === "A" && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/25 px-2.5 py-1 text-[0.7rem] font-bold text-emerald-200 border border-emerald-400/40">
                      <span className="flex items-center gap-1">
                        <span>✨</span>
                        <span>ANSWER LOCKED IN</span>
                      </span>
                      <span className="text-[0.65rem] text-emerald-300/80">Option A</span>
                    </div>
                  )}

                  {activeZone !== "A" && selectedOption !== "A" && (
                    <div className="flex items-center justify-between text-[0.65rem] text-water-foreground/60 font-medium">
                      <span>Hold 5s to choose</span>
                      <span>↖️ A</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ===================================== */}
              {/* ZONE B: TOP RIGHT */}
              {/* ===================================== */}
              <div
                onClick={() => swimToZone("B")}
                className={`cursor-pointer absolute top-2 right-2 w-[48%] h-[46%] rounded-2xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between ${
                  activeZone === "B" || selectedOption === "B"
                    ? "border-cyan-400 bg-cyan-400/20 shadow-[0_0_25px_rgba(34,211,238,0.5)] ring-2 ring-cyan-300 scale-[1.01]"
                    : "border-water-foreground/20 bg-water-deep/40 hover:bg-water-deep/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-bold ${
                        selectedOption === "B"
                          ? "bg-cyan-400 text-cyan-950 shadow-sm"
                          : "bg-water-foreground/20 text-water-foreground"
                      }`}
                    >
                      B
                    </span>
                    {selectedOption === "B" && (
                      <span className="rounded-full bg-cyan-400/30 px-2 py-0.5 text-[0.65rem] font-bold text-cyan-300 border border-cyan-400/40">
                        ✓ Locked
                      </span>
                    )}
                  </div>
                  <span className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider text-water-foreground/80">
                    ↗️ Top Right
                  </span>
                </div>

                <div className="my-auto py-1">
                  <p className="text-base sm:text-xl md:text-2xl font-bold font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-snug">
                    {currentQ.options[1]?.text}
                  </p>
                </div>

                {/* 5-SECOND DWELL COUNTDOWN BAR */}
                <div className="w-full">
                  {activeZone === "B" && selectedOption !== "B" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[0.68rem] sm:text-xs font-bold text-white drop-shadow">
                        <span className="flex items-center gap-1 text-cyan-200">
                          <span className="animate-spin text-xs">⏳</span>
                          <span>Holding 5s to Lock:</span>
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-black text-amber-300">
                          {dwellInfo.secondsLeft.toFixed(1)}s
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 border border-white/25">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)] transition-all duration-75"
                          style={{ width: `${dwellInfo.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedOption === "B" && (
                    <div className="flex items-center justify-between rounded-xl bg-cyan-500/25 px-2.5 py-1 text-[0.7rem] font-bold text-cyan-200 border border-cyan-400/40">
                      <span className="flex items-center gap-1">
                        <span>✨</span>
                        <span>ANSWER LOCKED IN</span>
                      </span>
                      <span className="text-[0.65rem] text-cyan-300/80">Option B</span>
                    </div>
                  )}

                  {activeZone !== "B" && selectedOption !== "B" && (
                    <div className="flex items-center justify-between text-[0.65rem] text-water-foreground/60 font-medium">
                      <span>Hold 5s to choose</span>
                      <span>↗️ B</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ===================================== */}
              {/* ZONE C: DOWN LEFT */}
              {/* ===================================== */}
              <div
                onClick={() => swimToZone("C")}
                className={`cursor-pointer absolute bottom-2 left-2 w-[48%] h-[46%] rounded-2xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between ${
                  activeZone === "C" || selectedOption === "C"
                    ? "border-amber-400 bg-amber-400/20 shadow-[0_0_25px_rgba(251,191,36,0.5)] ring-2 ring-amber-300 scale-[1.01]"
                    : "border-water-foreground/20 bg-water-deep/40 hover:bg-water-deep/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-bold ${
                        selectedOption === "C"
                          ? "bg-amber-400 text-amber-950 shadow-sm"
                          : "bg-water-foreground/20 text-water-foreground"
                      }`}
                    >
                      C
                    </span>
                    {selectedOption === "C" && (
                      <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-[0.65rem] font-bold text-amber-300 border border-amber-400/40">
                        ✓ Locked
                      </span>
                    )}
                  </div>
                  <span className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider text-water-foreground/80">
                    ↙️ Down Left
                  </span>
                </div>

                <div className="my-auto py-1">
                  <p className="text-base sm:text-xl md:text-2xl font-bold font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-snug">
                    {currentQ.options[2]?.text}
                  </p>
                </div>

                {/* 5-SECOND DWELL COUNTDOWN BAR */}
                <div className="w-full">
                  {activeZone === "C" && selectedOption !== "C" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[0.68rem] sm:text-xs font-bold text-white drop-shadow">
                        <span className="flex items-center gap-1 text-amber-200">
                          <span className="animate-spin text-xs">⏳</span>
                          <span>Holding 5s to Lock:</span>
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-black text-amber-300">
                          {dwellInfo.secondsLeft.toFixed(1)}s
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 border border-white/25">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] transition-all duration-75"
                          style={{ width: `${dwellInfo.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedOption === "C" && (
                    <div className="flex items-center justify-between rounded-xl bg-amber-500/25 px-2.5 py-1 text-[0.7rem] font-bold text-amber-200 border border-amber-400/40">
                      <span className="flex items-center gap-1">
                        <span>✨</span>
                        <span>ANSWER LOCKED IN</span>
                      </span>
                      <span className="text-[0.65rem] text-amber-300/80">Option C</span>
                    </div>
                  )}

                  {activeZone !== "C" && selectedOption !== "C" && (
                    <div className="flex items-center justify-between text-[0.65rem] text-water-foreground/60 font-medium">
                      <span>Hold 5s to choose</span>
                      <span>↙️ C</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ===================================== */}
              {/* ZONE D: DOWN RIGHT */}
              {/* ===================================== */}
              <div
                onClick={() => swimToZone("D")}
                className={`cursor-pointer absolute bottom-2 right-2 w-[48%] h-[46%] rounded-2xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between ${
                  activeZone === "D" || selectedOption === "D"
                    ? "border-purple-400 bg-purple-400/20 shadow-[0_0_25px_rgba(192,132,252,0.5)] ring-2 ring-purple-300 scale-[1.01]"
                    : "border-water-foreground/20 bg-water-deep/40 hover:bg-water-deep/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-bold ${
                        selectedOption === "D"
                          ? "bg-purple-400 text-purple-950 shadow-sm"
                          : "bg-water-foreground/20 text-water-foreground"
                      }`}
                    >
                      D
                    </span>
                    {selectedOption === "D" && (
                      <span className="rounded-full bg-purple-400/30 px-2 py-0.5 text-[0.65rem] font-bold text-purple-300 border border-purple-400/40">
                        ✓ Locked
                      </span>
                    )}
                  </div>
                  <span className="text-[0.65rem] sm:text-xs font-bold uppercase tracking-wider text-water-foreground/80">
                    ↘️ Down Right
                  </span>
                </div>

                <div className="my-auto py-1">
                  <p className="text-base sm:text-xl md:text-2xl font-bold font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-snug">
                    {currentQ.options[3]?.text}
                  </p>
                </div>

                {/* 5-SECOND DWELL COUNTDOWN BAR */}
                <div className="w-full">
                  {activeZone === "D" && selectedOption !== "D" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[0.68rem] sm:text-xs font-bold text-white drop-shadow">
                        <span className="flex items-center gap-1 text-purple-200">
                          <span className="animate-spin text-xs">⏳</span>
                          <span>Holding 5s to Lock:</span>
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-black text-amber-300">
                          {dwellInfo.secondsLeft.toFixed(1)}s
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 border border-white/25">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-300 shadow-[0_0_12px_rgba(192,132,252,0.9)] transition-all duration-75"
                          style={{ width: `${dwellInfo.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedOption === "D" && (
                    <div className="flex items-center justify-between rounded-xl bg-purple-500/25 px-2.5 py-1 text-[0.7rem] font-bold text-purple-200 border border-purple-400/40">
                      <span className="flex items-center gap-1">
                        <span>✨</span>
                        <span>ANSWER LOCKED IN</span>
                      </span>
                      <span className="text-[0.65rem] text-purple-300/80">Option D</span>
                    </div>
                  )}

                  {activeZone !== "D" && selectedOption !== "D" && (
                    <div className="flex items-center justify-between text-[0.65rem] text-water-foreground/60 font-medium">
                      <span>Hold 5s to choose</span>
                      <span>↘️ D</span>
                    </div>
                  )}
                </div>
              </div>

              {/* MEEMEE THE FISH (TRACKS POSITION IN 4 QUADRANTS) */}
              <div
                className="pointer-events-none absolute z-20 transition-transform duration-75 ease-out"
                style={{
                  left: `${fishPos.x}%`,
                  top: `${fishPos.y}%`,
                  transform: `translate(-50%, -50%) scaleX(${fishFacing})`,
                  width: "clamp(3.5rem, 8vw, 5.5rem)",
                }}
              >
                <div className="relative flex flex-col items-center">
                  {/* Floating Countdown Badge directly above Meemee */}
                  {activeZone !== "CENTER" && (
                    <div
                      className={`absolute -top-8 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold shadow-deep backdrop-blur-sm border transition-all ${
                        selectedOption === activeZone
                          ? "bg-emerald-500 text-emerald-950 border-emerald-300 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                          : "bg-black/85 text-amber-300 border-amber-400/50 animate-bounce"
                      }`}
                    >
                      {selectedOption === activeZone
                        ? "✨ LOCKED IN!"
                        : `⏱️ ${(5 - dwellInfo.secondsLeft).toFixed(1)}s / 5s`}
                    </div>
                  )}

                  <img
                    src={meemee}
                    alt="Meemee deciding"
                    className="w-full brightness-0 invert drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  />
                  {/* Lock-in ring indicator */}
                  <div
                    className={`absolute -inset-2 rounded-full border-2 transition-all ${
                      activeZone !== "CENTER"
                        ? selectedOption === activeZone
                          ? "border-emerald-400 ring-4 ring-emerald-400/40"
                          : "border-amber-400 ring-2 ring-amber-400/40 animate-pulse"
                        : "border-cyan-300/30"
                    }`}
                  />
                </div>
              </div>

              {/* PIP WEBCAM FEED (When camera active) */}
              {cameraActive && (
                <div className="paper-card absolute bottom-3 right-3 z-30 overflow-hidden border border-primary bg-background/95 p-1.5 shadow-deep w-36">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[0.55rem] font-bold text-red-600 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" />
                      FISH CAM
                    </span>
                    <span className="text-[0.5rem] font-bold text-muted-foreground">4 Zones</span>
                  </div>
                  <div className="relative aspect-[4/3] rounded-lg bg-black overflow-hidden">
                    <video
                      ref={(el) => {
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          el.srcObject = streamRef.current;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover [transform:scaleX(-1)]"
                    />
                  </div>
                </div>
              )}

              {/* Hidden analysis video & canvas */}
              <video ref={videoRef} autoPlay playsInline muted className="hidden" />
              <canvas ref={canvasRef} width={64} height={48} className="hidden" />
            </div>

            {/* QUICK FISH STEERING HELPER BUTTONS */}
            <div className="border-t border-border bg-card/60 p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Quick Steer Fish:
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground/80 font-medium">
                    (Swims to corner & holds 5s to confirm)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => swimToZone("A")}
                    className={`press cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedOption === "A"
                        ? "bg-emerald-600 text-white shadow-lift"
                        : activeZone === "A"
                        ? "border-2 border-emerald-400 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "border border-border bg-card hover:border-emerald-500"
                    }`}
                  >
                    ↖️ Top-Left (A) {selectedOption === "A" && "✓"}
                  </button>

                  <button
                    type="button"
                    onClick={() => swimToZone("B")}
                    className={`press cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedOption === "B"
                        ? "bg-cyan-600 text-white shadow-lift"
                        : activeZone === "B"
                        ? "border-2 border-cyan-400 bg-cyan-500/20 text-cyan-700 dark:text-cyan-300"
                        : "border border-border bg-card hover:border-cyan-500"
                    }`}
                  >
                    ↗️ Top-Right (B) {selectedOption === "B" && "✓"}
                  </button>

                  <button
                    type="button"
                    onClick={() => swimToZone("C")}
                    className={`press cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedOption === "C"
                        ? "bg-amber-600 text-white shadow-lift"
                        : activeZone === "C"
                        ? "border-2 border-amber-400 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "border border-border bg-card hover:border-amber-500"
                    }`}
                  >
                    ↙️ Down-Left (C) {selectedOption === "C" && "✓"}
                  </button>

                  <button
                    type="button"
                    onClick={() => swimToZone("D")}
                    className={`press cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                      selectedOption === "D"
                        ? "bg-purple-600 text-white shadow-lift"
                        : activeZone === "D"
                        ? "border-2 border-purple-400 bg-purple-500/20 text-purple-700 dark:text-purple-300"
                        : "border border-border bg-card hover:border-purple-500"
                    }`}
                  >
                    ↘️ Down-Right (D) {selectedOption === "D" && "✓"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QUESTION CARD & 2x2 OPTIONS */}
          <div className="paper-card grid-paper animate-enter-up p-6 sm:p-10">
            <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Question {String(currentQ.id).padStart(2, "0")}
              </span>
              <span className="eyebrow">Subject: Meemee</span>
            </div>

            <h2 className="display-xl mt-6 text-2xl sm:text-3xl text-foreground">
              “{currentQ.question}”
            </h2>

            {/* FISH SELECTION STATUS BANNER */}
            {selectedOption && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 px-5 py-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-enter-up shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🐟 ✨</span>
                  <span>
                    Answer <strong>{selectedOption}</strong> locked in by 5-second fish hold! (
                    {currentQ.options.find((o) => o.letter === selectedOption)?.text})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="press cursor-pointer rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lift transition-all hover:bg-emerald-500"
                >
                  {currentIdx < questions.length - 1 ? "Next Question →" : "See IQ Results 🎓"}
                </button>
              </div>
            )}

            {/* 2x2 OPTIONS CORRESPONDING TO 4 QUADRANTS */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {currentQ.options.map((opt) => {
                const isSelected = selectedOption === opt.letter;
                const zoneBadge =
                  opt.letter === "A"
                    ? "↖️ Top Left"
                    : opt.letter === "B"
                    ? "↗️ Top Right"
                    : opt.letter === "C"
                    ? "↙️ Down Left"
                    : "↘️ Down Right";

                return (
                  <div
                    key={opt.letter}
                    onClick={() => swimToZone(opt.letter)}
                    className={`paper-card lift-hover group cursor-pointer p-4 transition-all sm:p-5 flex flex-col justify-between ${
                      isSelected
                        ? "border-2 border-primary bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-lift scale-[1.01]"
                        : "bg-card hover:border-primary/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-display text-sm font-bold transition-colors ${
                              isSelected
                                ? "bg-primary-foreground text-primary"
                                : "border border-border bg-background text-foreground group-hover:border-primary"
                            }`}
                          >
                            {opt.letter}
                          </span>
                          <span
                            className={`text-[0.65rem] font-bold uppercase tracking-wider ${
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            {zoneBadge}
                          </span>
                        </div>

                        {isSelected ? (
                          <span className="rounded-full bg-primary-foreground px-2.5 py-0.5 text-[0.62rem] font-bold text-primary shadow-sm">
                            ✓ Locked (5s hold)
                          </span>
                        ) : activeZone === opt.letter ? (
                          <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[0.62rem] font-bold border border-amber-500/30 animate-pulse">
                            ⏱️ Holding {(5 - dwellInfo.secondsLeft).toFixed(1)}s / 5s
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 font-bold text-base sm:text-lg">{opt.text}</p>
                    </div>

                    {isSelected && (
                      <div className="animate-enter-up mt-3 border-t border-primary-foreground/20 pt-2.5">
                        <p className="hand text-base text-primary-foreground">
                          Verdict: {opt.verdict}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* COACH FIN WITTY NOTE */}
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-accent/60 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent">
                <img src={coachFin} alt="Coach Fin" className="h-8 w-8 object-contain" />
              </div>
              <p className="hand text-sm font-semibold text-foreground sm:text-base">
                {currentQ.coachQuirk}
              </p>
            </div>

            {/* NAVIGATION CONTROLS */}
            <div className="mt-8 flex items-center justify-between border-t border-border/80 pt-6">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={handlePrevious}
                className="press cursor-pointer rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={!selectedOption}
                onClick={handleNext}
                className="press cursor-pointer rounded-full bg-primary px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift transition-all hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none"
              >
                {currentIdx < questions.length - 1 ? "Next Question →" : "See IQ Results 🎓"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TEST COMPLETION / RESULTS CARD */
        <div className="paper-card grid-paper animate-enter-up mt-10 p-6 sm:p-10">
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-primary/60 bg-primary p-8 text-center text-primary-foreground">
            <Bubbles count={12} className="text-primary-foreground/40" />
            <Eyebrow>
              <span className="text-primary-foreground/75">Official Examination Record</span>
            </Eyebrow>

            <h2 className="display-xl mt-4 text-[clamp(2.5rem,8vw,4.5rem)]">
              Fish IQ: 168
            </h2>
            <p className="font-display text-lg tracking-widest uppercase opacity-85">
              Grade: Certified Unnecessarily Genius
            </p>

            <div className="relative mx-auto mt-6 flex justify-center">
              <img
                src={meemee}
                alt="Meemee the genius"
                className="animate-swim h-32 w-32 brightness-0 invert object-contain"
              />
            </div>

            <p className="hand mt-6 text-xl text-primary-foreground sm:text-2xl">
              “Meemee answered with complete disregard for traditional biological logic by swimming through all 4 quadrants. A flawless test.”
            </p>
            <p className="eyebrow mt-1 text-[0.65rem] text-primary-foreground/70">
              Exam Method: 4-Quadrant Aquatic Motion Guidance (↖️ A, ↗️ B, ↙️ C, ↘️ D)
            </p>
          </div>

          {/* DIAGNOSIS BREAKDOWN */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="paper-card p-5">
              <Eyebrow>Water Reflexes</Eyebrow>
              <p className="display-xl mt-2 text-2xl text-primary">100%</p>
              <p className="mt-1 text-xs text-muted-foreground">Panics on schedule</p>
            </div>
            <div className="paper-card p-5">
              <Eyebrow>Hook Avoidance</Eyebrow>
              <p className="display-xl mt-2 text-2xl text-primary">50%</p>
              <p className="mt-1 text-xs text-muted-foreground">Worm was too tempting</p>
            </div>
            <div className="paper-card p-5">
              <Eyebrow>Glass Resilience</Eyebrow>
              <p className="display-xl mt-2 text-2xl text-primary">∞</p>
              <p className="mt-1 text-xs text-muted-foreground">Bonking ongoing</p>
            </div>
          </div>

          {/* NEON VERIFICATION STAMP */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">
                {iqSaved ? "Exam Certified & Stored in Neon PostgreSQL (wandering-glitter-70313579)" : "Syncing Examination to Neon Database..."}
              </span>
            </div>
            <span className="font-mono text-[0.65rem] opacity-75">Table: fish_iq_records</span>
          </div>

          {/* GLOBAL FISH IQ HALL OF FAME */}
          {topRecords.length > 0 && (
            <div className="mt-8">
              <Eyebrow>Neon Global Standings</Eyebrow>
              <h3 className="display-xl mt-2 text-xl sm:text-2xl">Aquatic Genius Hall of Fame</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Verified high IQ fish recorded in Neon Serverless PostgreSQL.
              </p>
              <div className="mt-4 space-y-2">
                {topRecords.map((rec, i) => (
                  <div
                    key={rec.id || i}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-primary">#{i + 1}</span>
                      <div>
                        <span className="font-bold uppercase text-foreground">{rec.fish_name}</span>
                        <span className="ml-2 text-[0.65rem] text-muted-foreground">({rec.grade})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[0.65rem] text-muted-foreground">Reflexes: {rec.water_reflexes}%</span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-display text-sm font-bold text-primary">
                        IQ {rec.iq_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRestart}
              className="press cursor-pointer rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-lift transition-colors hover:bg-primary/90"
            >
              🔄 Retake IQ Test
            </button>
            <PillButton to="/train" variant="outline">
              Train Again
            </PillButton>
            <PillButton to="/certificate" variant="ghost">
              Claim Certificate
            </PillButton>
            <PillButton to="/" variant="ghost">
              Back to Home
            </PillButton>
          </div>
        </div>
      )}
    </section>
  );
}
