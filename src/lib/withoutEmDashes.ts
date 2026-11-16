// The UI never shows an em dash, so a model's free text gets a comma in its place.
export function withoutEmDashes(text: string): string {
  return text.replace(/\s*\u2014\s*/g, ', ').replace(/^, |, $/g, '');
}
