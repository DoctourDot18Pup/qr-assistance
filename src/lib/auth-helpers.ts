import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { headers } from 'next/headers';
import type { Session } from 'next-auth';

type AppUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  enrollmentNumber?: string | null;
};

async function resolveSession(): Promise<Session | null> {
  // 1. Intentar cookie de Auth.js (navegador / frontend)
  const cookieSession = await auth();
  if (cookieSession?.user) return cookieSession;

  // 2. Intentar Bearer token (Postman / API clients)
  const headersList = await headers();
  const authorization = headersList.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;

  const token = authorization.slice(7);
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    const user: AppUser = {
      id:               String(payload.id ?? payload.sub),
      name:             payload.name as string | null,
      email:            payload.email as string | null,
      role:             payload.role as string,
      enrollmentNumber: (payload.enrollmentNumber as string) ?? null,
    };

    return { user, expires: new Date((payload.exp ?? 0) * 1000).toISOString() } as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  return resolveSession();
}

export async function requireAuth(): Promise<Session> {
  const session = await resolveSession();
  if (!session?.user) {
    throw NextResponse.json(
      { success: false, message: 'No autenticado.' },
      { status: 401 }
    );
  }
  return session;
}

export async function requireRole(roles: string[]): Promise<Session> {
  const session = await resolveSession();
  if (!session?.user) {
    throw NextResponse.json(
      { success: false, message: 'No autenticado.' },
      { status: 401 }
    );
  }
  const userRole = (session.user as AppUser).role;
  if (!roles.includes(userRole)) {
    throw NextResponse.json(
      { success: false, message: 'Acceso denegado.' },
      { status: 403 }
    );
  }
  return session;
}
