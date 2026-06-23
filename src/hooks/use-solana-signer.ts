import { useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { sendMemoWithKeypair } from "@/lib/solana";
import type { SolanaSigner } from "@/lib/blockchain";

/**
 * Returns a SolanaSigner backed by the in-app Keypair. Always available
 * once the wallet has been initialized.
 */
export function useSolanaSigner(): SolanaSigner | undefined {
  const { keypair, refreshBalance } = useWallet();

  const signer = useCallback<SolanaSigner>(async (memo) => {
    if (!keypair) throw new Error("Wallet belum siap");
    const r = await sendMemoWithKeypair(keypair, memo);
    refreshBalance();
    return { ...r, wallet: keypair.publicKey.toBase58() };
  }, [keypair, refreshBalance]);

  if (!keypair) return undefined;
  return signer;
}
