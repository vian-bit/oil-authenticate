import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QRScanner from "@/components/QRScanner";
import { ChainBadges } from "@/components/ChainBadges";
import { listProducts } from "@/lib/blockchain";
import { toast } from "sonner";

export default function Scan() {
  const [params] = useSearchParams();
  const [code, setCode] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const c = params.get("code");
    if (c) nav(`/verify/${encodeURIComponent(c)}`, { replace: true });
  }, [params, nav]);

  function submit(c: string, query = "") {
    const v = c.trim().toUpperCase();
    if (!v) return;
    nav(`/verify/${encodeURIComponent(v)}${query}`);
  }

  function handleScanResult(text: string) {
    // Accepts a raw OG-XXXX-XXXX code OR a full /verify/<code>?d=... URL.
    const raw = text.trim();
    let code = raw;
    let query = "";
    try {
      // Try parse as URL to preserve the ?d= payload if present.
      const u = new URL(raw);
      const m = u.pathname.match(/(OG-[A-Z0-9]{4}-[A-Z0-9]{4})/i);
      if (m) {
        code = m[1].toUpperCase();
        const d = u.searchParams.get("d");
        if (d) query = `?d=${encodeURIComponent(d)}`;
      }
    } catch {
      const m = raw.match(/(OG-[A-Z0-9]{4}-[A-Z0-9]{4})/i);
      if (m) code = m[1].toUpperCase();
    }
    toast.success("QR ditemukan", { description: code, icon: <CheckCircle2 className="h-4 w-4" /> });
    submit(code, query);
  }

  function simulateScan() {
    const items = listProducts();
    const target = items.find((p) => p.status === "active") ?? items[0];
    if (!target) submit("OG-FAKE-0000");
    else {
      toast.success("QR ditemukan (simulasi)", { description: target.code });
      submit(target.code);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <ChainBadges />
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Verifikasi Produk</h1>
        <p className="mt-2 text-muted-foreground">
          Scan QR pada kemasan oli menggunakan kamera, atau masukkan kode unik secara manual.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold">Pemindai kamera</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">Realtime</span>
          </div>
          <QRScanner onResult={handleScanResult} />
          <Button onClick={simulateScan} variant="ghost" className="mt-3 w-full">
            <Sparkles className="mr-2 h-4 w-4" /> Atau gunakan simulasi (tanpa kamera)
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Input kode manual
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); submit(code); }}
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
