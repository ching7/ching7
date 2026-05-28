const SORTERS = {
  yaml_order: () => 0,
  stars_desc: (a, b) => {
    const cmp = b.stargazers_count - a.stargazers_count;
    if (cmp !== 0) return cmp;
    return new Date(b.pushed_at) - new Date(a.pushed_at);
  },
  updated_desc: (a, b) => {
    const cmp = new Date(b.pushed_at) - new Date(a.pushed_at);
    if (cmp !== 0) return cmp;
    return b.stargazers_count - a.stargazers_count;
  },
};

export function matchRepos(cache, cfg, { kind, options = {} }) {
  const { show_archived = false, sort = 'yaml_order' } = options;
  const sortFn = SORTERS[sort] ?? SORTERS.yaml_order;

  const filteredCache = show_archived ? cache : cache.filter(r => !r.archived);

  const lookupKey = kind === 'owned' ? 'name' : 'full_name';
  const byKey = new Map(filteredCache.map(r => [r[lookupKey], r]));
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
      const cmp = sortFn(a, b);
      if (cmp !== 0) return cmp;
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
    const comments = cfg.uncategorized_comments ?? {};
    let leftover = filteredCache
      .filter(r => !referenced.has(r[lookupKey]))
      .map(r => ({ ...r, comment: comments[r[lookupKey]] ?? '' }));
    if (leftover.length > 0) {
      const leftoverSortKey = cfg.uncategorized_sort ?? sort;
      const leftoverSortFn = SORTERS[leftoverSortKey] ?? sortFn;
      leftover.sort(leftoverSortFn);
      if (cfg.uncategorized_max != null) {
        leftover = leftover.slice(0, cfg.uncategorized_max);
      }
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
