import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  getPhantom, getBalanceSol, requestAirdrop,
  type PhantomProvider,
} from "@/lib/solana";

interface WalletState {
  provider: PhantomProvider | null;
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
}

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<PhantomProvider | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize provider + auto-reconnect "trusted" sessions
  useEffect(() => {
    const p = getPhantom();
    if (!p) return;
    setProvider(p);
    p.connect({ onlyIfTrusted: true })
      .then(({ publicKey }) => setPublicKey(publicKey))
      .catch(() => { /* user hasn't trusted yet */ });

    const onConnect = (pk: PublicKey) => setPublicKey(pk);
    const onDisconnect = () => setPublicKey(null);
    p.on("connect", onConnect);
    p.on("disconnect", onDisconnect);
    return () => {
      p.removeListener?.("connect", onConnect);
      p.removeListener?.("disconnect", onDisconnect);
    };
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) { setBalance(null); return; }
    try { setBalance(await getBalanceSol(publicKey)); }
    catch { setBalance(null); }
  }, [publicKey]);

  useEffect(() => { refreshBalance(); }, [refreshBalance]);

  const connect = useCallback(async () => {
    setError(null);
    const p = provider ?? getPhantom();
    if (!p) {
      setError("Phantom wallet tidak terdeteksi. Install di phantom.com");
      window.open("https://phantom.com/download", "_blank");
      return;
    }
    setProvider(p);
    setConnecting(true);
    try {
      const { publicKey } = await p.connect();
      setPublicKey(publicKey);
    } catch (e: any) {
      setError(e?.message ?? "Gagal connect");
    } finally {
      setConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(async () => {
    try { await provider?.disconnect(); } catch { /* noop */ }
    setPublicKey(null);
  }, [provider]);

  const airdrop = useCallback(async () => {
    if (!publicKey) throw new Error("Wallet belum terhubung");
    const sig = await requestAirdrop(publicKey, 1);
    refreshBalance();
    return sig;
  }, [publicKey, refreshBalance]);

  const value = useMemo<WalletState>(() => ({
    provider,
    publicKey,
    address: publicKey?.toBase58() ?? null,
    connected: !!publicKey,
    connecting,
    balance,
    error,
    connect,
    disconnect,
    refreshBalance,
    airdrop,
  }), [provider, publicKey, connecting, balance, error, connect, disconnect, refreshBalance, airdrop]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be inside <WalletProvider>");
  return v;
}
