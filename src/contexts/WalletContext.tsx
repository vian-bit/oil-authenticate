import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  loadOrCreateKeypair, resetKeypair, getBalanceSol, requestAirdrop,
} from "@/lib/solana";

interface WalletState {
  keypair: Keypair | null;
  publicKey: PublicKey | null;
  address: string | null;
  connected: boolean;
  connecting: boolean;
  balance: number | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  airdrop: () => Promise<string>;
  regenerate: () => void;
}

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-load the in-app wallet on mount — no external extension required.
  useEffect(() => {
    try {
      setKeypair(loadOrCreateKeypair());
    } catch (e: any) {
      setError(e?.message ?? "Gagal memuat wallet lokal");
    }
  }, []);

  const publicKey = keypair?.publicKey ?? null;

  const refreshBalance = useCallback(async () => {
    if (!publicKey) { setBalance(null); return; }
    try { setBalance(await getBalanceSol(publicKey)); }
    catch { setBalance(null); }
  }, [publicKey]);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);

  const connect = useCallback(async () => {
    setError(null);
    setKeypair(loadOrCreateKeypair());
  }, []);

  const disconnect = useCallback(async () => {
    // Keep keypair in storage; just clear balance display.
    setBalance(null);
  }, []);

  const airdrop = useCallback(async () => {
    if (!publicKey) throw new Error("Wallet belum siap");
    const sig = await requestAirdrop(publicKey, 1);
    refreshBalance();
    return sig;
  }, [publicKey, refreshBalance]);

  const regenerate = useCallback(() => {
    setKeypair(resetKeypair());
    setBalance(null);
  }, []);

  const value = useMemo<WalletState>(() => ({
    keypair,
    publicKey,
    address: publicKey?.toBase58() ?? null,
    connected: !!keypair,
    connecting: false,
    balance,
    error,
    connect,
    disconnect,
    refreshBalance,
    airdrop,
    regenerate,
  }), [keypair, publicKey, balance, error, connect, disconnect, refreshBalance, airdrop, regenerate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be inside <WalletProvider>");
  return v;
}
