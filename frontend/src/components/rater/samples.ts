/**
 * Canonical sample worksheets — one per design-phase grade chip.
 * Real Canadian data, ported verbatim from docs/design-phase/rater.jsx.
 */

export interface Sample {
  id:    string;
  label: string;
  text:  string;
}

const SAMPLE_BMW_X3 = `2026 BMW X3 xDrive30i
MSRP: $62,400
Freight & PDI: $2,480
Selling Price: $58,900
Term: 39 months
Money Factor: 0.00166 (3.99% APR)
Residual: 59% ($36,816)
KM/yr: 16,000
Down Payment: $0
Trade Equity: $0
Loyalty: $1,500
Province: Alberta
Monthly Payment (taxed): $698`;

const SAMPLE_HONDA_CRV = `2026 Honda CR-V Hybrid Touring
MSRP: $49,100
Freight: $1,995
Selling Price: $48,200
Term: 48 months
Money Factor: 0.00187 (4.49% APR)
Residual: 55%
KM/yr: 20,000
Down: $0
Province: Ontario
Doc fee: $799
Monthly (taxed): $612`;

const SAMPLE_MB_GLC = `2025 Mercedes-Benz GLC 300 4MATIC
MSRP: $60,500
Freight: $2,895
Selling Price: $61,200
Term: 36 months
Money Factor: 0.00275 (6.60% APR)
Residual: 56%
KM/yr: 18,000
Province: British Columbia
Wear protection: $42/mo
Monthly (taxed): $948`;

export const SAMPLES: Sample[] = [
  { id: 'bmw-x3',     label: 'BMW X3 (clean)',       text: SAMPLE_BMW_X3 },
  { id: 'honda-crv',  label: 'Honda CR-V (mid)',     text: SAMPLE_HONDA_CRV },
  { id: 'mb-glc',     label: 'MB GLC (marked up)',   text: SAMPLE_MB_GLC },
];
