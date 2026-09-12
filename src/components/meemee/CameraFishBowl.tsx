import { useState, useEffect, useRef, useCallback } from "react";
import meemee from "@/assets/meemee.png";
import { Bubbles, Eyebrow } from "@/components/meemee/bits";
import { Link } from "@tanstack/react-router";

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
}

type MotionDirection = "LEFT" | "RIGHT" | "UP" | "DOWN" | "STATIONARY" | "IDLE";

export interface CameraFishBowlProps {
  level?: string; // "01" | "02" | "03" | "04"
  onCompleteLevel?: (levelId: string) => void;
  onNextLevel?: () => void;
}

// Lightweight Web Audio API Synthesizer (No external assets required, zero errors if audio is blocked)
function playSynthSound(type: "pop" | "ding" | "bonk" | "boost" | "zap" | "win") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    if (type === "ding") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "bonk") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "boost") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "zap") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.22);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === "win") {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "triangle";
        o.frequency.setValueAtTime(f, now + i * 0.09);
        g.gain.setValueAtTime(0.18, now + i * 0.09);
        g.gain.linearRampToValueAtTime(0.001, now + i * 0.09 + 0.35);
        o.start(now + i * 0.09);
        o.stop(now + i * 0.09 + 0.35);
      });
    }
  } catch {
    // Audio optional
  }
}

