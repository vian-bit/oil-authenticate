import { Link, NavLink, useLocation } from "react-router-dom";
import { Droplet, ShieldCheck, ScanLine, LayoutDashboard, Activity, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOLANA_NETWORK_LABEL } from "@/lib/solana";
import WalletButton from "@/components/WalletButton";

const nav = [
  { to: "/", label: "Beranda", icon: ShieldCheck },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/explorer", label: "Explorer", icon: Activity },
  { to: "/solana", label: "Solana", icon: Coins },
  { to: "/admin", label: "Admin", icon: LayoutDashboard },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Droplet className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight">OilGuard</div>
              <div className="text-[11px] text-muted-foreground">Verifikasi keaslian oli on-chain</div>
            </div>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold md:flex">
              <span className="h-2 w-2 rounded-full bg-success" />
              {SOLANA_NETWORK_LABEL}
            </div>
            <WalletButton compact />
          </div>
        </div>
      </header>

      <main key={loc.pathname} className="container py-8 md:py-12 pb-24 md:pb-12">{children}</main>

      <footer className="border-t border-border bg-card">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} OilGuard. Prototype Web3 · {SOLANA_NETWORK_LABEL}.</p>
          <p>Smart contract: <code className="rounded bg-secondary px-1.5 py-0.5">OilGuard.sol</code> · Memo Program</p>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card md:hidden">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
