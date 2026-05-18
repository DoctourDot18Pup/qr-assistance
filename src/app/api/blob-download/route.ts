import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl } from "@vercel/blob";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  try {
    const downloadUrl = getDownloadUrl(url);
    return NextResponse.redirect(downloadUrl);
  } catch {
    return NextResponse.json({ error: "No se pudo acceder al archivo" }, { status: 500 });
  }
}
