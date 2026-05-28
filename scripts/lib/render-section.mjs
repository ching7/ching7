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
