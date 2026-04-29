import QRCode from "react-qr-code";

export function ProductQR({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-white p-3">
      <QRCode value={value} size={size} bgColor="#ffffff" fgColor="#3a1f10" />
    </div>
  );
}
