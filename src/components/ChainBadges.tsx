import { Link2, ShieldCheck } from "lucide-react";

export function ChainBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Blockchain Secured
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
        <Link2 className="h-3.5 w-3.5" /> On-chain Verified
      </span>
    </div>
  );
}

export function shortHash(h: string, head = 6, tail = 4) {
  if (!h) return "";
  if (h.length <= head + tail + 2) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}
