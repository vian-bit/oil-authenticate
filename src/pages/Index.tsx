import { Link } from "react-router-dom";
import { ScanLine, ShieldCheck, PackageCheck, Layers, Lock } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getStats, seedDemoData } from "@/lib/blockchain";

export default function Index() {
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });

  useEffect(() => {
    seedDemoData();
    const t = setTimeout(() => setStats(getStats()), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Layout>
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Lock className="h-3.5 w-3.5" /> Polygon · Smart Contract
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Pastikan oli kendaraan Anda <span className="text-primary">asli</span>, bukan palsu.
          </h1>
          <p className="mt-4 max-w-prose text-base text-muted-foreground">
            OilGuard memberikan identitas digital unik untuk setiap botol oli, tersimpan di blockchain.
            Cukup scan QR — Anda tahu seketika apakah produknya asli, sudah pernah digunakan, atau tidak terdaftar.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to="/scan"><ScanLine className="mr-2 h-5 w-5" /> Scan Produk</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base">
              <Link to="/scan?mode=manual"><ShieldCheck className="mr-2 h-5 w-5" /> Cek Keaslian</Link>
            </Button>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-4">
            <Stat label="Produk terdaftar" value={stats.total} />
            <Stat label="Sudah diverifikasi" value={stats.verified} />
            <Stat label="Belum discan" value={stats.pending} />
          </dl>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <PackageCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Hasil verifikasi terakhir</div>
                <div className="font-bold">Mesran Super 20W-50</div>
              </div>
              <span className="ml-auto rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground">ASLI</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Field k="Kode" v="OG-9X2A-4LM7" />
              <Field k="Batch" v="B-2410-A" />
              <Field k="Produksi" v="12 Okt 2024" />
              <Field k="Jaringan" v="Polygon Amoy" />
            </div>
            <div className="mt-5 rounded-lg bg-secondary p-3 font-mono text-[11px] leading-relaxed text-secondary-foreground break-all">
              tx: 0x7a3c…e91b · block #84,221,007
            </div>
          </div>
          <div className="absolute -right-4 -top-4 hidden rotate-6 rounded-xl border border-border bg-accent px-3 py-2 text-xs font-bold text-accent-foreground shadow-sm md:block">
            On-chain verified
          </div>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-bold">Cara kerja</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <Step n={1} icon={Layers} title="Pabrik daftarkan produk" desc="Admin menambahkan data oli; sistem generate kode unik & QR. Hash disimpan ke smart contract." />
          <Step n={2} icon={ScanLine} title="Pengguna scan QR" desc="Scan kamera atau input kode manual. Frontend memanggil contract.verifyProduct()." />
          <Step n={3} icon={ShieldCheck} title="Status terjamin" desc="Hijau = asli, Kuning = sudah pernah discan (indikasi pemalsuan), Merah = tidak terdaftar." />
        </div>
      </section>
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}
function Step({ n, icon: Icon, title, desc }: { n: number; icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-muted-foreground">LANGKAH {n}</span>
      </div>
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
