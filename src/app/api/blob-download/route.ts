import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  // Solo permitir URLs del dominio de Vercel Blob
  if (!blobUrl.includes(".blob.vercel-storage.com")) {
    return NextResponse.json({ error: "URL no permitida" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Blob no configurado" }, { status: 500 });
  }

  try {
    const upstream = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: upstream.status });
    }

    const contentType = upstream.headers.get("Content-Type") ?? "application/octet-stream";
    const contentDisposition = upstream.headers.get("Content-Disposition") ?? "inline";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo acceder al archivo" }, { status: 500 });
  }
}
