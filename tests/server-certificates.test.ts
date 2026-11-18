import assert from 'node:assert/strict';
import test from 'node:test';
import { createCertificateService } from '../server/lib/certificates';

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
