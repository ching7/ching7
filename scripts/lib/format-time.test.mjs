import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRelative } from './format-time.mjs';

const NOW = new Date('2026-05-28T12:00:00Z');

test('formatRelative: same day → "今天"', () => {
  assert.equal(formatRelative('2026-05-28T03:00:00Z', NOW), '今天');
});

test('formatRelative: 1 day ago → "1 天前"', () => {
  assert.equal(formatRelative('2026-05-27T12:00:00Z', NOW), '1 天前');
});

test('formatRelative: 3 days ago', () => {
  assert.equal(formatRelative('2026-05-25T12:00:00Z', NOW), '3 天前');
});

test('formatRelative: 14 days ago → "2 周前"', () => {
  assert.equal(formatRelative('2026-05-14T12:00:00Z', NOW), '2 周前');
});

test('formatRelative: 45 days ago → "1 个月前"', () => {
  assert.equal(formatRelative('2026-04-13T12:00:00Z', NOW), '1 个月前');
});

test('formatRelative: 400 days ago → "1 年前"', () => {
  assert.equal(formatRelative('2025-04-24T12:00:00Z', NOW), '1 年前');
});

test('formatRelative: null input → ""', () => {
  assert.equal(formatRelative(null, NOW), '');
});

test('formatRelative: future date → ""', () => {
  assert.equal(formatRelative('2026-06-15T12:00:00Z', NOW), '');
});
