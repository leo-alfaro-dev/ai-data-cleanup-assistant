export const FORMULA_TRIGGERS = ['=', '+', '-', '@'] as const;

export type FormulaTrigger = (typeof FORMULA_TRIGGERS)[number];
