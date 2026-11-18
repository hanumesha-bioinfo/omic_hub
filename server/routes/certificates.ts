import express, { type RequestHandler, type Router } from 'express';
import { CERTIFICATE_SIGNING_SECRET, PUBLIC_APP_URL } from '../config';
import { asyncHandler } from '../lib/asyncHandler';
import { createCertificateService, type CertificateService } from '../lib/certificates';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

export interface CertificateRouterDeps {
  requireAuth: RequestHandler;
  certs: CertificateService;
  publicAppUrl: string;
}

function levelFor(score: number): string {
  if (score >= 95) return 'Distinguished Expert';
  if (score >= 88) return 'Advanced Professional';
  return 'Certified Professional';
}

function categoryFor(score: number): string {
  if (score >= 95) return 'Expert-Level Technical Assessment';
  if (score >= 88) return 'Advanced Technical Assessment';
  return 'Professional Technical Assessment';
}

export function createCertificateRouter(deps: CertificateRouterDeps): Router {
  const router = express.Router();

  router.post(
    '/api/certificates/issue',
    deps.requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      if (!deps.certs.enabled) {
        return res.status(503).json({ error: 'Certificate issuance is not configured' });
      }

      const body = req.body as { assessmentToken?: unknown; skillName?: unknown };
      const token = body?.assessmentToken;
      if (typeof token !== 'string') {
        return res.status(403).json({ error: 'Invalid assessment token' });
      }

      const claims = deps.certs.verify(token);
      if (!claims || claims.kind !== 'assessment') {
        return res.status(403).json({ error: 'Invalid assessment token' });
      }
      if (claims.sub !== req.auth?.userId) {
        return res.status(403).json({ error: 'Assessment belongs to another user' });
      }
      if (claims.score < 80) {
        return res.status(403).json({ error: 'Assessment score is below the certification threshold' });
      }

      const skillName = claims.skill.trim();
      if (
        typeof body.skillName === 'string' &&
        body.skillName.trim().toLowerCase() !== skillName.toLowerCase()
      ) {
        return res.status(403).json({ error: 'Skill does not match the assessment' });
      }

      const issuedDate = new Date().toISOString().slice(0, 10);
      const { token: certificateToken, claims: certificateClaims } = deps.certs.issueCertificate({
        sub: claims.sub,
        skill: skillName,
        score: claims.score,
        issuedDate,
      });

      return res.status(200).json({
        id: `badge_${certificateClaims.verificationId}`,
        skillName,
        category: categoryFor(claims.score),
        level: levelFor(claims.score),
        score: claims.score,
        issuedDate,
        verificationId: certificateClaims.verificationId,
        verificationUrl: `${deps.publicAppUrl}/verify/cert/${certificateToken}`,
        status: 'Verified',
        assessedAreas: [
          'Technical depth and correctness',
          'Structured problem solving',
          'Quantified impact and communication',
        ],
        interviewerLens: 'Senior Bioinformatics Bar Raiser',
      });
    }),
  );

  router.get('/verify/cert/:token', (req, res) => {
    const claims = deps.certs.verify(req.params.token);
    if (!claims || claims.kind !== 'certificate') {
      return res.status(200).json({ valid: false });
    }
    return res.status(200).json({
      valid: true,
      verificationId: claims.verificationId,
      skillName: claims.skill,
      score: claims.score,
      issuedDate: claims.issuedDate,
      status: 'Verified',
    });
  });

  return router;
}

export const certificateRouter = createCertificateRouter({
  requireAuth,
  certs: createCertificateService({ secret: CERTIFICATE_SIGNING_SECRET }),
  publicAppUrl: PUBLIC_APP_URL,
});
