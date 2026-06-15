import test from 'node:test';
import assert from 'node:assert/strict';
import { applyValues, findPlaceholders, resolveValues } from './values.mjs';

test('applyValues fills known placeholders, leaves empty/unknown in place', () => {
  const out = applyValues('Mail: {{EMAIL}}, Domain: {{DOMAIN}}, Name: {{NAME_1}}, X: {{X}}', {
    EMAIL: 'a@b.de',
    DOMAIN: 'b.de',
    NAME_1: '',
  });
  assert.equal(out, 'Mail: a@b.de, Domain: b.de, Name: {{NAME_1}}, X: {{X}}');
});

test('findPlaceholders returns distinct remaining tokens', () => {
  assert.deepEqual(findPlaceholders('{{A}} {{A}} {{B}} text'), ['{{A}}', '{{B}}']);
});

test('resolveValues defaults EMAIL_DSA to EMAIL when blank', () => {
  assert.equal(resolveValues({ EMAIL: 'x@y.de', EMAIL_DSA: '' }).EMAIL_DSA, 'x@y.de');
  assert.equal(resolveValues({ EMAIL: 'x@y.de', EMAIL_DSA: 'dsa@y.de' }).EMAIL_DSA, 'dsa@y.de');
});
