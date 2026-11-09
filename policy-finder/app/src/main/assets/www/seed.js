/*
 * SAMPLE starter data – Car & Commercial Vehicle loans only.
 * All numbers are PLACEHOLDERS, not real policy. Replace them with your actual
 * rate card / policy (edit in the app, paste from Excel, or import a backup),
 * or remove them with More → Delete sample data.
 */
const SEED = {
  products: [
    {
      id: 's-nc', sample: true, name: 'New Car Loan', category: 'Car',
      rate: '8.5% – 12% p.a.', pf: 'Up to 1% + GST', doc: '₹ 1,000 + GST',
      other: 'Stamp duty as per state. Bounce ₹ 750 per instance. Foreclosure 4% of POS after 6 EMIs.',
      amount: 'Up to 90% of on-road price', tenure: '12 – 84 months',
      eligibility: 'Salaried / self-employed, age 21–65, CIBIL 700+, income proof (salary slips / ITR).',
      notes: 'LTV on on-road price as per LTV grid (CIBIL × tenure).',
      keywords: 'nc newcar new car hatchback sedan suv showroom dealer'
    },
    {
      id: 's-uc', sample: true, name: 'Used Car Loan', category: 'Car',
      rate: '12% – 18% p.a.', pf: 'Up to 2.5% + GST', doc: '₹ 1,000 + GST',
      other: 'Valuation ₹ 1,000. RC transfer in applicant name mandatory. Bounce ₹ 750.',
      amount: '₹ 1 lakh – ₹ 25 lakh', tenure: '12 – 60 months',
      eligibility: 'Age 21–65, CIBIL 680+. Vehicle age + tenure must not exceed 10 years.',
      notes: 'LTV on valuation by vehicle age – see LTV grid and Car scheme.',
      keywords: 'uc usedcar used car preowned secondhand refinance valuation rc'
    },
    {
      id: 's-ncv', sample: true, name: 'New Commercial Vehicle Loan', category: 'Commercial Vehicle',
      rate: '10% – 15% p.a.', pf: 'Up to 1.5% + GST', doc: '₹ 1,500 + GST',
      other: 'Insurance with HP endorsement. Permit and fitness as applicable. Bounce ₹ 1,000.',
      amount: 'Up to 90% of chassis + body cost', tenure: '12 – 60 months',
      eligibility: 'Fleet owners, first time users (FTU) and captive users. Property proof of applicant or guarantor.',
      notes: 'FTU: lower LTV and guarantor with own property needed.',
      keywords: 'ncv cv new truck tipper lcv icv hcv scv pickup bus ftu fleet captive'
    },
    {
      id: 's-ucv', sample: true, name: 'Used Commercial Vehicle Loan', category: 'Commercial Vehicle',
      rate: '14% – 22% p.a.', pf: 'Up to 2.5% + GST', doc: '₹ 1,500 + GST',
      other: 'Valuation ₹ 1,500. RC, permit, fitness and insurance mandatory.',
      amount: 'As per valuation', tenure: '12 – 48 months',
      eligibility: 'Vehicle age + tenure must not exceed 15 years. Existing fleet owner preferred.',
      notes: 'LTV on valuation by vehicle age – see LTV grid and CV scheme.',
      keywords: 'ucv cv used truck tipper lcv hcv pickup refinance valuation rc permit fitness'
    },
  ],
  grids: [
    {
      id: 's-g-nc', sample: true, name: 'New Car – LTV by CIBIL & Tenure', productId: 's-nc',
      rowLabel: 'CIBIL score', colLabel: 'Tenure (months)', unit: '%',
      cols: ['36', '48', '60', '72', '84'],
      rows: [
        { label: '750+', cells: ['90', '90', '90', '85', '85'] },
        { label: '700 – 749', cells: ['90', '85', '85', '80', '75'] },
        { label: '650 – 699', cells: ['80', '80', '75', '70', '—'] },
        { label: '< 650', cells: ['—', '—', '—', '—', '—'] },
      ],
      notes: 'SAMPLE. LTV on on-road price. “—” = not allowed.'
    },
    {
      id: 's-g-uc', sample: true, name: 'Used Car – LTV by Vehicle Age & Tenure', productId: 's-uc',
      rowLabel: 'Vehicle age', colLabel: 'Tenure (months)', unit: '%',
      cols: ['12', '24', '36', '48', '60'],
      rows: [
        { label: '1 – 3 yrs', cells: ['85', '85', '85', '80', '80'] },
        { label: '4 – 5 yrs', cells: ['80', '80', '80', '75', '70'] },
        { label: '6 – 7 yrs', cells: ['70', '70', '70', '65', '—'] },
        { label: '8 – 10 yrs', cells: ['60', '60', '—', '—', '—'] },
      ],
      notes: 'SAMPLE. LTV on valuation. Vehicle age + tenure ≤ 10 years.'
    },
    {
      id: 's-g-ncv', sample: true, name: 'New CV – LTV by Customer Type & Tenure', productId: 's-ncv',
      rowLabel: 'Customer type', colLabel: 'Tenure (months)', unit: '%',
      cols: ['24', '36', '48', '60'],
      rows: [
        { label: 'Fleet owner (5+ vehicles)', cells: ['90', '90', '90', '85'] },
        { label: 'Small fleet (1 – 4 vehicles)', cells: ['90', '85', '85', '80'] },
        { label: 'Captive user', cells: ['85', '85', '80', '75'] },
        { label: 'FTU with guarantor', cells: ['80', '75', '75', '—'] },
      ],
      notes: 'SAMPLE. LTV on chassis + body cost.'
    },
    {
      id: 's-g-ucv', sample: true, name: 'Used CV – LTV by Vehicle Age & Tenure', productId: 's-ucv',
      rowLabel: 'Vehicle age', colLabel: 'Tenure (months)', unit: '%',
      cols: ['12', '24', '36', '48'],
      rows: [
        { label: '1 – 3 yrs', cells: ['80', '80', '80', '75'] },
        { label: '4 – 6 yrs', cells: ['75', '75', '70', '65'] },
        { label: '7 – 10 yrs', cells: ['70', '65', '60', '—'] },
        { label: '11 – 12 yrs', cells: ['60', '55', '—', '—'] },
      ],
      notes: 'SAMPLE. LTV on valuation. Vehicle age + tenure ≤ 15 years.'
    },
  ],
  rules: [
    { id: 's-r-cv-prop', sample: true, decision: 'NO', title: 'CV loan without property proof', keywords: 'truck tipper commercial vehicle own house residence ownership', solution: 'SAMPLE: Property proof of applicant or guarantor is mandatory for all CV cases (new and used).', ref: 'Sample CV policy', productId: 's-ncv' },
    { id: 's-r-cv-ftu', sample: true, decision: 'COND', title: 'First time user (FTU) for CV', keywords: 'ftu first time user new transporter no experience', solution: 'SAMPLE: Allowed at lower LTV (see New CV grid “FTU with guarantor”) with a guarantor who has own property.', ref: 'Sample CV policy', productId: 's-ncv' },
    { id: 's-r-uc-rc', sample: true, decision: 'NO', title: 'Used car loan without RC', keywords: 'registration certificate rc book rc copy', solution: 'SAMPLE: Original RC is mandatory; RC transfer in applicant name before disbursal.', ref: 'Sample used car policy', productId: 's-uc' },
    { id: 's-r-ucv-permit', sample: true, decision: 'NO', title: 'Used CV without permit or fitness', keywords: 'permit fitness certificate expired', solution: 'SAMPLE: Valid permit and fitness are mandatory for used CV funding.', ref: 'Sample used CV policy', productId: 's-ucv' },
    { id: 's-r-car-cibil', sample: true, decision: '', title: 'Car loan customer with low CIBIL (below 650)', keywords: 'low cibil score below 650 poor bureau', solution: 'SAMPLE: New car – “< 650” row not allowed in LTV grid. Consider co-applicant with good CIBIL.', ref: '', productId: 's-nc' },
  ],
};

