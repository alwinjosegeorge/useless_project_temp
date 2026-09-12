import { createFileRoute, Link } from "@tanstack/react-router";
import meemee from "@/assets/meemee.png";
import { Bubbles, Eyebrow, PillButton, SectionHead } from "@/components/meemee/bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MEEMEE — Teach A Fish To Swim" },
      {
        name: "description",
        content:
          "An unnecessarily advanced swimming academy for fish. Training, rankings, certificates and extremely important statistics.",
      },
      { property: "og:title", content: "MEEMEE — Teach A Fish To Swim" },
      {
        property: "og:description",
        content: "Teaching fish what they already know. An unnecessarily advanced swimming academy.",
      },
    ],
  }),
  component: Home,
});

const cards = [
  {
    to: "/profile" as const,
    label: "Meet Meemee",
    copy: "A fish with two years of experience and no formal qualifications.",
    tag: "Profile",
  },
  {
    to: "/train" as const,
    label: "Training Program",
    copy: "Four levels of increasingly unnecessary aquatic instruction.",
    tag: "Academy",
  },
  {
    to: "/olympics" as const,
    label: "Fish Olympics",
    copy: "Five prestigious events. Extreme aquatic drama. Zero athletic purpose.",
    tag: "Olympics",
  },
  {
    to: "/iq-test" as const,
    label: "Fish IQ Test",
    copy: "Rigorous examination of aquatic logic, hooks, and glass wall negotiation.",
    tag: "IQ Test",
  },
  {
    to: "/result" as const,
    label: "Swimming Report",
    copy: "Detailed analysis of a skill the subject already possessed.",
    tag: "Report",
  },
];

const stats = [
  { label: "Total Distance", value: "128.4 m", note: "Mostly in circles" },
  { label: "Calories Burned", value: "0.0003 kcal", note: "Rounding error" },
  { label: "Water Consumed", value: "∞ L", note: "Surrounded by it" },
  { label: "Swimming Efficiency", value: "73%", note: "Generous estimate" },
  { label: "Time Wasted", value: "42 min", note: "Yours, not the fish's" },
  { label: "Actual Human Benefit", value: "0%", note: "Consistent result" },
];

function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden px-5 pt-12 pb-8 sm:px-8 sm:pt-20">
        <Bubbles className="text-primary/40" count={10} />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="animate-enter-up">
            <Eyebrow>Swimming Academy · Est. 2026</Eyebrow>
            <h1 className="display-xl mt-5 text-[clamp(2.75rem,11vw,6.5rem)]">
              Teach a fish
              <br />
              <span className="text-primary">to swim.</span>
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground sm:text-lg">
              An unnecessarily advanced swimming academy for fish.
            </p>
            <p className="hand mt-2 text-primary">Teaching fish what they already know.</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <PillButton to="/train">Start Training</PillButton>
              <PillButton to="/profile" variant="outline">
                Meet Meemee
              </PillButton>
            </div>

            <div className="paper-card mt-10 flex max-w-sm items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <Eyebrow>Current swimming ability</Eyebrow>
                <p className="mt-1 truncate font-display text-lg">Suspiciously acceptable</p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary font-display text-sm text-primary-foreground">
                B+
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-primary p-8 shadow-deep">
              <Bubbles className="text-primary-foreground/50" count={14} />
              <div className="relative grid place-items-center py-6">
                <img
                  src={meemee}
                  alt="Meemee, a fish wearing sunglasses"
                  width={1024}
                  height={1024}
                  className="animate-swim w-full max-w-sm brightness-0 invert"
                />
              </div>
              <p className="hand relative mt-2 text-center text-primary-foreground">
                come for the swim, stay for the pointlessness
              </p>
            </div>
            <span className="absolute -bottom-4 left-6 rounded-full bg-card px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] shadow-lift">
              Student #001
            </span>
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <SectionHead
          eyebrow="The academy"
          title="Five ways to overthink swimming"
          note="Every module is fully accredited by our own imagination."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Link
              key={c.label}
              to={c.to}
              className="paper-card lift-hover animate-enter-up group flex flex-col justify-between p-6"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <Eyebrow>{c.tag}</Eyebrow>
                <span className="text-lg transition-transform group-hover:translate-x-1">↗</span>
              </div>
              <div className="mt-14">
                <h3 className="display-xl text-2xl">{c.label}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.copy}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto mt-24 max-w-6xl px-5 sm:px-8">
        <SectionHead
          eyebrow="Analytics"
          title="Extremely important statistics"
          note="Collected with great care and absolutely no purpose."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="paper-card lift-hover animate-enter-up p-6"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <Eyebrow>{s.label}</Eyebrow>
              <p className="display-xl mt-3 text-4xl text-primary">{s.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>
        <p className="hand mt-6 text-muted-foreground">None of these statistics are useful.</p>
      </section>
    </>
  );
}
