import { createFileRoute } from "@tanstack/react-router";
import meemee from "@/assets/meemee.png";
import { Bubbles, Eyebrow, PillButton, StatBar } from "@/components/meemee/bits";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Meemee — Fish Profile | MEEMEE" },
      {
        name: "description",
        content:
          "The official student file of Meemee: species fish, two years of experience, technique still under review.",
      },
      { property: "og:title", content: "Meemee — Fish Profile" },
      {
        property: "og:description",
        content: "Two years of swimming experience. We still don't trust the technique.",
      },
    ],
  }),
  component: Profile,
});

const facts = [
  { label: "Name", value: "Meemee" },
  { label: "Species", value: "Fish" },
  { label: "Age", value: "2 years" },
  { label: "Experience", value: "2 years" },
  { label: "Level", value: "Beginner" },
];

function Profile() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-12 sm:px-8 sm:pt-16">
      <Eyebrow>Student file · 001</Eyebrow>
      <h1 className="display-xl mt-4 text-[clamp(2.5rem,9vw,5rem)]">Meet Meemee</h1>

      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-primary p-8">
          <Bubbles className="text-primary-foreground/50" count={12} />
          <img
            src={meemee}
            alt="Meemee the fish"
            width={1024}
            height={1024}
            loading="lazy"
            className="animate-swim relative mx-auto w-full max-w-xs brightness-0 invert"
          />
          <p className="hand relative mt-4 text-center text-primary-foreground">
            currently unimpressed
          </p>
        </div>

        <div className="space-y-4">
          <div className="paper-card divide-y divide-border">
            {facts.map((f) => (
              <div
                key={f.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4"
              >
                <Eyebrow>{f.label}</Eyebrow>
                <p className="font-display text-lg">{f.value}</p>
              </div>
            ))}
          </div>

          <div className="paper-card bg-accent p-6">
            <p className="hand text-lg text-accent-foreground sm:text-xl">
              “Meemee has been swimming for years. We still don't trust the technique.”
            </p>
          </div>
        </div>
      </div>

      <div className="paper-card mt-4 p-6 sm:p-8">
        <Eyebrow>Assessment · Static evaluation</Eyebrow>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <StatBar label="Swimming Skill" value={72} delay={100} />
          <StatBar label="Speed" value={64} delay={220} />
          <StatBar label="Direction" value={81} delay={340} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <PillButton to="/train">Start Training</PillButton>
        <PillButton to="/result" variant="outline">
          View Swimming Report
        </PillButton>
      </div>
    </section>
  );
}
