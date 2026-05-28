# GitHub Profile README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Profile README at `github.com/ching7/ching7` that integrates a redacted Tech Profile, GitHub stats cards, and a curated repo Dashboard (own + starred), refreshed nightly via GitHub Actions.

**Architecture:** Two Node entry scripts — `fetch-github.mjs` pulls repo / starred metadata via Octokit into `data/cache.json`; `render-readme.mjs` applies `data/categories.yml` + cache to `templates/README.template.md` producing `README.md`. Pure functions extracted into `scripts/lib/` for `node:test` unit coverage. GitHub Actions runs both on schedule + push + dispatch, commits diff.

**Tech Stack:** Node 20 (ESM, `"type": "module"`), `@octokit/rest`, `yaml`, `node:test` (built-in), GitHub Actions, Markdown + shields.io + github-readme-stats SVG.

**Spec reference:** `docs/superpowers/specs/2026-05-28-github-readme-design.md`

---

## File Structure

```
ching7/
├── .github/workflows/
│   └── update-readme.yml                 ← CI: cron + push + dispatch
├── scripts/
│   ├── fetch-github.mjs                  ← entry: API → cache
│   ├── render-readme.mjs                 ← entry: template + cache → README
│   └── lib/
│       ├── format-time.mjs               ← ISO → "3 天前"
│       ├── format-time.test.mjs
│       ├── extract-fields.mjs            ← API repo → white-listed dict
│       ├── extract-fields.test.mjs
│       ├── replace-section.mjs           ← template + key + content → replaced
│       ├── replace-section.test.mjs
│       ├── match-repos.mjs               ← categories + cache → matched groups
│       ├── match-repos.test.mjs
│       ├── render-section.mjs            ← matched groups → markdown
│       └── render-section.test.mjs
├── data/
│   ├── categories.yml                    ← user-maintained
│   └── cache.json                        ← script-written
├── templates/
│   └── README.template.md
├── README.md                             ← rendered, do not hand-edit
├── package.json
├── package-lock.json
└── .gitignore                            ← already exists
```

Each `lib/` file owns one pure responsibility, sits behind a small interface, and has its own `*.test.mjs`. Entry scripts compose these into the I/O flow. This decomposition exists so that:
- you can hold any one file in your head at once
- tests run in milliseconds because there's no network in the lib layer
- entry scripts contain mostly orchestration, very little branching logic

---

### Task 1: Project Scaffolding

**Files:**
- Create: `/Users/chenyanan/Desktop/github-readme/package.json`
- Verify: `/Users/chenyanan/Desktop/github-readme/.gitignore` (already exists)
- Create: directory skeleton (`scripts/lib/`, `data/`, `templates/`, `.github/workflows/`)

- [ ] **Step 1: Create directory skeleton**

```bash
cd /Users/chenyanan/Desktop/github-readme
mkdir -p scripts/lib data templates .github/workflows
```

- [ ] **Step 2: Create package.json**

`/Users/chenyanan/Desktop/github-readme/package.json`:

```json
{
  "name": "ching7-profile-readme",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test scripts/lib/*.test.mjs",
    "fetch": "node scripts/fetch-github.mjs",
    "render": "node scripts/render-readme.mjs",
    "build": "npm run fetch && npm run render"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@octokit/rest": "^21.0.0",
    "yaml": "^2.5.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm install
```
Expected: creates `node_modules/` and `package-lock.json`. No errors.

- [ ] **Step 4: Verify .gitignore covers node_modules**

```bash
grep -q "node_modules" /Users/chenyanan/Desktop/github-readme/.gitignore && echo "OK"
```
Expected: prints `OK`. (Already present from spec commit.)

- [ ] **Step 5: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add package.json package-lock.json
git commit -m "chore: scaffold node project with octokit + yaml"
```

---

### Task 2: `lib/format-time.mjs` — ISO timestamp → "3 天前"

**Files:**
- Create: `scripts/lib/format-time.mjs`
- Test: `scripts/lib/format-time.test.mjs`

This is the warm-up task — a tiny pure function — to lock in the TDD rhythm before tackling larger ones.

- [ ] **Step 1: Write the failing test**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/format-time.test.mjs`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./format-time.mjs`.

- [ ] **Step 3: Implement**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/format-time.mjs`:

