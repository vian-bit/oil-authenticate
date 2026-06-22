import { useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { sendMemo } from "@/lib/solana";
import type { SolanaSigner } from "@/lib/blockchain";

/**
 * Returns a SolanaSigner if Phantom is connected, else undefined.
 * The signer sends a Memo Program tx on Devnet and returns the real
 * signature, slot, and blockTime.
 */
export function useSolanaSigner(): SolanaSigner | undefined {
  const { provider, publicKey, refreshBalance } = useWallet();

  const signer = useCallback<SolanaSigner>(async (memo) => {
    if (!provider || !publicKey) throw new Error("Wallet belum terhubung");
    const r = await sendMemo(provider, memo);
    refreshBalance();
    return { ...r, wallet: publicKey.toBase58() };
  }, [provider, publicKey, refreshBalance]);

  if (!provider || !publicKey) return undefined;
  return signer;
}
