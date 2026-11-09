/*
 * SAMPLE starter data so the app is not empty on first open.
 * These numbers are PLACEHOLDERS, not real policy. Replace them with your
 * actual rate card / policy (edit in the app, or import a CSV / backup file),
 * or delete them from More → Delete sample data.
 */
const SEED = {
  products: [
    { id: 's-pl', sample: true, name: 'Personal Loan', category: 'Unsecured', rate: '14% – 24% p.a.', pf: 'Up to 3% + GST', doc: '₹ 500 + GST', other: 'Stamp duty as per state. Bounce charge ₹ 750 per instance.', amount: '₹ 50,000 – ₹ 15 lakh', tenure: '12 – 60 months', eligibility: 'Salaried, age 21–58, min net salary ₹ 20,000, CIBIL 700+.', notes: 'Foreclosure allowed after 12 EMIs, 4% of principal outstanding.', keywords: 'pl salaried unsecured cibil 700 foreclosure' },
    { id: 's-bl', sample: true, name: 'Business Loan', category: 'Unsecured', rate: '16% – 26% p.a.', pf: 'Up to 3% + GST', doc: '₹ 1,000 + GST', other: 'Bounce ₹ 750. Penal 2% p.m. on overdue.', amount: '₹ 1 lakh – ₹ 50 lakh', tenure: '12 – 48 months', eligibility: 'Self-employed, 3 yrs business vintage, ITR 2 yrs, ABB as per policy.', notes: 'GST registration / Udyam needed.', keywords: 'bl seb msme itr vintage gst udyam' },
    { id: 's-lap', sample: true, name: 'Loan Against Property', category: 'Secured – Mortgage', rate: '10.5% – 15% p.a.', pf: 'Up to 2% + GST', doc: '₹ 2,500 + GST', other: 'Legal & technical valuation charges at actuals.', amount: '₹ 5 lakh – ₹ 5 crore', tenure: 'Up to 180 months', eligibility: 'Residential / commercial property, clear title.', notes: 'LTV depends on property type – see LTV grid.', keywords: 'lap mortgage property residential commercial title' },
    { id: 's-gl', sample: true, name: 'Gold Loan', category: 'Secured – Gold', rate: '9.9% – 24% p.a.', pf: '0.5% + GST', doc: 'Nil', other: 'Valuation charges as applicable.', amount: '₹ 10,000 onwards', tenure: '3 – 12 months', eligibility: 'KYC + gold ornaments 18–22 carat.', notes: 'Max LTV 75% as per RBI.', keywords: 'gl gold ornaments carat jewellery' },
    { id: 's-tw', sample: true, name: 'Two Wheeler Loan', category: 'Secured – Vehicle', rate: '12% – 22% p.a.', pf: '₹ 1,500 – 3% + GST', doc: '₹ 500 + GST', other: 'Hypothecation in RTO.', amount: 'Up to 95% of on-road price', tenure: '12 – 48 months', eligibility: 'Age 18–65, KYC, address proof.', notes: 'LTV depends on CIBIL & tenure – see LTV grid.', keywords: 'tw 2w bike scooter ev new vehicle' },
    { id: 's-uc', sample: true, name: 'Used Car Loan', category: 'Secured – Vehicle', rate: '13% – 20% p.a.', pf: 'Up to 2.5% + GST', doc: '₹ 1,000 + GST', other: 'Valuation ₹ 1,000. RC transfer mandatory.', amount: '₹ 1 lakh – ₹ 25 lakh', tenure: '12 – 60 months', eligibility: 'Vehicle age + tenure ≤ 10 years.', notes: 'LTV on valuation by vehicle age – see LTV grid.', keywords: 'used car ucv refinance valuation rc' },
    { id: 's-cv', sample: true, name: 'Commercial Vehicle Loan', category: 'Secured – Vehicle', rate: '13% – 21% p.a.', pf: 'Up to 2% + GST', doc: '₹ 1,500 + GST', other: 'Insurance with HP endorsement.', amount: 'As per vehicle', tenure: '12 – 60 months', eligibility: 'FTU / existing fleet operators. Route & income check.', notes: 'First time user (FTU) gets lower LTV.', keywords: 'cv truck lcv hcv tipper ftu fleet' },
    { id: 's-cd', sample: true, name: 'Consumer Durable Loan', category: 'Unsecured', rate: '0% (subvention) – 24%', pf: '₹ 199 – ₹ 999 + GST', doc: 'Nil', other: 'Down payment as per scheme.', amount: '₹ 5,000 – ₹ 2 lakh', tenure: '3 – 24 months', eligibility: 'KYC + bank account / NACH.', notes: 'Scheme-wise subvention from dealer.', keywords: 'cd mobile tv fridge ac laptop zero emi' },
  ],
  grids: [
    {
      id: 's-g1', sample: true, name: 'Two Wheeler – LTV by CIBIL & Tenure', productId: 's-tw',
      rowLabel: 'CIBIL score', colLabel: 'Tenure (months)', unit: '%',
      cols: ['12', '18', '24', '36', '48'],
      rows: [
        { label: '750+', cells: ['95', '95', '92', '90', '85'] },
        { label: '700 – 749', cells: ['92', '90', '88', '85', '80'] },
        { label: '650 – 699', cells: ['85', '85', '80', '75', '70'] },
        { label: 'NTC / -1', cells: ['80', '80', '75', '70', '—'] },
        { label: '< 650', cells: ['—', '—', '—', '—', '—'] },
      ],
      notes: 'SAMPLE. “—” = not allowed.'
    },
    {
      id: 's-g2', sample: true, name: 'Used Car – LTV by Vehicle Age & Tenure', productId: 's-uc',
      rowLabel: 'Vehicle age', colLabel: 'Tenure (months)', unit: '%',
      cols: ['12', '24', '36', '48', '60'],
      rows: [
        { label: '0 – 3 yrs', cells: ['90', '90', '85', '85', '80'] },
        { label: '3 – 5 yrs', cells: ['85', '85', '80', '75', '70'] },
        { label: '5 – 7 yrs', cells: ['80', '75', '70', '65', '—'] },
        { label: '7 – 10 yrs', cells: ['70', '65', '60', '—', '—'] },
      ],
      notes: 'SAMPLE. Vehicle age + tenure must not exceed 10 years.'
    },
    {
      id: 's-g3', sample: true, name: 'LAP – LTV by Property Type', productId: 's-lap',
      rowLabel: 'Property type', colLabel: 'Loan amount', unit: '%',
      cols: ['≤ 50 L', '50 L – 1 Cr', '> 1 Cr'],
      rows: [
        { label: 'Residential – self occupied', cells: ['70', '65', '60'] },
        { label: 'Residential – rented', cells: ['65', '60', '55'] },
        { label: 'Commercial', cells: ['60', '55', '50'] },
        { label: 'Industrial', cells: ['50', '45', '40'] },
      ],
      notes: 'SAMPLE.'
    },
  ],
  rules: [
    { id: 's-r1', sample: true, title: 'Customer has low CIBIL (below 650)', keywords: 'low cibil score below 650 poor bureau reject', solution: 'SAMPLE: Not eligible for unsecured (PL / BL). For two wheeler, check LTV grid row “< 650” – not allowed. Suggest Gold Loan (no bureau cut-off) or co-applicant with good CIBIL.', productId: '' },
    { id: 's-r2', sample: true, title: 'New to credit (NTC) customer', keywords: 'ntc new to credit no cibil -1 first time', solution: 'SAMPLE: Two wheeler allowed with lower LTV (see grid row “NTC / -1”). Consumer durable allowed with NACH. PL not allowed.', productId: 's-tw' },
    { id: 's-r3', sample: true, title: 'Customer wants to foreclose loan', keywords: 'foreclosure preclosure close loan early prepayment charges', solution: 'SAMPLE: PL – allowed after 12 EMIs, 4% of POS + GST. Check product page “Notes” for each product.', productId: 's-pl' },
    { id: 's-r4', sample: true, title: 'Self-employed without ITR', keywords: 'self employed no itr income proof cash salary banking', solution: 'SAMPLE: Business Loan needs ITR 2 yrs. Consider secured products (LAP, Gold Loan, vehicle) with surrogate income programs as per policy.', productId: 's-bl' },
  ],
};

