import { db } from '../db/client';
import { issueTokenPair, verifyToken, signAccessToken, TokenPayload } from './jwtService';
import { createSession, findSessionByToken, deleteSession } from './sessionStore';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  };
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const result = await db.query(
    `SELECT id, email, name, role, password_hash
     FROM users
     WHERE email = $1`,
    [req.email]
  );

  const user = result.rows[0];
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // In production: use bcrypt.compare(req.password, user.password_hash)
  if (req.password !== user.password_hash) {
    throw new Error('Invalid credentials');
  }

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = issueTokenPair(payload);
  await createSession(user.id, tokens.refreshToken);

  return {
    ...tokens,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function refreshToken(token: string): Promise<{ accessToken: string }> {
  const session = await findSessionByToken(token);
  if (!session) {
    throw new Error('Invalid or expired refresh token');
  }

  const payload = verifyToken(token);
  const newAccessToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  });

  return { accessToken: newAccessToken };
}

export async function logout(token: string): Promise<void> {
  await deleteSession(token);
}

export function verifyTokenMiddleware(token: string): TokenPayload {
  return verifyToken(token);
}
