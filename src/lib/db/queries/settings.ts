import { db } from '@/lib/db';
import { thresholdSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function getThresholds() {
  const rows = await db.select().from(thresholdSettings);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.key] = Number(r.value);
  return {
    attendanceWarning:  map['attendance_warning']  ?? 75,
    attendanceRisk:     map['attendance_risk']     ?? 60,
    attendanceCritical: map['attendance_critical'] ?? 50,
  };
}

export async function updateThreshold(key: string, value: number) {
  await db
    .update(thresholdSettings)
    .set({ value: String(value), updatedAt: new Date() })
    .where(eq(thresholdSettings.key, key));
}
