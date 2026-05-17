import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.QR_JWT_SECRET!);

export async function signQrToken(sessionId: number): Promise<string> {
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .setIssuedAt()
    .sign(await secret());
}

export async function verifyQrToken(token: string): Promise<{ sessionId: number }> {
  const { payload } = await jwtVerify(token, await secret());
  return { sessionId: payload.sessionId as number };
}
