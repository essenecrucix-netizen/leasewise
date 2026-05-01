// LeaseWise Canada — sample data (April 2026)
// Real Canadian MSRPs, real dealer names, plausible captive lender programs.
// All data is illustrative; for design preview only.

window.LW_DATA = {
  vehicles: [
    {
      id: 'bmw-x3-30i-2026',
      year: 2026, make: 'BMW', model: 'X3', trim: 'xDrive30i',
      msrp: 62400, freight: 2480,
      // BMW Financial Services — April 2026 program (illustrative, plausible)
      programs: [
        { term: 36, rate: 4.99, residual: 0.62, kmYr: 16000 },
        { term: 39, rate: 3.99, residual: 0.59, kmYr: 16000, headline: true },
        { term: 48, rate: 4.49, residual: 0.51, kmYr: 16000 },
      ],
      loyalty: 1500, conquest: 1500,
      daysOnLot: 92,
    },
    {
      id: 'lexus-rx350-2025',
      year: 2025, make: 'Lexus', model: 'RX 350', trim: 'Premium',
      msrp: 64950, freight: 2205,
      programs: [
        { term: 36, rate: 5.49, residual: 0.66, kmYr: 16000 },
        { term: 48, rate: 5.49, residual: 0.55, kmYr: 16000, headline: true },
      ],
      loyalty: 750, conquest: 0,
      daysOnLot: 71,
    },
    {
      id: 'rav4-hybrid-2026',
      year: 2026, make: 'Toyota', model: 'RAV4 Hybrid', trim: 'XLE AWD',
      msrp: 41450, freight: 1930,
      programs: [
        { term: 36, rate: 6.49, residual: 0.64, kmYr: 20000 },
        { term: 48, rate: 6.49, residual: 0.55, kmYr: 20000, headline: true },
        { term: 60, rate: 6.99, residual: 0.45, kmYr: 20000 },
      ],
      loyalty: 0, conquest: 0,
      daysOnLot: 9,
    },
    {
      id: 'mb-glc300-2025',
      year: 2025, make: 'Mercedes-Benz', model: 'GLC 300', trim: '4MATIC',
      msrp: 60500, freight: 2895,
      programs: [
        { term: 36, rate: 5.99, residual: 0.60, kmYr: 18000, headline: true },
        { term: 48, rate: 5.49, residual: 0.50, kmYr: 18000 },
      ],
      loyalty: 1000, conquest: 1500,
      daysOnLot: 124,
    },
    {
      id: 'crv-hybrid-2026',
      year: 2026, make: 'Honda', model: 'CR-V Hybrid', trim: 'Touring',
      msrp: 49100, freight: 1995,
      programs: [
        { term: 36, rate: 4.99, residual: 0.65, kmYr: 20000, headline: true },
        { term: 48, rate: 4.99, residual: 0.55, kmYr: 20000 },
      ],
      loyalty: 500, conquest: 500,
      daysOnLot: 17,
    },
  ],

  // Provincial tax: total combined rate applied on monthly payment / fees per spec.
  // Note: BC luxury surtax > $124,999 modeled as flag.
  provinces: {
    AB: { name: 'Alberta',          gst: 0.05, pst: 0.00, combined: 0.05, label: 'GST 5%' },
    BC: { name: 'British Columbia', gst: 0.05, pst: 0.07, combined: 0.12, label: 'GST 5% + PST 7%', luxuryThreshold: 124999, luxuryRateExtra: 0.05 },
    ON: { name: 'Ontario',          gst: 0.05, pst: 0.08, combined: 0.13, label: 'HST 13%' },
    QC: { name: 'Québec',           gst: 0.05, pst: 0.09975, combined: 0.14975, label: 'GST 5% + QST 9.975%' },
    MB: { name: 'Manitoba',         gst: 0.05, pst: 0.07, combined: 0.12, label: 'GST 5% + PST 7%' },
    SK: { name: 'Saskatchewan',     gst: 0.05, pst: 0.06, combined: 0.11, label: 'GST 5% + PST 6%' },
    NS: { name: 'Nova Scotia',      gst: 0.05, pst: 0.10, combined: 0.15, label: 'HST 15%' },
    NB: { name: 'New Brunswick',    gst: 0.05, pst: 0.10, combined: 0.15, label: 'HST 15%' },
    NL: { name: 'Newfoundland & Labrador', gst: 0.05, pst: 0.10, combined: 0.15, label: 'HST 15%' },
    PE: { name: 'Prince Edward Island', gst: 0.05, pst: 0.10, combined: 0.15, label: 'HST 15%' },
    YT: { name: 'Yukon',            gst: 0.05, pst: 0.00, combined: 0.05, label: 'GST 5%' },
    NT: { name: 'Northwest Territories', gst: 0.05, pst: 0.00, combined: 0.05, label: 'GST 5%' },
    NU: { name: 'Nunavut',          gst: 0.05, pst: 0.00, combined: 0.05, label: 'GST 5%' },
  },

  // Recent community deals — populates the homepage ticker
  recentDeals: [
    { id: 1, vehicle: '2026 BMW X3 xDrive30i', province: 'AB',     payment: 692, term: 39, rate: 3.99, percentile: 84, grade: 'A', when: '12 min ago', dealer: 'Bavaria BMW · Edmonton' },
    { id: 2, vehicle: '2025 Lexus RX 350',     province: 'ON',     payment: 798, term: 48, rate: 5.49, percentile: 61, grade: 'B', when: '34 min ago', dealer: 'Lexus on the Park · Toronto' },
    { id: 3, vehicle: '2026 Toyota RAV4 Hybrid XLE', province: 'BC', payment: 528, term: 48, rate: 6.49, percentile: 42, grade: 'C', when: '1 hr ago',  dealer: 'OpenRoad Toyota · Richmond' },
    { id: 4, vehicle: '2025 MB GLC 300 4MATIC', province: 'QC',    payment: 824, term: 36, rate: 5.99, percentile: 72, grade: 'B', when: '2 hr ago',   dealer: 'Mercedes-Benz Laval' },
    { id: 5, vehicle: '2026 Honda CR-V Hybrid Touring', province: 'ON', payment: 568, term: 36, rate: 4.99, percentile: 89, grade: 'A', when: '3 hr ago', dealer: 'Bayview Honda · Toronto' },
    { id: 6, vehicle: '2026 BMW X3 xDrive30i', province: 'BC',     payment: 768, term: 39, rate: 3.99, percentile: 31, grade: 'D', when: '5 hr ago',   dealer: 'Brian Jessel BMW · Vancouver' },
    { id: 7, vehicle: '2025 MB GLC 300 4MATIC', province: 'AB',    payment: 752, term: 36, rate: 5.99, percentile: 88, grade: 'A', when: '6 hr ago',   dealer: 'Mercedes-Benz Calgary' },
    { id: 8, vehicle: '2026 Toyota RAV4 Hybrid XLE', province: 'ON', payment: 512, term: 48, rate: 6.49, percentile: 76, grade: 'B', when: '8 hr ago', dealer: 'Bayview Toyota · Toronto' },
  ],

  // Live floorplan tracking — illustrative single VIN highlighted
  floorplan: {
    vin: 'WBA53AV0XPCM12847',
    vehicle: '2025 Mercedes-Benz GLC 300 4MATIC',
    dealer: 'Mercedes-Benz Vancouver',
    daysOnLot: 124,
    capCost: 60500,
    floorplanRate: 0.0697, // prime + ~2 — illustrative
    // perDay = capCost * floorplanRate / 365
    // accrued = perDay * daysOnLot
  },

  // Forum thread highlights
  threads: [
    { id: 't1', title: 'GLC 300 in Mississauga — dealer offering 4.99%, is there better?', cat: 'Mercedes-Benz', province: 'ON', replies: 23, views: 1402, last: '8 min ago', op: 'lease_curious_416' },
    { id: 't2', title: 'X3 30i Edmonton: 3.99/39 + $1500 loyalty — pulled the trigger', cat: 'BMW', province: 'AB', replies: 41, views: 2287, last: '1 hr ago', op: 'yegLeaser', solved: true },
    { id: 't3', title: 'Quebec QST + GST on cap reduction — can someone sanity check this math?', cat: 'Québec', province: 'QC', replies: 18, views: 904, last: '2 hr ago', op: 'mtl_2026' },
    { id: 't4', title: 'RAV4 Hybrid wait times in BC — anyone seen movement?', cat: 'Toyota', province: 'BC', replies: 67, views: 5180, last: '3 hr ago', op: 'vanGreenCar' },
    { id: 't5', title: 'F&I tried to charge $3,200 for "tire & rim" — walked. Did I overreact?', cat: 'F&I office', province: 'ON', replies: 89, views: 8401, last: '4 hr ago', op: 'ottawaDriver' },
  ],

  // Captive program snapshot — homepage table
  programs: [
    { brand: 'BMW',           captive: 'BMW Financial Services',        flagship: 'X3 xDrive30i', term: 39, rate: 3.99, residual: 0.59, change: -50, expires: 'Apr 30' },
    { brand: 'Mercedes-Benz', captive: 'Mercedes-Benz Financial',       flagship: 'GLC 300',      term: 36, rate: 5.99, residual: 0.60, change:   0, expires: 'May 1'  },
    { brand: 'Lexus',         captive: 'Lexus Financial Services',      flagship: 'RX 350',       term: 48, rate: 5.49, residual: 0.55, change: +25, expires: 'Apr 30' },
    { brand: 'Toyota',        captive: 'Toyota Financial Services',     flagship: 'RAV4 Hybrid',  term: 48, rate: 6.49, residual: 0.55, change:   0, expires: 'Apr 30' },
    { brand: 'Honda',         captive: 'Honda Financial Services',      flagship: 'CR-V Hybrid',  term: 36, rate: 4.99, residual: 0.65, change: -25, expires: 'May 1'  },
  ],

  // Data sources transparency strip
  sources: [
    'BMW Canada offers',
    'Mercedes-Benz Canada offers',
    'Lexus Canada incentives',
    'Toyota Canada current offers',
    'Honda Canada lease programs',
    'Statistics Canada — provincial sales tax',
    'Bank of Canada prime rate',
    'Community-submitted deals (verified)',
    'AMVIC, OMVIC, MVSA dealer registries',
  ],
};

