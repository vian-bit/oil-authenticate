import { Wallet, LogOut, Loader2, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { explorerAddressUrl } from "@/lib/solana";
import { toast } from "sonner";

function shortAddr(a: string) { return `${a.slice(0, 4)}…${a.slice(-4)}`; }

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const { connected, connecting, address, balance, connect, disconnect, airdrop } = useWallet();

  if (!connected) {
    return (
      <Button
        size={compact ? "sm" : "default"}
        onClick={connect}
        disabled={connecting}
        className="gap-2"
      >
        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        {connecting ? "Menyambungkan…" : "Connect Phantom"}
      </Button>
    );
  }

  async function doAirdrop() {
    try {
      toast.loading("Meminta airdrop 1 SOL devnet…", { id: "ad" });
      const sig = await airdrop();
      toast.success("Airdrop sukses", { id: "ad", description: sig.slice(0, 16) + "…" });
    } catch (e: any) {
      toast.error("Airdrop gagal", { id: "ad", description: e?.message ?? "Rate limit devnet" });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={compact ? "sm" : "default"} variant="secondary" className="gap-2 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-success" />
          {address && shortAddr(address)}
          {balance !== null && <span className="text-muted-foreground">· {balance.toFixed(2)} SOL</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">
          Phantom · Solana Devnet
          <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{address}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={doAirdrop}>
          <Droplets className="mr-2 h-4 w-4" /> Airdrop 1 SOL (devnet)
        </DropdownMenuItem>
        {address && (
          <DropdownMenuItem asChild>
            <a href={explorerAddressUrl(address)} target="_blank" rel="noreferrer">
              <Wallet className="mr-2 h-4 w-4" /> Lihat di Solana Explorer
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect} className="text-danger">
          <LogOut className="mr-2 h-4 w-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
