"use server";

import { auth } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/db/queries/notifications";
import { revalidatePath } from "next/cache";

export async function markAllRead() {
  const session = await auth();
  if (!session?.user) return;
  await markAllNotificationsRead(Number(session.user.id));
  revalidatePath("/notifications");
}
