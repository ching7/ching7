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
      stale: false,
      owned: ownedRaw.map(extractRepo),
      starred: starredRaw.map(extractRepo),
    };

    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
    console.log(`Fetched ${cache.owned.length} owned + ${cache.starred.length} starred repos for ${USER}`);
  } catch (err) {
    console.error('fetch-github failed:', err.message);
    if (existsSync(CACHE_PATH)) {
      const prior = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
      prior.stale = true;
      prior.last_error = err.message;
      writeFileSync(CACHE_PATH, JSON.stringify(prior, null, 2) + '\n');
      console.warn('Marked cache.json as stale; render will show warning.');
      process.exit(0);
    }
    process.exit(1);
  }
}

main();
