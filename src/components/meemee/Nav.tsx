import { Link } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Home" },
  { to: "/train", label: "Train" },
  { to: "/olympics", label: "Olympics" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/certificate", label: "Certificate" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 sm:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-base text-primary-foreground">
            🐟
          </span>
          <span className="display-xl truncate text-xl sm:text-2xl">Meemee</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="press shrink-0 rounded-full px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground sm:px-4 sm:text-xs"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-24 max-w-6xl px-5 pb-14 sm:px-8">
      <div className="paper-card flex flex-col gap-3 px-6 py-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="display-xl text-2xl">Meemee 🐟</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Teaching fish what they already know.
          </p>
        </div>
        <p className="hand text-primary">Est. 2026 · Accredited by nobody</p>
      </div>
    </footer>
  );
}
