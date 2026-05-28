import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRepo } from './extract-fields.mjs';

const RAW = {
  id: 999,
  full_name: 'ching7/sample',
  name: 'sample',
  description: 'A demo repo',
  language: 'JavaScript',
  stargazers_count: 42,
  pushed_at: '2026-05-20T10:00:00Z',
  archived: false,
  fork: false,
  topics: ['llm', 'rag'],
  html_url: 'https://github.com/ching7/sample',
  // fields we should NOT keep:
  owner: { email: 'leak@example.com', login: 'ching7' },
  default_branch: 'main',
  network_count: 12,
};

test('extractRepo: keeps only white-listed fields', () => {
  const result = extractRepo(RAW);
  assert.deepEqual(result, {
    full_name: 'ching7/sample',
    name: 'sample',
    description: 'A demo repo',
    language: 'JavaScript',
    stargazers_count: 42,
    pushed_at: '2026-05-20T10:00:00Z',
    archived: false,
    fork: false,
    topics: ['llm', 'rag'],
    html_url: 'https://github.com/ching7/sample',
  });
});

test('extractRepo: missing optional fields default sensibly', () => {
  const result = extractRepo({
    full_name: 'a/b',
    name: 'b',
    html_url: 'https://github.com/a/b',
  });
  assert.equal(result.description, '');
  assert.equal(result.language, null);
  assert.equal(result.stargazers_count, 0);
  assert.equal(result.archived, false);
  assert.equal(result.fork, false);
  assert.deepEqual(result.topics, []);
});

test('extractRepo: leak field never appears', () => {
  const result = extractRepo(RAW);
  assert.equal('owner' in result, false);
  assert.equal('network_count' in result, false);
});
