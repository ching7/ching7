import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSection } from './render-section.mjs';

const NOW = new Date('2026-05-28T12:00:00Z');

const GROUPS = [
  {
    id: 'llm',
    title: 'LLM 应用',
    description: '大模型应用层探索',
    repos: [
      {
        full_name: 'ching7/alpha',
        name: 'alpha',
        html_url: 'https://github.com/ching7/alpha',
        description: 'orig desc',
        language: 'Python',
        stargazers_count: 1500,
        pushed_at: '2026-05-25T12:00:00Z',
        comment: '点评 alpha',
      },
    ],
  },
];

test('renderSection: produces H3 + description + table', () => {
  const out = renderSection(GROUPS, { now: NOW });
  assert.ok(out.includes('### LLM 应用'));
  assert.ok(out.includes('大模型应用层探索'));
  assert.ok(out.includes('| 仓库 | 点评 | ⭐ | 语言 | 最后更新 |'));
  assert.ok(out.includes('[ching7/alpha](https://github.com/ching7/alpha)'));
  assert.ok(out.includes('点评 alpha'));
  assert.ok(out.includes('1.5k'));
  assert.ok(out.includes('Python'));
  assert.ok(out.includes('3 天前'));
});

test('renderSection: empty groups → fallback message', () => {
  const out = renderSection([], { now: NOW });
  assert.ok(out.includes('暂无') || out.includes('(empty)'));
});

test('renderSection: skips group with no repos when description-only', () => {
  const groups = [{ id: 'x', title: 'X', description: 'd', repos: [] }];
  const out = renderSection(groups, { now: NOW });
  assert.equal(out.includes('### X'), false);
});

test('renderSection: star count under 1000 shown plain', () => {
  const groups = [{
    id: 'a', title: 'A', description: '',
    repos: [{
      full_name: 'x/y', name: 'y', html_url: 'https://github.com/x/y',
      description: '', language: 'Go', stargazers_count: 42,
      pushed_at: '2026-05-28T12:00:00Z', comment: 'c',
    }],
  }];
  const out = renderSection(groups, { now: NOW });
  assert.ok(out.includes('| 42 |'));
});

test('renderSection: max_per_category truncates with note', () => {
  const repos = Array.from({ length: 35 }, (_, i) => ({
    full_name: `x/r${i}`, name: `r${i}`, html_url: `https://github.com/x/r${i}`,
    description: '', language: 'Go', stargazers_count: i,
    pushed_at: '2026-05-28T12:00:00Z', comment: `c${i}`,
  }));
  const out = renderSection(
    [{ id: 'a', title: 'A', description: '', repos }],
    { now: NOW, max_per_category: 30 }
  );
  const tableLines = out.split('\n').filter(l => l.startsWith('| [x/'));
  assert.equal(tableLines.length, 30);
  assert.ok(out.includes('还有 5 个未列出'));
});
