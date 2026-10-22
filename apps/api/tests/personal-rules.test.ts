import { describe, it, expect } from 'vitest';
import {
  validateMoment,
  assertReflectionAuthor,
  validateEvidenceClaim,
} from '../src/resources/personal-rules';

describe('personal-rules', () => {
  it('accepts mood-only and energy-only moments', () => {
    expect(() => validateMoment({ mood: 'CALM' })).not.toThrow();
    expect(() => validateMoment({ energy: 2 })).not.toThrow();
  });

  it('rejects empty moment and OTHER without customMood', () => {
    expect(() => validateMoment({})).toThrow();
    expect(() => validateMoment({ mood: 'OTHER' })).toThrow();
  });

  it('rejects GENERATED reflections, accepts USER reflections', () => {
    expect(() =>
      assertReflectionAuthor('GENERATED', { reflection: 'generated' }),
    ).toThrow();
    expect(() =>
      assertReflectionAuthor('USER', { reflection: 'exact user text' }),
    ).not.toThrow();
  });

  it('allows CONTACT evidence with source only', () => {
    expect(() =>
      validateEvidenceClaim('CONTACT', null, false, {
        reflection: null,
        applications: null,
      }),
    ).not.toThrow();
  });

  it('rejects UNDERSTANDING with note+confirm but null reflection/applications', () => {
    expect(() =>
      validateEvidenceClaim('UNDERSTANDING', 'n', true, {
        reflection: null,
        applications: null,
      }),
    ).toThrow();
  });

  it('accepts UNDERSTANDING with own reflection; rejects TRANSFER with null applications', () => {
    expect(() =>
      validateEvidenceClaim('UNDERSTANDING', 'n', true, {
        reflection: 'my explanation',
        applications: null,
      }),
    ).not.toThrow();
    expect(() =>
      validateEvidenceClaim('TRANSFER', 'n', true, {
        reflection: 'my explanation',
        applications: null,
      }),
    ).toThrow();
  });
});
