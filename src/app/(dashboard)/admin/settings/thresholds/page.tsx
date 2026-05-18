import { db } from "@/lib/db";
import { thresholdSettings } from "@/lib/db/schema";
import { Header } from "@/components/shell/header";
import { ThresholdsForm } from "./thresholds-form";

async function getThresholds() {
  const rows = await db.select().from(thresholdSettings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    warning:  Number(map["warning_threshold"]  ?? 85),
    critical: Number(map["critical_threshold"] ?? 75),
    risk:     Number(map["risk_threshold"]      ?? 70),
  };
}

export default async function ThresholdsPage() {
  const thresholds = await getThresholds();

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Umbrales de alerta"
        subtitle="Porcentajes de asistencia que disparan alertas en todos los grupos"
      />
      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <ThresholdsForm initial={thresholds} />
      </div>
    </div>
  );
}
