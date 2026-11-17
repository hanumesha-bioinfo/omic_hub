import type { Request, RequestHandler } from 'express';
import {
  adminVerifier,
  type ServerProfile,
  type SupabaseAdminVerifier,
} from '../lib/supabaseAdmin';

export type AppRole = 'student' | 'recruiter';

export interface AuthenticatedIdentity {
  userId: string;
  role: AppRole;
  profile: ServerProfile;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedIdentity;
}

const BEARER_TOKEN = /^Bearer\s+(\S+)$/i;

/** Parses a JWT from an Authorization header, accepting only "Bearer <token>". */
export function extractBearerToken(header: string | undefined): string | null {
  const match = typeof header === 'string' ? BEARER_TOKEN.exec(header) : null;
  return match ? match[1] : null;
}

/** Role authority comes only from the DB profile's user_type, never from JWT metadata. */
export function resolveRole(
  userType: string | null | undefined,
): AppRole | null {
  if (userType === 'student' || userType === 'recruiter') return userType;
  return null;
}

export function createRequireAuth(
  verifier: SupabaseAdminVerifier,
): RequestHandler {
  return async (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let userId: string;
    try {
      const result = await verifier.getUser(token);
      if (result.error || !result.data?.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      userId = result.data.user.id;
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let profile: ServerProfile | null;
    try {
      profile = await verifier.getProfile(userId);
    } catch {
      res.status(503).json({ error: 'Authentication service unavailable' });
      return;
    }

    if (!profile) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const role = resolveRole(profile.user_type);
    if (!role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    (req as AuthenticatedRequest).auth = { userId, role, profile };
    next();
  };
}

export function requireRole(role: AppRole): RequestHandler {
  return (req, res, next) => {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (auth.role !== role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export const requireAuth = createRequireAuth(adminVerifier);
