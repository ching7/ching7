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
