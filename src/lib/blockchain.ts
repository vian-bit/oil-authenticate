/**
 * Blockchain simulator for OilGuard prototype.
 * Mimics OilGuard.sol behaviour. Tracks products and a full transaction
 * ledger (REGISTER / VERIFY) with block numbers, timestamps, and tx hashes
 * — all persisted in localStorage so reloads keep history intact.
 */

export type ProductStatus = "active" | "used";
export type TxType = "REGISTER" | "VERIFY";

export interface Product {
  code: string;
  name: string;
  batch: string;
  producedAt: string;        // ISO date
  registeredAt: number;      // ms
  hash: string;              // simulated keccak256
  status: ProductStatus;
  txRegister: string;        // first register tx hash
}

export interface BlockchainTx {
  txHash: string;
  txType: TxType;
  productCode: string;
  productName?: string;
  blockNumber: number;
  timestamp: number;
  verifier?: string;
  result?: "authentic" | "used" | "not_found";
  // Solana on-chain proof (present when wallet connected)
  signature?: string;   // real Solana tx signature
  slot?: number;        // Solana slot
  blockTime?: number | null;
  wallet?: string;      // signer address
  network?: string;     // label
}

const PRODUCTS_KEY = "oilguard.products.v2";
const TX_KEY = "oilguard.txs.v2";
const BLOCK_KEY = "oilguard.block.v2";
const NETWORK = "Solana Devnet";
const GENESIS_BLOCK = 88_421_000;

export type SolanaSigner = (memo: string) => Promise<{
  signature: string;
  slot: number;
  blockTime: number | null;
  wallet: string;
}>;


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

function randomVerifier(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function loadProducts(): Product[] {
  try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) ?? "[]"); }
  catch { return []; }
}
function saveProducts(items: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(items));
}

function loadTxs(): BlockchainTx[] {
  try { return JSON.parse(localStorage.getItem(TX_KEY) ?? "[]"); }
  catch { return []; }
}
function saveTxs(items: BlockchainTx[]) {
  localStorage.setItem(TX_KEY, JSON.stringify(items));
}

function nextBlock(): number {
  const cur = parseInt(localStorage.getItem(BLOCK_KEY) ?? `${GENESIS_BLOCK}`, 10);
  const next = cur + Math.floor(1 + Math.random() * 6); // jump like a real chain
  localStorage.setItem(BLOCK_KEY, String(next));
  return next;
}

function appendTx(tx: BlockchainTx) {
  const txs = loadTxs();
  txs.unshift(tx);
  saveTxs(txs);
}

export function getNetwork() { return NETWORK; }

export function generateCode(): string {
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
  signer?: SolanaSigner;
}): Promise<{ product: Product; tx: BlockchainTx }> {
  const code = input.code ?? generateCode();
  const items = loadProducts();
  if (items.some((p) => p.code === code)) {
    throw new Error("Kode produk sudah terdaftar");
  }
  const hash = await sha256(`${code}|${input.batch}|${input.producedAt}|${input.name}`);

  // Try real Solana tx if signer provided
  let signature: string | undefined;
  let slot: number | undefined;
  let blockTime: number | null | undefined;
  let wallet: string | undefined;
  if (input.signer) {
    const memo = JSON.stringify({
      app: "OilGuard",
      type: "REGISTER",
      code,
      name: input.name,
      batch: input.batch,
      producedAt: input.producedAt,
      hash,
    });
    const r = await input.signer(memo);
    signature = r.signature;
    slot = r.slot;
    blockTime = r.blockTime;
    wallet = r.wallet;
  } else {
    // simulate confirmation latency
    await new Promise((r) => setTimeout(r, 350));
  }

  const txHash = signature ?? randomTx();
  const product: Product = {
    code,
    name: input.name,
    batch: input.batch,
    producedAt: input.producedAt,
    registeredAt: Date.now(),
    hash,
    txRegister: txHash,
    status: "active",
  };
  items.unshift(product);
  saveProducts(items);

  const tx: BlockchainTx = {
    txHash,
    txType: "REGISTER",
    productCode: code,
    productName: product.name,
    blockNumber: slot ?? nextBlock(),
    timestamp: blockTime ? blockTime * 1000 : Date.now(),
    signature, slot, blockTime, wallet,
    network: NETWORK,
  };
  appendTx(tx);
  return { product, tx };
}


export type VerifyResult =
  | { kind: "authentic"; product: Product; tx: BlockchainTx }
  | { kind: "used"; product: Product; tx: BlockchainTx; previousVerifications: number }
  | { kind: "not_found"; code: string; tx: BlockchainTx };

export interface VerifyPayload {
  code: string;
  name: string;
  batch: string;
  producedAt: string;
}

/** Decode `?d=` query payload from a verify link (base64url JSON). */
export function decodePayload(raw: string | null | undefined): VerifyPayload | null {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const obj = JSON.parse(json);
    if (obj && typeof obj.code === "string" && typeof obj.name === "string") return obj;
  } catch { /* noop */ }
  return null;
}

