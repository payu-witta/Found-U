import { eq, and, gt, isNull } from 'drizzle-orm';
import { getDb, schema } from '../lib/db.js';
import { createTokenPair, verifyRefreshToken } from '../lib/jwt.js';
import { hashRefreshToken, generateSecureToken } from '../utils/helpers.js';
import { isUMassEmail } from '../utils/validators.js';
import { logger } from '../lib/logger.js';
import { HTTPException } from 'hono/http-exception';
import { env } from '../config/env.js';

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * In production you should use the Google Auth Library for full verification.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) {
    throw new HTTPException(401, { message: 'Invalid Google ID token' });
  }

  const payload = (await response.json()) as GoogleTokenPayload & {
    aud?: string;
    azp?: string;
    error_description?: string;
  };

  if (payload.error_description) {
    throw new HTTPException(401, { message: `Google token error: ${payload.error_description}` });
  }

  // Verify audience matches our client ID
  if (payload.aud !== env.GOOGLE_CLIENT_ID && payload.azp !== env.GOOGLE_CLIENT_ID) {
    throw new HTTPException(401, { message: 'Google token audience mismatch' });
  }

  if (!payload.email_verified) {
    throw new HTTPException(401, { message: 'Google email is not verified' });
  }

  return payload;
}

/**
 * Login with Google ID token.
 * Verifies token, enforces email domain, upserts user, issues token pair.
 */
export async function loginWithGoogle(idToken: string) {
  const googlePayload = await verifyGoogleIdToken(idToken);
  const { sub: googleId, email, name, picture } = googlePayload;

  if (!isUMassEmail(email)) {
    throw new HTTPException(403, {
      message: `Only @${env.ALLOWED_EMAIL_DOMAIN} accounts are allowed`,
    });
  }

  const db = getDb();

  // Upsert user
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      googleId,
      displayName: name ?? email.split('@')[0],
      avatarUrl: picture ?? null,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        googleId,
        displayName: name ?? undefined,
        avatarUrl: picture ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!user) {
    throw new HTTPException(500, { message: 'Failed to create or update user' });
  }

  // Generate token pair
  const tokenPair = await createTokenPair({
    sub: user.id,
    email: user.email,
    displayName: user.displayName ?? undefined,
  });

  // Store refresh token hash
  const tokenHash = hashRefreshToken(tokenPair.refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  logger.info({ userId: user.id, email }, 'User logged in');

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    ...tokenPair,
  };
}

/**
 * Refresh an access token using a valid refresh token.
 */
export async function refreshAccessToken(rawRefreshToken: string) {
  // Verify JWT signature first
  let jwtPayload: Awaited<ReturnType<typeof verifyRefreshToken>>;
  try {
    jwtPayload = await verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new HTTPException(401, { message: 'Invalid refresh token' });
  }

  const userId = jwtPayload.sub;
  if (!userId) throw new HTTPException(401, { message: 'Malformed refresh token' });

  const db = getDb();
  const tokenHash = hashRefreshToken(rawRefreshToken);

  // Look up token in DB
  const [storedToken] = await db
    .select()
    .from(schema.refreshTokens)
    .where(
      and(
        eq(schema.refreshTokens.tokenHash, tokenHash),
        eq(schema.refreshTokens.userId, userId),
        gt(schema.refreshTokens.expiresAt, new Date()),
        isNull(schema.refreshTokens.revokedAt),
      ),
    )
    .limit(1);

  if (!storedToken) {
    throw new HTTPException(401, { message: 'Refresh token not found or revoked' });
  }

  // Get user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    throw new HTTPException(401, { message: 'User not found' });
  }

  // Rotate: revoke old token, issue new pair
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.refreshTokens.id, storedToken.id));

  const tokenPair = await createTokenPair({
    sub: user.id,
    email: user.email,
    displayName: user.displayName ?? undefined,
  });

  const newHash = hashRefreshToken(tokenPair.refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    tokenHash: newHash,
    expiresAt,
  });

  return tokenPair;
}

/**
 * Revoke all refresh tokens for a user (logout).
 */
export async function logout(userId: string, rawRefreshToken?: string) {
  const db = getDb();

  if (rawRefreshToken) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.userId, userId),
          eq(schema.refreshTokens.tokenHash, tokenHash),
        ),
      );
  } else {
    // Revoke all tokens for user (logout everywhere)
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(schema.refreshTokens.userId, userId), isNull(schema.refreshTokens.revokedAt)),
      );
  }

  logger.info({ userId }, 'User logged out');
}

export async function getUserById(userId: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return user ?? null;
}
