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
