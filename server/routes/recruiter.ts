import express, { type Router } from 'express';
import {
  adminVerifier,
  type SupabaseAdminVerifier,
} from '../lib/supabaseAdmin';
import {
  createRequireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth';

export function createRecruiterRouter(
  verifier: SupabaseAdminVerifier = adminVerifier,
): Router {
  const router = express.Router();

  router.get(
    '/api/recruiter/me',
    createRequireAuth(verifier),
    requireRole('recruiter'),
    (req, res) => {
      const auth = (req as AuthenticatedRequest).auth!;
      res.json({
        userId: auth.userId,
        role: auth.role,
        companyName: auth.profile.company_name,
      });
    },
  );

  return router;
}

export const recruiterRouter = createRecruiterRouter();
