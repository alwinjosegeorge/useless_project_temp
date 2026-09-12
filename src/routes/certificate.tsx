import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import meemee from "@/assets/meemee.png";
import { Eyebrow, PillButton } from "@/components/meemee/bits";
import { getLatestCertificate, issueCertificate, verifyCertificate } from "@/lib/neon";

export const Route = createFileRoute("/certificate")({
  head: () => ({
    meta: [
      { title: "Certified Fish Swimmer | MEEMEE" },
      {
        name: "description",
        content:
          "The official MEEMEE certificate confirming that a fish has completed the advanced fish swimming program, verified on Neon PostgreSQL.",
      },
      { property: "og:title", content: "Certified Fish Swimmer — MEEMEE" },
      {
        property: "og:description",
        content: "Meemee has completed the advanced fish swimming program. Verified in Neon Database.",
      },
    ],
  }),
  component: Certificate,
});

function Certificate() {
  const [certData, setCertData] = useState<{
    certificate_code: string;
    fish_name: string;
    score: number;
    program_name: string;
    instructor: string;
    created_at?: string;
  }>({
    certificate_code: "MEE-2026-001",
    fish_name: "Meemee",
    score: 87,
    program_name: "The advanced fish swimming program",
    instructor: "Coach Fin",
  });

  const [isNeonLoaded, setIsNeonLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Verification state
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    found: boolean;
    data?: any;
    searched: boolean;
  }>({ found: false, searched: false });
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    getLatestCertificate("Meemee").then((record) => {
      if (record) {
        setCertData(record as any);
        setIsNeonLoaded(true);
      }
    });
  }, []);

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    const randomScore = Math.floor(85 + Math.random() * 15);
    const newCert = await issueCertificate({
      fishName: "Meemee",
      score: randomScore,
    });
    if (newCert) {
      setCertData(newCert as any);
      setIsNeonLoaded(true);
    }
    setIsGenerating(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setIsVerifying(true);
    const match = await verifyCertificate(verifyInput.trim());
    setVerifyResult({
      searched: true,
      found: !!match,
      data: match,
    });
    setIsVerifying(false);
  };

  const dateStr = certData.created_at
    ? new Date(certData.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "11 September 2026";

  const meta = [
    { label: "Score", value: `${certData.score} / 100` },
    { label: "Instructor", value: certData.instructor || "Coach Fin" },
    { label: "Date", value: dateStr },
  ];

  return (
    <section className="mx-auto max-w-5xl px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Accreditation</Eyebrow>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {isNeonLoaded ? "Neon PostgreSQL Verified" : "Database Connected"}
        </span>
      </div>

      <h1 className="display-xl mt-4 text-[clamp(2.25rem,8vw,4.5rem)]">Certificate</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Official graduation records stored in Neon Serverless PostgreSQL with immutable verification codes.
      </p>

      {/* CERTIFICATE DISPLAY */}
      <div className="paper-card grid-paper animate-enter-up mt-8 p-3 sm:p-5">
        <div className="rounded-[1.75rem] border-2 border-primary/70 bg-card p-6 text-center sm:p-12">
          <div className="mx-auto max-w-2xl rounded-[1.25rem] border border-border/80 px-4 py-10 sm:px-10 sm:py-14">
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
                {certData.certificate_code}
              </span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400">
                VERIFIED ✓
              </span>
            </div>

            <h2 className="display-xl mt-5 text-[clamp(1.75rem,6vw,3.25rem)] text-primary">
              Certified fish swimmer
            </h2>

            <p className="mt-8 text-sm text-muted-foreground">This certifies that</p>
            <p className="display-xl mt-2 text-[clamp(2rem,8vw,3.5rem)]">{certData.fish_name}</p>

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
              {certData.program_name}
            </p>

            <div className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
              {meta.map((m) => (
                <div key={m.label}>
                  <Eyebrow>{m.label}</Eyebrow>
                  <p className="mt-1.5 font-display text-lg">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-dashed border-border pt-4">
              <p className="hand text-primary">Coach Fin</p>
              <p className="eyebrow mt-1">Signed, reluctantly · Verified in Neon DB</p>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerateNew}
            disabled={isGenerating}
            className="press cursor-pointer rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-lift hover:bg-primary/90 disabled:opacity-50"
          >
            {isGenerating ? "Issuing in Neon DB..." : "✨ Issue New Certificate"}
          </button>
          <PillButton to="/train" variant="outline">
            Train More
          </PillButton>
          <PillButton to="/leaderboard" variant="ghost">
            Back To Leaderboard
          </PillButton>
        </div>
      </div>

      {/* CERTIFICATE VERIFICATION TOOL */}
      <div className="mt-14 paper-card p-6 border border-border bg-card">
        <Eyebrow>Neon Database Public Verification</Eyebrow>
        <h3 className="display-xl mt-2 text-xl sm:text-2xl">Verify Any Fish Certificate</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a certificate code (e.g. <code>MEE-2026-001</code> or <code>{certData.certificate_code}</code>) to query the Neon PostgreSQL ledger.
        </p>

        <form onSubmit={handleVerify} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            placeholder="Enter certificate code (e.g. MEE-2026-001)"
            className="flex-1 min-w-[240px] rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-mono uppercase focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={isVerifying || !verifyInput.trim()}
            className="press rounded-xl bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lift cursor-pointer disabled:opacity-40"
          >
            {isVerifying ? "Searching Neon..." : "🔍 Verify Certificate"}
          </button>
        </form>

        {verifyResult.searched && (
          <div className="mt-4 animate-enter-up">
            {verifyResult.found ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-900 dark:text-emerald-300">
                <p className="font-bold text-sm">✅ Authentic Certificate Found in Neon Database!</p>
                <div className="mt-2 grid gap-1 font-mono text-[0.75rem]">
                  <span>Code: {verifyResult.data.certificate_code}</span>
                  <span>Student: {verifyResult.data.fish_name}</span>
                  <span>Score: {verifyResult.data.score} / 100</span>
                  <span>Program: {verifyResult.data.program_name}</span>
                  <span>Instructor: {verifyResult.data.instructor}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
                <p className="font-bold">❌ Certificate Not Found</p>
                <p className="mt-0.5 text-[0.7rem] opacity-90">
                  No certificate matching "{verifyInput}" exists in the Neon database.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