```javascript
const DAY = 24 * 60 * 60 * 1000;

export function formatRelative(iso, now = new Date()) {
  if (!iso) return '';
  const then = new Date(iso);
  const diffDays = Math.floor((now - then) / DAY);

  if (diffDays <= 0) return '今天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`;
  return `${Math.floor(diffDays / 365)} 年前`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add scripts/lib/format-time.mjs scripts/lib/format-time.test.mjs
git commit -m "feat(lib): format-time renders relative time in Chinese"
```

---

### Task 3: `lib/extract-fields.mjs` — GitHub API row → white-listed dict

**Files:**
- Create: `scripts/lib/extract-fields.mjs`
- Test: `scripts/lib/extract-fields.test.mjs`

White-listing is the PII防护 hardpoint per spec §5.5. Even if Octokit's response shape changes, only listed fields ever land in cache.

- [ ] **Step 1: Write the failing test**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/extract-fields.test.mjs`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: FAIL with module-not-found for `./extract-fields.mjs`.

- [ ] **Step 3: Implement**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/extract-fields.mjs`:

```javascript
const ALLOWED = [
  'full_name', 'name', 'description', 'language',
  'stargazers_count', 'pushed_at', 'archived', 'fork',
  'topics', 'html_url',
];

const DEFAULTS = {
  description: '',
  language: null,
  stargazers_count: 0,
  pushed_at: null,
  archived: false,
  fork: false,
  topics: [],
};

