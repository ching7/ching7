export function replaceSection(template, key, content) {
  const pattern = new RegExp(
    `(<!--START_SECTION:${key}-->)[\\s\\S]*?(<!--END_SECTION:${key}-->)`
  );
  if (!pattern.test(template)) {
    throw new Error(`SECTION:${key} not found in template`);
  }
  pattern.lastIndex = 0;
  return template.replace(pattern, (_match, start, end) =>
    `${start}\n${content}\n${end}`
  );
}
