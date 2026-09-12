import { createFileRoute } from "@tanstack/react-router";
import meemee from "@/assets/meemee.png";
import { Eyebrow, PillButton } from "@/components/meemee/bits";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: "Certified Fish Swimmer | MEEMEE" },
      {
        name: "description",
        content:
          "The official MEEMEE certificate confirming that a fish has completed the advanced fish swimming program.",
      },
      { property: "og:title", content: "Certified Fish Swimmer — MEEMEE" },
      {
        property: "og:description",
        content: "Meemee has completed the advanced fish swimming program. Score 87 / 100.",
      },
    ],
  }),
  component: Certificate,
});

const meta = [
  { label: "Score", value: "87 / 100" },
  { label: "Instructor", value: "Coach Fin" },
  { label: "Date", value: "11 September 2026" },
];

function Certificate() {
  return (
    <section className="mx-auto max-w-5xl px-5 pt-12 sm:px-8 sm:pt-16">
      <Eyebrow>Accreditation</Eyebrow>
      <h1 className="display-xl mt-4 text-[clamp(2.25rem,8vw,4.5rem)]">Certificate</h1>

      <div className="paper-card grid-paper animate-enter-up mt-10 p-3 sm:p-5">
        <div className="rounded-[1.75rem] border-2 border-primary/70 bg-card p-6 text-center sm:p-12">
          <div className="mx-auto max-w-2xl rounded-[1.25rem] border border-border/80 px-4 py-10 sm:px-10 sm:py-14">
            <p className="eyebrow">Meemee Swimming Academy</p>
            <h2 className="display-xl mt-5 text-[clamp(1.75rem,6vw,3.25rem)] text-primary">
              Certified fish swimmer
            </h2>

            <p className="mt-8 text-sm text-muted-foreground">This certifies that</p>
            <p className="display-xl mt-2 text-[clamp(2rem,8vw,3.5rem)]">Meemee</p>

            <img
              src={meemee}
              alt="Meemee the certified fish"
              width={1024}
              height={1024}
              loading="lazy"
              className="animate-swim mx-auto mt-6 w-40 sm:w-52"
            />

            <p className="mt-6 text-sm text-muted-foreground">has successfully completed</p>
            <p className="mt-2 font-display text-lg uppercase tracking-[0.1em] sm:text-xl">
              The advanced fish swimming program
            </p>

            <div className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
              {meta.map((m) => (
                <div key={m.label}>
                  <Eyebrow>{m.label}</Eyebrow>
                  <p className="mt-1.5 font-display text-lg">{m.value}</p>
                </div>
              ))}
            </div>

            <p className="hand mt-10 text-primary">Coach Fin</p>
            <p className="eyebrow mt-1">Signed, reluctantly</p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <PillButton>Generate Certificate</PillButton>
        <PillButton variant="outline">Share Achievement</PillButton>
        <PillButton to="/leaderboard" variant="ghost">
          Back To Leaderboard
        </PillButton>
      </div>
    </section>
  );
}