export function extractRepo(raw) {
  const out = {};
  for (const key of ALLOWED) {
    out[key] = raw[key] ?? DEFAULTS[key] ?? null;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add scripts/lib/extract-fields.mjs scripts/lib/extract-fields.test.mjs
git commit -m "feat(lib): extract-fields whitelists 10 repo fields"
```

---

### Task 4: `lib/replace-section.mjs` — section marker swap

**Files:**
- Create: `scripts/lib/replace-section.mjs`
- Test: `scripts/lib/replace-section.test.mjs`

Replaces `<!--START_SECTION:key-->...<!--END_SECTION:key-->` blocks. The unit of templating.

- [ ] **Step 1: Write the failing test**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/replace-section.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceSection } from './replace-section.mjs';

test('replaceSection: swaps content between markers', () => {
  const tmpl = 'A\n<!--START_SECTION:foo-->\nOLD\n<!--END_SECTION:foo-->\nB';
  const out = replaceSection(tmpl, 'foo', 'NEW');
  assert.equal(out, 'A\n<!--START_SECTION:foo-->\nNEW\n<!--END_SECTION:foo-->\nB');
});

test('replaceSection: handles multi-line content', () => {
  const tmpl = '<!--START_SECTION:k-->\nX\n<!--END_SECTION:k-->';
  const out = replaceSection(tmpl, 'k', 'line1\nline2\nline3');
  assert.ok(out.includes('line1\nline2\nline3'));
  assert.ok(out.startsWith('<!--START_SECTION:k-->'));
  assert.ok(out.endsWith('<!--END_SECTION:k-->'));
});

test('replaceSection: missing key throws', () => {
  const tmpl = 'no markers here';
  assert.throws(
    () => replaceSection(tmpl, 'absent', 'whatever'),
    /SECTION:absent not found/
  );
});

test('replaceSection: leaves other sections untouched', () => {
  const tmpl = [
    '<!--START_SECTION:a-->old-a<!--END_SECTION:a-->',
    '<!--START_SECTION:b-->old-b<!--END_SECTION:b-->',
  ].join('\n');
  const out = replaceSection(tmpl, 'a', 'new-a');
  assert.ok(out.includes('new-a'));
  assert.ok(out.includes('old-b'));
});

test('replaceSection: special regex chars in content are safe', () => {
  const tmpl = '<!--START_SECTION:s-->X<!--END_SECTION:s-->';
  const tricky = '$1 $& \\n [ok]';
  const out = replaceSection(tmpl, 's', tricky);
  assert.ok(out.includes(tricky));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/replace-section.mjs`:

```javascript
export function replaceSection(template, key, content) {
  const pattern = new RegExp(
    `(<!--START_SECTION:${key}-->)[\\s\\S]*?(<!--END_SECTION:${key}-->)`
  );
  if (!pattern.test(template)) {
    throw new Error(`SECTION:${key} not found in template`);
  }
  pattern.lastIndex = 0;
  // Use a replacer function so $1 / $& inside `content` are not interpreted
  return template.replace(pattern, (_match, start, end) =>
    `${start}\n${content}\n${end}`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add scripts/lib/replace-section.mjs scripts/lib/replace-section.test.mjs
git commit -m "feat(lib): replace-section swaps marked blocks safely"
```

---

### Task 5: `lib/match-repos.mjs` — categories + cache → matched groups

**Files:**
- Create: `scripts/lib/match-repos.mjs`
- Test: `scripts/lib/match-repos.test.mjs`

Joins `categories.yml` config with `cache.json` metadata. Pure function. Handles `pin`, sort, uncategorized strategy.

- [ ] **Step 1: Write the failing test**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/match-repos.test.mjs`:

```javascript
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
  // pin=true comes first; ties broken by yaml order
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/match-repos.mjs`:

```javascript
export function matchRepos(cache, cfg, { kind }) {
  const lookupKey = kind === 'owned' ? 'name' : 'full_name';
  const byKey = new Map(cache.map(r => [r[lookupKey], r]));
  const referenced = new Set();

  const groups = cfg.categories.map(cat => {
    const matched = [];
    cat.repos.forEach((entry, idx) => {
      const key = kind === 'owned' ? entry.name : entry.id;
      const meta = byKey.get(key);
      if (!meta) {
        console.warn(`[match-repos] ${key} configured but not in cache; skipped`);
        return;
      }
      referenced.add(key);
      matched.push({
        ...meta,
        comment: entry.comment ?? '',
        pin: entry.pin === true,
        _order: idx,
      });
    });
    // pin first, then yaml order
    matched.sort((a, b) => {
      if (a.pin !== b.pin) return a.pin ? -1 : 1;
      return a._order - b._order;
    });
    return {
      id: cat.id,
      title: cat.title,
      description: cat.description ?? '',
      repos: matched.map(({ _order, pin, ...rest }) => rest),
    };
  });

  if (cfg.uncategorized_strategy === 'include') {
    const leftover = cache
      .filter(r => !referenced.has(r[lookupKey]))
      .map(r => ({ ...r, comment: '' }));
    if (leftover.length > 0) {
      groups.push({
        id: '_uncategorized',
        title: cfg.uncategorized_title ?? '其他',
        description: '',
        repos: leftover,
      });
    }
  }

  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: PASS, all 5 match-repos tests green plus prior ones.

- [ ] **Step 5: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add scripts/lib/match-repos.mjs scripts/lib/match-repos.test.mjs
git commit -m "feat(lib): match-repos joins categories.yml with cache"
```

---

### Task 6: `lib/render-section.mjs` — matched groups → markdown

**Files:**
- Create: `scripts/lib/render-section.mjs`
- Test: `scripts/lib/render-section.test.mjs`

Renders the H3 + description + 5-column markdown table. Uses `formatRelative` for the last column.

- [ ] **Step 1: Write the failing test**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/render-section.test.mjs`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

`/Users/chenyanan/Desktop/github-readme/scripts/lib/render-section.mjs`:

```javascript
import { formatRelative } from './format-time.mjs';

function formatStars(n) {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

function escapePipes(text) {
  return String(text ?? '').replace(/\|/g, '\\|');
}

function renderRow(repo, now) {
  const link = `[${repo.full_name}](${repo.html_url})`;
  return `| ${link} | ${escapePipes(repo.comment)} | ${formatStars(repo.stargazers_count)} | ${repo.language ?? '—'} | ${formatRelative(repo.pushed_at, now)} |`;
}

function renderTable(repos, now) {
  const header = '| 仓库 | 点评 | ⭐ | 语言 | 最后更新 |';
  const sep    = '| --- | --- | --- | --- | --- |';
  return [header, sep, ...repos.map(r => renderRow(r, now))].join('\n');
}

export function renderSection(groups, { now = new Date(), max_per_category = 30 } = {}) {
  const renderableGroups = groups.filter(g => g.repos.length > 0);
  if (renderableGroups.length === 0) {
    return '_(暂无内容)_';
  }

  const blocks = renderableGroups.map(group => {
    const visible = group.repos.slice(0, max_per_category);
    const overflow = group.repos.length - visible.length;
    const parts = [`### ${group.title}`];
    if (group.description) parts.push(group.description);
    parts.push('');
    parts.push(renderTable(visible, now));
    if (overflow > 0) parts.push(`\n_还有 ${overflow} 个未列出，见原始 starred 列表_`);
    return parts.join('\n');
  });

  return blocks.join('\n\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm test
```
Expected: PASS, all 5 render-section tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add scripts/lib/render-section.mjs scripts/lib/render-section.test.mjs
git commit -m "feat(lib): render-section emits H3 + 5-col markdown table"
```

---

### Task 7: Templates and initial `categories.yml`

**Files:**
- Create: `templates/README.template.md`
- Create: `data/categories.yml`
- Create: `data/cache.json` (placeholder empty cache to bootstrap local renders)

- [ ] **Step 1: Write `templates/README.template.md`**

`/Users/chenyanan/Desktop/github-readme/templates/README.template.md`:

```markdown
# 陈亚男 · AI Application Architect

<!--START_SECTION:hero-->
> 金融行业大模型落地 · RAG / Multi-Agent · 8 年经验

![LLM](https://img.shields.io/badge/-LLM-blueviolet?style=flat-square)
![RAG](https://img.shields.io/badge/-RAG-blue?style=flat-square)
![LangGraph](https://img.shields.io/badge/-LangGraph-green?style=flat-square)
![MCP](https://img.shields.io/badge/-MCP-orange?style=flat-square)
![Cloud-Native](https://img.shields.io/badge/-Cloud--Native-1f6feb?style=flat-square)

![Java](https://img.shields.io/badge/-Java-red?style=flat-square&logo=oracle)
![Python](https://img.shields.io/badge/-Python-yellow?style=flat-square&logo=python)
![Go](https://img.shields.io/badge/-Go-00ADD8?style=flat-square&logo=go)
<!--END_SECTION:hero-->

## 📊 数据画像

<!--START_SECTION:stats-->
<table>
  <tr>
    <td><img src="https://github-readme-stats.vercel.app/api?username=ching7&show_icons=true&theme=tokyonight&hide_border=true&count_private=true" /></td>
    <td><img src="https://github-readme-streak-stats.herokuapp.com/?user=ching7&theme=tokyonight&hide_border=true" /></td>
  </tr>
</table>

<img src="https://github-readme-stats.vercel.app/api/top-langs/?username=ching7&layout=compact&theme=tokyonight&hide_border=true&langs_count=10" />

<img src="https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=ching7&theme=tokyonight" />
<!--END_SECTION:stats-->

## 🗂 我的项目

<!--START_SECTION:my-repos-->
_(待 GitHub Action 渲染)_
<!--END_SECTION:my-repos-->

## ⭐ 精选收藏

<!--START_SECTION:starred-->
_(待 GitHub Action 渲染)_
<!--END_SECTION:starred-->

## 💼 Tech Profile

<!--START_SECTION:experience-->
### 代表项目

<details>
<summary><b>金融行业智能体平台 — 架构师 — 2024.05 至今</b></summary>

面向金融行业客服与内部管理的智能体平台。覆盖知识问答、客户意图识别、信贷审核等业务场景。

**技术栈：** Docker / K8s · RAG · LangGraph · AgentSkills · MCP · SpringBoot · 国产化

**个人贡献：**
- 主导整体 APM / Skywalking 监控体系搭建，覆盖应用性能、机器性能、链路监控、服务拓扑
- 负责高并发场景下系统性能超时与 OOM 问题的编码优化
- 设计 RAG 底层平台抽象，支撑多 Agent 按需调用，降低重复建设
- 采用 ReAct 模式 + LangGraph 双模式架构，适配不同复杂度业务

</details>

<details>
<summary><b>AI 训推一体平台 — 应用架构师 — 2024.05 至今</b></summary>

面向金融、央国企客户的通用 AI 训练 / 行业大模型训练推理 / 开发服务一体平台，含智管 / 智训 / 智运三大模块。

**技术栈：** Docker / K8s · Harbor · SpringBoot · ES · Zookeeper · 自研网关注册配置中心 · 国产化

**个人贡献：**
- 应用场景接入、模型微调训练 POC 开发
- 网关对接、存储对接方案开发
- 异构资源统一管理与算力调度集成

</details>

<details>
<summary><b>金融行业智能呼叫中心 — 研发组长 — 2021.05 至 2024.05</b></summary>

基于 FreeSWITCH 自研 CTI / ACD 路由组件，结合 TTS / ASR / 知识库等智能化能力，打造 200 座席、1000 通话并发能力的呼叫中心。

**技术栈：** SpringBoot · MySQL · Redis · Dubbo · Nacos · Arthas · FreeSWITCH

**个人贡献：**
- 完成智能呼叫中心 0-1 搭建；并发性能从单机 50 路提升到单机 200 路，最终扩展到集群 1000 路
- 完成坐席工作台单体服务向微服务架构的演进
- 基于 Doris + DolphinScheduler 完成时数仓建设，构建 30+ 张实时统计报表，200+ 指标数据实时计算
- 担任研发经理 / 架构师，进行研发进度跟踪、方案架构设计、并发优化
- 带领常驻研测试 15+、峰值 40+ 研测人员，完成多场景试运营

</details>

### 工作经历

| 时间 | 组织 | 角色 | 技术方向 |
| --- | --- | --- | --- |
| 2021.05 – Now | 头部 AI 平台公司 | AI 系统架构师 | 大模型平台 / Agent / RAG |
| 2018.07 – 2021.05 | 金融 SaaS 上市公司 | Java 工程师 | 金融基础架构 / 高并发 |

### 技能矩阵

- **LLM Engineering**: RAG · LangGraph · MCP · AgentSkills · Embedding · Fine-tuning
- **架构与基建**: Docker · K8s · Skywalking · 双中心双活 · 异地灾备
- **后端**: SpringBoot · Dubbo · MySQL · Redis · ES · Zookeeper
- **领域专长**: 金融大模型落地 · 高并发系统调优 · IPD 流程 · 团队管理（40+）
<!--END_SECTION:experience-->

## 🪶 关于我

<!--START_SECTION:narrative-->
AI 应用架构师，做金融场景的大模型落地。

从呼叫中心的高并发起家，那时候 jstack 用得比 IDE 还熟，每天修 OOM 修到怀疑人生。后来转去搞大模型平台，发现 OOM 没躲过去，只是变成了显存版。

技术上最近在折腾模型微调、RAG 平台、Multi-Agent 编排、国产化适配。习惯把可观测性做扎实了再谈架构——没有 APM 的系统跟黑盒没区别。

带过 40+ 人的团队，看到白板就想画架构图，算是职业病。

下面是写过的代码，以及一些 star 了但还没看完的仓库。
<!--END_SECTION:narrative-->

---

<!--START_SECTION:footer-->
_Last updated by GitHub Action_
<!--END_SECTION:footer-->
```

- [ ] **Step 2: Write `data/categories.yml`**

`/Users/chenyanan/Desktop/github-readme/data/categories.yml`:

```yaml
# 唯一手动维护的文件 — 改完 push 即触发 README 重渲染

my_repos:
  uncategorized_strategy: include
  uncategorized_title: 其他探索

  categories:
    - id: llm-apps
      title: LLM 应用
      description: 大模型应用层探索
      repos: []

    - id: infra
      title: 工程基建
      repos: []

starred:
  uncategorized_strategy: hide

  categories:
    - id: llm-agent
      title: LLM / Agent 框架
      description: 多智能体编排与 LLM 应用开发框架
      repos: []

    - id: rag
      title: RAG 与向量检索
      repos: []

    - id: inference
      title: 模型推理与部署
      repos: []

    - id: fin-ai
      title: 金融 × AI
      repos: []

options:
  max_per_category: 30
  columns: [name, comment, stars, language, updated]
  sort: yaml_order
  show_archived: false
```

- [ ] **Step 3: Write empty `data/cache.json`**

`/Users/chenyanan/Desktop/github-readme/data/cache.json`:

```json
{
  "fetched_at": "2026-05-28T00:00:00Z",
  "user": "ching7",
  "owned": [],
  "starred": []
}
```

- [ ] **Step 4: Verify template & yaml are well-formed**

```bash
cd /Users/chenyanan/Desktop/github-readme
node -e "import('yaml').then(({default:y}) => console.log('OK:', Object.keys(y.parse(require('fs').readFileSync('data/categories.yml','utf8')))))"
```
Expected: `OK: [ 'my_repos', 'starred', 'options' ]`

- [ ] **Step 5: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add templates/README.template.md data/categories.yml data/cache.json
git commit -m "feat: README template + initial categories.yml skeleton"
```

---

### Task 8: `scripts/render-readme.mjs` — compose lib into entry script

**Files:**
- Create: `scripts/render-readme.mjs`

This is composition — no new logic. It reads three files, calls lib functions, writes README.md. Tested by running it against the empty cache and checking the output.

- [ ] **Step 1: Implement the entry script**

`/Users/chenyanan/Desktop/github-readme/scripts/render-readme.mjs`:

```javascript
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import yaml from 'yaml';

import { replaceSection } from './lib/replace-section.mjs';
import { matchRepos } from './lib/match-repos.mjs';
import { renderSection } from './lib/render-section.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function main() {
  const template = read('templates/README.template.md');
  const cfg = yaml.parse(read('data/categories.yml'));
  const cache = JSON.parse(read('data/cache.json'));

  const now = new Date();
  const max = cfg.options?.max_per_category ?? 30;

  const myGroups = matchRepos(cache.owned, cfg.my_repos, { kind: 'owned' });
  const starGroups = matchRepos(cache.starred, cfg.starred, { kind: 'starred' });

  const myMd = renderSection(myGroups, { now, max_per_category: max });
  const starMd = renderSection(starGroups, { now, max_per_category: max });

  const fetchedDate = (cache.fetched_at ?? new Date().toISOString()).slice(0, 10);
  const footerMd = `_Last updated by GitHub Action · ${fetchedDate}_`;

  let out = template;
  out = replaceSection(out, 'my-repos', myMd);
  out = replaceSection(out, 'starred', starMd);
  out = replaceSection(out, 'footer', footerMd);

  writeFileSync(resolve(ROOT, 'README.md'), out);
  console.log(`Rendered README.md (${out.length} bytes)`);
}

main();
```

- [ ] **Step 2: Run it against the empty cache**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm run render
```
Expected: stdout `Rendered README.md (NNNN bytes)`. No errors.

- [ ] **Step 3: Inspect output**

```bash
cd /Users/chenyanan/Desktop/github-readme
head -40 README.md
echo "---"
grep -A 1 'START_SECTION:my-repos' README.md | head -5
```
Expected: `# 陈亚男 · AI Application Architect` at top; `my-repos` section contains `_(暂无内容)_` (because owned cache is empty); `footer` shows `Last updated by GitHub Action · 2026-05-28`.

- [ ] **Step 4: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add scripts/render-readme.mjs README.md
git commit -m "feat: render-readme.mjs composes lib functions into pipeline"
```

---

### Task 9: `scripts/fetch-github.mjs` — Octokit-backed API loader

**Files:**
- Create: `scripts/fetch-github.mjs`

This file does I/O. It is **not** unit-tested with mocks — we exercise it via Task 11's end-to-end smoke test with a real GitHub token. The pure extraction logic already has unit tests in Task 3.

- [ ] **Step 1: Implement the entry script**

`/Users/chenyanan/Desktop/github-readme/scripts/fetch-github.mjs`:

```javascript
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Octokit } from '@octokit/rest';

