"use client";

import dynamic from "next/dynamic";

const QrScannerClient = dynamic(
  () => import("./scanner-client").then(m => m.QrScannerClient),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-sm text-[#6B6457]">
        Iniciando cámara…
      </div>
    ),
  }
);

export function ScanWrapper() {
  return <QrScannerClient />;
}
