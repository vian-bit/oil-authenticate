import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, History, ShieldCheck, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ChainBadges, shortHash } from "@/components/ChainBadges";
import { ProductQR } from "@/components/ProductQR";
import {
  getProductByCode, getProductHistory,
  type Product, type BlockchainTx,
} from "@/lib/blockchain";
import { explorerTxUrl, SOLANA_NETWORK_LABEL } from "@/lib/solana";
import { ExternalLink } from "lucide-react";

export default function ProductDetail() {
  const { code = "" } = useParams();
  const decoded = decodeURIComponent(code);
  const [product, setProduct] = useState<Product | undefined>();
  const [history, setHistory] = useState<BlockchainTx[]>([]);

  useEffect(() => {
    setProduct(getProductByCode(decoded));
    setHistory(getProductHistory(decoded));
  }, [decoded]);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/admin"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke Admin</Link>
        </Button>
        <ChainBadges className="mb-4" />

        {!product ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-danger" />
            <h2 className="mt-3 text-xl font-bold">Produk tidak ditemukan</h2>
            <p className="mt-1 text-sm text-muted-foreground">Kode <span className="font-mono">{decoded}</span> belum terdaftar.</p>
            <Button asChild className="mt-5"><Link to="/admin">Ke Admin</Link></Button>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between bg-primary p-5 text-primary-foreground">
                <div>
                  <div className="text-xs font-bold uppercase opacity-80">Produk</div>
                  <h1 className="text-2xl font-extrabold">{product.name}</h1>
                  <div className="font-mono text-xs opacity-90">{product.code}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${product.status === "active" ? "bg-accent text-accent-foreground" : "bg-success text-success-foreground"}`}>
                  {product.status === "active" ? "BELUM DISCAN" : "DIVERIFIKASI"}
                </span>
              </div>
              <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="rounded-xl bg-secondary p-3">
                  <ProductQR value={`${window.location.origin}/verify/${encodeURIComponent(product.code)}`} size={160} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field k="Batch" v={product.batch} />
                  <Field k="Tanggal produksi" v={new Date(product.producedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
                  <Field k="Jaringan" v={SOLANA_NETWORK_LABEL} />
                  <Field k="Terdaftar" v={new Date(product.registeredAt).toLocaleString("id-ID")} />
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Hash on-chain</div>
                    <div className="mt-1 break-all rounded-lg bg-secondary p-2 font-mono text-[11px]">{product.hash}</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-muted/40 p-4">
                <Button asChild size="sm"><Link to={`/verify/${encodeURIComponent(product.code)}`}><ShieldCheck className="mr-2 h-4 w-4" /> Verifikasi sekarang</Link></Button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-sm font-bold">
                <History className="h-4 w-4 text-primary" /> Riwayat Aktivitas
              </div>
              <ol className="mt-5 space-y-5 border-l-2 border-border pl-5">
                {history.map((t, i) => {
                  const verifyIdx = history.slice(0, i + 1).filter((h) => h.txType === "VERIFY").length;
                  const isReg = t.txType === "REGISTER";
                  const label = isReg
                    ? "Produk didaftarkan"
                    : verifyIdx === 1 ? "Diverifikasi pertama kali" : "Diverifikasi kembali";
                  return (
                    <li key={t.txHash} className="relative">
                      <span className={`absolute -left-[27px] top-1 h-4 w-4 rounded-full border-2 border-background ${isReg ? "bg-primary" : t.result === "not_found" ? "bg-danger" : "bg-success"}`} />
                      <div className="text-sm font-semibold">✓ {label}</div>
                      <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                        <div>TX: <span className="font-mono text-foreground">{shortHash(t.txHash, 8, 4)}</span></div>
                        <div>Block: <span className="font-mono text-foreground">#{t.blockNumber.toLocaleString()}</span></div>
                        <div>{new Date(t.timestamp).toLocaleString("id-ID")}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="mt-0.5 font-medium">{v}</div>
    </div>
  );
}
