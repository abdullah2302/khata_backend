// Avoids float noise like 0.1 + 0.2 = 0.30000000000000004 in invoice totals.
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
