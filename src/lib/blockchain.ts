/**
 * Blockchain simulator untuk OilGuard prototype.
 * Mensimulasikan smart contract OilGuard.sol menggunakan localStorage.
 * Setiap operasi menghasilkan "tx hash" palsu agar UX terasa seperti on-chain.
 */

export type ProductStatus = "active" | "used";

export interface Product {
  code: string;          // unique code (juga dipakai di QR)
  name: string;
  batch: string;
  producedAt: string;    // ISO date
  registeredAt: number;  // ms
  verifiedAt?: number;
  hash: string;          // simulated keccak256
  txRegister: string;    // simulated tx hash
  txVerify?: string;
  status: ProductStatus;
}

const KEY = "oilguard.products.v1";
const NETWORK = "Polygon Amoy (simulated)";

/* ---------------- helpers ---------------- */

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return (
    "0x" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function randomTx(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function load(): Product[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: Product[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getNetwork() {
  return NETWORK;
}

export function generateCode(): string {
  // OG-XXXX-XXXX
  const part = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `OG-${part()}-${part()}`;
}

/* ---------------- contract methods (simulated) ---------------- */

export async function registerProduct(input: {
  name: string;
  batch: string;
  producedAt: string;
  code?: string;
}): Promise<Product> {
  const code = input.code ?? generateCode();
  const items = load();
  if (items.some((p) => p.code === code)) {
    throw new Error("Kode produk sudah terdaftar");
  }
  const hash = await sha256(`${code}|${input.batch}|${input.producedAt}|${input.name}`);
  const product: Product = {
    code,
    name: input.name,
    batch: input.batch,
    producedAt: input.producedAt,
    registeredAt: Date.now(),
    hash,
    txRegister: randomTx(),
    status: "active",
  };
  items.unshift(product);
  save(items);
  // simulasi konfirmasi block
  await new Promise((r) => setTimeout(r, 350));
  return product;
}

export type VerifyResult =
  | { kind: "authentic"; product: Product }       // baru saja diverifikasi
  | { kind: "used"; product: Product }            // sudah pernah discan
  | { kind: "not_found"; code: string };

export async function verifyProduct(code: string): Promise<VerifyResult> {
  await new Promise((r) => setTimeout(r, 400));
  const items = load();
  const idx = items.findIndex((p) => p.code === code.trim());
  if (idx === -1) return { kind: "not_found", code };
  const p = items[idx];
  if (p.status === "used") return { kind: "used", product: p };
  // tandai sebagai used (one-time)
  p.status = "used";
  p.verifiedAt = Date.now();
  p.txVerify = randomTx();
  items[idx] = p;
  save(items);
  return { kind: "authentic", product: p };
}

export function listProducts(): Product[] {
  return load();
}

export function getStats() {
  const items = load();
  const verified = items.filter((p) => p.status === "used").length;
  return {
    total: items.length,
    verified,
    pending: items.length - verified,
  };
}

export function seedDemoData() {
  if (load().length > 0) return;
  const samples = [
    { name: "Mesran Super 20W-50", batch: "B-2410-A", producedAt: "2024-10-12" },
    { name: "Enduro Matic 10W-30", batch: "B-2411-C", producedAt: "2024-11-03" },
    { name: "Fastron Diesel 15W-40", batch: "B-2412-D", producedAt: "2024-12-20" },
  ];
  Promise.all(samples.map((s) => registerProduct(s)));
}
