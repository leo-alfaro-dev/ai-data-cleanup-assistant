export function toExportFileName({
  fileName,
  suffix,
}: {
  fileName: string;
  suffix: 'cleaned' | 'changes';
}): string {
  const dotIndex = fileName.lastIndexOf('.');
  const hasExtension = dotIndex > 0;
  const name = hasExtension ? fileName.slice(0, dotIndex) : fileName;

  return `${name}.${suffix}.csv`;
}