import { extractRepo } from './lib/extract-fields.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USER = process.env.GITHUB_USER ?? 'ching7';
const TOKEN = process.env.GITHUB_TOKEN;
const CACHE_PATH = resolve(ROOT, 'data/cache.json');

async function fetchAllPages(octokit, endpoint, params) {
  const pages = [];
  for (let page = 1; page <= 20; page++) {
    const res = await endpoint({ ...params, per_page: 100, page });
    pages.push(...res.data);
    if (res.data.length < 100) break;
  }
  return pages;
}

async function main() {
  if (!TOKEN) {
    console.warn('No GITHUB_TOKEN set; aborting fetch (render will use existing cache).');
    process.exit(0);
  }

  const octokit = new Octokit({ auth: TOKEN });

  try {
    const ownedRaw = await fetchAllPages(
      octokit,
      octokit.rest.repos.listForUser.bind(octokit),
      { username: USER, type: 'owner', sort: 'updated' }
    );
    const starredRaw = await fetchAllPages(
      octokit,
      octokit.rest.activity.listReposStarredByUser.bind(octokit),
      { username: USER, sort: 'created' }
    );

    const cache = {
      fetched_at: new Date().toISOString(),
      user: USER,
      owned: ownedRaw.map(extractRepo),
      starred: starredRaw.map(extractRepo),
    };

    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
    console.log(`Fetched ${cache.owned.length} owned + ${cache.starred.length} starred repos for ${USER}`);
  } catch (err) {
    console.error('fetch-github failed:', err.message);
    if (existsSync(CACHE_PATH)) {
      console.warn('Keeping previous cache.json; render will use stale data.');
      process.exit(0);
    }
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Smoke-run without a token (graceful degradation)**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm run fetch
```
Expected: prints `No GITHUB_TOKEN set; aborting fetch (render will use existing cache).` and exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add scripts/fetch-github.mjs
git commit -m "feat: fetch-github.mjs pulls owned + starred via Octokit"
```

---

### Task 10: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/update-readme.yml`

- [ ] **Step 1: Write the workflow**

`/Users/chenyanan/Desktop/github-readme/.github/workflows/update-readme.yml`:

```yaml
name: Update README

on:
  schedule:
    - cron: '0 16 * * *'      # UTC 16:00 ≈ 北京时间 0:00
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'data/categories.yml'
      - 'templates/**'
      - 'scripts/**'
      - '.github/workflows/update-readme.yml'

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Fetch GitHub data
        run: node scripts/fetch-github.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Render README
        run: node scripts/render-readme.mjs

      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add README.md data/cache.json
          if git diff --staged --quiet; then
            echo "No changes to commit."
          else
            git commit -m "chore: refresh README $(date -u +%Y-%m-%d)"
            git push
          fi
```

- [ ] **Step 2: Validate YAML syntax**

```bash
cd /Users/chenyanan/Desktop/github-readme
node -e "import('yaml').then(({default:y}) => { y.parse(require('fs').readFileSync('.github/workflows/update-readme.yml','utf8')); console.log('YAML OK'); })"
```
Expected: `YAML OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add .github/workflows/update-readme.yml
git commit -m "ci: nightly + push workflow to refresh README"
```

---

### Task 11: End-to-end local smoke test with real GitHub token

**Files:**
- Touches: `data/cache.json`, `README.md` (regenerated)

This task confirms the full pipeline works locally before pushing to GitHub. You'll need a Personal Access Token with `public_repo` scope (read-only is fine for public repos).

- [ ] **Step 1: Create a local PAT and export it**

In a terminal you'll execute manually (not in the agent's command):
- Open https://github.com/settings/tokens/new
- Generate a token with no scopes (public read works without scopes; this gives the 5000/h rate limit instead of 60/h)
- Copy it

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

- [ ] **Step 2: Run the full pipeline**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm run build
```
Expected: prints `Fetched N owned + M starred repos for ching7` then `Rendered README.md (NNNN bytes)`.

- [ ] **Step 3: Inspect generated cache & README**

```bash
cd /Users/chenyanan/Desktop/github-readme
node -e "const c = JSON.parse(require('fs').readFileSync('data/cache.json')); console.log('owned:', c.owned.length, 'starred:', c.starred.length, 'first owned keys:', Object.keys(c.owned[0]||{}))"
echo "---"
grep -n "START_SECTION\|^### " README.md | head -30
```
Expected:
- Cache has both arrays populated; first owned repo's keys are exactly the 10 whitelisted fields
- README contains section markers in correct order; my-repos shows the "其他探索" group (because categories.yml has empty `repos: []`)

- [ ] **Step 4: Verify no PII leaked into cache**

```bash
cd /Users/chenyanan/Desktop/github-readme
node -e "
const c = JSON.parse(require('fs').readFileSync('data/cache.json'));
const allowed = new Set(['full_name','name','description','language','stargazers_count','pushed_at','archived','fork','topics','html_url']);
const leak = [...c.owned, ...c.starred].flatMap(r => Object.keys(r).filter(k => !allowed.has(k)));
console.log(leak.length === 0 ? 'No leaks detected' : 'LEAK: ' + leak);
"
```
Expected: `No leaks detected`.

- [ ] **Step 5: Commit the regenerated cache + README**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add data/cache.json README.md
git commit -m "chore: first end-to-end render with real GitHub data"
```

---

### Task 12: Push to GitHub remote and verify Action runs

**Files:** none (remote work)

- [ ] **Step 1: Create the remote `ching7/ching7` repository on GitHub**

In a browser, you (the user) manually:
- Visit https://github.com/new
- Name: `ching7` (exact match to username — this is the "magic" Profile README repo)
- Public, no init files

- [ ] **Step 2: Add remote and push**

```bash
cd /Users/chenyanan/Desktop/github-readme
git remote add origin https://github.com/ching7/ching7.git
git push -u origin main
```
Expected: push succeeds. Commit history is visible at `github.com/ching7/ching7`.

- [ ] **Step 3: Trigger the workflow manually**

In a browser:
- Go to `https://github.com/ching7/ching7/actions/workflows/update-readme.yml`
- Click "Run workflow" → choose `main` → Run

- [ ] **Step 4: Verify the Action succeeds**

After ~30-60 seconds:
- Workflow shows green check
- A new commit `chore: refresh README YYYY-MM-DD` appears (if data changed) OR `No changes to commit.` in logs (if cache already up to date)

- [ ] **Step 5: Verify Profile rendering**

Open `https://github.com/ching7` in browser:
- README displays
- Stats cards load (network-dependent; may briefly show broken images that resolve in ~1 minute)
- Section order matches spec §2: stats → my-repos → starred → experience → narrative

---

### Task 13: Populate `categories.yml` with first real entries

**Files:**
- Modify: `data/categories.yml`

This is the only ongoing maintenance task. Adding 1 owned repo + 1 starred recommendation as a smoke test of the maintenance workflow.

- [ ] **Step 1: Inspect `data/cache.json` to see actual repo names**

```bash
cd /Users/chenyanan/Desktop/github-readme
node -e "
const c = JSON.parse(require('fs').readFileSync('data/cache.json'));
console.log('=== OWNED ===');
c.owned.forEach(r => console.log(r.name, '|', r.language, '|', r.stargazers_count, '⭐'));
console.log('=== STARRED (first 20) ===');
c.starred.slice(0, 20).forEach(r => console.log(r.full_name, '|', r.language, '|', r.stargazers_count, '⭐'));
"
```

- [ ] **Step 2: Edit `data/categories.yml`** — pick one repo from each list and write a one-line comment.

Example (replace with real names from Step 1's output):

```yaml
my_repos:
  categories:
    - id: llm-apps
      title: LLM 应用
      description: 大模型应用层探索
      repos:
        - name: <your-real-repo-name>
          comment: <一句话点评，描述你做了什么或学到什么>
```

```yaml
starred:
  categories:
    - id: llm-agent
      title: LLM / Agent 框架
      description: 多智能体编排与 LLM 应用开发框架
      repos:
        - id: <owner/repo from cache>
          comment: <你的中文点评>
```

- [ ] **Step 3: Re-render locally and inspect**

```bash
cd /Users/chenyanan/Desktop/github-readme && npm run render && grep -A 8 "LLM 应用" README.md | head -20
```
Expected: README's "LLM 应用" section now shows a row for the configured repo with its star count and last-update time.

- [ ] **Step 4: Commit and push**

```bash
cd /Users/chenyanan/Desktop/github-readme
git add data/categories.yml README.md
git commit -m "chore: first curated entries in categories.yml"
git push
```
Expected: push triggers the `push to data/categories.yml` workflow path; Action re-renders within ~1 minute.

---

## Self-Review Checklist (already run; recorded here for traceability)

1. **Spec coverage**:
   - §0 goals → Tasks 7-13 cover Tech Profile (Task 7 template), stats (Task 7), Dashboard (Tasks 5/6/8)
   - §1 directory → Tasks 1, 2, 7, 8, 9, 10
   - §2 README order → Task 7 template
   - §3 categories.yml model → Tasks 5 (matching logic) + 7 (initial file)
   - §4 narrative → Task 7 template body
   - §5 scripts/workflow → Tasks 8 (render), 9 (fetch), 10 (workflow)
   - §6 SVG services → Task 7 template
   - §7 maintenance workflow → Task 13
   - §8 open questions → addressed inline (badges in Task 7 template; theme = tokyonight chosen)

2. **Placeholder scan**: no TBD/TODO/"add appropriate" appears in any code block. The only `<...>` placeholders are in Task 13 Step 2 where the user must substitute real repo names — this is intentional, not a plan gap.

3. **Type consistency**:
   - `extractRepo` exports match all 10 white-listed fields; `match-repos.test.mjs` uses every field
   - `formatRelative(iso, now)` signature consistent across `format-time.mjs` and `render-section.mjs`
   - `replaceSection(template, key, content)` consistent in usage from `render-readme.mjs`
   - `matchRepos(cache, cfg, { kind })` consistent across test + entry script
   - `renderSection(groups, { now, max_per_category })` consistent

4. **Order-of-operations**: Task 8 (render-readme.mjs) only requires Tasks 2-6 (lib funcs) and Task 7 (template). Task 9 (fetch) doesn't block Task 8 since Task 7 ships an empty cache.json. Tasks 11-13 require Tasks 1-10.

---
