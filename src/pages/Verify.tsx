import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Loader2, History, ExternalLink } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ChainBadges, shortHash } from "@/components/ChainBadges";
import {
  verifyProduct, type VerifyResult, getProductHistory, type BlockchainTx,
  decodePayload,
} from "@/lib/blockchain";
import { useSolanaSigner } from "@/hooks/use-solana-signer";
import { explorerTxUrl, SOLANA_NETWORK_LABEL } from "@/lib/solana";
import { useWallet } from "@/contexts/WalletContext";

export default function Verify() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [history, setHistory] = useState<BlockchainTx[]>([]);
  const [stage, setStage] = useState<"wallet" | "pending" | "done">("wallet");
  const signer = useSolanaSigner();
  const { connected } = useWallet();

  useEffect(() => {
    setResult(null);
    setStage(connected ? "wallet" : "pending");
    const t1 = setTimeout(() => setStage("pending"), 500);
    const payload = decodePayload(params.get("d"));
    verifyProduct(decodeURIComponent(code), payload, signer).then((r) => {
      setResult(r);
      setStage("done");
      const c = r.kind === "not_found" ? r.code : r.product.code;
      setHistory(getProductHistory(c));
    });
    return () => clearTimeout(t1);
  }, [code, params, signer, connected]);


  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/scan"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link>
        </Button>
        <ChainBadges className="mb-4" />

        {!result ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-border bg-card text-center px-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-3 text-sm font-semibold">
              {stage === "wallet" ? "Waiting for wallet confirmation…" : "Memverifikasi di blockchain…"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Memanggil <code className="rounded bg-secondary px-1">verifyProduct()</code> di {getNetwork()}
            </p>
          </div>
        ) : (
          <>
            <ResultView result={result} />
            <HistoryTimeline history={history} />
          </>
        )}
      </div>
    </Layout>
  );
}

function ResultView({ result }: { result: VerifyResult }) {
  if (result.kind === "authentic") {
    return (
      <Banner
        tone="success"
        icon={CheckCircle2}
        title="ASLI"
        subtitle="Produk terdaftar di blockchain. Belum pernah diverifikasi sebelumnya."
        result={result}
      />
    );
  }
  if (result.kind === "used") {
    return (
      <Banner
        tone="warning"
        icon={AlertTriangle}
        title="PERNAH DIVERIFIKASI"
        subtitle={`Produk sudah pernah discan sebelumnya (${result.previousVerifications}× verifikasi). Waspada terhadap kemungkinan pemalsuan.`}
        result={result}
      />
    );
  }
  return (
    <Banner
      tone="danger"
      icon={XCircle}
      title="TIDAK TERDAFTAR"
      subtitle={`Kode "${result.code}" tidak ditemukan di blockchain. Hindari produk ini.`}
      result={result}
    />
  );
}

type Tone = "success" | "warning" | "danger";

function Banner({
  tone, icon: Icon, title, subtitle, result,
}: {
  tone: Tone; icon: any; title: string; subtitle: string; result: VerifyResult;
}) {
  const toneClass = {
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-danger text-danger-foreground",
  }[tone];

  const product = result.kind !== "not_found" ? result.product : undefined;
  const tx = result.tx;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className={`flex items-center gap-4 p-6 ${toneClass}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-black/10">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">Status</div>
          <div className="text-2xl font-extrabold leading-tight">{title}</div>
          <div className="mt-0.5 text-sm opacity-90">{subtitle}</div>
        </div>
      </div>

      {product && (
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field k="Nama produk" v={product.name} />
          <Field k="Kode unik" v={<span className="font-mono">{product.code}</span>} />
          <Field k="Batch" v={product.batch} />
          <Field k="Tanggal produksi" v={new Date(product.producedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
          <Field k="Jaringan" v={getNetwork()} />
          <Field k="Block #" v={<span className="font-mono">{tx.blockNumber.toLocaleString()}</span>} />
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">Hash on-chain</div>
            <div className="mt-1 break-all rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed">{product.hash}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">Tx verifikasi (baru)</div>
            <div className="mt-1 break-all rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed">{tx.txHash}</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border bg-muted/40 p-6">
        <Button asChild><Link to="/scan">Scan produk lain</Link></Button>
        {product && (
          <Button asChild variant="secondary">
            <Link to={`/product/${encodeURIComponent(product.code)}`}>Detail produk</Link>
          </Button>
        )}
        <Button asChild variant="ghost"><Link to="/explorer">Lihat Explorer</Link></Button>
      </div>
    </div>
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

function HistoryTimeline({ history }: { history: BlockchainTx[] }) {
  if (history.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm font-bold">
        <History className="h-4 w-4 text-primary" /> Riwayat Aktivitas
      </div>
      <ol className="mt-5 space-y-4 border-l-2 border-border pl-5">
        {history.map((t, i) => {
          const isReg = t.txType === "REGISTER";
          const label = isReg
            ? "Produk didaftarkan"
            : i === 1 || (!isReg && history.filter((h) => h.txType === "VERIFY").indexOf(t) === 0)
              ? "Diverifikasi pertama kali"
              : "Diverifikasi kembali";
          return (
            <li key={t.txHash} className="relative">
              <span className={`absolute -left-[27px] top-1 h-4 w-4 rounded-full border-2 border-background ${isReg ? "bg-primary" : "bg-success"}`} />
              <div className="text-sm font-semibold">✓ {label}</div>
              <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                <div>TX: <span className="font-mono text-foreground">{shortHash(t.txHash, 8, 4)}</span></div>
                <div>Block: <span className="font-mono text-foreground">#{t.blockNumber.toLocaleString()}</span></div>
                <div>{new Date(t.timestamp).toLocaleString("id-ID")}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