/** Encode product data to base64url JSON for embedding in QR URL. */
export function encodePayload(p: VerifyPayload): string {
  const json = JSON.stringify(p);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifyProduct(
  code: string,
  payload?: VerifyPayload | null,
  signer?: SolanaSigner,
): Promise<VerifyResult> {
  const trimmed = code.trim().toUpperCase();
  let items = loadProducts();
  let idx = items.findIndex((p) => p.code.toUpperCase() === trimmed);
  const verifier = randomVerifier();

  // Cross-device recovery: if the QR/link carried product data, auto-register it
  // on this device's local ledger so verification can succeed end-to-end.
  if (idx === -1 && payload && payload.code.trim().toUpperCase() === trimmed) {
    try {
      await registerProduct({
        code: trimmed,
        name: payload.name,
        batch: payload.batch,
        producedAt: payload.producedAt,
        // do NOT use signer here — register memo not desired during verify
      });
      items = loadProducts();
      idx = items.findIndex((p) => p.code.toUpperCase() === trimmed);
    } catch { /* already exists or invalid — fall through */ }
  }

  // Real Solana memo (if signer present)
  let signature: string | undefined;
  let slot: number | undefined;
  let blockTime: number | null | undefined;
  let wallet: string | undefined;
  if (signer) {
    const product = idx === -1 ? null : items[idx];
    const memo = JSON.stringify({
      app: "OilGuard",
      type: "VERIFY",
      code: trimmed,
      result: idx === -1 ? "not_found" : (product?.status === "active" ? "authentic" : "used"),
      ts: Date.now(),
    });
    try {
      const r = await signer(memo);
      signature = r.signature;
      slot = r.slot;
      blockTime = r.blockTime;
      wallet = r.wallet;
    } catch (e) {
      // If signer fails (rejected, no funds), fall back to simulated.
      await new Promise((r) => setTimeout(r, 300));
    }
  } else {
    await new Promise((r) => setTimeout(r, 300));
  }

  if (idx === -1) {
    const tx: BlockchainTx = {
      txHash: signature ?? randomTx(),
      txType: "VERIFY",
      productCode: trimmed,
      blockNumber: slot ?? nextBlock(),
      timestamp: blockTime ? blockTime * 1000 : Date.now(),
      verifier: wallet ?? verifier,
      result: "not_found",
      signature, slot, blockTime, wallet, network: NETWORK,
    };
    appendTx(tx);
    return { kind: "not_found", code: trimmed, tx };
  }

  const p = items[idx];
  const wasActive = p.status === "active";

  if (wasActive) {
    p.status = "used";
    items[idx] = p;
    saveProducts(items);
  }

  const tx: BlockchainTx = {
    txHash: signature ?? randomTx(),
    txType: "VERIFY",
    productCode: p.code,
    productName: p.name,
    blockNumber: slot ?? nextBlock(),
    timestamp: blockTime ? blockTime * 1000 : Date.now(),
    verifier: wallet ?? verifier,
    result: wasActive ? "authentic" : "used",
    signature, slot, blockTime, wallet, network: NETWORK,
  };
  appendTx(tx);

  if (wasActive) return { kind: "authentic", product: p, tx };
  const previousVerifications = loadTxs().filter(
    (t) => t.txType === "VERIFY" && t.productCode === p.code && t.txHash !== tx.txHash && t.result !== "not_found"
  ).length;
  return { kind: "used", product: p, tx, previousVerifications };
}


export function listProducts(): Product[] { return loadProducts(); }
export function listTransactions(): BlockchainTx[] { return loadTxs(); }
export function getProductByCode(code: string): Product | undefined {
  return loadProducts().find((p) => p.code === code);
}
export function getProductHistory(code: string): BlockchainTx[] {
  return loadTxs()
    .filter((t) => t.productCode === code)
    .sort((a, b) => a.blockNumber - b.blockNumber);
}

export function getStats() {
  const items = loadProducts();
  const txs = loadTxs();
  const verified = items.filter((p) => p.status === "used").length;
  const verifyTxs = txs.filter((t) => t.txType === "VERIFY").length;
  const lastBlock = txs.length > 0
    ? Math.max(...txs.map((t) => t.blockNumber))
    : GENESIS_BLOCK;
  return {
    total: items.length,
    verified,
    pending: items.length - verified,
    totalTx: txs.length,
    totalVerifyTx: verifyTxs,
    lastBlock,
  };
}

export async function seedDemoData() {
  if (loadProducts().length > 0) return;
  const samples = [
    { name: "Mesran Super 20W-50", batch: "B-2410-A", producedAt: "2024-10-12" },
    { name: "Enduro Matic 10W-30", batch: "B-2411-C", producedAt: "2024-11-03" },
    { name: "Fastron Diesel 15W-40", batch: "B-2412-D", producedAt: "2024-12-20" },
  ];
  for (const s of samples) {
    try { await registerProduct(s); } catch { /* ignore */ }
  }
}
