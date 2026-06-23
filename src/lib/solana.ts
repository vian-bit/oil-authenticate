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

/** Load existing keypair from localStorage, or create + persist a new one. */
export function loadOrCreateKeypair(): Keypair {
  try {
    const raw = localStorage.getItem(KEY_STORAGE);
    if (raw) {
      const arr = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      return Keypair.fromSecretKey(arr);
    }
  } catch { /* fall through */ }
  const kp = Keypair.generate();
  const b64 = btoa(String.fromCharCode(...kp.secretKey));
  localStorage.setItem(KEY_STORAGE, b64);
  return kp;
}

export function resetKeypair(): Keypair {
  localStorage.removeItem(KEY_STORAGE);
  return loadOrCreateKeypair();
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
