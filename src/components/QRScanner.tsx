import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onResult: (text: string) => void;
}

const REGION_ID = "oilguard-qr-region";

export default function QRScanner({ onResult }: Props) {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  async function start() {
    setError(null);
    handledRef.current = false;
    setStarting(true);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(REGION_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decoded) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onResult(decoded);
          stop();
        },
        () => { /* ignore per-frame decode errors */ },
      );
      setActive(true);
    } catch (e: any) {
      setError(e?.message || "Kamera tidak tersedia. Masukkan kode secara manual.");
      setActive(false);
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    if (!scannerRef.current) return;
    try {
      if (scannerRef.current.isScanning) await scannerRef.current.stop();
      await scannerRef.current.clear();
    } catch { /* noop */ }
    setActive(false);
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary">
        <div id={REGION_ID} className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {starting ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-sm font-medium">Menyalakan kamera…</div>
              </>
            ) : error ? (
              <>
                <CameraOff className="h-12 w-12 text-danger" />
                <div className="text-sm text-danger-foreground">
                  <span className="rounded-md bg-danger px-2 py-1 font-semibold">Kamera tidak tersedia</span>
                </div>
                <p className="text-xs text-muted-foreground">{error}</p>
              </>
            ) : (
              <>
                <Camera className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Tekan <strong>Mulai Scan</strong> dan arahkan kamera ke QR pada kemasan oli.
                </p>
              </>
            )}
          </div>
        )}
        {active && (
          <>
            <Corner pos="top-3 left-3" rot="border-l-4 border-t-4" />
            <Corner pos="top-3 right-3" rot="border-r-4 border-t-4" />
            <Corner pos="bottom-3 left-3" rot="border-l-4 border-b-4" />
            <Corner pos="bottom-3 right-3" rot="border-r-4 border-b-4" />
            <div className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 animate-pulse bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button onClick={start} disabled={starting || active} className="h-11">
          <ScanLine className="mr-2 h-4 w-4" />
          {active ? "Memindai…" : starting ? "Memulai…" : "Mulai Scan"}
        </Button>
        <Button onClick={stop} variant="secondary" disabled={!active} className="h-11">
          <CameraOff className="mr-2 h-4 w-4" /> Hentikan
        </Button>
      </div>
    </div>
  );
}

function Corner({ pos, rot }: { pos: string; rot: string }) {
  return <div className={`absolute ${pos} h-8 w-8 ${rot} rounded-md border-primary`} />;
}
