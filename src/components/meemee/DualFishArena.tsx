import { useState, useEffect, useRef, useCallback } from "react";
import meemee from "@/assets/meemee.png";
import { Eyebrow, Bubbles } from "@/components/meemee/bits";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FishDuelSession, FishTelemetry } from "@/lib/fishDuelPeer";

export interface DualFishArenaProps {
  isOpen: boolean;
  onClose: () => void;
  onAwardMedal?: (medal: "gold" | "silver" | "bronze") => void;
  initialRoomCode?: string;
  initialTab?: "create" | "join";
}

export function DualFishArena({
  isOpen,
  onClose,
  onAwardMedal,
  initialRoomCode = "",
  initialTab = "create",
}: DualFishArenaProps) {
  // Setup state
  const [activeTab, setActiveTab] = useState<"create" | "join">(
    initialRoomCode ? "join" : initialTab
  );
  const [role, setRole] = useState<"choose" | "host" | "join">("choose");
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [assignedRoomCode, setAssignedRoomCode] = useState("");
  const [myFishName, setMyFishName] = useState("Team Meemee");
  const [oppFishName, setOppFishName] = useState("Team Fin Diesel");
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync initialRoomCode when opened via link
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode);
      setActiveTab("join");
    }
  }, [initialRoomCode]);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Waiting for opponent laptop...");
  const [copiedCode, setCopiedCode] = useState(false);

  // Camera & Video streams
  const [cameraActive, setCameraActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [myThrust, setMyThrust] = useState(0);

  // Race state
  const [gameState, setGameState] = useState<"lobby" | "countdown" | "racing" | "finished">("lobby");
  const [countdownNum, setCountdownNum] = useState(3);
  const [myDist, setMyDist] = useState(0);
  const [oppDist, setOppDist] = useState(0);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [raceElapsed, setRaceElapsed] = useState(0);

  // References
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const sessionRef = useRef<FishDuelSession | null>(null);
  const raceStartRef = useRef<number>(0);

  // Start Local Camera for Fish Bowl tracking
  const startCamera = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      setLocalStream(stream);
      setCameraActive(true);
      if (sessionRef.current) {
        sessionRef.current.updateLocalStream(stream);
      }
      return stream;
    } catch (err) {
      console.warn("Could not start fish bowl camera:", err);
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setCameraActive(false);
    prevFrameRef.current = null;
  }, [localStream]);

  // Host a Duel
  const handleHost = async () => {
    setRole("host");
    const stream = await startCamera();
    const session = new FishDuelSession(myFishName);
    sessionRef.current = session;

    setupSessionHandlers(session);
    const code = await session.hostRoom(stream);
    setAssignedRoomCode(code);
    setStatusMessage(`Match Code: FISH-${code}. Enter this code on Laptop 2!`);
  };

  // Join an existing Duel
  const handleJoin = async () => {
    if (!roomCodeInput.trim()) return;
    setRole("join");
    const stream = await startCamera();
    const session = new FishDuelSession(myFishName || "Fin Diesel");
    sessionRef.current = session;

    setupSessionHandlers(session);
    await session.joinRoom(roomCodeInput, stream);
    setStatusMessage("Connecting to Host laptop...");
  };

  // Setup WebRTC Event Handlers
  const setupSessionHandlers = (session: FishDuelSession) => {
    session.onConnected = () => {
      setIsConnected(true);
      setStatusMessage("🟢 Connected to Opponent Laptop! Both Fish Bowls Ready!");
      if (session.opponentFishName) {
        setOppFishName(session.opponentFishName);
      }
    };

    session.onRemoteStream = (stream) => {
      setRemoteStream(stream);
    };

    session.onMessage = (msg) => {
      if (msg.type === "TELEMETRY") {
        setOppDist(msg.telemetry.dist);
        if (msg.telemetry.dist >= 100 && gameState === "racing") {
          finishRace(msg.telemetry.fishName);
        }
      } else if (msg.type === "START_COUNTDOWN") {
        startSynchronizedCountdown();
      } else if (msg.type === "RESET") {
        resetRaceLobby();
      }
    };

    session.onDisconnected = () => {
      setIsConnected(false);
      setStatusMessage("⚠️ Opponent laptop disconnected.");
    };
  };

  // Synchronized countdown trigger
  const requestStartRace = () => {
    if (sessionRef.current) {
      sessionRef.current.sendMessage({
        type: "START_COUNTDOWN",
        startTime: Date.now(),
      });
    }
    startSynchronizedCountdown();
  };

  const startSynchronizedCountdown = () => {
    setGameState("countdown");
    setCountdownNum(3);
    setMyDist(0);
    setOppDist(0);
    setWinnerName(null);

    let count = 3;
    const interval = window.setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
      } else {
        clearInterval(interval);
        setGameState("racing");
        raceStartRef.current = performance.now();
      }
    }, 1000);
  };

  const finishRace = (winner: string) => {
    setGameState("finished");
    setWinnerName(winner);
    if (winner === myFishName && onAwardMedal) {
      onAwardMedal("gold");
    }
  };

  const resetRaceLobby = () => {
    setGameState("lobby");
    setMyDist(0);
    setOppDist(0);
    setWinnerName(null);
  };

  const triggerResetAll = () => {
    if (sessionRef.current) {
      sessionRef.current.sendMessage({ type: "RESET" });
    }
    resetRaceLobby();
  };

  // Real-Time Computer Vision Loop for Fish Bowl Motion
  useEffect(() => {
    if (!cameraActive || !localStream || !isOpen) return;

    const interval = window.setInterval(() => {
      const video = localVideoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -w, 0, w, h);
      ctx.restore();

      const cur = ctx.getImageData(0, 0, w, h).data;

      if (prevFrameRef.current) {
        const prev = prevFrameRef.current;
        let diffPixels = 0;

        // Circular Bowl Region Mask: Focus motion tracking on the central bowl zone
        const cx = w / 2;
        const cy = h / 2;
        const radius = w * 0.42;

        for (let i = 0; i < cur.length; i += 4 * 2) {
          const pixelIdx = i / 4;
          const px = pixelIdx % w;
          const py = Math.floor(pixelIdx / w);

          const distFromCenter = Math.hypot(px - cx, py - cy);
          if (distFromCenter <= radius) {
            const diff =
              Math.abs(cur[i]! - prev[i]!) +
              Math.abs(cur[i + 1]! - prev[i + 1]!) +
              Math.abs(cur[i + 2]! - prev[i + 2]!);

            if (diff > 40) {
              diffPixels++;
            }
          }
        }

        const intensity = Math.min(Math.round((diffPixels / 60) * 100), 100);
        setMyThrust(intensity);

        if (gameState === "racing") {
          if (intensity > 8) {
            const delta = (intensity / 100) * 1.5 + 0.2;
            setMyDist((prevDist) => {
              const next = Math.min(prevDist + delta, 100);
              if (next >= 100 && gameState === "racing") {
                finishRace(myFishName);
              }

              // Send telemetry to opponent laptop via WebRTC
              if (sessionRef.current) {
                sessionRef.current.sendMessage({
                  type: "TELEMETRY",
                  telemetry: {
                    dist: next,
                    speed: delta * 10,
                    motionIntensity: intensity,
                    fishName: myFishName,
                  },
                });
              }

              return next;
            });
          }
        }
      }

      prevFrameRef.current = new Uint8ClampedArray(cur);
    }, 45);

    return () => clearInterval(interval);
  }, [cameraActive, localStream, isOpen, gameState, myFishName]);

  // Stopwatch for race
  useEffect(() => {
    if (gameState !== "racing") return;
    const interval = window.setInterval(() => {
      const sec = (performance.now() - raceStartRef.current) / 1000;
      setRaceElapsed(Math.round(sec * 10) / 10);
    }, 100);
    return () => clearInterval(interval);
  }, [gameState]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
      stopCamera();
      setIsConnected(false);
      setRole("choose");
      setGameState("lobby");
    }
  }, [isOpen, stopCamera]);

  const copyCodeToClipboard = () => {
    if (assignedRoomCode) {
      navigator.clipboard.writeText(`FISH-${assignedRoomCode}`);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (assignedRoomCode && typeof window !== "undefined") {
      const url = `${window.location.origin}/olympics?room=${assignedRoomCode}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleBackToLobby = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    stopCamera();
    setRole("choose");
    setIsConnected(false);
    setAssignedRoomCode("");
    setRemoteStream(null);
    setGameState("lobby");
    setMyDist(0);
    setOppDist(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="paper-card grid-paper border-2 border-primary/50 bg-card p-4 sm:max-w-4xl sm:p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">⚔️</span>
              <div>
                <DialogTitle className="display-xl text-xl sm:text-2xl text-foreground">
                  2-Player Live Olympic Race
                </DialogTitle>
                <p className="text-[0.7rem] text-muted-foreground">
                  Race live together across 2 laptops / devices via WebRTC Real-Time P2P!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-500/30">
                  <span className="h-2 w-2 animate-ping rounded-full bg-emerald-600" />
                  Dual Devices Connected
                </span>
              ) : (
                <span className="rounded-full bg-accent px-3 py-1 text-xs text-muted-foreground">
                  P2P Pairing Mode
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Hidden analysis video & canvas */}
        <video
          ref={(el) => {
            localVideoRef.current = el;
            if (el && localStream && el.srcObject !== localStream) {
              el.srcObject = localStream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        <canvas ref={canvasRef} width={80} height={60} className="hidden" />

        {/* STEP 1: CHOOSE OR CONFIGURE: CREATE GAME OR JOIN TEAM */}
        {role === "choose" && (
          <div className="space-y-6 py-4 text-center">
            <div>
              <span className="text-5xl select-none">🐟 💻 ⚡ 💻 🐠</span>
              <h3 className="display-xl mt-3 text-2xl">
                Multiplayer 100m Fish Sprint (2 Devices)
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Two players on two laptops or devices can race simultaneously! Both camera feeds track swim motions in real time.
              </p>
            </div>

            {/* TAB SELECTOR: CREATE GAME vs JOIN GAME */}
            <div className="mx-auto max-w-md flex rounded-full border border-primary/30 bg-muted/60 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "create"
                    ? "bg-primary text-primary-foreground shadow-lift"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎮 1. Create Game
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("join")}
                className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "join"
                    ? "bg-primary text-primary-foreground shadow-lift"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🤝 2. Join Team / Game
              </button>
            </div>

            {/* TAB 1: CREATE GAME (HOST) */}
            {activeTab === "create" && (
              <div className="mx-auto max-w-md space-y-4 rounded-2xl border-2 border-primary/40 bg-card p-6 text-left shadow-paper animate-enter-up">
                <div>
                  <label className="font-display text-xs font-bold uppercase text-foreground">
                    Your Fish / Team Name:
                  </label>
                  <input
                    type="text"
                    value={myFishName}
                    onChange={(e) => setMyFishName(e.target.value)}
                    placeholder="e.g. Team Meemee"
                    className="mt-1 w-full rounded-xl border border-primary/40 bg-background px-4 py-2.5 font-display text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="rounded-xl border border-accent bg-accent/30 p-3 text-xs text-muted-foreground">
                  <p className="font-bold text-foreground">How it works:</p>
                  <p className="mt-1">
                    Clicking below will start your camera and generate a unique <strong>Match Room Code</strong> and <strong>Share Link</strong> for Player 2 to join.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleHost}
                  className="press w-full rounded-full bg-primary py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift hover:scale-[1.02] cursor-pointer"
                >
                  🚀 Create Game Room & Start
                </button>
              </div>
            )}

            {/* TAB 2: JOIN GAME (ENTER CODE) */}
            {activeTab === "join" && (
              <div className="mx-auto max-w-md space-y-4 rounded-2xl border-2 border-primary/40 bg-card p-6 text-left shadow-paper animate-enter-up">
                <div>
                  <label className="font-display text-xs font-bold uppercase text-foreground">
                    Your Fish / Team Name:
                  </label>
                  <input
                    type="text"
                    value={myFishName}
                    onChange={(e) => setMyFishName(e.target.value)}
                    placeholder="e.g. Team Fin Diesel"
                    className="mt-1 w-full rounded-xl border border-primary/40 bg-background px-4 py-2.5 font-display text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-display text-xs font-bold uppercase text-foreground">
                    Enter Match / Team Code:
                  </label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 7824 or FISH-7824"
                    className="mt-1 w-full rounded-xl border-2 border-primary bg-background px-4 py-3 text-center font-mono text-base font-bold uppercase tracking-widest text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    Ask Player 1 for their 4-digit match code or open their share link directly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={!roomCodeInput.trim()}
                  className="press w-full rounded-full bg-primary py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift disabled:opacity-40 hover:scale-[1.02] cursor-pointer"
                >
                  ⚡ Connect & Join Match
                </button>
              </div>
            )}

            <p className="text-[0.7rem] text-muted-foreground">
              💡 Tip: You can test right now on this single computer by opening this race in two separate browser windows!
            </p>
          </div>
        )}

        {/* STEP 2: CONNECTED ARENA & CALIBRATION */}
        {role !== "choose" && (
          <div className="space-y-4">
            {/* LOBBY / CODE BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-accent/30 p-3.5">
              <div>
                <p className="text-xs font-bold text-foreground">
                  {role === "host" ? "👑 Laptop 1 (Host Room)" : "⚡ Laptop 2 (Challenger Room)"}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">{statusMessage}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {assignedRoomCode && (
                  <>
                    <span className="rounded-xl border border-primary bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary tracking-wider">
                      FISH-{assignedRoomCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyCodeToClipboard}
                      className="press rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-lift cursor-pointer"
                    >
                      {copiedCode ? "Code Copied! ✅" : "📋 Copy Code"}
                    </button>
                    <button
                      type="button"
                      onClick={copyInviteLink}
                      className="press rounded-lg border border-primary/50 bg-background px-3 py-1 text-xs font-bold text-primary hover:bg-accent cursor-pointer"
                    >
                      {copiedLink ? "Link Copied! ✅" : "🔗 Share Link"}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleBackToLobby}
                  className="press rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ↩️ Leave Room
                </button>
              </div>
            </div>

            {/* DUAL LIVE FISH BOWL FEEDS */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* BOWL 1: YOUR FISH BOWL */}
              <div className="paper-card p-3 border-2 border-primary/60 bg-background/95">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🐟</span>
                    <span className="font-display text-xs font-bold text-primary">
                      {myFishName} (Your Fish Bowl)
                    </span>
                  </div>
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    Thrust: {myThrust}%
                  </span>
                </div>

                {/* Video container with Fish Bowl alignment circle */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black border border-primary/40">
                  <video
                    ref={(el) => {
                      if (el && localStream && el.srcObject !== localStream) {
                        el.srcObject = localStream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover [transform:scaleX(-1)]"
                  />

                  {/* Fish Bowl Alignment Reticle */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-36 w-36 rounded-full border-2 border-dashed border-cyan-400/75 animate-pulse flex items-center justify-center">
                      <span className="rounded bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-bold text-cyan-300">
                        Align Bowl Here
                      </span>
                    </div>
                  </div>

                  {/* Real-time Thrust Bar */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-500 transition-all duration-75"
                    style={{ width: `${myThrust}%` }}
                  />
                </div>
              </div>

              {/* BOWL 2: OPPONENT FISH BOWL */}
              <div className="paper-card p-3 border-2 border-border bg-background/95">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🐠</span>
                    <span className="font-display text-xs font-bold text-foreground">
                      {oppFishName} (Opponent's Bowl)
                    </span>
                  </div>
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {isConnected ? "🟢 Live Sync" : "⏳ Waiting..."}
                  </span>
                </div>

                {/* Opponent Video / Stream Container */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black border border-border flex items-center justify-center text-center p-4">
                  {remoteStream ? (
                    <video
                      ref={(el) => {
                        remoteVideoRef.current = el;
                        if (el && el.srcObject !== remoteStream) {
                          el.srcObject = remoteStream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="space-y-1 text-muted-foreground">
                      <span className="text-3xl animate-bounce">📡</span>
                      <p className="text-xs font-semibold">
                        {isConnected
                          ? "Connected! Synchronizing Opponent Stream..."
                          : "Waiting for second laptop to join..."}
                      </p>
                    </div>
                  )}

                  {/* Reticle */}
                  {remoteStream && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-36 w-36 rounded-full border-2 border-dashed border-amber-400/60 flex items-center justify-center">
                        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-300">
                          Opponent Bowl
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RACE TRACK ARENA */}
            <div className="relative space-y-3 rounded-2xl border-2 border-border bg-water p-4 text-water-foreground overflow-hidden shadow-paper">
              <div className="absolute inset-0 bg-gradient-to-r from-water via-water to-water-deep opacity-90 rounded-2xl" />

              {/* Finish Line */}
              <div className="absolute right-10 top-0 bottom-0 z-10 w-1 border-r-2 border-dashed border-amber-300 opacity-90">
                <span className="absolute -top-1 -right-4 rounded bg-amber-400 px-1 py-0.5 text-[0.55rem] font-bold text-amber-950">
                  FINISH
                </span>
              </div>

              {/* Lane 1: My Fish */}
              <div className="relative z-10 flex items-center justify-between rounded-xl bg-water-deep/75 px-3 py-2.5 border border-amber-300/40">
                <div className="w-28 shrink-0 flex items-center gap-1.5">
                  <span className="font-display text-xs font-bold text-amber-300 truncate">
                    {myFishName} (You)
                  </span>
                </div>
                <div className="relative mx-3 h-8 flex-1">
                  <div
                    className="absolute top-0 transition-all duration-75"
                    style={{ left: `${myDist * 0.85}%` }}
                  >
                    <div className="flex items-center">
                      <img src={meemee} alt="My Fish" className="h-8 brightness-0 invert" />
                      {myThrust > 25 && <span className="text-[0.65rem] animate-pulse">💨</span>}
                    </div>
                  </div>
                </div>
                <span className="font-display text-xs tabular-nums text-amber-300 font-bold">
                  {Math.round(myDist)}m
                </span>
              </div>

              {/* Lane 2: Opponent Fish */}
              <div className="relative z-10 flex items-center justify-between rounded-xl bg-water-deep/50 px-3 py-2.5 border border-border/50">
                <div className="w-28 shrink-0 flex items-center gap-1.5">
                  <span className="font-display text-xs font-bold text-water-foreground truncate">
                    {oppFishName}
                  </span>
                </div>
                <div className="relative mx-3 h-8 flex-1">
                  <div
                    className="absolute top-0 transition-all duration-75"
                    style={{ left: `${oppDist * 0.85}%` }}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl">🐠</span>
                    </div>
                  </div>
                </div>
                <span className="font-display text-xs tabular-nums text-water-foreground font-bold">
                  {Math.round(oppDist)}m
                </span>
              </div>
            </div>

            {/* COUNTDOWN OVERLAY */}
            {gameState === "countdown" && (
              <div className="rounded-2xl border-2 border-primary bg-primary p-6 text-center text-primary-foreground shadow-lift animate-enter-up">
                <p className="eyebrow text-primary-foreground/80">SYNCHRONIZED RACE START</p>
                <span className="display-xl mt-2 block text-6xl animate-ping font-extrabold">
                  {countdownNum}
                </span>
                <p className="hand mt-2 text-lg text-primary-foreground">
                  Get ready! Make sure both fish bowls are in the cameras!
                </p>
              </div>
            )}

            {/* FINISHED PODIUM */}
            {gameState === "finished" && (
              <div className="rounded-2xl border-2 border-primary bg-primary p-6 text-center text-primary-foreground shadow-lift animate-enter-up">
                <span className="text-4xl">🥇</span>
                <h3 className="display-xl mt-1 text-2xl uppercase">
                  {winnerName} IS THE OLYMPIC FISH CHAMPION!
                </h3>
                <p className="hand mt-2 text-lg text-primary-foreground">
                  Official 2-Laptop Derby Time: {raceElapsed} seconds!
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={triggerResetAll}
                    className="press rounded-full bg-primary-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary shadow-lift"
                  >
                    Rematch 🔄
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="press rounded-full border border-primary-foreground/50 bg-transparent px-5 py-2.5 text-xs font-bold text-primary-foreground"
                  >
                    Exit Arena
                  </button>
                </div>
              </div>
            )}

            {/* LOBBY CONTROLS */}
            {gameState === "lobby" && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  {isConnected
                    ? "Both fish bowls calibrated. Click Start Synchronized Race!"
                    : "Share the match code with the second laptop to start the race."}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={requestStartRace}
                    className="press rounded-full bg-primary px-8 py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-lift hover:scale-105"
                  >
                    🏁 Start 2-Fish Live Race!
                  </button>
                </div>
              </div>
            )}

            {gameState === "racing" && (
              <div className="rounded-xl border border-primary/30 bg-card p-3 text-center">
                <p className="font-display text-sm font-bold text-primary animate-pulse">
                  ⚡ 2-FISH RACE IN PROGRESS! Time: {raceElapsed}s
                </p>
                <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                  Both real fish are racing right now through their respective laptop cameras!
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
