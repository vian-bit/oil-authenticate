import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, RefreshCw, Wallet, Activity, ShieldCheck, FileText } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChainBadges, shortHash } from "@/components/ChainBadges";
import WalletButton from "@/components/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import {
  fetchSignatures, explorerTxUrl, SOLANA_NETWORK_LABEL,
} from "@/lib/solana";
import { listTransactions, type BlockchainTx } from "@/lib/blockchain";

type Row = {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: any;
  source: "onchain" | "local";
  txType?: "REGISTER" | "VERIFY";
  productCode?: string;
  productName?: string;
};

export default function SolanaExplorer() {
  const { connected, publicKey, address } = useWallet();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      // 1. local txs that have a real signature
      const local = listTransactions().filter((t) => !!t.signature) as Required<Pick<BlockchainTx, "signature">>[] & BlockchainTx[];
      const localRows: Row[] = local.map((t) => ({
        signature: t.signature!,
        slot: t.slot ?? 0,
        blockTime: t.blockTime ?? null,
        err: null,
        source: "local",
        txType: t.txType,
        productCode: t.productCode,
        productName: t.productName,
      }));

      // 2. on-chain signatures from Phantom wallet (devnet)
      let chain: Row[] = [];
      if (publicKey) {
        const sigs = await fetchSignatures(publicKey, 25);
        chain = sigs.map((s) => ({
          signature: s.signature,
          slot: s.slot,
          blockTime: s.blockTime ?? null,
          err: s.err,
          source: "onchain",
        }));
      }

      // merge, dedupe by signature, prefer enriched (local) data
      const map = new Map<string, Row>();
      for (const r of chain) map.set(r.signature, r);
      for (const r of localRows) map.set(r.signature, { ...map.get(r.signature), ...r });
      const merged = Array.from(map.values()).sort((a, b) => (b.slot - a.slot));
      setRows(merged);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [publicKey]);

  return (
    <Layout>
      <ChainBadges />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solana Explorer</h1>
          <p className="mt-1 text-muted-foreground">
            Transaksi register & verify yang dikonfirmasi di {SOLANA_NETWORK_LABEL}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <WalletButton compact />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Jaringan" value={SOLANA_NETWORK_LABEL} icon={Activity} tone="primary" />
        <Stat label="Status wallet" value={connected ? "Connected" : "Disconnected"} icon={Wallet} tone={connected ? "success" : "accent"} />
        <Stat label="Total tx tampil" value={rows.length} icon={FileText} tone="accent" />
      </div>

      {!connected && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-2 font-bold">Hubungkan Phantom Wallet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hubungkan Phantom untuk menampilkan transaksi register & verify dari Solana Devnet.
          </p>
          <div className="mt-4 flex justify-center"><WalletButton /></div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4 text-sm font-bold">
          Transaksi On-Chain {address && (<span className="font-normal text-muted-foreground">· {address.slice(0, 4)}…{address.slice(-4)}</span>)}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Signature</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Block Time</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {connected ? "Belum ada transaksi. Daftarkan / verifikasi produk untuk membuat memo on-chain." : "Hubungkan wallet untuk memuat transaksi."}
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.signature}>
                  <TableCell className="font-mono text-xs">{shortHash(r.signature, 10, 6)}</TableCell>
                  <TableCell>
                    {r.txType
                      ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${r.txType === "REGISTER" ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground"}`}>{r.txType}</span>
                      : <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">MEMO</span>}
                  </TableCell>
                  <TableCell>
                    {r.productCode ? (
                      <Link to={`/product/${encodeURIComponent(r.productCode)}`} className="font-mono text-xs hover:underline">
                        {r.productCode}
                      </Link>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                    {r.productName && <div className="text-[11px] text-muted-foreground">{r.productName}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">#{r.slot.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.blockTime ? new Date(r.blockTime * 1000).toLocaleString("id-ID") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <a href={explorerTxUrl(r.signature)} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: "primary" | "success" | "accent" }) {
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
      <div className="mt-3 text-xl font-bold">{value}</div>
    </div>
  );
}