/*
 * SAMPLE vehicle schemes (age bands) and vehicle models.
 * Age = current year − manufacturing year.
 * valuePct = vehicle value as % of new price for age 0,1,2,… (used when a model has no year-wise value).
 * Prices are PLACEHOLDERS – replace with your valuation master.
 */
SEED.schemes = [
  {
    id: 's-sc-car', sample: true, name: 'Car', productId: 's-uc', maxAge: 10,
    valuePct: '90,80,70,62,55,48,42,36,31,27,23',
    bands: [
      { from: 0, to: 3, ltv: 90, roi: 13, tenure: 60, maxLoan: '' },
      { from: 4, to: 5, ltv: 85, roi: 14, tenure: 60, maxLoan: '' },
      { from: 6, to: 7, ltv: 75, roi: 15.5, tenure: 48, maxLoan: '' },
      { from: 8, to: 10, ltv: 65, roi: 17, tenure: 36, maxLoan: '' },
    ],
    notes: 'SAMPLE. Vehicle age at loan maturity must not exceed 10 years.'
  },
  {
    id: 's-sc-tw', sample: true, name: 'Two Wheeler', productId: 's-tw', maxAge: 8,
    valuePct: '95,80,70,60,50,42,35,30,25',
    bands: [
      { from: 0, to: 0, ltv: 95, roi: 12, tenure: 48, maxLoan: '' },
      { from: 1, to: 3, ltv: 80, roi: 16, tenure: 36, maxLoan: '' },
      { from: 4, to: 6, ltv: 70, roi: 20, tenure: 24, maxLoan: '' },
    ],
    notes: 'SAMPLE.'
  },
  {
    id: 's-sc-cv', sample: true, name: 'Commercial Vehicle', productId: 's-cv', maxAge: 15,
    valuePct: '90,80,70,62,55,48,42,37,33,29,26,23,20',
    bands: [
      { from: 0, to: 0, ltv: 90, roi: 13, tenure: 60, maxLoan: '' },
      { from: 1, to: 5, ltv: 80, roi: 15, tenure: 48, maxLoan: '' },
      { from: 6, to: 10, ltv: 70, roi: 17, tenure: 36, maxLoan: '' },
      { from: 11, to: 12, ltv: 60, roi: 19, tenure: 24, maxLoan: '' },
    ],
    notes: 'SAMPLE.'
  },
];
SEED.vehicles = [
  { id: 's-v1', sample: true, name: 'Maruti Suzuki Swift VXi', scheme: 'Car', price: '700000', yearValues: '2024=560000, 2022=470000', keywords: 'swift hatchback' },
  { id: 's-v2', sample: true, name: 'Hyundai Creta SX', scheme: 'Car', price: '1500000', yearValues: '', keywords: 'creta suv' },
  { id: 's-v3', sample: true, name: 'Honda Activa 6G', scheme: 'Two Wheeler', price: '85000', yearValues: '', keywords: 'activa scooter' },
  { id: 's-v4', sample: true, name: 'Hero Splendor Plus', scheme: 'Two Wheeler', price: '80000', yearValues: '', keywords: 'splendor bike' },
  { id: 's-v5', sample: true, name: 'Tata Ace Gold', scheme: 'Commercial Vehicle', price: '600000', yearValues: '', keywords: 'ace chota hathi scv' },
  { id: 's-v6', sample: true, name: 'Mahindra Bolero Pik-Up', scheme: 'Commercial Vehicle', price: '950000', yearValues: '', keywords: 'bolero pickup pik up' },
];
