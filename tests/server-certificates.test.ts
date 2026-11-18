import assert from 'node:assert/strict';
import express from 'express';
import test from 'node:test';
import { createCertificateService } from '../server/lib/certificates';
import { createCertificateRouter } from '../server/routes/certificates';
import { createAiRouter } from '../server/routes/ai';

test('signed tokens roundtrip and reject tampering, expiry and wrong claims', () => {
  let now = 1_000_000;
  const certs = createCertificateService({ secret: 'test-secret', now: () => now });
  assert.equal(certs.enabled, true);

  const assessment = certs.issueAssessment({ sub: 'u1', qHash: 'q', aHash: 'a', score: 90, skill: 'nextflow' });
  const parsed = certs.verify(assessment);
  assert.equal(parsed?.kind, 'assessment');
  assert.equal(parsed?.sub, 'u1');
  assert.equal(certs.verify(`${assessment}x`), null);

  now += 15 * 60 * 1000 + 1;
  assert.equal(certs.verify(assessment), null);
});

test('certificate tokens carry a derived verification id and survive expiry checks', () => {
  const certs = createCertificateService({ secret: 'test-secret', now: () => 1_000_000 });
  const { token, claims } = certs.issueCertificate({
    sub: 'u1', skill: 'Nextflow', score: 92, issuedDate: '2026-11-18',
  });
  assert.match(claims.verificationId, /^OMI-CERT-[A-Za-z0-9_-]{10}$/);
  const parsed = certs.verify(token);
  assert.equal(parsed?.kind, 'certificate');
  assert.equal((parsed as typeof claims).verificationId, claims.verificationId);
  assert.equal(createCertificateService({ secret: '' }).enabled, false);
});

function allowAuth(req: any, _res: any, next: any) {
  req.auth = { userId: 'u1', role: 'student', profile: {} };
  next();
}

async function withCerts(certs: any, run: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use(createCertificateRouter({ requireAuth: allowAuth, certs, publicAppUrl: 'https://example.test' }));
  const server = app.listen(0);
  try {
    await run(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('issue returns a fully server-authored badge and a verifiable URL', async () => {
  const certs = createCertificateService({ secret: 'test-secret', now: () => 1_000_000 });
  const token = certs.issueAssessment({ sub: 'u1', qHash: 'q', aHash: 'a', score: 92, skill: 'Nextflow' });
  await withCerts(certs, async (base) => {
    const response = await fetch(`${base}/api/certificates/issue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentToken: token }),
    });
    assert.equal(response.status, 200);
    const badge = await response.json() as any;
    for (const field of ['id','skillName','category','level','score','issuedDate','verificationId','verificationUrl','status','assessedAreas','interviewerLens']) {
      assert.ok(field in badge, `missing ${field}`);
    }
    assert.equal(badge.status, 'Verified');
    assert.match(badge.verificationUrl, /^https:\/\/example\.test\/verify\/cert\//);

    const verified = await (await fetch(badge.verificationUrl.replace('https://example.test', base))).json() as any;
    assert.equal(verified.valid, true);
    assert.equal(verified.verificationId, badge.verificationId);

    const tampered = await (await fetch(`${base}/verify/cert/${badge.verificationUrl.split('/').pop()}x`)).json() as any;
    assert.equal(tampered.valid, false);
  });
});

test('issue rejects low scores, wrong subject, mismatched skill and missing secret', async () => {
  const certs = createCertificateService({ secret: 'test-secret', now: () => 1_000_000 });
  const low = certs.issueAssessment({ sub: 'u1', qHash: 'q', aHash: 'a', score: 70, skill: 'Nextflow' });
  const good = certs.issueAssessment({ sub: 'other', qHash: 'q', aHash: 'a', score: 92, skill: 'Nextflow' });
  await withCerts(certs, async (base) => {
    const post = (body: unknown) => fetch(`${base}/api/certificates/issue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal((await post({ assessmentToken: low })).status, 403);
    assert.equal((await post({ assessmentToken: good })).status, 403);
    assert.equal((await post({ assessmentToken: good.replace('other', 'u1'), skillName: 'other-skill' })).status, 403);
  });
  await withCerts(createCertificateService({ secret: '' }), async (base) => {
    const response = await fetch(`${base}/api/certificates/issue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 503);
  });
});

test('fallback evaluations never carry an assessment token', async () => {
  const certs = createCertificateService({ secret: 'test-secret' });
  const app = express();
  app.use(express.json());
  app.use(createAiRouter({ requireAuth: allowAuth, rateLimiters: [], certs }));
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const response = await fetch(`${base}/api/ai/mock-interview/evaluate-response`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'q', candidateAnswer: 'a'.repeat(20), role: 'dev' }),
    });
    const body = await response.json() as any;
    assert.equal(body.isFallback, true);
    assert.equal(body.assessmentToken, undefined);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
