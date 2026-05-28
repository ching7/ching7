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
