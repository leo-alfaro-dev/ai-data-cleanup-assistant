export function toMarkdownTable(
  rows: readonly (readonly string[])[]
): string[] {
  const [header, ...body] = rows;
  if (!header) return [];

  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ];
}
