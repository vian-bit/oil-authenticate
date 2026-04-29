import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, KeyRound, Loader2, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listProducts } from "@/lib/blockchain";

export default function Scan() {
  const [params] = useSearchParams();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const c = params.get("code");
    if (c) {
      nav(`/verify/${encodeURIComponent(c)}`, { replace: true });
    }
  }, [params, nav]);

  function submit(c: string) {
    const v = c.trim();
    if (!v) return;
    nav(`/verify/${encodeURIComponent(v)}`);
  }

  function simulateScan() {
    setScanning(true);
    setTimeout(() => {
      const items = listProducts();
      // pilih yang masih active jika ada, kalau tidak random
      const target = items.find((p) => p.status === "active") ?? items[0];
      setScanning(false);
      if (!target) {
        // simulasi unknown
        submit("OG-FAKE-0000");
      } else {
        submit(target.code);
      }
    }, 1400);
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Verifikasi Produk</h1>
        <p className="mt-2 text-muted-foreground">
          Scan QR pada kemasan oli, atau masukkan kode unik secara manual.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="h-4 w-4 text-primary" /> Pemindai kamera
          </div>

          <div className="relative mt-4 aspect-square overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary">
            <div className="absolute inset-0 flex items-center justify-center">
              {scanning ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="text-sm font-medium">Membaca QR & memanggil smart contract…</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    Kamera tidak tersedia di prototype. Gunakan tombol simulasi di bawah.
                  </div>
                </div>
              )}
            </div>
            {/* corner frames */}
            <Corner pos="top-3 left-3" rot="border-l-4 border-t-4" />
            <Corner pos="top-3 right-3" rot="border-r-4 border-t-4" />
            <Corner pos="bottom-3 left-3" rot="border-l-4 border-b-4" />
            <Corner pos="bottom-3 right-3" rot="border-r-4 border-b-4" />
          </div>

          <Button onClick={simulateScan} disabled={scanning} className="mt-4 h-11 w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            {scanning ? "Memproses…" : "Simulasikan Scan QR"}
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Input kode manual
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(code);
            }}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <Label htmlFor="code" className="sr-only">Kode produk</Label>
              <Input
                id="code"
                placeholder="cth. OG-9X2A-4LM7"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="h-11 font-mono"
              />
            </div>
            <Button type="submit" className="h-11 px-6">Cek Keaslian</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: buka tab <strong>Admin</strong> untuk melihat kode produk yang terdaftar.
          </p>
        </div>
      </div>
    </Layout>
  );
}

function Corner({ pos, rot }: { pos: string; rot: string }) {
  return <div className={`absolute ${pos} h-8 w-8 ${rot} rounded-md border-primary`} />;
}