/*
 * SAMPLE vehicle schemes. Age = current year − manufacturing year.
 * Age 0 = NEW vehicle (new car / new CV product); older = USED product.
 * valuePct = vehicle value as % of new price for age 0,1,2,… (used when a model has no year-wise value).
 */
SEED.schemes = [
  {
    id: 's-sc-car', sample: true, name: 'Car', productId: 's-uc', maxAge: 10,
    valuePct: '100,80,70,62,55,48,42,36,31,27,23',
    bands: [
      { from: 0, to: 0, ltv: 90, roi: 9, tenure: 84, maxLoan: '', productId: 's-nc' },
      { from: 1, to: 3, ltv: 85, roi: 13, tenure: 60, maxLoan: '', productId: 's-uc' },
      { from: 4, to: 5, ltv: 80, roi: 14, tenure: 60, maxLoan: '', productId: 's-uc' },
      { from: 6, to: 7, ltv: 70, roi: 15.5, tenure: 48, maxLoan: '', productId: 's-uc' },
      { from: 8, to: 10, ltv: 60, roi: 17, tenure: 36, maxLoan: '', productId: 's-uc' },
    ],
    notes: 'SAMPLE. Vehicle age at loan maturity must not exceed 10 years.'
  },
  {
    id: 's-sc-cv', sample: true, name: 'Commercial Vehicle', productId: 's-ucv', maxAge: 15,
    valuePct: '100,80,70,62,55,48,42,37,33,29,26,23,20',
    bands: [
      { from: 0, to: 0, ltv: 90, roi: 11, tenure: 60, maxLoan: '', productId: 's-ncv' },
      { from: 1, to: 5, ltv: 80, roi: 15, tenure: 48, maxLoan: '', productId: 's-ucv' },
      { from: 6, to: 10, ltv: 70, roi: 17, tenure: 36, maxLoan: '', productId: 's-ucv' },
      { from: 11, to: 12, ltv: 60, roi: 19, tenure: 24, maxLoan: '', productId: 's-ucv' },
    ],
    notes: 'SAMPLE. Vehicle age at loan maturity must not exceed 15 years.'
  },
];
SEED.vehicles = [
  { id: 's-v1', sample: true, name: 'Maruti Suzuki Swift VXi', scheme: 'Car', price: '700000', yearValues: '2024=560000, 2022=470000', keywords: 'swift hatchback' },
  { id: 's-v2', sample: true, name: 'Hyundai Creta SX', scheme: 'Car', price: '1500000', yearValues: '', keywords: 'creta suv' },
  { id: 's-v3', sample: true, name: 'Tata Nexon XZ', scheme: 'Car', price: '1100000', yearValues: '', keywords: 'nexon suv' },
  { id: 's-v4', sample: true, name: 'Mahindra Scorpio-N Z4', scheme: 'Car', price: '1450000', yearValues: '', keywords: 'scorpio suv' },
  { id: 's-v5', sample: true, name: 'Toyota Innova Crysta GX', scheme: 'Car', price: '2000000', yearValues: '', keywords: 'innova crysta mpv' },
  { id: 's-v6', sample: true, name: 'Tata Ace Gold', scheme: 'Commercial Vehicle', price: '600000', yearValues: '', keywords: 'ace chota hathi scv' },
  { id: 's-v7', sample: true, name: 'Mahindra Bolero Pik-Up', scheme: 'Commercial Vehicle', price: '950000', yearValues: '', keywords: 'bolero pickup pik up' },
  { id: 's-v8', sample: true, name: 'Ashok Leyland Dost+', scheme: 'Commercial Vehicle', price: '850000', yearValues: '', keywords: 'dost lcv' },
  { id: 's-v9', sample: true, name: 'Tata LPT 1109', scheme: 'Commercial Vehicle', price: '2200000', yearValues: '', keywords: '1109 lpt icv truck' },
  { id: 's-v10', sample: true, name: 'Eicher Pro 2049', scheme: 'Commercial Vehicle', price: '1800000', yearValues: '', keywords: '2049 pro icv truck' },
  { id: 's-v11', sample: true, name: 'Tata Signa 2823.K Tipper', scheme: 'Commercial Vehicle', price: '4500000', yearValues: '', keywords: 'signa 2823 tipper hcv' },
];
