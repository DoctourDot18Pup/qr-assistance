"use client";

import { useState, useEffect } from "react";
import { QrBadge } from "@/components/ui/qr-badge";

export function SessionStatusBadge({ startedAt }: { startedAt: string }) {
  const [mins, setMins] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setMins(Math.floor((Date.now() - start) / 60000));
    update();
    const iv = setInterval(update, 30_000);
    return () => clearInterval(iv);
  }, [startedAt]);

  return <QrBadge tone="gold">Activa · {mins} min transcurridos</QrBadge>;
}
