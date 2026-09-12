import { useState, useEffect, useRef } from "react";

interface MicroBubble {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function FishCursor() {
  const [bubbles, setBubbles] = useState<MicroBubble[]>([]);
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // References for direct 1:1 hardware performance
  const fishContainerRef = useRef<HTMLDivElement | null>(null);
  const facingRef = useRef<1 | -1>(1);
  const isHoveringRef = useRef(false);
  const isClickingRef = useRef(false);
  const lastBubbleTimeRef = useRef(0);
  const lastXRef = useRef(0);

  useEffect(() => {
    // Only enable on devices with a mouse/trackpad
    const hasPointer = window.matchMedia("(pointer: fine)").matches;
    if (!hasPointer) return;

    const fishEl = fishContainerRef.current;
    if (fishEl) {
      fishEl.style.display = "none"; // hidden until first mousemove
    }

    const updateFishTransform = (x: number, y: number) => {
      if (!fishEl) return;
      const facing = facingRef.current;
      const scale = isClickingRef.current ? 0.85 : isHoveringRef.current ? 1.25 : 1;
      const tilt = isHoveringRef.current ? -12 * facing : 0;

      // Position fish with snout/mouth right at cursor point
      // When facing right (scaleX 1), offset mouth slightly
      // When facing left (scaleX -1), offset mouth symmetrically
      fishEl.style.transform = `translate3d(${x}px, ${y}px, 0) translate(${
        facing === 1 ? "-75%" : "-25%"
      }, -50%) scaleX(${facing}) scale(${scale}) rotate(${tilt}deg)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      if (fishEl && fishEl.style.display === "none") {
        fishEl.style.display = "block";
      }

      // Detect horizontal motion to face left or right instantly
      const dx = x - lastXRef.current;
      if (dx > 0.5) {
        facingRef.current = 1;
      } else if (dx < -0.5) {
        facingRef.current = -1;
      }
      lastXRef.current = x;

      // Direct GPU transform update on mousemove (ZERO LATENCY)
      updateFishTransform(x, y);

      // Check if hovering over clickable element
      const target = e.target as HTMLElement | null;
      if (target) {
        const clickable = Boolean(
          target.closest(
            "a, button, input, select, textarea, [role='button'], .press, [tabindex], [onclick]"
          )
        );
        if (clickable !== isHoveringRef.current) {
          isHoveringRef.current = clickable;
          setIsHovering(clickable);
          updateFishTransform(x, y);
        }
      }

      // Spawn ambient micro bubbles behind fish
      const now = performance.now();
      if (Math.abs(dx) > 3 && now - lastBubbleTimeRef.current > 140) {
        lastBubbleTimeRef.current = now;
        const bubbleX = x + (facingRef.current === 1 ? -26 : 26) + (Math.random() * 6 - 3);
        const bubbleY = y + 3 + (Math.random() * 4 - 2);

        setBubbles((prev) => [
          ...prev.slice(-10),
          {
            id: now + Math.random(),
            x: bubbleX,
            y: bubbleY,
            size: 4 + Math.random() * 4,
          },
        ]);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isClickingRef.current = true;
      setIsClicking(true);
      updateFishTransform(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      isClickingRef.current = false;
      setIsClicking(false);
      updateFishTransform(e.clientX, e.clientY);
    };

    const handleMouseLeave = () => {
      if (fishEl) fishEl.style.opacity = "0";
    };

    const handleMouseEnter = (e: MouseEvent) => {
      if (fishEl) {
        fishEl.style.opacity = "1";
        updateFishTransform(e.clientX, e.clientY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  // Bubble rise & pop loop
  useEffect(() => {
    if (bubbles.length === 0) return;
    const interval = setInterval(() => {
      setBubbles((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - 1.8 }))
          .filter((b) => b.y > 0)
      );
    }, 40);
    return () => clearInterval(interval);
  }, [bubbles.length]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden">
      {/* Floating Micro-bubbles */}
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute rounded-full border border-sky-400/60 bg-sky-200/40 backdrop-blur-[1px] animate-pulse pointer-events-none"
          style={{
            left: `${b.x}px`,
            top: `${b.y}px`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            transition: "transform 0.3s ease-out",
          }}
        />
      ))}

      {/* Zero-Latency Swimming Fish Cursor Element */}
      <div
        ref={fishContainerRef}
        className="absolute top-0 left-0 pointer-events-none will-change-transform select-none"
        style={{
          display: "none",
          transformOrigin: "center center",
          transition: "opacity 0.15s ease-out",
        }}
      >
        <svg
          width="34"
          height="24"
          viewBox="0 0 34 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md select-none"
        >
          {/* Tail Fin with Animated Flutter */}
          <path
            d="M4 7 C0 3, 0 21, 4 17 L9 12 Z"
            fill="#3b82f6"
            className="origin-[9px_12px] animate-[pulse_0.35s_ease-in-out_infinite]"
          />
          <path d="M2 9 C0 5, 0 19, 2 15 L6 12 Z" fill="#60a5fa" opacity="0.8" />

          {/* Dorsal Top Fin */}
          <path d="M13 5 C16 1, 21 1, 23 5 Z" fill="#60a5fa" />

          {/* Ventral Bottom Fin */}
          <path d="M14 19 C17 23, 21 23, 23 19 Z" fill="#60a5fa" />

          {/* Main Fish Body */}
          <ellipse cx="18.5" cy="12" rx="12" ry="7.5" fill="#2563eb" />

          {/* Cute Belly Tone */}
          <path
            d="M11 14 C15 18, 24 18, 27 14 C24 19.5, 15 19.5, 11 14 Z"
            fill="#93c5fd"
            opacity="0.9"
          />

          {/* Cute Eye */}
          <circle cx="24" cy="9.5" r="2.8" fill="white" />
          <circle cx="25" cy="9.5" r="1.5" fill="#0f172a" />
          <circle cx="25.5" cy="8.8" r="0.6" fill="white" />

          {/* Meemee Sunglasses (Appears on Hover!) */}
          {isHovering ? (
            <g>
              <rect x="20" y="7.5" width="8" height="4" rx="1.2" fill="#0f172a" />
              <line x1="19" y1="9" x2="21" y2="9" stroke="#0f172a" strokeWidth="1.2" />
            </g>
          ) : (
            <circle cx="21" cy="13" r="1.3" fill="#f43f5e" opacity="0.6" />
          )}

          {/* Snout / Nose (Exact Click Point) */}
          <circle cx="30.5" cy="12" r="1.2" fill="#1d4ed8" />
        </svg>

        {/* Click Splash Splash Icon */}
        {isClicking && (
          <span className="absolute -top-1 -right-1 text-xs animate-ping">
            💦
          </span>
        )}
      </div>
    </div>
  );
}
