import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NextResponse } from "next/server"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ok(data: unknown, message = 'OK', status = 200): NextResponse {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function fail(message: string, status: number, errors?: unknown): NextResponse {
  return NextResponse.json({ success: false, message, errors }, { status });
}
