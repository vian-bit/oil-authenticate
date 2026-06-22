/**
 * Solana Devnet integration for OilGuard.
 * - Phantom Wallet connection (window.solana)
 * - Sends Memo Program transactions on Devnet that embed product / verify
 *   payloads as JSON memos. The transaction signature, slot, and blockTime
 *   become the audit trail visible on https://explorer.solana.com.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Buffer } from "buffer";

// Ensure Buffer is available globally for @solana/web3.js in browser bundles.
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}



export const SOLANA_CLUSTER = "devnet" as const;
export const SOLANA_NETWORK_LABEL = "Solana Devnet";
// SPL Memo v2 program
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

let _conn: Connection | null = null;
export function getConnection(): Connection {
  if (!_conn) _conn = new Connection(clusterApiUrl(SOLANA_CLUSTER), "confirmed");
  return _conn;
}

/* ---------------- Phantom ---------------- */

export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

export function getPhantom(): PhantomProvider | null {
  const w = window as any;
  const p = w?.phantom?.solana ?? w?.solana;
  if (p?.isPhantom) return p as PhantomProvider;
  return null;
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
 * Build & send a memo transaction signed by Phantom. Returns the real
 * signature + slot + blockTime confirmed on Devnet.
 */
export async function sendMemo(
  provider: PhantomProvider,
  memo: string,
): Promise<SolanaTxInfo> {
  if (!provider.publicKey) throw new Error("Wallet belum terhubung");
  const conn = getConnection();
  const payer = provider.publicKey;

  // Memos can be relatively long, but we cap to keep tx small.
  const data = Buffer.from(memo.slice(0, 500), "utf8");
  const ix = new TransactionInstruction({
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: payer, blockhash, lastValidBlockHeight }).add(ix);

  const { signature } = await provider.signAndSendTransaction(tx);
  await conn.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  // Fetch slot + blockTime
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

/**
 * Fetch recent signatures for a given account (used for the Solana Explorer
 * page so we can show transactions even from other devices).
 */
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
  // logMessages contains "Program log: Memo (len X): \"...\"" lines
  const log = tx.meta?.logMessages?.find((l) => l.includes("Memo"));
  let memo: string | null = null;
  if (log) {
    const m = log.match(/"([\s\S]*)"/);
    if (m) memo = m[1];
  }
  return { memo, slot: tx.slot, blockTime: tx.blockTime ?? null };
}
