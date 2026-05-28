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
