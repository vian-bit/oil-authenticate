import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { verifyProduct, type VerifyResult, getNetwork } from "@/lib/blockchain";

export default function Verify() {
  const { code = "" } = useParams();
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    setResult(null);
    verifyProduct(decodeURIComponent(code)).then(setResult);
  }, [code]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/scan"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link>
        </Button>

        {!result ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-border bg-card">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Memverifikasi di blockchain…</p>
          </div>
        ) : (
          <ResultView result={result} />
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
        subtitle="Produk terdaftar dan baru pertama kali diverifikasi."
        product={result.product}
      />
    );
  }
  if (result.kind === "used") {
    return (
      <Banner
        tone="warning"
        icon={AlertTriangle}
        title="SUDAH PERNAH DIGUNAKAN"
        subtitle="QR ini telah discan sebelumnya. Waspada — bisa jadi indikasi pemalsuan."
        product={result.product}
      />
    );
  }
  return (
    <Banner
      tone="danger"
      icon={XCircle}
      title="TIDAK DITEMUKAN"
      subtitle={`Kode "${result.code}" tidak terdaftar di smart contract OilGuard. Hindari produk ini.`}
    />
  );
}

type Tone = "success" | "warning" | "danger";

function Banner({
  tone,
  icon: Icon,
  title,
  subtitle,
  product,
}: {
  tone: Tone;
  icon: any;
  title: string;
  subtitle: string;
  product?: import("@/lib/blockchain").Product;
}) {
  const toneClass = {
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-danger text-danger-foreground",
  }[tone];

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
          <Field k="Diverifikasi" v={product.verifiedAt ? new Date(product.verifiedAt).toLocaleString("id-ID") : "-"} />
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground">Hash on-chain</div>
            <div className="mt-1 break-all rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed">
              {product.hash}
            </div>
          </div>
          {product.txVerify && (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground">Tx verifikasi</div>
              <div className="mt-1 break-all rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed">
                {product.txVerify}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border bg-muted/40 p-6">
        <Button asChild><Link to="/scan">Scan produk lain</Link></Button>
        <Button asChild variant="secondary"><Link to="/">Ke beranda</Link></Button>
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
