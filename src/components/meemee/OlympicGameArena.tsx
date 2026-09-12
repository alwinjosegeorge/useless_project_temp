import { useState, useEffect, useRef, useCallback } from "react";
import meemee from "@/assets/meemee.png";
import { Bubbles, Eyebrow } from "@/components/meemee/bits";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type OlympicEventId = "100m" | "uturn" | "splash" | "bubbles" | "lazy";

export interface CameraMotionState {
  active: boolean;
  intensity: number; // 0 - 100
  normX: number; // -1 (left) to +1 (right)
  normY: number; // -1 (top) to +1 (bottom)
  handX: number; // 0 - 100%
  handY: number; // 0 - 100%
  grid: boolean[][]; // 4 rows x 6 cols
}

interface OlympicGameArenaProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: OlympicEventId;
  onAwardMedal: (eventId: OlympicEventId, medal: "gold" | "silver" | "bronze") => void;
}

export function OlympicGameArena({
  isOpen,
  onClose,
  eventId,
  onAwardMedal,
}: OlympicGameArenaProps) {
  // Shared Camera State for all Olympic mini-games
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

  // Live motion values for games and UI feedback
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [handPos, setHandPos] = useState({ x: 50, y: 50 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

  // Real-time motion data container passed down to games
  const motionDataRef = useRef<CameraMotionState>({
    active: false,
    intensity: 0,
    normX: 0,
    normY: 0,
    handX: 50,
    handY: 50,
    grid: Array.from({ length: 4 }, () => Array(6).fill(false)),
  });

  // Start Webcam automatically
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraLoading(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      setActiveStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video auto-play suppressed:", playErr);
        }
      }
      setCameraActive(true);
      motionDataRef.current.active = true;
    } catch (e: unknown) {
      console.warn("Camera access error:", e);
      const msg = e instanceof Error ? e.message : "Camera access required for Olympic games.";
      setCameraError(msg);
      setCameraActive(false);
      setActiveStream(null);
      motionDataRef.current.active = false;
    } finally {
      setCameraLoading(false);
    }
  }, []);

  // Stop Webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveStream(null);
    prevFrameRef.current = null;
    setCameraActive(false);
    setMotionIntensity(0);
    motionDataRef.current.active = false;
  }, []);

  // Auto-start camera when arena opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  // High-performance Computer Vision Motion Engine (30 FPS)
  useEffect(() => {
    if (!cameraActive || !isOpen) return;

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      // Ensure stream is attached and playing
      if (streamRef.current && video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        video.play().catch(() => {});
      }

      if (video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Draw mirrored video frame for natural motion
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -width, 0, width, height);
      ctx.restore();

      const curData = ctx.getImageData(0, 0, width, height).data;

      if (prevFrameRef.current) {
        const prev = prevFrameRef.current;
        let diffCount = 0;
        let sumX = 0;
        let sumY = 0;

        // 4 rows x 6 cols grid for spatial detection
        const gridCols = 6;
        const gridRows = 4;
        const gridCounts: number[][] = Array.from({ length: gridRows }, () =>
          Array(gridCols).fill(0)
        );

        for (let i = 0; i < curData.length; i += 4 * 2) {
          const rDiff = Math.abs(curData[i]! - prev[i]!);
          const gDiff = Math.abs(curData[i + 1]! - prev[i + 1]!);
          const bDiff = Math.abs(curData[i + 2]! - prev[i + 2]!);
          const totalDiff = rDiff + gDiff + bDiff;

          if (totalDiff > 52) {
            const pixelIdx = i / 4;
            const px = pixelIdx % width;
            const py = Math.floor(pixelIdx / width);

            sumX += px;
            sumY += py;
            diffCount++;

            const col = Math.min(Math.floor((px / width) * gridCols), gridCols - 1);
            const row = Math.min(Math.floor((py / height) * gridRows), gridRows - 1);
            gridCounts[row]![col]!++;
          }
        }

        // Noise-floor subtracted motion intensity (sitting still = 0% - 5%)
        const effectiveDiff = Math.max(0, diffCount - 12);
        const intensity = Math.min(Math.round((effectiveDiff / 130) * 100), 100);
        setMotionIntensity(intensity);

        if (diffCount > 15) {
          const avgX = sumX / diffCount;
          const avgY = sumY / diffCount;

          const normX = (avgX - width / 2) / (width / 2);
          const normY = (avgY - height / 2) / (height / 2);

          const hX = Math.round((avgX / width) * 100);
          const hY = Math.round((avgY / height) * 100);

          setHandPos({ x: hX, y: hY });

          const motionGrid = gridCounts.map((row) =>
            row.map((cellCount) => cellCount > 6)
          );

          motionDataRef.current = {
            active: true,
            intensity,
            normX,
            normY,
            handX: hX,
            handY: hY,
            grid: motionGrid,
          };
        } else {
          motionDataRef.current = {
            ...motionDataRef.current,
            intensity,
            grid: Array.from({ length: 4 }, () => Array(6).fill(false)),
          };
        }
      }

      prevFrameRef.current = new Uint8ClampedArray(curData);
    }, 40);

    return () => clearInterval(interval);
  }, [cameraActive, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="paper-card grid-paper border-2 border-primary/50 bg-card p-4 sm:max-w-3xl sm:p-5 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <DialogTitle className="display-xl text-xl sm:text-2xl text-foreground">
                  Fish Olympics Arena
                </DialogTitle>
                <p className="text-[0.7rem] text-muted-foreground">
                  100% Real-Time Camera Motion & Gesture Controls
                </p>
              </div>
            </div>

            {/* LIVE CAMERA PIP & SENSOR STATUS */}
            <div className="flex items-center gap-2">
              {cameraActive ? (
                <div className="flex items-center gap-2.5 rounded-2xl border border-primary/40 bg-accent/40 px-3 py-1.5 shadow-sm">
                  {/* Mirrored PIP Video preview - guaranteed active stream */}
                  <div className="relative h-14 w-20 sm:h-16 sm:w-24 overflow-hidden rounded-lg border-2 border-primary/60 bg-black shadow-inner">
                    <video
                      ref={(el) => {
                        if (el && activeStream && el.srcObject !== activeStream) {
                          el.srcObject = activeStream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover [transform:scaleX(-1)]"
                    />
                    {/* Live Motion Activity Ring */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500 transition-all duration-75"
                      style={{ width: `${motionIntensity}%` }}
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-600">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-600" />
                      Camera Live
                    </span>
                    <span className="text-[0.6rem] text-muted-foreground tabular-nums font-mono">
                      Motion: {motionIntensity}%
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={cameraLoading}
                  className="press flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-lift"
                >
                  <span>📹</span>
                  <span>{cameraLoading ? "Starting..." : "Connect Camera"}</span>
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Persistent Hidden video & analysis canvas for computer vision engine */}
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el && activeStream && el.srcObject !== activeStream) {
              el.srcObject = activeStream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        <canvas ref={canvasRef} width={80} height={60} className="hidden" />

        {/* CAMERA PERMISSION NOTICE (if not yet granted) */}
        {!cameraActive && !cameraLoading && (
          <div className="my-3 rounded-2xl border-2 border-dashed border-amber-500/50 bg-amber-500/10 p-4 text-center">
            <span className="text-3xl">📹</span>
            <h4 className="font-display mt-1 text-base font-bold text-amber-900 dark:text-amber-200">
              Camera Input Required For Olympic Competition
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {cameraError ||
                "This event is controlled purely by your physical movements, gestures, and stillness in front of your camera!"}
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="press mt-3 rounded-full bg-amber-500 px-6 py-2 text-xs font-bold uppercase tracking-wider text-amber-950 shadow-lift hover:bg-amber-400"
            >
              Allow Camera & Enter Arena
            </button>
          </div>
        )}

        {/* ACTIVE MINI-GAME DISPATCHER */}
        <div className="mt-3">
          {eventId === "100m" && (
            <Game100m
              cameraActive={cameraActive}
              motionDataRef={motionDataRef}
              onWin={(medal) => onAwardMedal("100m", medal)}
            />
          )}

          {eventId === "uturn" && (
            <GameUTurn
              cameraActive={cameraActive}
              motionDataRef={motionDataRef}
              onWin={(medal) => onAwardMedal("uturn", medal)}
            />
          )}

          {eventId === "splash" && (
            <GameSplash
              cameraActive={cameraActive}
              motionDataRef={motionDataRef}
              onWin={(medal) => onAwardMedal("splash", medal)}
            />
          )}

          {eventId === "bubbles" && (
            <GameBubbles
              cameraActive={cameraActive}
              motionDataRef={motionDataRef}
              handPos={handPos}
              onWin={(medal) => onAwardMedal("bubbles", medal)}
            />
          )}

          {eventId === "lazy" && (
            <GameLazy
              cameraActive={cameraActive}
              motionDataRef={motionDataRef}
              onWin={(medal) => onAwardMedal("lazy", medal)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================
// GAME 1: 100M SWIMMING DASH (WAVE HANDS RAPIDLY TO PADDLE)
// =============================================================
function Game100m({
  cameraActive,
  motionDataRef,
  onWin,
}: {
  cameraActive: boolean;
  motionDataRef: React.MutableRefObject<CameraMotionState>;
  onWin: (medal: "gold" | "silver" | "bronze") => void;
}) {
  const [playerDist, setPlayerDist] = useState(0);
  const [bubblesDist, setBubblesDist] = useState(0);
  const [finDieselDist, setFinDieselDist] = useState(0);
  const [nemoDist, setNemoDist] = useState(0);
  const [gameState, setGameState] = useState<"ready" | "racing" | "finished">("ready");
  const [elapsed, setElapsed] = useState(0);
  const [paddlePower, setPaddlePower] = useState(0);
  const [resultMedal, setResultMedal] = useState<"gold" | "silver" | "bronze" | null>(null);

  // Camera Motion-Driven Physics Loop (ticks every 50ms)
  useEffect(() => {
    const interval = window.setInterval(() => {
      const motion = motionDataRef.current;
      const intensity = motion.intensity;

      // Real-time paddle power reflection
      setPaddlePower(intensity);

      if (gameState === "racing") {
        // Camera motion directly thrusts Meemee forward
        if (intensity > 12) {
          const thrust = (intensity / 100) * 1.8 + 0.3;
          setPlayerDist((prev) => Math.min(prev + thrust, 100));
        }

        // AI Competitors swim forward steadily
        setBubblesDist((prev) => Math.min(prev + (Math.random() * 0.9 + 0.6), 100));
        setFinDieselDist((prev) => Math.min(prev + (Math.random() * 0.85 + 0.55), 100));
        setNemoDist((prev) => Math.min(prev + (Math.random() * 1.0 + 0.4), 100));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, motionDataRef]);

  // Stopwatch timer
  useEffect(() => {
    if (gameState !== "racing") return;

    const start = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const sec = (now - start) / 1000;
      setElapsed(Math.round(sec * 10) / 10);
    }, 100);

    return () => clearInterval(interval);
  }, [gameState]);

  // Check finish line
  useEffect(() => {
    if (gameState === "racing" && playerDist >= 100) {
      setGameState("finished");
      let medal: "gold" | "silver" | "bronze" = "bronze";
      if (bubblesDist < 100 && finDieselDist < 100 && nemoDist < 100) {
        medal = "gold";
      } else if (bubblesDist >= 100 && finDieselDist < 100) {
        medal = "silver";
      }
      setResultMedal(medal);
      onWin(medal);
    }
  }, [playerDist, bubblesDist, finDieselDist, nemoDist, gameState, onWin]);

  const startRace = () => {
    setPlayerDist(0);
    setBubblesDist(0);
    setFinDieselDist(0);
    setNemoDist(0);
    setElapsed(0);
    setPaddlePower(0);
    setResultMedal(null);
    setGameState("racing");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>Event 01 · Camera Sprint</Eyebrow>
          <h3 className="display-xl text-xl sm:text-2xl">100m Olympic Sprint</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 font-display text-sm font-bold text-primary-foreground tabular-nums">
            ⏱️ {elapsed}s
          </span>
        </div>
      </div>

      {/* 4 RACE LANES */}
      <div className="relative space-y-2 rounded-2xl border-2 border-border bg-water p-4 text-water-foreground overflow-hidden shadow-paper">
        <div className="absolute inset-0 bg-gradient-to-r from-water via-water to-water-deep opacity-90 rounded-2xl" />

        {/* Finish Ribbon */}
        <div className="absolute right-10 top-0 bottom-0 z-10 w-1 border-r-2 border-dashed border-amber-300 opacity-90">
          <span className="absolute -top-1 -right-4 rounded bg-amber-400 px-1 py-0.5 text-[0.55rem] font-bold text-amber-950">
            FINISH
          </span>
        </div>

        {/* Lane 1: Meemee (Camera Player) */}
        <div className="relative z-10 flex items-center justify-between rounded-xl bg-water-deep/75 px-3 py-2 border border-amber-300/40">
          <div className="w-24 shrink-0 flex items-center gap-1.5">
            <span className="font-display text-xs font-bold text-amber-300">Lane 1 (You)</span>
            <span className="text-xs">📹</span>
          </div>
          <div className="relative mx-3 h-7 flex-1">
            <div
              className="absolute top-0 transition-all duration-75"
              style={{ left: `${playerDist * 0.85}%` }}
            >
              <div className="flex items-center">
                <img src={meemee} alt="Meemee" className="h-7 brightness-0 invert" />
                {paddlePower > 25 && (
                  <span className="text-[0.65rem] animate-pulse">💨</span>
                )}
              </div>
            </div>
          </div>
          <span className="font-display text-xs tabular-nums text-amber-300 font-bold">
            {Math.round(playerDist)}m
          </span>
        </div>

        {/* Lane 2: Bubbles */}
        <div className="relative z-10 flex items-center justify-between rounded-xl bg-water-deep/40 px-3 py-1.5 opacity-90">
          <span className="w-24 shrink-0 font-display text-xs text-water-foreground/80">Bubbles</span>
          <div className="relative mx-3 h-5 flex-1">
            <span
              className="absolute text-lg transition-all duration-100"
              style={{ left: `${bubblesDist * 0.85}%` }}
            >
              🐟
            </span>
          </div>
          <span className="font-display text-xs tabular-nums">{Math.round(bubblesDist)}m</span>
        </div>

        {/* Lane 3: Fin Diesel */}
        <div className="relative z-10 flex items-center justify-between rounded-xl bg-water-deep/40 px-3 py-1.5 opacity-90">
          <span className="w-24 shrink-0 font-display text-xs text-water-foreground/80">Fin Diesel</span>
          <div className="relative mx-3 h-5 flex-1">
            <span
              className="absolute text-lg transition-all duration-100"
              style={{ left: `${finDieselDist * 0.85}%` }}
            >
              🐠
            </span>
          </div>
          <span className="font-display text-xs tabular-nums">{Math.round(finDieselDist)}m</span>
        </div>

        {/* Lane 4: Nemo-ish */}
        <div className="relative z-10 flex items-center justify-between rounded-xl bg-water-deep/40 px-3 py-1.5 opacity-90">
          <span className="w-24 shrink-0 font-display text-xs text-water-foreground/80">Nemo-ish</span>
          <div className="relative mx-3 h-5 flex-1">
            <span
              className="absolute text-lg transition-all duration-100"
              style={{ left: `${nemoDist * 0.85}%` }}
            >
              🐡
            </span>
          </div>
          <span className="font-display text-xs tabular-nums">{Math.round(nemoDist)}m</span>
        </div>
      </div>

      {/* LIVE CAMERA THRUST GAUGE (Visible in both Ready & Racing modes) */}
      <div className="rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-display font-bold text-foreground">
            ⚡ Camera Hand Flutter Sensor:
          </span>
          <span className="font-display font-bold text-primary tabular-nums">
            {paddlePower > 60
              ? "🔥 MAX TURBO PROPULSION!"
              : paddlePower > 25
              ? "⚡ Active Paddling Detected"
              : "👋 Wave hands in front of camera!"}
          </span>
        </div>
        <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-muted border border-border">
          <div
            className={`h-full transition-all duration-75 ${
              paddlePower > 60 ? "bg-amber-500 animate-pulse" : "bg-primary"
            }`}
            style={{ width: `${Math.max(paddlePower, 4)}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {gameState === "racing"
            ? "Keep flapping both hands rapidly like fins to sprint to the finish!"
            : "Wave your hands now to test the sensor bar, then click Start Camera Sprint!"}
        </p>
      </div>

      {/* CONTROLS */}
      {gameState === "ready" && (
        <div className="text-center">
          <button
            type="button"
            onClick={startRace}
            className="press rounded-full bg-primary px-9 py-4 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift hover:scale-105 active:scale-95"
          >
            🏁 Start Camera Sprint
          </button>
        </div>
      )}

      {gameState === "finished" && (
        <div className="animate-enter-up rounded-2xl border-2 border-primary bg-primary p-5 text-center text-primary-foreground">
          <span className="text-3xl">
            {resultMedal === "gold" ? "🥇" : resultMedal === "silver" ? "🥈" : "🥉"}
          </span>
          <h4 className="display-xl mt-2 text-2xl uppercase">
            {resultMedal === "gold"
              ? "Gold Medalist! 🥇"
              : resultMedal === "silver"
              ? "Silver Finish! 🥈"
              : "Bronze Finish! 🥉"}
          </h4>
          <p className="hand mt-1 text-base text-primary-foreground">
            Official 100m Camera Sprint Time: {elapsed}s.
          </p>
          <button
            type="button"
            onClick={startRace}
            className="press mt-4 rounded-full bg-primary-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary shadow-lift"
          >
            Race Again
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================
// GAME 2: FASTEST U-TURN (CAMERA REFLEX JERK / DODGE)
// =============================================================
function GameUTurn({
  cameraActive,
  motionDataRef,
  onWin,
}: {
  cameraActive: boolean;
  motionDataRef: React.MutableRefObject<CameraMotionState>;
  onWin: (medal: "gold" | "silver" | "bronze") => void;
}) {
  const [phase, setPhase] = useState<"idle" | "ready" | "scare" | "result">("idle");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [medal, setMedal] = useState<"gold" | "silver" | "bronze" | "none">("none");
  const [verdict, setVerdict] = useState("");
  const timerRef = useRef<number | null>(null);
  const scareTimeRef = useRef<number>(0);
  const readyStartTimeRef = useRef<number>(0);

  // Monitor camera for reflex twitch
  useEffect(() => {
    const interval = window.setInterval(() => {
      const intensity = motionDataRef.current.intensity;
      const now = performance.now();

      // Only check false start after a 750ms grace period to let mouse/finger click motion settle
      if (phase === "ready" && now - readyStartTimeRef.current > 750 && intensity > 68) {
        // False start before danger!
        if (timerRef.current) clearTimeout(timerRef.current);
        setPhase("result");
        setReactionTime(null);
        setMedal("none");
        setVerdict("False Alarm! You flinched before the snail even appeared. 💀");
      } else if (phase === "scare" && intensity > 25) {
        // Triggered upon danger!
        const diff = Math.round(performance.now() - scareTimeRef.current);
        setReactionTime(diff);
        setPhase("result");

        if (diff < 180) {
          setMedal("gold");
          setVerdict(`Insane ${diff}ms! Olympic Gold Panic! Twitch reflexes of pure dread! 🥇`);
          onWin("gold");
        } else if (diff < 340) {
          setMedal("silver");
          setVerdict(`Sharp ${diff}ms! High speed camera dodge! Silver awarded. 🥈`);
          onWin("silver");
        } else {
          setMedal("bronze");
          setVerdict(`${diff}ms! A bit delayed, but you avoided the snail! 🥉`);
          onWin("bronze");
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [phase, motionDataRef, onWin]);

  const startTest = () => {
    readyStartTimeRef.current = performance.now();
    setPhase("ready");
    setReactionTime(null);
    setVerdict("");
    setMedal("none");

    const delay = 1800 + Math.random() * 2600;
    timerRef.current = window.setTimeout(() => {
      scareTimeRef.current = performance.now();
      setPhase("scare");
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Event 02 · Camera Reflex</Eyebrow>
        <h3 className="display-xl text-xl sm:text-2xl">Fastest U-Turn Panic Test</h3>
      </div>

      <div className="relative flex h-36 sm:h-44 items-center justify-between overflow-hidden rounded-2xl border-2 border-border bg-water px-6 py-4 text-water-foreground shadow-paper">
        <div className="absolute inset-0 bg-gradient-to-r from-water to-water-deep opacity-90" />

        {/* Meemee swimming */}
        <div className="relative z-10 flex flex-col items-center">
          <img
            src={meemee}
            alt="Meemee"
            className={`h-12 brightness-0 invert sm:h-16 transition-transform duration-200 ${
              phase === "scare" || phase === "result" ? "scale-x-[1]" : "scale-x-[-1]"
            }`}
          />
          <span className="eyebrow block text-center text-[0.65rem] text-water-foreground/90 mt-1 font-bold">
            {phase === "scare" ? "🚨 PANIC U-TURN!" : phase === "result" ? "U-TURN ESCAPE" : "SWIMMING ➡️"}
          </span>
        </div>

        {/* Danger Obstacle */}
        <div className="relative z-10 text-center">
          {phase === "scare" ? (
            <div className="animate-bounce">
              <span className="text-4xl sm:text-5xl">🐌</span>
              <p className="mt-1 font-display text-xs font-bold text-red-300">
                ⚠️ SUSPICIOUS SEA SNAIL!
              </p>
            </div>
          ) : (
            <div className="text-center opacity-40">
              <span className="text-2xl sm:text-3xl">🪨</span>
              <span className="block text-[0.6rem] text-water-foreground/60">Approaching Rock</span>
            </div>
          )}
        </div>
      </div>

      {phase === "idle" && (
        <div className="space-y-3 pt-1 text-center">
          <div className="rounded-xl border border-primary/25 bg-accent/40 p-3 text-left">
            <p className="font-display text-xs font-bold text-foreground">🎯 How to Play Event 02:</p>
            <ol className="mt-1 space-y-1 text-[0.7rem] text-muted-foreground list-decimal list-inside">
              <li>Click <strong>Start Reflex Test</strong> below.</li>
              <li>Meemee will swim forward towards the rock. <strong>Freeze and stay still</strong> in front of your camera! (Moving early causes a false alarm!)</li>
              <li>When the <strong>🚨 Sea Snail</strong> flashes, <strong>instantly swipe your hand or dodge your head</strong>!</li>
              <li>Your reaction speed will be timed in milliseconds (&lt;180ms for 🥇 Gold!).</li>
            </ol>
          </div>

          <button
            type="button"
            onClick={startTest}
            className="press w-full rounded-full bg-primary py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift hover:scale-[1.02] active:scale-95 transition-all"
          >
            ▶️ Start Reflex Test Now!
          </button>
        </div>
      )}

      {phase === "ready" && (
        <div className="rounded-2xl border border-primary/30 bg-card p-4 text-center">
          <p className="font-display animate-pulse text-base font-bold text-foreground">
            Swimming forward... Hold position in front of camera... DO NOT FLINCH YET!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Camera is tracking your stillness. Moving now causes a false start!
          </p>
        </div>
      )}

      {phase === "scare" && (
        <div className="animate-bounce rounded-2xl bg-red-600 p-5 text-center text-white shadow-lift">
          <h4 className="display-xl text-2xl font-bold uppercase">
            🚨 SWIPE / DODGE IN FRONT OF CAMERA NOW!!
          </h4>
          <p className="mt-1 text-xs opacity-90">
            Fastest motion jerk captures your reaction time in milliseconds!
          </p>
        </div>
      )}

      {phase === "result" && (
        <div className="animate-enter-up rounded-2xl border-2 border-primary bg-card p-5 text-center shadow-paper">
          <span className="text-4xl">
            {medal === "gold" ? "🥇" : medal === "silver" ? "🥈" : medal === "bronze" ? "🥉" : "💀"}
          </span>
          <h4 className="display-xl mt-2 text-2xl">
            {reactionTime ? `${reactionTime} Milliseconds` : "Disqualified"}
          </h4>
          <p className="hand mt-2 text-lg text-foreground font-semibold">"{verdict}"</p>
          <button
            type="button"
            onClick={startTest}
            className="press mt-4 rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift"
          >
            Try Reflex Again
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================
// GAME 3: MOST DRAMATIC SPLASH (2-STAGE CAMERA BREACH DIVE)
// =============================================================
function GameSplash({
  cameraActive,
  motionDataRef,
  onWin,
}: {
  cameraActive: boolean;
  motionDataRef: React.MutableRefObject<CameraMotionState>;
  onWin: (medal: "gold" | "silver" | "bronze") => void;
}) {
  const [charge, setCharge] = useState(0);
  const [phase, setPhase] = useState<"charge" | "launch_ready" | "air" | "splash" | "score">("charge");
  const [chosenPose, setChosenPose] = useState("Majestic Cannonball");
  const [totalScore, setTotalScore] = useState("0");

  // Camera Motion Monitor
  useEffect(() => {
    const interval = window.setInterval(() => {
      const motion = motionDataRef.current;

      if (phase === "charge") {
        // Pumping hands charges power
        if (motion.intensity > 15) {
          setCharge((c) => {
            const next = Math.min(c + 4, 100);
            if (next >= 90) {
              setPhase("launch_ready");
            }
            return next;
          });
        }
      } else if (phase === "launch_ready") {
        // Detect sudden upward gesture or jump to breach
        if (motion.normY < -0.25 || (motion.intensity > 40 && motion.normY < 0)) {
          // Detect pose based on hand horizontal placement
          let pose = "Majestic Cannonball";
          if (motion.normX < -0.25) pose = "The Bellyflop";
          else if (motion.normX > 0.25) pose = "The Sunglasses Flail";

          setChosenPose(pose);
          setPhase("air");

          setTimeout(() => {
            setPhase("splash");
            setTimeout(() => {
              const calculated = (27 + (charge / 100) * 2.8).toFixed(1);
              setTotalScore(calculated);
              setPhase("score");
              onWin("gold");
            }, 1000);
          }, 1200);
        }
      }
    }, 45);

    return () => clearInterval(interval);
  }, [phase, charge, motionDataRef, onWin]);

  const resetDive = () => {
    setCharge(0);
    setPhase("charge");
  };

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Event 03 · Camera High Dive</Eyebrow>
        <h3 className="display-xl text-xl sm:text-2xl">Most Dramatic Splash</h3>
      </div>

      <div className="relative aspect-[16/8] overflow-hidden rounded-2xl border-2 border-border bg-water p-4 text-center shadow-paper">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/30 via-water to-water-deep" />

        {phase === "charge" && (
          <div className="relative z-10 flex h-full flex-col items-center justify-center">
            <img src={meemee} alt="Meemee" className="h-12 brightness-0 invert animate-bounce" />
            <p className="eyebrow mt-3 text-water-foreground">Deep Tank Energy Charging</p>
            <div className="mt-2 h-4 w-60 overflow-hidden rounded-full bg-water-deep border border-water-foreground/40">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${charge}%` }}
              />
            </div>
            <span className="mt-1 font-display text-xs text-water-foreground font-bold">
              {charge}% Power Charged
            </span>
          </div>
        )}

        {phase === "launch_ready" && (
          <div className="relative z-10 flex h-full flex-col items-center justify-center animate-pulse">
            <span className="text-4xl">🚀</span>
            <h4 className="display-xl mt-1 text-2xl text-amber-300">
              READY TO BREACH!
            </h4>
            <p className="hand mt-1 text-base text-water-foreground">
              THROW BOTH HANDS UP HIGH IN FRONT OF CAMERA TO LAUNCH!
            </p>
          </div>
        )}

        {phase === "air" && (
          <div className="relative z-10 flex h-full flex-col items-center justify-center animate-bounce">
            <span className="text-xs uppercase font-bold text-amber-300">Form: {chosenPose}</span>
            <img src={meemee} alt="Meemee flying" className="mt-2 h-16 brightness-0 invert rotate-45" />
            <p className="hand mt-1 text-sm text-water-foreground">"Defying aquatic physics!"</p>
          </div>
        )}

        {phase === "splash" && (
          <div className="relative z-10 flex h-full flex-col items-center justify-center">
            <span className="text-6xl animate-ping">💦</span>
            <h4 className="display-xl mt-2 text-2xl text-water-foreground">COLOSSAL SPLASH!</h4>
          </div>
        )}

        {phase === "score" && (
          <div className="relative z-10 flex h-full flex-col items-center justify-center">
            <span className="text-3xl">🥇</span>
            <h4 className="display-xl text-2xl text-water-foreground">{totalScore} / 30 Score!</h4>
            <p className="hand text-base text-amber-300">"Spectators were soaked. Perfect form."</p>
          </div>
        )}
      </div>

      {phase === "charge" && (
        <div className="rounded-2xl border border-primary/30 bg-card p-4 text-center">
          <p className="font-display text-sm font-bold text-foreground">
            👋 Wave & pump your hands up and down rapidly to charge the dive!
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Camera motion feeds straight into the launch power meter!
          </p>
        </div>
      )}

      {phase === "score" && (
        <div>
          <div className="grid grid-cols-3 gap-2 border-t border-border/80 pt-4 text-center">
            <div className="paper-card p-2.5">
              <p className="eyebrow">Coach Fin</p>
              <p className="font-display text-xl font-bold text-primary">9.8</p>
              <p className="text-[0.65rem] text-muted-foreground">Completely soaked</p>
            </div>
            <div className="paper-card p-2.5">
              <p className="eyebrow">Starfish</p>
              <p className="font-display text-xl font-bold text-primary">9.9</p>
              <p className="text-[0.65rem] text-muted-foreground">Speechless</p>
            </div>
            <div className="paper-card p-2.5">
              <p className="eyebrow">Sleepy Crab</p>
              <p className="font-display text-xl font-bold text-primary">9.8</p>
              <p className="text-[0.65rem] text-muted-foreground">Standing ovation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetDive}
            className="press mt-4 w-full rounded-full bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift"
          >
            Dive Again
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================
// GAME 4: BEST BUBBLE FORMATION (AR HAND BUBBLE POPPING)
// =============================================================
interface PopBubble {
  id: number;
  x: number; // 10 to 85%
  y: number; // 10 to 90%
  val: number;
  type: string;
}

function GameBubbles({
  cameraActive,
  motionDataRef,
  handPos,
  onWin,
}: {
  cameraActive: boolean;
  motionDataRef: React.MutableRefObject<CameraMotionState>;
  handPos: { x: number; y: number };
  onWin: (medal: "gold" | "silver" | "bronze") => void;
}) {
  const [bubbles, setBubbles] = useState<PopBubble[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [finished, setFinished] = useState(false);
  const [fishFacing, setFishFacing] = useState<1 | -1>(1);
  const prevHandXRef = useRef(handPos.x);

  useEffect(() => {
    if (handPos.x > prevHandXRef.current + 0.5) {
      setFishFacing(1);
    } else if (handPos.x < prevHandXRef.current - 0.5) {
      setFishFacing(-1);
    }
    prevHandXRef.current = handPos.x;
  }, [handPos.x]);

  // Spawn bubbles loop
  useEffect(() => {
    if (finished) return;

    const spawnInterval = setInterval(() => {
      const isGold = Math.random() > 0.8;
      const newB: PopBubble = {
        id: Date.now() + Math.random(),
        x: 15 + Math.random() * 70,
        y: 85,
        val: isGold ? 5 : 1,
        type: isGold ? "🌟 Golden Bubble" : "🫧 Oxygen Sphere",
      };
      setBubbles((prev) => [...prev.slice(-9), newB]);
    }, 600);

    return () => clearInterval(spawnInterval);
  }, [finished]);

  // Rise bubbles loop
  useEffect(() => {
    if (finished) return;
    const riseInterval = setInterval(() => {
      setBubbles((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - 3.5 }))
          .filter((b) => b.y > 6)
      );
    }, 65);
    return () => clearInterval(riseInterval);
  }, [finished]);

  // Real-Time Camera Hand Collision Popping
  useEffect(() => {
    if (finished) return;

    const popInterval = setInterval(() => {
      const motion = motionDataRef.current;
      if (!motion.active || motion.intensity < 15) return;

      const hX = motion.handX;
      const hY = motion.handY;

      setBubbles((prev) => {
        const remaining: PopBubble[] = [];
        let poppedScore = 0;

        for (const b of prev) {
          // Check collision distance between tracked hand and bubble
          const dx = Math.abs(b.x - hX);
          const dy = Math.abs(b.y - hY);

          // Pop if hand is within range of bubble
          if (dx < 16 && dy < 18) {
            poppedScore += b.val;
          } else {
            remaining.push(b);
          }
        }

        if (poppedScore > 0) {
          setScore((s) => s + poppedScore);
        }

        return remaining;
      });
    }, 45);

    return () => clearInterval(popInterval);
  }, [finished, motionDataRef]);

  // 15-second countdown
  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (finished) {
      if (score >= 15) onWin("gold");
      else if (score >= 8) onWin("silver");
      else onWin("bronze");
    }
  }, [finished, score, onWin]);

  const restartGame = () => {
    setScore(0);
    setTimeLeft(15);
    setBubbles([]);
    setFinished(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Eyebrow>Event 04 · AR Camera Swat</Eyebrow>
          <h3 className="display-xl text-xl sm:text-2xl">Bubble Pop Arena</h3>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-accent px-3 py-1 font-display text-sm font-bold text-accent-foreground">
            🫧 Score: {score} pts
          </span>
          <span className="rounded-full bg-primary px-3 py-1 font-display text-sm font-bold text-primary-foreground tabular-nums">
            ⏳ {timeLeft}s
          </span>
        </div>
      </div>

      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border-2 border-border bg-water p-4 shadow-paper">
        <div className="absolute inset-0 bg-gradient-to-b from-water via-water to-water-deep opacity-90" />

        {/* Real-Time Camera Swimmer Fish / Bubble Popper Indicator */}
        <div
          className="pointer-events-none absolute z-20 transition-all duration-75"
          style={{
            left: `${handPos.x}%`,
            top: `${handPos.y}%`,
            transform: `translate(-50%, -50%) scaleX(${fishFacing})`,
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* Water Ripple Ring */}
            <span className="h-12 w-12 animate-ping rounded-full border-2 border-cyan-300 bg-cyan-400/20" />

            {/* Cute Swimming Fish with Sunglasses */}
            <div className="absolute flex items-center justify-center filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)]">
              <svg
                width="46"
                height="32"
                viewBox="0 0 34 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Tail Fin with Animated Flutter */}
                <path
                  d="M4 7 C0 3, 0 21, 4 17 L9 12 Z"
                  fill="#38bdf8"
                  className="origin-[9px_12px] animate-pulse"
                />
                <path d="M2 9 C0 5, 0 19, 2 15 L6 12 Z" fill="#7dd3fc" opacity="0.8" />

                {/* Dorsal Top Fin */}
                <path d="M13 5 C16 1, 21 1, 23 5 Z" fill="#38bdf8" />

                {/* Ventral Bottom Fin */}
                <path d="M14 19 C17 23, 21 23, 23 19 Z" fill="#38bdf8" />

                {/* Main Fish Body */}
                <ellipse cx="18.5" cy="12" rx="12" ry="7.5" fill="#0284c7" />

                {/* Cute Belly Tone */}
                <path
                  d="M11 14 C15 18, 24 18, 27 14 C24 19.5, 15 19.5, 11 14 Z"
                  fill="#bae6fd"
                  opacity="0.9"
                />

                {/* Cute Eye */}
                <circle cx="24" cy="9.5" r="2.8" fill="white" />
                <circle cx="25" cy="9.5" r="1.5" fill="#0f172a" />
                <circle cx="25.5" cy="8.8" r="0.6" fill="white" />

                {/* Cool Sunglasses */}
                <g>
                  <rect x="20" y="7.5" width="8" height="4" rx="1.2" fill="#0f172a" />
                  <line x1="19" y1="9" x2="21" y2="9" stroke="#0f172a" strokeWidth="1.2" />
                  <line x1="22" y1="8" x2="26" y2="10.5" stroke="white" strokeWidth="0.8" opacity="0.6" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Rising Bubbles */}
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
          >
            <span className="text-3xl select-none">{b.val === 5 ? "⭐" : "🫧"}</span>
          </div>
        ))}

        {finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-water-deep/85 backdrop-blur-sm text-water-foreground z-30">
            <span className="text-4xl">
              {score >= 15 ? "🥇" : score >= 8 ? "🥈" : "🥉"}
            </span>
            <h4 className="display-xl mt-2 text-2xl">
              {score >= 15 ? "Gold Bubble Master! 🥇" : "Silver Formation! 🥈"}
            </h4>
            <p className="hand mt-1 text-base text-amber-300">
              Total Score: {score} points popped with camera tracking!
            </p>
            <button
              type="button"
              onClick={restartGame}
              className="press mt-4 rounded-full bg-primary-foreground px-6 py-2 text-xs font-bold uppercase tracking-wider text-primary shadow-lift"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-primary/30 bg-card p-3 text-center">
        <p className="font-display text-xs font-bold text-foreground">
          🐟 Move your hands in front of your camera to guide your fish and pop bubbles!
        </p>
        <p className="mt-1 text-[0.65rem] text-muted-foreground">
          The 🐟 fish swimmer follows your hand motion in real time. Golden stars ⭐ are worth 5 points!
        </p>
      </div>
    </div>
  );
}

// =============================================================
// GAME 5: SWIMMING WHILE DOING ABSOLUTELY NOTHING (CAMERA STILLNESS)
// =============================================================
function GameLazy({
  cameraActive,
  motionDataRef,
  onWin,
}: {
  cameraActive: boolean;
  motionDataRef: React.MutableRefObject<CameraMotionState>;
  onWin: (medal: "gold" | "silver" | "bronze") => void;
}) {
  const [secondsStill, setSecondsStill] = useState(0);
  const [failed, setFailed] = useState(false);
  const [won, setWon] = useState(false);
  const [running, setRunning] = useState(false);
  const [motionLevel, setMotionLevel] = useState(0);

  // Monitor camera stillness
  useEffect(() => {
    const interval = window.setInterval(() => {
      const intensity = motionDataRef.current.intensity;
      setMotionLevel(intensity);

      if (running && intensity > 42) {
        setFailed(true);
        setRunning(false);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [running, motionDataRef]);

  // 15 seconds stillness timer
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setSecondsStill((s) => {
        if (s >= 14) {
          setWon(true);
          setRunning(false);
          onWin("gold");
          return 15;
        }
        return s + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, onWin]);

  const startStillness = () => {
    setSecondsStill(0);
    setFailed(false);
    setWon(false);
    setRunning(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Event 05 · Camera Zen Stillness</Eyebrow>
        <h3 className="display-xl text-xl sm:text-2xl">Doing Absolutely Nothing</h3>
      </div>

      <div className="relative aspect-[16/8] overflow-hidden rounded-2xl border-2 border-border bg-water p-6 text-center text-water-foreground shadow-paper">
        <div className="absolute inset-0 bg-gradient-to-b from-water to-water-deep opacity-90" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center">
          <img src={meemee} alt="Meemee stationary" className="h-16 brightness-0 invert" />
          <h4 className="display-xl mt-3 text-3xl tabular-nums">
            {secondsStill} / 15 SECONDS STILL
          </h4>
          <p className="hand mt-1 text-sm text-water-foreground/85">
            {running
              ? "CAMERA IS WATCHING YOU: FREEZE! ZERO MOVEMENT!"
              : "15 seconds of complete stillness needed to win Gold."}
          </p>
        </div>
      </div>

      {/* LIVE CAMERA STILLNESS / ZEN SENSOR GAUGE */}
      {running && (
        <div className="rounded-2xl border-2 border-primary/30 bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-bold text-foreground">
              👁️ Camera Movement Sensor:
            </span>
            <span
              className={`font-display font-bold tabular-nums ${
                motionLevel > 30 ? "text-red-500" : "text-emerald-600"
              }`}
            >
              {motionLevel > 30 ? "⚠️ WARNING: HIGH MOVEMENT" : "✅ Normal Stillness"}
            </span>
          </div>
          <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-muted border border-border">
            <div
              className={`h-full transition-all duration-75 ${
                motionLevel > 35 ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(motionLevel * 2.4, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[0.65rem] text-muted-foreground">
            Keep pixel movement in the green zone. Natural breathing is fine; avoid sudden arm waves or body shifts!
          </p>
        </div>
      )}

      {!running && !failed && !won && (
        <div className="text-center">
          <p className="hand text-lg text-primary">
            "The hardest test in history: stay completely motionless for 15 seconds in front of your camera."
          </p>
          <button
            type="button"
            onClick={startStillness}
            className="press mt-3 rounded-full bg-primary px-8 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift"
          >
            🦥 Begin The Camera Stillness Challenge
          </button>
        </div>
      )}

      {failed && (
        <div className="animate-enter-up rounded-2xl border-2 border-red-500 bg-red-500/10 p-5 text-center text-red-600 dark:text-red-400">
          <span className="text-3xl">🚨</span>
          <h4 className="display-xl mt-1 text-xl uppercase">Disqualified For Accidental Effort!</h4>
          <p className="hand mt-1 text-base text-foreground font-semibold">
            "Camera detected physical movement! In this academy, effort is strictly penalized!"
          </p>
          <button
            type="button"
            onClick={startStillness}
            className="press mt-3 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground"
          >
            Try Stillness Again
          </button>
        </div>
      )}

      {won && (
        <div className="animate-enter-up rounded-2xl border-2 border-primary bg-primary p-5 text-center text-primary-foreground">
          <span className="text-4xl">🥇</span>
          <h4 className="display-xl mt-1 text-2xl uppercase">Gold Medal: Supreme Inertia!</h4>
          <p className="hand mt-1 text-base text-primary-foreground">
            "15 seconds of pure, unadulterated stillness. Meemee is proud."
          </p>
          <button
            type="button"
            onClick={startStillness}
            className="press mt-3 rounded-full bg-primary-foreground px-6 py-2.5 text-xs font-bold text-primary"
          >
            Rest Again
          </button>
        </div>
      )}
    </div>
  );
}