// ────────────────────────────────────────────────────────────────────────
// Lease math helpers (Canadian conventions)
// Money factor → APR: APR = MF × 2400; MF = APR / 2400.
// Monthly base = (depreciation / term) + ((cap + residual)/2) × MF
// Then apply provincial tax on monthly payment.
window.LW_MATH = (function () {
  function mfFromApr(apr) { return apr / 2400; }
  function aprFromMf(mf) { return mf * 2400; }

  // capCost: negotiated cap cost (after manufacturer cap-cost reductions and trade equity that reduces cap)
  // residualValue: residual$ = msrp × residualPct
  // term: months, apr: % (e.g., 4.99)
  function basePayment({ capCost, residualValue, apr, term }) {
    const mf = mfFromApr(apr);
    const depreciation = (capCost - residualValue) / term;
    const finance = (capCost + residualValue) * mf;
    return depreciation + finance;
  }

  function leasePayment({
    msrp, freight = 0, capCostReduction = 0,
    discount = 0, // dollar discount off MSRP+freight
    residualPct, apr, term,
    downPayment = 0, tradeEquity = 0,
    incentives = 0, // cap-cost reducing incentives
    province,
  }) {
    const provData = (window.LW_DATA.provinces[province] || window.LW_DATA.provinces.ON);
    const grossCap = msrp + freight;
    const adjCap = grossCap - discount - downPayment - tradeEquity - incentives - capCostReduction;
    const residualBase = msrp; // residual computed on MSRP, Canadian convention
    const residualValue = residualBase * residualPct;
    const base = basePayment({ capCost: adjCap, residualValue, apr, term });

    // BC luxury surtax: simplified — extra ~5% on tax for >$125k vehicles
    let taxRate = provData.combined;
    if (province === 'BC' && msrp > (provData.luxuryThreshold || Infinity)) {
      taxRate += provData.luxuryRateExtra || 0;
    }
    const tax = base * taxRate;
    const monthly = base + tax;
    const totalLease = monthly * term + downPayment;
    const effDiscountPct = (msrp - (adjCap)) / msrp; // crude

    return {
      grossCap, adjCap, residualValue,
      basePayment: base, tax, taxRate, monthly,
      totalLease,
      effDiscountPct,
      mf: mfFromApr(apr),
      provLabel: provData.label,
      provName: provData.name,
    };
  }

  // Inverse: given target monthly, solve for adjCap
  function reverseTargetCap({ targetMonthly, residualPct, apr, term, msrp, province }) {
    const provData = (window.LW_DATA.provinces[province] || window.LW_DATA.provinces.ON);
    let taxRate = provData.combined;
    if (province === 'BC' && msrp > (provData.luxuryThreshold || Infinity)) {
      taxRate += provData.luxuryRateExtra || 0;
    }
    const targetBase = targetMonthly / (1 + taxRate);
    const mf = mfFromApr(apr);
    const residualValue = msrp * residualPct;
    // base = (cap - rv)/n + (cap + rv) * mf
    // base = cap*(1/n + mf) + rv*(mf - 1/n)
    // cap = (base - rv*(mf - 1/n)) / (1/n + mf)
    const a = (1 / term) + mf;
    const b = mf - (1 / term);
    const cap = (targetBase - residualValue * b) / a;
    return cap;
  }

  function fmtCurrency(n, opts = {}) {
    if (n == null || isNaN(n)) return '—';
    const { decimals = 0, sign = false } = opts;
    const abs = Math.abs(n);
    const fmt = abs.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const s = (sign && n > 0 ? '+' : (n < 0 ? '−' : '')) + '$' + fmt;
    return s;
  }
  function fmtPct(n, decimals = 2) {
    if (n == null || isNaN(n)) return '—';
    return n.toFixed(decimals) + '%';
  }

  return { mfFromApr, aprFromMf, basePayment, leasePayment, reverseTargetCap, fmtCurrency, fmtPct };
})();
