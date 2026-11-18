import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AssessmentClaims {
  kind: 'assessment';
  sub: string;
  qHash: string;
  aHash: string;
  score: number;
  skill: string;
  iat: number;
  exp: number;
}

export interface CertificateClaims {
  kind: 'certificate';
  sub: string;
  skill: string;
  score: number;
  issuedDate: string;
  verificationId: string;
  iat: number;
}

export type TokenClaims = AssessmentClaims | CertificateClaims;

export interface CertificateService {
  enabled: boolean;
  issueAssessment(input: {
    sub: string;
    qHash: string;
    aHash: string;
    score: number;
    skill: string;
  }): string;
  issueCertificate(input: {
    sub: string;
    skill: string;
    score: number;
    issuedDate: string;
  }): { token: string; claims: CertificateClaims };
  verify(token: string): TokenClaims | null;
}

const ASSESSMENT_TTL_MS = 15 * 60 * 1000;

/** Deterministic JSON so the signature covers a stable byte sequence. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function createCertificateService(options: {
  secret: string;
  now?: () => number;
}): CertificateService {
  const secret = options.secret;
  const now = options.now ?? (() => Date.now());

  function sign(claims: TokenClaims): string {
    const payload = Buffer.from(canonicalJson(claims)).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  return {
    enabled: secret.length > 0,

    issueAssessment({ sub, qHash, aHash, score, skill }) {
      const iat = now();
      const claims: AssessmentClaims = {
        kind: 'assessment',
        sub,
        qHash,
        aHash,
        score,
        skill,
        iat,
        exp: iat + ASSESSMENT_TTL_MS,
      };
      return sign(claims);
    },

    issueCertificate({ sub, skill, score, issuedDate }) {
      const iat = now();
      const verificationId = `OMI-CERT-${createHmac('sha256', secret)
        .update(`${sub}|${skill}|${score}|${iat}`)
        .digest('base64url')
        .slice(0, 10)}`;
      const claims: CertificateClaims = {
        kind: 'certificate',
        sub,
        skill,
        score,
        issuedDate,
        verificationId,
        iat,
      };
      return { token: sign(claims), claims };
    },

    verify(token) {
      try {
        const separator = token.lastIndexOf('.');
        if (separator < 1) return null;
        const payload = token.slice(0, separator);
        const signature = token.slice(separator + 1);
        const expected = createHmac('sha256', secret).update(payload).digest();
        const provided = Buffer.from(signature, 'base64url');
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
          return null;
        }
        const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
        if (!claims || (claims.kind !== 'assessment' && claims.kind !== 'certificate')) {
          return null;
        }
        if (claims.kind === 'assessment' && now() >= claims.exp) return null;
        return claims;
      } catch {
        return null;
      }
    },
  };
}
