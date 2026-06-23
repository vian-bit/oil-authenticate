/**
 * Solana Devnet integration for OilGuard.
 * Uses a built-in in-app Keypair (stored encrypted-base64 in localStorage)
 * instead of an external wallet extension. This guarantees that any airdrop
 * received by the app's wallet is the same wallet signing transactions —
 * avoiding the common "Phantom shows 0 SOL but app shows balance" mismatch
 * (which happens because Phantom defaults to mainnet UI even when the dapp
 * uses devnet).
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import bs58 from "bs58";

if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

export const SOLANA_CLUSTER = "devnet" as const;
export const SOLANA_NETWORK_LABEL = "Solana Devnet";
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

let _conn: Connection | null = null;
export function getConnection(): Connection {
  if (!_conn) _conn = new Connection(clusterApiUrl(SOLANA_CLUSTER), "confirmed");
  return _conn;
}

/* ---------------- In-app Keypair wallet ---------------- */

const KEY_STORAGE = "oilguard.wallet.secret.v1";

function encodeSecret(sk: Uint8Array): string {
  let s = "";
  for (let i = 0; i < sk.length; i++) s += String.fromCharCode(sk[i]);
  return btoa(s);
}
function decodeSecret(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Load existing keypair from localStorage, or create + persist a new one. */
export function loadOrCreateKeypair(): Keypair {
  const raw = localStorage.getItem(KEY_STORAGE);
  if (raw) {
    try {
      return Keypair.fromSecretKey(decodeSecret(raw));
    } catch (e) {
      console.error("[OilGuard] gagal load wallet — TIDAK regenerate untuk hindari kehilangan address. Hapus 'oilguard.wallet.secret.v1' di localStorage untuk reset.", e);
      throw e;
    }
  }
  const kp = Keypair.generate();
  localStorage.setItem(KEY_STORAGE, encodeSecret(kp.secretKey));
  return kp;
}

export function resetKeypair(): Keypair {
  localStorage.removeItem(KEY_STORAGE);
  return loadOrCreateKeypair();
}

/** Export current secret key as base58 string (Phantom-compatible). */
export function exportSecretKeyBase58(): string | null {
  const raw = localStorage.getItem(KEY_STORAGE);
  if (!raw) return null;
  try { return bs58.encode(decodeSecret(raw)); } catch { return null; }
}

/** Import a secret key (base58 or JSON array). Returns the loaded Keypair. */
export function importSecretKey(input: string): Keypair {
  const trimmed = input.trim();
  let sk: Uint8Array | null = null;
  // JSON array form: [12,34,...]
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.length === 64) sk = Uint8Array.from(arr);
    } catch { /* noop */ }
  }
  if (!sk) {
    try {
      const decoded = bs58.decode(trimmed);
      if (decoded.length === 64) sk = decoded;
    } catch { /* noop */ }
  }
  if (!sk) throw new Error("Format secret key tidak dikenali. Gunakan base58 (88 char) atau JSON array [..64 angka..].");
  const kp = Keypair.fromSecretKey(sk);
  localStorage.setItem(KEY_STORAGE, encodeSecret(sk));
  return kp;
}

export function explorerTxUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`;
}
export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${SOLANA_CLUSTER}`;
}

/* ---------------- Memo TX ---------------- */

export interface SolanaTxInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
}

/**
 * Build & send a memo transaction signed by the in-app Keypair.
 */
export async function sendMemoWithKeypair(
  payer: Keypair,
  memo: string,
): Promise<SolanaTxInfo> {
  const conn = getConnection();
  const data = Buffer.from(memo.slice(0, 500), "utf8");
  const ix = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(ix);
  const signature = await sendAndConfirmTransaction(conn, tx, [payer], {
    commitment: "confirmed",
  });

  let slot = 0;
  let blockTime: number | null = null;
  try {
    const parsed = await conn.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    slot = parsed?.slot ?? 0;
    blockTime = parsed?.blockTime ?? null;
  } catch { /* noop */ }
  return { signature, slot, blockTime };
}

export async function getBalanceSol(pubkey: PublicKey): Promise<number> {
  const lamports = await getConnection().getBalance(pubkey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}

export async function requestAirdrop(pubkey: PublicKey, sol = 1): Promise<string> {
  const conn = getConnection();
  const sig = await conn.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}

export async function fetchSignatures(pubkey: PublicKey, limit = 25) {
  const conn = getConnection();
  return conn.getSignaturesForAddress(pubkey, { limit });
}

export async function fetchTransactionMemo(signature: string): Promise<{
  memo: string | null;
  slot: number;
  blockTime: number | null;
}> {
  const conn = getConnection();
  const tx = await conn.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) return { memo: null, slot: 0, blockTime: null };
  const log = tx.meta?.logMessages?.find((l) => l.includes("Memo"));
  let memo: string | null = null;
  if (log) {
    const m = log.match(/"([\s\S]*)"/);
    if (m) memo = m[1];
  }
  return { memo, slot: tx.slot, blockTime: tx.blockTime ?? null };
}
