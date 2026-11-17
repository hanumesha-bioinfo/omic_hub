import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { UserProfile } from '../src/types';
import {
  canSeeRecruiterWorkspace,
  canSeeStudentWorkspace,
} from '../src/features/auth/roles';

test('only profiles with an explicit role may see a workspace', () => {
  const recruiter = { id: 'uuid-1', userType: 'recruiter' } as UserProfile;
  const student = { id: 'uuid-2', userType: 'student' } as UserProfile;

  assert.equal(canSeeRecruiterWorkspace(recruiter), true);
  assert.equal(canSeeStudentWorkspace(recruiter), false);
  assert.equal(canSeeStudentWorkspace(student), true);
  assert.equal(canSeeRecruiterWorkspace(student), false);
  assert.equal(canSeeRecruiterWorkspace(null), false);
  assert.equal(canSeeStudentWorkspace(undefined), false);
  assert.equal(canSeeRecruiterWorkspace({ id: 'uuid-3' } as UserProfile), false);
});

test('App gates workspaces on verified profile predicates and renders an Access Denied screen', () => {
  const source = readFileSync(
    new URL('../src/App.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /canSeeRecruiterWorkspace\(user\)/);
  assert.match(source, /!canSeeStudentWorkspace\(user\)/);
  assert.match(source, /Access Denied/);
});
