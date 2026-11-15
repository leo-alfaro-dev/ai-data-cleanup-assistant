import { describe, expect, it } from 'vitest';
import { readFormulaTrigger } from './readFormulaTrigger';

describe('readFormulaTrigger', () => {
  it.each([
    { value: '=SUM(A1)', trigger: '=' },
    {
      value: '=HYPERLINK("https://example.com/refund","Claim refund")',
      trigger: '=',
    },
    { value: "+cmd|' /C calc'!A0", trigger: '+' },
    { value: '-2+3', trigger: '-' },
    { value: '@SUM(A1)', trigger: '@' },
    { value: '=1+1 ', trigger: '=' },
    { value: '--1', trigger: '-' },
    { value: '---', trigger: '-' },
    { value: '=', trigger: '=' },
    { value: '-A1', trigger: '-' },
    { value: '-1,5+2', trigger: '-' },
    { value: '-,', trigger: '-' },
  ])('reads the leading $trigger of $value', ({ value, trigger }) => {
    expect(readFormulaTrigger(value)).toBe(trigger);
  });

  it.each([
    { name: 'a space', padding: ' ' },
    { name: 'a tab', padding: '\t' },
    { name: 'a carriage return', padding: '\r' },
    { name: 'a line feed', padding: '\n' },
    { name: 'a non-breaking space', padding: ' ' },
    { name: 'several kinds', padding: ' \t\r ' },
  ])('still reads the trigger after $name', ({ padding }) => {
    expect(readFormulaTrigger(`${padding}=SUM(A1)`)).toBe('=');
  });

  it.each([
    '-12.5',
    '-5',
    '-.5',
    '-$5',
    '-12.5%',
    '-1,234.50',
    '+5',
    '+12.5',
    ' -12.5 ',
    '-12,5',
    '-1.234,50',
    '+3,5',
    '-1 234,5',
    '-5,5%',
  ])('leaves the number %j', (value) => {
    expect(readFormulaTrigger(value)).toBeNull();
  });

  it.each(['+1 555 0100', '+44 20 7946 0958', '+15550100123', ' +1 555 0100 '])(
    'leaves the phone number %j',
    (value) => {
      expect(readFormulaTrigger(value)).toBeNull();
    }
  );

  it.each(['-', '--', ' - ', ' -- '])('leaves the placeholder %j', (value) => {
    expect(readFormulaTrigger(value)).toBeNull();
  });

  it.each([
    '',
    '   ',
    'Ada',
    'a=b',
    'a+b',
    'a-b',
    'ada@example.com',
    '(555) 010-0123',
    '2024-03-04',
    "'=SUM(A1)",
    '​=SUM(A1)',
  ])('leaves %j, which does not start with a trigger', (value) => {
    expect(readFormulaTrigger(value)).toBeNull();
  });
});
