import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

// Solo disponible si NODE_ENV !== 'production' o si la variable ALLOW_TOKEN_ENDPOINT=true
const isEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.ALLOW_TOKEN_ENDPOINT === 'true';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  if (!isEnabled) {
    return fail('Este endpoint no está disponible en producción.', 403);
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (!user) return fail('Credenciales incorrectas.', 401);

    const passwordMatch = await bcrypt.compare(parsed.data.password, user.password);
    if (!passwordMatch) return fail('Credenciales incorrectas.', 401);

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

    const token = await new SignJWT({
      sub:              String(user.id),
      id:               String(user.id),
      name:             user.name,
      email:            user.email,
      role:             user.role,
      enrollmentNumber: user.enrollmentNumber ?? null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    return ok(
      {
        token,
        user: {
          id:               user.id,
          name:             user.name,
          email:            user.email,
          role:             user.role,
          enrollmentNumber: user.enrollmentNumber,
        },
      },
      'Autenticación exitosa.'
    );
  } catch {
    return fail('Error interno del servidor.', 500);
  }
}
