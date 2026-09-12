import { useState, useEffect, useRef } from "react";
import meemee from "@/assets/meemee.png";
import coachFin from "@/assets/coach-fin.png";
import { Eyebrow } from "@/components/meemee/bits";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMERGENCY_ACTIONS = [
  "Have you tried asking it nicely? 🐟",
  "Meemee appears to be on a swimming break. ☕",
  "We recommend turning the fish off and on again. 🔌",
  "Good news: the fish is alive. Bad news: it refuses to cooperate. 🪨",
  "Coach Fin has been notified. He is also confused. 🤷",
];

const EMERGENCY_STATUSES = [
  "⚠️ Suspiciously stationary",
  "⚠️ Motionless by choice",
  "⚠️ Unresponsive to aquatic stimuli",
  "⚠️ Zero fin activity detected",
];

type SequenceStep = "idle" | "asking" | "no_response" | "escalated";

export function FishEmergency() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(EMERGENCY_STATUSES[0]);
  const [action, setAction] = useState(EMERGENCY_ACTIONS[0]);
  const [step, setStep] = useState<SequenceStep>("idle");

  const timer1Ref = useRef<number | null>(null);
  const timer2Ref = useRef<number | null>(null);

  const clearTimers = () => {
    if (timer1Ref.current) window.clearTimeout(timer1Ref.current);
    if (timer2Ref.current) window.clearTimeout(timer2Ref.current);
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const openEmergency = () => {
    clearTimers();
    // Pick random action & status
    const randomAction =
      EMERGENCY_ACTIONS[Math.floor(Math.random() * EMERGENCY_ACTIONS.length)];
    const randomStatus =
      EMERGENCY_STATUSES[Math.floor(Math.random() * EMERGENCY_STATUSES.length)];
    setAction(randomAction);
    setStatus(randomStatus);
    setStep("idle");
    setIsOpen(true);
  };

  const handleAskMeemee = () => {
    clearTimers();
    setStep("asking");

    // After 2 seconds: Meemee refuses to respond
    timer1Ref.current = window.setTimeout(() => {
      setStep("no_response");

      // After another 1.5 seconds: Coach Fin escalates
      timer2Ref.current = window.setTimeout(() => {
        setStep("escalated");
      }, 1500);
    }, 2000);
  };

  const handleResetAction = () => {
    clearTimers();
    const nextAction =
      EMERGENCY_ACTIONS[Math.floor(Math.random() * EMERGENCY_ACTIONS.length)];
    setAction(nextAction);
    setStep("idle");
  };

  return (
    <>
      {/* TRIGGER CARD */}
      <div className="paper-card lift-hover relative overflow-hidden border-2 border-red-500/40 bg-card p-6 shadow-paper">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block animate-bounce text-xl">🚨</span>
            <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              Fish Emergency
            </span>
          </div>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-red-700 dark:bg-red-950/60 dark:text-red-300">
            Protocol 404
          </span>
        </div>

        <h3 className="display-xl mt-4 text-2xl text-foreground">
          Is Meemee refusing to swim?
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          Critical procedures for stubbornly stationary aquatic students.
        </p>

        <button
          type="button"
          onClick={openEmergency}
          className="press mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-red-600/30 bg-red-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lift transition-transform hover:bg-red-700 active:scale-95"
        >
          <span>🚨</span>
          <span>My Fish Is Not Swimming</span>
        </button>
      </div>

      {/* EMERGENCY MODAL */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) clearTimers();
        setIsOpen(open);
      }}>
        <DialogContent className="paper-card grid-paper border-2 border-red-500/50 bg-card p-6 sm:max-w-lg sm:p-8">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <span className="animate-pulse text-2xl">🚨</span>
              <DialogTitle className="display-xl text-2xl tracking-normal sm:text-3xl text-red-600 dark:text-red-400">
                Emergency Response
              </DialogTitle>
            </div>
            <p className="eyebrow text-muted-foreground">
              Official Incident Dispatch · Code: STATIONARY-FISH
            </p>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* STATUS BOX */}
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
              <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.2em] text-red-700 dark:text-red-300">
                Meemee Status
              </p>
              <p className="mt-1 font-display text-xl font-bold tracking-tight text-red-600 dark:text-red-400 sm:text-2xl">
                {status}
              </p>
            </div>

            {/* RECOMMENDED ACTION */}
            <div className="paper-card border border-border/80 bg-background/80 p-5">
              <Eyebrow>Recommended action</Eyebrow>
              <p className="hand mt-2 text-xl font-bold text-foreground sm:text-2xl">
                “{action}”
              </p>
            </div>

            {/* INTERACTIVE CONVERSATION SEQUENCE */}
            {step !== "idle" && (
              <div className="animate-enter-up space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                {/* 1. Trainer speech bubble */}
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    🗣️
                  </span>
                  <div className="animate-enter-up max-w-[85%] rounded-2xl rounded-tl-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm">
                    <p className="text-[0.65rem] uppercase tracking-wider opacity-75">You asked:</p>
                    <p className="font-display text-base tracking-wide">“Meemee, please swim.”</p>
                  </div>
                </div>

                {/* 2. Meemee reaction after 2s */}
                {(step === "no_response" || step === "escalated") && (
                  <div className="flex items-start justify-end gap-2.5">
                    <div className="animate-enter-up max-w-[85%] rounded-2xl rounded-tr-sm border border-border bg-card px-4 py-2.5 text-sm shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                          Meemee's reaction:
                        </span>
                        <span className="text-base">💀</span>
                      </div>
                      <p className="hand mt-1 text-xl font-bold text-foreground">
                        “Meemee has chosen not to respond.”
                      </p>
                      <p className="eyebrow mt-1 text-[0.6rem] text-muted-foreground">
                        Sunglasses remain unadjusted
                      </p>
                    </div>
                    <div className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-primary/20">
                      <img
                        src={meemee}
                        alt="Meemee unbothered"
                        className="h-7 w-7 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Coach Fin escalation after 1.5s */}
                {step === "escalated" && (
                  <div className="animate-enter-up flex items-start gap-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent">
                      <img
                        src={coachFin}
                        alt="Coach Fin"
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border-2 border-primary/40 bg-accent/80 px-4 py-3 text-sm shadow-sm">
                      <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">
                        Coach Fin · AI Instructor
                      </p>
                      <p className="mt-1 font-display text-base font-bold text-foreground">
                        “I've escalated the situation.” 😂
                      </p>
                      <p className="hand mt-1.5 text-sm text-primary">
                        Incident logged in the permanent fish academy record.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODAL FOOTER BUTTONS */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-border/80 pt-4">
            {step === "idle" ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="press cursor-pointer rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAskMeemee}
                  className="press flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-lift transition-colors hover:bg-primary/90 active:scale-95"
                >
                  <span>🐟</span>
                  <span>Ask Meemee</span>
                </button>
              </>
            ) : step === "asking" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                <span className="eyebrow">Waiting for Meemee to care... (2s)</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleResetAction}
                  className="press cursor-pointer rounded-full border border-border bg-card px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-accent active:scale-95"
                >
                  🔄 Try Another Action
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="press cursor-pointer rounded-full bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-lift transition-colors hover:bg-primary/90 active:scale-95"
                >
                  Close Protocol
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
