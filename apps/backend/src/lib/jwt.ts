import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env.js';

export interface TokenPayload extends JWTPayload {
  sub: string; // user id
  email: string;
  displayName?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // seconds

const getAccessSecret = () => new TextEncoder().encode(env.JWT_SECRET);
const getRefreshSecret = () => new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export async function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setIssuer('foundu-api')
    .setAudience('foundu-client')
    .sign(getAccessSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setIssuer('foundu-api')
    .setAudience('foundu-refresh')
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getAccessSecret(), {
    issuer: 'foundu-api',
    audience: 'foundu-client',
  });
  return payload as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret(), {
    issuer: 'foundu-api',
    audience: 'foundu-refresh',
  });
  return payload;
}

export async function createTokenPair(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload.sub as string),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  };
}
