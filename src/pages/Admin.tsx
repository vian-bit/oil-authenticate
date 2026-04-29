import { useEffect, useMemo, useState } from "react";
import { Plus, Package, ShieldCheck, Clock, Copy, Check } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductQR } from "@/components/ProductQR";
import {
  generateCode, listProducts, registerProduct, getStats, seedDemoData,
  type Product,
} from "@/lib/blockchain";
import { toast } from "@/hooks/use-toast";

export default function Admin() {
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [qrFor, setQrFor] = useState<Product | null>(null);

  function refresh() {
    setItems(listProducts());
  }

  useEffect(() => {
    seedDemoData();
    setTimeout(refresh, 500);
  }, []);

  const stats = useMemo(() => getStats(), [items]);

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
          <p className="mt-1 text-muted-foreground">Kelola registrasi produk oli on-chain.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-11"><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Button>
          </DialogTrigger>
          <RegisterDialog
            onClose={() => setOpen(false)}
            onCreated={(p) => {
              refresh();
              setQrFor(p);
            }}
          />
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total produk" value={stats.total} icon={Package} tone="primary" />
        <StatCard label="Sudah diverifikasi" value={stats.verified} icon={ShieldCheck} tone="success" />
        <StatCard label="Belum discan" value={stats.pending} icon={Clock} tone="accent" />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="font-bold">Daftar Produk Terdaftar</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Kode Unik</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Produksi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Belum ada produk. Klik “Tambah Produk” untuk mulai.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow key={p.code}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell>{p.batch}</TableCell>
                    <TableCell>{new Date(p.producedAt).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell><StatusPill status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => setQrFor(p)}>Lihat QR</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!qrFor} onOpenChange={(v) => !v && setQrFor(null)}>
        {qrFor && <QRDialog product={qrFor} />}
      </Dialog>
    </Layout>
  );
}

function StatusPill({ status }: { status: "active" | "used" }) {
  if (status === "active")
    return <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">BELUM DISCAN</span>;
  return <span className="rounded-full bg-success px-2.5 py-1 text-[11px] font-bold text-success-foreground">DIVERIFIKASI</span>;
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "primary" | "success" | "accent" }) {
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
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}

function RegisterDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Product) => void }) {
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [producedAt, setProducedAt] = useState(new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState(generateCode());
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !batch) return;
    setLoading(true);
    try {
      const p = await registerProduct({ name, batch, producedAt, code });
      toast({ title: "Produk terdaftar", description: `Tx: ${p.txRegister.slice(0, 18)}…` });
      onCreated(p);
      onClose();
      setName(""); setBatch(""); setCode(generateCode());
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrasi Produk Baru</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nama produk</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Mesran Super 20W-50" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="code">Kode unik (auto-generate)</Label>
          <div className="flex gap-2">
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
            <Button type="button" variant="secondary" onClick={() => setCode(generateCode())}>Acak</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="batch">Batch number</Label>
            <Input id="batch" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="B-2410-A" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date">Tanggal produksi</Label>
            <Input id="date" type="date" value={producedAt} onChange={(e) => setProducedAt(e.target.value)} required />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={loading}>{loading ? "Menulis ke chain…" : "Daftarkan & Buat QR"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function QRDialog({ product }: { product: Product }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/verify/${encodeURIComponent(product.code)}`;
  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>QR Code Produk</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-2">
        <ProductQR value={url} size={200} />
        <div className="text-center">
          <div className="font-bold">{product.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{product.code}</div>
        </div>
        <div className="w-full rounded-lg bg-secondary p-3 text-xs break-all font-mono">{url}</div>
        <Button variant="secondary" onClick={copy} className="w-full">
          {copied ? <><Check className="mr-2 h-4 w-4" /> Tersalin</> : <><Copy className="mr-2 h-4 w-4" /> Salin URL verifikasi</>}
        </Button>
      </div>
    </DialogContent>
  );
}
