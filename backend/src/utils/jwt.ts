import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('CRITICAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
}

export interface TokenPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXP || '15m' } as any);
};

export const generateRefreshToken = (payload: TokenPayload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXP || '7d' } as any);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};

// Hash the refresh token before storing in DB for extra security
export const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};