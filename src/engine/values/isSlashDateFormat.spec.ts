import { describe, expect, it } from 'vitest';
import { DATE_FORMATS } from './dateFormat';
import { isSlashDateFormat } from './isSlashDateFormat';

describe('isSlashDateFormat', () => {
  it('is true for the two formats that read the same text in either order', () => {
    const slashFormats = DATE_FORMATS.filter(isSlashDateFormat);

    expect(slashFormats).toEqual(['MM/DD/YYYY', 'DD/MM/YYYY']);
  });
});
