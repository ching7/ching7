import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRepos } from './match-repos.mjs';

const OWNED_CACHE = [
  { full_name: 'ching7/alpha', name: 'alpha', stargazers_count: 3, pushed_at: '2026-05-20T00:00:00Z', language: 'Go',     archived: false, fork: false, topics: [], html_url: 'https://github.com/ching7/alpha', description: '' },
  { full_name: 'ching7/beta',  name: 'beta',  stargazers_count: 1, pushed_at: '2026-05-10T00:00:00Z', language: 'Python', archived: false, fork: false, topics: [], html_url: 'https://github.com/ching7/beta',  description: '' },
  { full_name: 'ching7/gamma', name: 'gamma', stargazers_count: 9, pushed_at: '2026-05-01T00:00:00Z', language: 'Rust',   archived: false, fork: false, topics: [], html_url: 'https://github.com/ching7/gamma', description: '' },
];

const CFG_OWNED = {
  uncategorized_strategy: 'include',
  uncategorized_title: '其他探索',
  categories: [
    {
      id: 'llm', title: 'LLM 应用',
      repos: [
        { name: 'beta',  comment: '点评 beta',  pin: true },
        { name: 'alpha', comment: '点评 alpha' },
      ],
    },
  ],
};

test('matchRepos: groups configured repos by category, with comments', () => {
  const result = matchRepos(OWNED_CACHE, CFG_OWNED, { kind: 'owned' });
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'LLM 应用');
  assert.equal(result[0].repos.length, 2);
  assert.equal(result[0].repos[0].name, 'beta');
  assert.equal(result[0].repos[0].comment, '点评 beta');
  assert.equal(result[0].repos[1].name, 'alpha');
});

test('matchRepos: include strategy puts uncategorized owned in fallback group', () => {
  const result = matchRepos(OWNED_CACHE, CFG_OWNED, { kind: 'owned' });
  const other = result.find(r => r.title === '其他探索');
  assert.ok(other);
  assert.equal(other.repos.length, 1);
  assert.equal(other.repos[0].name, 'gamma');
  assert.equal(other.repos[0].comment, '');
});

test('matchRepos: hide strategy drops uncategorized', () => {
  const cfg = { ...CFG_OWNED, uncategorized_strategy: 'hide' };
  const result = matchRepos(OWNED_CACHE, cfg, { kind: 'owned' });
  assert.equal(result.length, 1);
  assert.equal(result[0].repos.length, 2);
});

test('matchRepos: missing-from-cache config entries are skipped (with warning prop)', () => {
  const cfg = {
    uncategorized_strategy: 'hide',
    categories: [{
      id: 'x', title: 'X',
      repos: [
        { name: 'alpha', comment: 'ok' },
        { name: 'ghost', comment: 'not in cache' },
      ],
    }],
  };
  const result = matchRepos(OWNED_CACHE, cfg, { kind: 'owned' });
  assert.equal(result[0].repos.length, 1);
  assert.equal(result[0].repos[0].name, 'alpha');
});

test('matchRepos: starred uses full_name lookup', () => {
  const starredCache = [
    { full_name: 'org/repo1', name: 'repo1', stargazers_count: 5, pushed_at: '2026-05-01T00:00:00Z', language: 'Go',     archived: false, fork: false, topics: [], html_url: 'https://github.com/org/repo1', description: '' },
  ];
  const cfg = {
    uncategorized_strategy: 'hide',
    categories: [{
      id: 'a', title: 'A',
      repos: [{ id: 'org/repo1', comment: '点评' }],
    }],
  };
  const result = matchRepos(starredCache, cfg, { kind: 'starred' });
  assert.equal(result[0].repos[0].full_name, 'org/repo1');
  assert.equal(result[0].repos[0].comment, '点评');
});

test('matchRepos: show_archived=false filters archived repos', () => {
  const cache = [
    { full_name: 'ching7/x', name: 'x', stargazers_count: 1, pushed_at: '2026-01-01T00:00:00Z', language: 'Go', archived: false, fork: false, topics: [], html_url: '', description: '' },
    { full_name: 'ching7/y', name: 'y', stargazers_count: 1, pushed_at: '2026-01-01T00:00:00Z', language: 'Go', archived: true,  fork: false, topics: [], html_url: '', description: '' },
  ];
  const cfg = {
    uncategorized_strategy: 'include',
    uncategorized_title: 'other',
    categories: [{ id: 'a', title: 'A', repos: [] }],
  };
  const result = matchRepos(cache, cfg, { kind: 'owned', options: { show_archived: false } });
  const other = result.find(g => g.title === 'other');
  assert.equal(other.repos.length, 1);
  assert.equal(other.repos[0].name, 'x');
});

test('matchRepos: sort=stars_desc orders within category by stars desc', () => {
  const cache = [
    { full_name: 'ching7/a', name: 'a', stargazers_count: 5, pushed_at: '2026-01-01T00:00:00Z', language: 'Go', archived: false, fork: false, topics: [], html_url: '', description: '' },
    { full_name: 'ching7/b', name: 'b', stargazers_count: 99, pushed_at: '2026-01-01T00:00:00Z', language: 'Go', archived: false, fork: false, topics: [], html_url: '', description: '' },
  ];
  const cfg = {
    uncategorized_strategy: 'hide',
    categories: [{
      id: 'x', title: 'X', repos: [
        { name: 'a', comment: 'c1' },
        { name: 'b', comment: 'c2' },
      ],
    }],
  };
  const result = matchRepos(cache, cfg, { kind: 'owned', options: { sort: 'stars_desc' } });
  assert.equal(result[0].repos[0].name, 'b');
  assert.equal(result[0].repos[1].name, 'a');
});

test('matchRepos: pin overrides sort', () => {
  const cache = [
    { full_name: 'ching7/a', name: 'a', stargazers_count: 5, pushed_at: '2026-01-01T00:00:00Z', language: 'Go', archived: false, fork: false, topics: [], html_url: '', description: '' },
    { full_name: 'ching7/b', name: 'b', stargazers_count: 99, pushed_at: '2026-01-01T00:00:00Z', language: 'Go', archived: false, fork: false, topics: [], html_url: '', description: '' },
  ];
  const cfg = {
    uncategorized_strategy: 'hide',
    categories: [{
      id: 'x', title: 'X', repos: [
        { name: 'a', comment: 'c1', pin: true },
        { name: 'b', comment: 'c2' },
      ],
    }],
  };
  const result = matchRepos(cache, cfg, { kind: 'owned', options: { sort: 'stars_desc' } });
  assert.equal(result[0].repos[0].name, 'a');
});