export function CameraFishBowl({
  level = "01",
  onCompleteLevel,
  onNextLevel,
}: CameraFishBowlProps) {
  // Fish physics state
  const [posX, setPosX] = useState(25); // percentage (8 - 82)
  const [posY, setPosY] = useState(45); // percentage (16 - 76)
  const [facing, setFacing] = useState<1 | -1>(1); // 1 = right, -1 = left
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [motionDetected, setMotionDetected] = useState<MotionDirection>("STATIONARY");
  const [isRunStopped, setIsRunStopped] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Camera & Tracking state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Level-specific progress states
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: "bonk" | "star" | "pearl" | "boost" | "zap" } | null>(null);

  // Level 02 state: Collected pearls & Bonk recoil
  const [collectedPearls, setCollectedPearls] = useState<number[]>([]);
  const [isBonked, setIsBonked] = useState(false);

  // Level 03 state: Speed rings & Timer
  const [clearedRings, setClearedRings] = useState<number[]>([]);
  const [turboActive, setTurboActive] = useState(false);
  const [level3TimeLeft, setLevel3TimeLeft] = useState(30);
  const [level3Failed, setLevel3Failed] = useState(false);

  // Level 04 state: Stars & Jellyfish
  const [collectedStars, setCollectedStars] = useState<number[]>([]);
  const [isZapped, setIsZapped] = useState(false);
  const [jelly1Pos, setJelly1Pos] = useState({ x: 38, y: 40 });
  const [jelly2Pos, setJelly2Pos] = useState({ x: 64, y: 50 });

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastActiveMotionTimeRef = useRef<number>(performance.now());
  const manualStopRef = useRef(false);
  const lastHazardHitTimeRef = useRef<number>(0);
  const toastTimeoutRef = useRef<number | null>(null);

  // Bubbles emitted by fish
  const [trailBubbles, setTrailBubbles] = useState<Bubble[]>([]);

  // Physics refs for 60FPS physics loop
  const stateRef = useRef({
    x: 25,
    y: 45,
    vx: 0,
    vy: 0,
    facing: 1 as 1 | -1,
    dist: 0,
    lastBubbleTime: 0,
    isStationary: true,
  });

  const showToast = useCallback((text: string, type: "bonk" | "star" | "pearl" | "boost" | "zap") => {
    setFeedbackToast({ text, type });
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setFeedbackToast(null);
    }, 1800);
  }, []);

  // Reset or initialize state whenever level changes
  useEffect(() => {
    stateRef.current.x = 22;
    stateRef.current.y = 46;
    stateRef.current.vx = 0.35;
    stateRef.current.vy = 0;
    stateRef.current.facing = 1;
    stateRef.current.dist = 0;
    stateRef.current.isStationary = false;

    setPosX(22);
    setPosY(46);
    setFacing(1);
    setDistance(0);
    setElapsedSeconds(0);
    setLevelCompleted(false);
    setFeedbackToast(null);
    setIsRunStopped(false);
    manualStopRef.current = false;

    // Reset Level 2
    setCollectedPearls([]);
    setIsBonked(false);

    // Reset Level 3
    setClearedRings([]);
    setTurboActive(false);
    setLevel3TimeLeft(30);
    setLevel3Failed(false);

    // Reset Level 4
    setCollectedStars([]);
    setIsZapped(false);
  }, [level]);

  // Start Webcam Stream
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
      setIsCameraActive(true);
      manualStopRef.current = false;
      setIsRunStopped(false);
      lastActiveMotionTimeRef.current = performance.now();
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Camera permission denied or camera not found.";
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  };

  // Stop Webcam Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevFrameRef.current = null;
    setIsCameraActive(false);
    setMotionDetected("STATIONARY");
  }, []);

  // Manual Toggle Run Stop / Resume
  const toggleManualRunStop = () => {
    manualStopRef.current = !manualStopRef.current;
    setIsRunStopped(manualStopRef.current);
    if (manualStopRef.current) {
      stateRef.current.vx = 0;
      stateRef.current.vy = 0;
      stateRef.current.isStationary = true;
      setMotionDetected("STATIONARY");
    } else {
      lastActiveMotionTimeRef.current = performance.now();
      stateRef.current.vx = stateRef.current.facing * 0.45;
      stateRef.current.isStationary = false;
    }
  };

  // Steer Meemee directly (used by camera and manual gesture helper buttons)
  const steerFish = useCallback((direction: "LEFT" | "RIGHT" | "UP" | "DOWN") => {
    if (manualStopRef.current) return;
    lastActiveMotionTimeRef.current = performance.now();
    stateRef.current.isStationary = false;
    setIsRunStopped(false);
    setMotionDetected(direction);

    if (direction === "LEFT") {
      stateRef.current.vx = -0.7;
      stateRef.current.facing = -1;
    } else if (direction === "RIGHT") {
      stateRef.current.vx = 0.7;
      stateRef.current.facing = 1;
    } else if (direction === "UP") {
      stateRef.current.vy = -0.7;
    } else if (direction === "DOWN") {
      stateRef.current.vy = 0.7;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [stopCamera]);

  // Elapsed Time counter (ticks only when Meemee is actively swimming)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!stateRef.current.isStationary && !manualStopRef.current && !levelCompleted) {
        setElapsedSeconds((prev) => prev + 1);

        // Level 03 Timer Countdown
        if (level === "03") {
          setLevel3TimeLeft((prev) => {
            if (prev <= 1) {
              setLevel3Failed(true);
              return 0;
            }
            return prev - 1;
          });
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [level, levelCompleted]);

  // Computer Vision Centroid Motion Processor
  useEffect(() => {
    if (!isCameraActive) return;

    let intervalId: number;

    const processMotion = () => {
      if (manualStopRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Draw current video frame (mirrored)
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
          const totalDiff = rDiff + gDiff + bDiff;

          if (totalDiff > 45) {
            const pixelIndex = i / 4;
            const px = pixelIndex % width;
            const py = Math.floor(pixelIndex / width);

            sumX += px;
            sumY += py;
            motionPixels++;
          }
        }

        const now = performance.now();
        const minMotionThreshold = 35;

        if (motionPixels > minMotionThreshold) {
          const avgX = sumX / motionPixels;
          const avgY = sumY / motionPixels;

          const normX = (avgX - width / 2) / (width / 2);
          const normY = (avgY - height / 2) / (height / 2);

          const absX = Math.abs(normX);
          const absY = Math.abs(normY);

          lastActiveMotionTimeRef.current = now;
          stateRef.current.isStationary = false;
          setIsRunStopped(false);

          if (absY > 0.15 && absY >= absX * 0.7) {
            if (normY < 0) {
              steerFish("UP");
            } else {
              steerFish("DOWN");
            }
          } else if (absX > 0.15) {
            if (normX < 0) {
              steerFish("LEFT");
            } else {
              steerFish("RIGHT");
            }
          }
        } else {
          if (now - lastActiveMotionTimeRef.current > 1000) {
            stateRef.current.isStationary = true;
            setMotionDetected("STATIONARY");
            setIsRunStopped(true);
          }
        }
      }

      prevFrameRef.current = new Uint8ClampedArray(currentFrame);
    };

    intervalId = window.setInterval(processMotion, 50);
    return () => clearInterval(intervalId);
  }, [isCameraActive, steerFish]);

  // Main 60FPS Physics, Animation & Level Collision Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const s = stateRef.current;

      // Update Level 04 Patrolling Jellyfish positions
      if (level === "04") {
        const j1Y = 45 + Math.sin(now * 0.0022) * 23;
        const j2Y = 45 + Math.cos(now * 0.0026) * 23;
        setJelly1Pos({ x: 38, y: j1Y });
        setJelly2Pos({ x: 64, y: j2Y });
      }

      if (s.isStationary || manualStopRef.current || levelCompleted || level3Failed) {
        // MEEMEE IS STATIONARY
        s.vx *= 0.84;
        s.vy *= 0.84;
        if (Math.abs(s.vx) < 0.02) s.vx = 0;
        if (Math.abs(s.vy) < 0.02) s.vy = 0;

        const idleWave = Math.sin(now * 0.002) * 0.04;
        s.y += idleWave * (dt * 60);

        setPosX(s.x);
        setPosY(s.y);
        setFacing(s.facing);
        setSpeed(0);
      } else {
        // MEEMEE IS ACTIVELY SWIMMING
        const wave = Math.sin(now * 0.0025) * 0.1;

        // In Level 03, water current flows swiftly towards the right (+X)
        if (level === "03") {
          s.x += (s.vx + 0.15) * (dt * 60);
        } else {
          s.x += s.vx * (dt * 60);
        }
        s.y += (s.vy + wave) * (dt * 60);

        // Edge boundaries & turnaround
        const minX = 8;
        const maxX = 82;
        const minY = 16;
        const maxY = 74;

        if (s.x > maxX) {
          s.x = maxX;
          s.vx = -Math.abs(s.vx);
          s.facing = -1;
        } else if (s.x < minX) {
          s.x = minX;
          s.vx = Math.abs(s.vx);
          s.facing = 1;
        }

        if (s.y > maxY) {
          s.y = maxY;
          if (s.vy > 0) s.vy = 0;
        } else if (s.y < minY) {
          s.y = minY;
          if (s.vy < 0) s.vy = 0;
        }

        // Autonomous cruising if camera inactive
        if (!isCameraActive && Math.abs(s.vx) < 0.2) {
          s.vx = s.facing * 0.25;
        }

        // Speed calculation
        const curSpeed = Math.sqrt(s.vx * s.vx + s.vy * s.vy) * 10;
        s.dist += curSpeed * dt * 0.1;

        // Trail bubbles
        if (now - s.lastBubbleTime > 900 && curSpeed > 1) {
          s.lastBubbleTime = now;
          const newBubble: Bubble = {
            id: now,
            x: s.facing === 1 ? s.x - 2 : s.x + 14,
            y: s.y + 4 + (Math.random() * 4 - 2),
            size: 6 + Math.random() * 10,
          };
          setTrailBubbles((prev) => [...prev.slice(-8), newBubble]);
        }

        setPosX(s.x);
        setPosY(s.y);
        setFacing(s.facing);
        setSpeed(Math.round(curSpeed * 10) / 10);
        setDistance(Math.round(s.dist * 10) / 10);

        // ==========================================
        // LEVEL 01 GOAL: SWIM 20 METERS
        // ==========================================
        if (level === "01" && !levelCompleted) {
          if (s.dist >= 20) {
            setLevelCompleted(true);
            playSynthSound("win");
            onCompleteLevel?.("01");
          }
        }

        // ==========================================
        // LEVEL 02: AVOID HAZARDS & COLLECT 3 PEARLS
        // ==========================================
        if (level === "02" && !levelCompleted) {
          // 3 Pearls
          const pearls = [
            { id: 1, x: 18, y: 28 },
            { id: 2, x: 68, y: 22 },
            { id: 3, x: 44, y: 68 },
          ];

          pearls.forEach((p) => {
            if (!collectedPearls.includes(p.id)) {
              const d = Math.hypot(s.x - p.x, s.y - p.y);
              if (d < 8) {
                setCollectedPearls((prev) => {
                  if (prev.includes(p.id)) return prev;
                  const next = [...prev, p.id];
                  playSynthSound("ding");
                  showToast(`✨ Sea Pearl Found (${next.length}/3)!`, "pearl");
                  if (next.length >= 3) {
                    setLevelCompleted(true);
                    playSynthSound("win");
                    onCompleteLevel?.("02");
                  }
                  return next;
                });
              }
            }
          });

          // 3 Obstacles (Rock, Pufferfish, Snail)
          const obstacles = [
            { name: "Jagged Rock", x: 28, y: 55, r: 8.5 },
            { name: "Spiky Pufferfish", x: 56, y: 32, r: 8.5 },
            { name: "Reef Snail", x: 74, y: 65, r: 7.5 },
          ];

          obstacles.forEach((obs) => {
            const d = Math.hypot(s.x - obs.x, s.y - obs.y);
            if (d < obs.r && now - lastHazardHitTimeRef.current > 750) {
              lastHazardHitTimeRef.current = now;
              // Bonk recoil: reverse and shove fish
              s.vx = (s.x > obs.x ? 1 : -1) * 0.95;
              s.vy = (s.y > obs.y ? 1 : -1) * 0.7;
              setIsBonked(true);
              playSynthSound("bonk");
              showToast(`💥 BONK! Avoid the ${obs.name}!`, "bonk");
              setTimeout(() => setIsBonked(false), 600);
            }
          });
        }

        // ==========================================
        // LEVEL 03: SPEED RINGS & WATER CURRENT
        // ==========================================
        if (level === "03" && !levelCompleted && !level3Failed) {
          const rings = [
            { id: 1, x: 24, y: 36 },
            { id: 2, x: 50, y: 58 },
            { id: 3, x: 76, y: 32 },
          ];

          rings.forEach((ring) => {
            if (!clearedRings.includes(ring.id)) {
              const d = Math.hypot(s.x - ring.x, s.y - ring.y);
              if (d < 8.5) {
                setClearedRings((prev) => {
                  if (prev.includes(ring.id)) return prev;
                  const next = [...prev, ring.id];
                  playSynthSound("boost");
                  setTurboActive(true);
                  // Turbo acceleration burst
                  s.vx = (s.facing || 1) * 1.5;
                  showToast(`⚡ TURBO BOOST! Ring ${next.length}/3 Smashed!`, "boost");
                  setTimeout(() => setTurboActive(false), 900);
                  if (next.length >= 3) {
                    setLevelCompleted(true);
                    playSynthSound("win");
                    onCompleteLevel?.("03");
                  }
                  return next;
                });
              }
            }
          });
        }

        // ==========================================
        // LEVEL 04: PATROLLING JELLYFISH & 4 STARS
        // ==========================================
        if (level === "04" && !levelCompleted) {
          // 4 Golden Mastery Stars
          const stars = [
            { id: 1, x: 16, y: 24 },
            { id: 2, x: 24, y: 68 },
            { id: 3, x: 50, y: 46 },
            { id: 4, x: 82, y: 28 },
          ];

          stars.forEach((st) => {
            if (!collectedStars.includes(st.id)) {
              const d = Math.hypot(s.x - st.x, s.y - st.y);
              if (d < 7.5) {
                setCollectedStars((prev) => {
                  if (prev.includes(st.id)) return prev;
                  const next = [...prev, st.id];
                  playSynthSound("ding");
                  showToast(`⭐ Mastery Star Captured (${next.length}/4)!`, "star");
                  if (next.length >= 4) {
                    setLevelCompleted(true);
                    playSynthSound("win");
                    onCompleteLevel?.("04");
                  }
                  return next;
                });
              }
            }
          });

          // 2 Electric Jellyfish Hazards
          const jellies = [
            { name: "Electric Jellyfish Alpha", x: 38, y: 45 + Math.sin(now * 0.0022) * 23 },
            { name: "Electric Jellyfish Beta", x: 64, y: 45 + Math.cos(now * 0.0026) * 23 },
          ];

          jellies.forEach((jelly) => {
            const d = Math.hypot(s.x - jelly.x, s.y - jelly.y);
            if (d < 8.5 && now - lastHazardHitTimeRef.current > 800) {
              lastHazardHitTimeRef.current = now;
              // Electric Shock knockback
              s.vx = (s.x > jelly.x ? 1 : -1) * 1.15;
              s.vy = (s.y > jelly.y ? 1 : -1) * 0.85;
              setIsZapped(true);
              playSynthSound("zap");
              showToast(`⚡ ZAP! Steer clear of high-voltage jellyfish!`, "zap");
              setTimeout(() => setIsZapped(false), 700);
            }
          });
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    isCameraActive,
    level,
    levelCompleted,
    level3Failed,
    collectedPearls,
    clearedRings,
    collectedStars,
    onCompleteLevel,
    showToast,
  ]);

  const restartLevel = () => {
    stateRef.current.x = 22;
    stateRef.current.y = 46;
    stateRef.current.vx = 0.35;
    stateRef.current.vy = 0;
    stateRef.current.facing = 1;
    stateRef.current.dist = 0;
    stateRef.current.isStationary = false;

    setPosX(22);
    setPosY(46);
    setFacing(1);
    setDistance(0);
    setElapsedSeconds(0);
    setLevelCompleted(false);
    setLevel3Failed(false);
    setFeedbackToast(null);

    setCollectedPearls([]);
    setClearedRings([]);
    setLevel3TimeLeft(30);
    setCollectedStars([]);
  };

  return (
    <div className="space-y-4">
      {/* AQUARIUM CONTAINER */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] border-2 border-border bg-water shadow-deep sm:aspect-[16/10]">
        {/* Water gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-water to-water-deep" />
        <Bubbles className="text-water-foreground/50" count={14} />

        {/* Ambient light shafts */}
        <div className="animate-drift absolute -top-10 left-1/4 h-[140%] w-24 rotate-12 bg-water-foreground/10 blur-md" />
        <div className="animate-drift absolute -top-10 left-2/3 h-[140%] w-16 rotate-12 bg-water-foreground/10 blur-md" />

        {/* Grid scanning effect when camera is active */}
        {isCameraActive && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff18_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
        )}

        {/* ==================================================== */}
        {/* LEVEL 03 WATER CURRENT STREAM LINES */}
        {/* ==================================================== */}
        {level === "03" && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-35">
            <div className="absolute top-[28%] left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-pulse" />
            <div className="absolute top-[52%] left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-100 to-transparent animate-pulse" />
            <div className="absolute top-[70%] left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-pulse" />
            <div className="absolute top-[26%] flex w-full justify-around text-xs font-mono tracking-widest text-cyan-200/60">
              <span>&gt;&gt;&gt;&gt;</span>
              <span>&gt;&gt;&gt;&gt;</span>
              <span>&gt;&gt;&gt;&gt;</span>
            </div>
            <div className="absolute top-[50%] flex w-full justify-around text-xs font-mono tracking-widest text-cyan-200/60">
              <span>&gt;&gt;&gt;&gt;&gt;&gt;</span>
              <span>&gt;&gt;&gt;&gt;&gt;&gt;</span>
              <span>&gt;&gt;&gt;&gt;&gt;&gt;</span>
            </div>
          </div>
        )}

        {/* Path checkpoints */}
        <svg
          aria-hidden
          viewBox="0 0 800 500"
          className="absolute inset-0 h-full w-full text-water-foreground/35 pointer-events-none"
        >
          <path
            d="M80 400 C 220 310, 260 170, 400 210 S 580 340, 720 140"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="12 14"
          />
        </svg>

        {/* Sea floor sand and rocks */}
        <div className="absolute bottom-0 left-0 right-0 h-16 rounded-t-[50%] bg-sand/70 pointer-events-none" />
        <div className="absolute bottom-6 left-[16%] h-14 w-24 rounded-t-full rounded-b-lg bg-water-deep/80 pointer-events-none" />
        <div className="absolute bottom-8 left-[54%] h-10 w-16 rounded-t-full rounded-b-md bg-water-deep/70 pointer-events-none" />

        {/* Sea plants */}
        {[10, 32, 68, 86].map((left, i) => (
          <div
            key={left}
            className="animate-sway absolute bottom-6 pointer-events-none"
            style={{ left: `${left}%`, animationDelay: `${i * 0.6}s` }}
          >
            <svg width="44" height="120" viewBox="0 0 44 120" className="text-water-foreground/40">
              <path
                d="M22 120 C 6 90, 34 70, 18 44 C 8 26, 26 14, 22 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}

        {/* ==================================================== */}
        {/* LEVEL 02 ENTITIES: 3 OBSTACLES + 3 SEA PEARLS */}
        {/* ==================================================== */}
        {level === "02" && (
          <>
            {/* Obstacle 1: Jagged Sea Rock */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
              style={{ left: "28%", top: "55%" }}
            >
              <div className="relative flex flex-col items-center">
                <span className="text-3xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">🪨</span>
                <span className="rounded bg-black/60 px-1 py-0.2 text-[0.55rem] font-bold text-amber-300">
                  ROCK
                </span>
              </div>
            </div>

            {/* Obstacle 2: Spiky Pufferfish */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
              style={{ left: "56%", top: "32%" }}
            >
              <div className="relative flex flex-col items-center animate-pulse">
                <span className="text-3xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">🐡</span>
                <span className="rounded bg-red-950/70 px-1 py-0.2 text-[0.55rem] font-bold text-red-300">
                  PUFFER
                </span>
              </div>
            </div>

            {/* Obstacle 3: Deep-Sea Snail */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
              style={{ left: "74%", top: "65%" }}
            >
              <div className="relative flex flex-col items-center">
                <span className="text-2xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">🐌</span>
                <span className="rounded bg-black/60 px-1 py-0.2 text-[0.55rem] font-bold text-amber-200">
                  SNAIL
                </span>
              </div>
            </div>

            {/* Pearl 1 */}
            {!collectedPearls.includes(1) && (
              <div
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none animate-bounce"
                style={{ left: "18%", top: "28%" }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-cyan-100 shadow-[0_0_15px_rgba(255,255,255,0.9)] flex items-center justify-center text-xs">
                    ⚪
                  </div>
                  <span className="mt-0.5 rounded bg-blue-950/70 px-1 text-[0.5rem] font-bold text-cyan-200">
                    Pearl 1
                  </span>
                </div>
              </div>
            )}

            {/* Pearl 2 */}
            {!collectedPearls.includes(2) && (
              <div
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none animate-bounce"
                style={{ left: "68%", top: "22%", animationDelay: "0.3s" }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-cyan-100 shadow-[0_0_15px_rgba(255,255,255,0.9)] flex items-center justify-center text-xs">
                    ⚪
                  </div>
                  <span className="mt-0.5 rounded bg-blue-950/70 px-1 text-[0.5rem] font-bold text-cyan-200">
                    Pearl 2
                  </span>
                </div>
              </div>
            )}

            {/* Pearl 3 */}
            {!collectedPearls.includes(3) && (
              <div
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none animate-bounce"
                style={{ left: "44%", top: "68%", animationDelay: "0.6s" }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-cyan-100 shadow-[0_0_15px_rgba(255,255,255,0.9)] flex items-center justify-center text-xs">
                    ⚪
                  </div>
                  <span className="mt-0.5 rounded bg-blue-950/70 px-1 text-[0.5rem] font-bold text-cyan-200">
                    Pearl 3
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================================================== */}
        {/* LEVEL 03 ENTITIES: 3 SPEED BOOST RINGS */}
        {/* ==================================================== */}
        {level === "03" && (
          <>
            {[
              { id: 1, x: 24, y: 36, label: "RING 01" },
              { id: 2, x: 50, y: 58, label: "RING 02" },
              { id: 3, x: 76, y: 32, label: "RING 03" },
            ].map((ring) => {
              const isCleared = clearedRings.includes(ring.id);
              return (
                <div
                  key={ring.id}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none transition-all duration-300"
                  style={{ left: `${ring.x}%`, top: `${ring.y}%` }}
                >
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`h-12 w-12 rounded-full border-4 flex items-center justify-center transition-all ${
                        isCleared
                          ? "border-emerald-400 bg-emerald-400/20 shadow-[0_0_20px_rgba(52,211,153,0.8)] scale-90"
                          : "border-cyan-300 bg-cyan-400/15 shadow-[0_0_20px_rgba(34,211,238,0.7)] animate-pulse"
                      }`}
                    >
                      <span className="text-base">{isCleared ? "✅" : "⚡"}</span>
                    </div>
                    <span
                      className={`mt-1 rounded px-1.5 py-0.5 text-[0.55rem] font-bold tracking-wider ${
                        isCleared
                          ? "bg-emerald-950/80 text-emerald-300"
                          : "bg-cyan-950/80 text-cyan-300"
                      }`}
                    >
                      {ring.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ==================================================== */}
        {/* LEVEL 04 ENTITIES: 2 PATROLLING JELLYFISH + 4 STARS */}
        {/* ==================================================== */}
        {level === "04" && (
          <>
            {/* Patrolling Jellyfish 1 */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none transition-all duration-75 ease-linear"
              style={{ left: `${jelly1Pos.x}%`, top: `${jelly1Pos.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <span className="text-3xl filter drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]">
                    🪼
                  </span>
                  <span className="absolute -top-1 -right-1 text-xs animate-ping">⚡</span>
                </div>
                <span className="rounded bg-yellow-950/80 px-1 py-0.2 text-[0.5rem] font-bold text-yellow-300">
                  JELLY ALPHA
                </span>
              </div>
            </div>

            {/* Patrolling Jellyfish 2 */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none transition-all duration-75 ease-linear"
              style={{ left: `${jelly2Pos.x}%`, top: `${jelly2Pos.y}%` }}
            >
              <div className="relative flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <span className="text-3xl filter drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]">
                    🪼
                  </span>
                  <span className="absolute -top-1 -left-1 text-xs animate-ping">⚡</span>
                </div>
                <span className="rounded bg-yellow-950/80 px-1 py-0.2 text-[0.5rem] font-bold text-yellow-300">
                  JELLY BETA
                </span>
              </div>
            </div>

            {/* 4 Golden Mastery Stars */}
            {[
              { id: 1, x: 16, y: 24 },
              { id: 2, x: 24, y: 68 },
              { id: 3, x: 50, y: 46 },
              { id: 4, x: 82, y: 28 },
            ].map((star) => {
              if (collectedStars.includes(star.id)) return null;
              return (
                <div
                  key={star.id}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none animate-bounce"
                  style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${star.id * 0.25}s` }}
                >
                  <div className="relative flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 shadow-[0_0_16px_rgba(251,191,36,0.9)]">
                      <span className="text-lg">⭐</span>
                    </div>
                    <span className="rounded bg-amber-950/80 px-1 text-[0.5rem] font-bold text-amber-200">
                      Star {star.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Trail bubbles created by Meemee */}
        {trailBubbles.map((b) => (
          <span
            key={b.id}
            className="animate-rise pointer-events-none absolute rounded-full border border-water-foreground/60 bg-water-foreground/20"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
            }}
          />
        ))}

        {/* MEEMEE THE FISH (PHYSICS-CONTROLLED SPRITE) */}
        <div
          className={`absolute transition-transform duration-100 ease-out ${
            isBonked ? "animate-bounce filter drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]" : ""
          } ${
            isZapped ? "animate-ping filter drop-shadow-[0_0_20px_rgba(250,204,21,1)]" : ""
          } ${
            turboActive ? "filter drop-shadow-[0_0_20px_rgba(34,211,238,1)]" : ""
          }`}
          style={{
            left: `${posX}%`,
            top: `${posY}%`,
            transform: `scaleX(${facing})`,
            width: "clamp(5rem, 12vw, 8.5rem)",
          }}
        >
          <img
            src={meemee}
            alt="Meemee swimming"
            className="w-full brightness-0 invert drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          />

          {/* AI Vision target bounding box */}
          {isCameraActive && (
            <div
              className={`pointer-events-none absolute -inset-2 rounded-lg border border-dashed transition-colors ${
                isRunStopped ? "border-amber-400/80" : "border-emerald-400/80"
              }`}
            >
              <span
                className={`absolute -top-4 left-0 rounded px-1.5 py-0.2 text-[0.55rem] font-bold tracking-wider ${
                  isRunStopped
                    ? "bg-amber-950/80 text-amber-300"
                    : "bg-emerald-950/80 text-emerald-300"
                }`}
              >
                {isRunStopped ? "MEEMEE · STATIONARY" : "MEEMEE · SWIMMING"}
              </span>
            </div>
          )}
        </div>

        {/* DYNAMIC IN-GAME TOAST FEEDBACK */}
        {feedbackToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-enter-up pointer-events-none">
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold shadow-lift backdrop-blur-md ${
                feedbackToast.type === "bonk"
                  ? "bg-red-500/90 text-white border border-red-300"
                  : feedbackToast.type === "zap"
                  ? "bg-amber-400 text-amber-950 border border-amber-200 animate-pulse"
                  : feedbackToast.type === "boost"
                  ? "bg-cyan-500 text-white border border-cyan-300"
                  : "bg-emerald-500 text-white border border-emerald-300"
              }`}
            >
              <span>{feedbackToast.text}</span>
            </div>
          </div>
        )}

        {/* TOP HUD METRICS */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2 z-20">
          {/* Level Badge */}
          <div className="rounded-2xl border border-water-foreground/25 bg-water-deep/75 px-3 py-1.5 backdrop-blur-sm">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-water-foreground/70">
              Curriculum
            </p>
            <p className="font-display text-sm font-bold text-cyan-300">
              Level {level}
            </p>
          </div>

          {/* Run Status */}
          <div className="rounded-2xl border border-water-foreground/25 bg-water-deep/60 px-3 py-1.5 backdrop-blur-sm">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-water-foreground/70">
              Run Status
            </p>
            <div className="flex items-center gap-1.5 font-display text-sm font-bold text-water-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  isRunStopped ? "bg-red-400" : "bg-emerald-400 animate-ping"
                }`}
              />
              <span>{isRunStopped ? "Stopped" : "Active"}</span>
            </div>
          </div>

          {/* Level 01 Metric: Distance towards 20m */}
          {level === "01" && (
            <div className="rounded-2xl border border-water-foreground/25 bg-water-deep/60 px-3 py-1.5 backdrop-blur-sm">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-water-foreground/70">
                Swim Distance
              </p>
              <p className="font-display text-sm font-bold text-water-foreground tabular-nums">
                {Math.min(20, distance)} / 20.0m
              </p>
            </div>
          )}

          {/* Level 02 Metric: Pearls Collected */}
          {level === "02" && (
            <div className="rounded-2xl border border-water-foreground/25 bg-water-deep/60 px-3 py-1.5 backdrop-blur-sm">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Sea Pearls
              </p>
              <p className="font-display text-sm font-bold text-white tabular-nums">
                ⚪ {collectedPearls.length} / 3
              </p>
            </div>
          )}

          {/* Level 03 Metric: Rings Cleared & Timer */}
          {level === "03" && (
            <>
              <div className="rounded-2xl border border-water-foreground/25 bg-water-deep/60 px-3 py-1.5 backdrop-blur-sm">
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Speed Rings
                </p>
                <p className="font-display text-sm font-bold text-white tabular-nums">
                  ⚡ {clearedRings.length} / 3
                </p>
              </div>

              <div
                className={`rounded-2xl border px-3 py-1.5 backdrop-blur-sm ${
                  level3TimeLeft < 8
                    ? "border-red-400 bg-red-950/80 animate-pulse text-red-200"
                    : "border-water-foreground/25 bg-water-deep/60 text-water-foreground"
                }`}
              >
                <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] opacity-80">
                  Urgency Timer
                </p>
                <p className="font-display text-sm font-bold tabular-nums">
                  ⏳ {level3TimeLeft}s
                </p>
              </div>
            </>
          )}

          {/* Level 04 Metric: Mastery Stars */}
          {level === "04" && (
            <div className="rounded-2xl border border-water-foreground/25 bg-water-deep/60 px-3 py-1.5 backdrop-blur-sm">
              <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-amber-300">
                Mastery Stars
              </p>
              <p className="font-display text-sm font-bold text-amber-300 tabular-nums">
                ⭐ {collectedStars.length} / 4
              </p>
            </div>
          )}

          {/* Speed */}
          <div className="rounded-2xl border border-water-foreground/25 bg-water-deep/60 px-3 py-1.5 backdrop-blur-sm">
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-water-foreground/70">
              Speed
            </p>
            <p className="font-display text-sm text-water-foreground tabular-nums">
              {speed} kn
            </p>
          </div>
        </div>

        {/* LIVE MOTION DIRECTION BADGE */}
        <div className="absolute right-4 top-4 z-20">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lift transition-all ${
              motionDetected === "LEFT"
                ? "bg-amber-400 text-amber-950 animate-pulse"
                : motionDetected === "RIGHT"
                ? "bg-emerald-400 text-emerald-950 animate-pulse"
                : motionDetected === "UP"
                ? "bg-cyan-400 text-cyan-950 animate-pulse"
                : motionDetected === "DOWN"
                ? "bg-blue-400 text-blue-950 animate-pulse"
                : isRunStopped
                ? "bg-red-500/90 text-white font-bold"
                : "bg-water-deep/80 text-water-foreground border border-water-foreground/30"
            }`}
          >
            {motionDetected === "LEFT" && "👈 Swimming Left"}
            {motionDetected === "RIGHT" && "👉 Swimming Right"}
            {motionDetected === "UP" && "👆 Swimming Up"}
            {motionDetected === "DOWN" && "👇 Swimming Down"}
            {motionDetected === "STATIONARY" && "🛑 Stationary (Run Stopped)"}
            {motionDetected === "IDLE" && "Wave To Steer"}
          </span>
        </div>

        {/* ==================================================== */}
        {/* LEVEL COMPLETION CELEBRATION MODAL OVERLAY */}
        {/* ==================================================== */}
        {levelCompleted && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-water-deep/80 p-5 backdrop-blur-md animate-enter-up">
            <div className="paper-card w-full max-w-md border-2 border-primary bg-background p-6 text-center shadow-deep">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-3xl">
                {level === "01" && "🎉"}
                {level === "02" && "🐚"}
                {level === "03" && "🚀"}
                {level === "04" && "🏆"}
              </div>

              <span className="eyebrow mt-3 block">Level {level} Mastered</span>
              <h2 className="display-xl mt-1 text-2xl sm:text-3xl">
                {level === "01" && "Level 01 Cleared!"}
                {level === "02" && "Level 02 Cleared!"}
                {level === "03" && "Level 03 Cleared!"}
                {level === "04" && "Master Of The Seas!"}
              </h2>

              <p className="mt-2 text-xs text-muted-foreground">
                {level === "01" &&
                  "Baseline swimming mastered. You covered 20m with 4-way optical steering!"}
                {level === "02" &&
                  "All 3 sea pearls retrieved while successfully evading rocks, pufferfish and snails!"}
                {level === "03" &&
                  "Supersonic fish! You rode the deep-sea currents and smashed all 3 speed rings in time!"}
                {level === "04" &&
                  "Fully unnecessary aquatic mastery achieved! You out-swam high-voltage electric jellyfish and gathered all 4 stars!"}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={restartLevel}
                  className="press cursor-pointer rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-accent"
                >
                  🔄 Replay
                </button>

                {level !== "04" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLevelCompleted(false);
                      onNextLevel?.();
                    }}
                    className="press cursor-pointer rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift hover:bg-primary/90"
                  >
                    Next Level ➡️
                  </button>
                ) : (
                  <Link
                    to="/olympics"
                    className="press inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift hover:bg-primary/90"
                  >
                    <span>🥇</span>
                    <span>Compete in Fish Olympics</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* LEVEL 03 TIMEOUT FAIL OVERLAY */}
        {/* ==================================================== */}
        {level === "03" && level3Failed && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-water-deep/80 p-5 backdrop-blur-md animate-enter-up">
            <div className="paper-card w-full max-w-sm border-2 border-red-500 bg-background p-6 text-center shadow-deep">
              <span className="text-4xl">⏰</span>
              <h3 className="display-xl mt-2 text-xl text-red-600">Urgency Expired!</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                You cleared {clearedRings.length} / 3 rings before the 30-second current swept away.
              </p>
              <button
                type="button"
                onClick={restartLevel}
                className="press mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift hover:bg-primary/90"
              >
                <span>🔄</span>
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* PIP (PICTURE-IN-PICTURE) WEBCAM FEED */}
        {isCameraActive && (
          <div className="paper-card absolute bottom-4 right-4 z-20 overflow-hidden border-2 border-primary bg-background/95 p-2 shadow-deep sm:w-48">
            <div className="flex items-center justify-between pb-1.5">
              <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wider text-red-600">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-red-600" />
                CAM 01
              </span>
              <span className="text-[0.55rem] font-bold uppercase tracking-wider text-muted-foreground">
                4-Axis Sensor
              </span>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
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
                className="h-full w-full object-cover [transform:scaleX(-1)] opacity-90"
              />
            </div>
          </div>
        )}

        {/* Hidden processing video & canvas */}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} width={64} height={48} className="hidden" />
      </div>

      {/* CONTROLS & MANUAL STEER BAR */}
      <div className="paper-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{isCameraActive ? "📹" : "📷"}</span>
              <Eyebrow>4-Way Optical Motion Guidance</Eyebrow>
            </div>
            <h3 className="display-xl mt-1 text-xl sm:text-2xl">
              {isCameraActive
                ? isRunStopped
                  ? "Meemee Stopped · Wave to Resume"
                  : "Camera Vision Active (4 Directions)"
                : "Camera Motion Guidance"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {isCameraActive
                ? "Wave hand UP to swim up, DOWN to dive, LEFT/RIGHT to turn. Stop waving to halt in place!"
                : "Enable your camera to direct Meemee in 4 directions or click the test gesture buttons below."}
            </p>
          </div>

          <div className="flex flex-wrap shrink-0 items-center gap-2">
            {/* Reset Level Button */}
            <button
              type="button"
              onClick={restartLevel}
              className="press flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-foreground hover:bg-accent"
            >
              <span>🔄</span>
              <span>Reset Level</span>
            </button>

            {/* Manual Run Stop / Resume Button */}
            <button
              type="button"
              onClick={toggleManualRunStop}
              className={`press flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] shadow-paper transition-all ${
                isRunStopped
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-border bg-card text-foreground hover:bg-accent"
              }`}
            >
              <span>{isRunStopped ? "▶️" : "⏸️"}</span>
              <span>{isRunStopped ? "Resume Run" : "Stop Run"}</span>
            </button>

            {/* Camera Start / Stop Button */}
            {!isCameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="press flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift transition-all hover:bg-primary/90"
              >
                <span>📹</span>
                <span>Start Camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="press flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground transition-all hover:text-foreground"
              >
                <span>🛑</span>
                <span>Stop Camera</span>
              </button>
            )}
          </div>
        </div>

        {/* CAMERA ERROR BANNER */}
        {cameraError && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            ⚠️ {cameraError} (Meemee will continue swimming autonomously).
          </div>
        )}

        {/* 4-DIRECTION INTERACTIVE BUTTONS / GESTURE HINTS */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/80 pt-4 sm:grid-cols-5">
          <button
            type="button"
            onClick={() => steerFish("LEFT")}
            className="paper-card lift-hover cursor-pointer p-2.5 text-center transition-all hover:border-primary/60"
          >
            <span className="text-base">👈</span>
            <p className="font-display mt-1 text-xs font-bold">Wave / Click Left</p>
            <p className="text-[0.65rem] text-muted-foreground">Swims Left</p>
          </button>

          <button
            type="button"
            onClick={() => steerFish("RIGHT")}
            className="paper-card lift-hover cursor-pointer p-2.5 text-center transition-all hover:border-primary/60"
          >
            <span className="text-base">👉</span>
            <p className="font-display mt-1 text-xs font-bold">Wave / Click Right</p>
            <p className="text-[0.65rem] text-muted-foreground">Swims Right</p>
          </button>

          <button
            type="button"
            onClick={() => steerFish("UP")}
            className="paper-card lift-hover cursor-pointer p-2.5 text-center transition-all hover:border-cyan-500/60"
          >
            <span className="text-base">👆</span>
            <p className="font-display mt-1 text-xs font-bold text-cyan-600 dark:text-cyan-400">
              Wave / Click Up
            </p>
            <p className="text-[0.65rem] text-muted-foreground">Swims Upwards</p>
          </button>

          <button
            type="button"
            onClick={() => steerFish("DOWN")}
            className="paper-card lift-hover cursor-pointer p-2.5 text-center transition-all hover:border-blue-500/60"
          >
            <span className="text-base">👇</span>
            <p className="font-display mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              Wave / Click Down
            </p>
            <p className="text-[0.65rem] text-muted-foreground">Dives Down</p>
          </button>

          <div className="paper-card p-2.5 text-center border-amber-500/40 bg-amber-500/10">
            <span className="text-base">🛑</span>
            <p className="font-display mt-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              Stop Waving
            </p>
            <p className="text-[0.65rem] text-amber-700/80 dark:text-amber-300/80">
              Run Stops in Place
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
