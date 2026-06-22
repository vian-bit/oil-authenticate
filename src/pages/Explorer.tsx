import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Activity, FileText, ShieldCheck } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChainBadges, shortHash } from "@/components/ChainBadges";
import { listTransactions, getStats, type BlockchainTx, type TxType } from "@/lib/blockchain";

type FilterType = "ALL" | TxType;

export default function Explorer() {
  const [txs, setTxs] = useState<BlockchainTx[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");

  useEffect(() => { setTxs(listTransactions()); }, []);
  const stats = useMemo(() => getStats(), [txs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txs.filter((t) => {
      if (filter !== "ALL" && t.txType !== filter) return false;
      if (!q) return true;
      return (
        t.txHash.toLowerCase().includes(q) ||
        t.productCode.toLowerCase().includes(q) ||
        (t.productName ?? "").toLowerCase().includes(q)
      );
    });
  }, [txs, query, filter]);

  return (
    <Layout>
      <ChainBadges />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Explorer</h1>
          <p className="mt-1 text-muted-foreground">Audit trail seluruh aktivitas on-chain OilGuard.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total transaksi" value={stats.totalTx} icon={Activity} tone="primary" />
        <Stat label="Register" value={stats.total} icon={FileText} tone="accent" />
        <Stat label="Verify" value={stats.totalVerifyTx} icon={ShieldCheck} tone="success" />
        <Stat label="Block terakhir" value={`#${stats.lastBlock.toLocaleString()}`} icon={Activity} tone="primary" />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari tx hash atau kode produk…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex gap-2">
            <FilterBtn active={filter === "ALL"} onClick={() => setFilter("ALL")}>Semua</FilterBtn>
            <FilterBtn active={filter === "REGISTER"} onClick={() => setFilter("REGISTER")}>Register</FilterBtn>
            <FilterBtn active={filter === "VERIFY"} onClick={() => setFilter("VERIFY")}>Verify</FilterBtn>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tx Hash</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Tidak ada transaksi yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.txHash}>
                    <TableCell className="font-mono text-xs">{shortHash(t.txHash, 10, 6)}</TableCell>
                    <TableCell><EventBadge tx={t} /></TableCell>
                    <TableCell>
                      <Link to={`/product/${encodeURIComponent(t.productCode)}`} className="font-mono text-xs hover:underline">
                        {t.productCode}
                      </Link>
                      {t.productName && <div className="text-[11px] text-muted-foreground">{t.productName}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">#{t.blockNumber.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.timestamp).toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button size="sm" variant={active ? "default" : "secondary"} onClick={onClick}>{children}</Button>
  );
}

function EventBadge({ tx }: { tx: BlockchainTx }) {
  if (tx.txType === "REGISTER")
    return <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">REGISTER</span>;
  if (tx.result === "not_found")
    return <span className="rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-danger-foreground">VERIFY · NOT FOUND</span>;
  if (tx.result === "used")
    return <span className="rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold text-warning-foreground">VERIFY · USED</span>;
  return <span className="rounded-full bg-success px-2.5 py-1 text-[11px] font-bold text-success-foreground">VERIFY · OK</span>;
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: any; tone: "primary" | "success" | "accent" }) {
  const cls = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-success text-success-foreground",
    accent: "bg-accent text-accent-foreground",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${cls}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}
