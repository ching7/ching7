function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replaceSection(template, key, content) {
  const escapedKey = escapeRegExp(key);
  const pattern = new RegExp(
    `(<!--START_SECTION:${escapedKey}-->)[\\s\\S]*?(<!--END_SECTION:${escapedKey}-->)`
  );
  if (!pattern.test(template)) {
    throw new Error(`SECTION:${key} not found in template`);
  }
  return template.replace(pattern, (_match, start, end) =>
    `${start}\n${content}\n${end}`
  );
}
