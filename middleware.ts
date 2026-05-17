import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { auth } from '@/lib/auth';

async function getUserFromBearer(req: NextRequest): Promise<{ id: string; role: string } | null> {
  const authorization = req.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7);
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return {
      id:   String(payload.id ?? payload.sub),
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  const isAuthApi = pathname.startsWith('/api/auth');
  const isApiRoute = pathname.startsWith('/api');

  // Rutas /api/auth/* pasan siempre (login, token, callbacks)
  if (isAuthApi) return NextResponse.next();

  if (isApiRoute) {
    // Verificar cookie (Auth.js) o Bearer token
    const cookieUser = req.auth?.user;
    const bearerUser = cookieUser ? null : await getUserFromBearer(req);

    if (!cookieUser && !bearerUser) {
      return NextResponse.json(
        { success: false, message: 'No autenticado.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Rutas de dashboard — solo cookies (navegador)
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/reports');

  const session = req.auth;
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  if (isDashboardRoute && !session?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (pathname.startsWith('/teacher') && userRole !== 'teacher') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (pathname.startsWith('/student') && userRole !== 'student') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/notifications/:path*',
    '/reports/:path*',
    '/api/:path*',
  ],
};
