// Site-root-relative paths (no leading slash). render.js prepends each
// consuming page's own basePath, so these work from any page depth.
window.CATEGORIES = [
  { key: 'individual-income-tax', label: 'Individual Income Tax' },
  { key: 'property-transactions', label: 'Property Transactions' },
  { key: 'corporate-tax', label: 'Corporate Tax' },
  { key: 'pass-through-entities', label: 'Pass-Through Entities' },
  { key: 'trusts-estates', label: 'Trusts & Estates' },
  { key: 'payroll-state-local', label: 'Payroll & State/Local' },
  { key: 'general', label: 'General' }
];

window.TOOLS = [
  {
    slug: 'tax-bracket-ledger',
    title: 'Income Tax Ledger',
    description: 'Explore progressive bracket mechanics for 2025 single filers with a per-bracket tax breakdown, effective rate, and curve tracing.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/tax-bracket-ledger/index.html',
    order: 1,
    featured: true,
    // Optional. Shown as the key-facts table in the homepage spotlight.
    facts: [
      { label: 'Tax year', value: '2025' },
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Filing status', value: 'Single' },
      { label: 'Brackets', value: '7' }
    ]
  },
  {
    slug: 'payroll-tax-split-viewer',
    title: 'Payroll Tax Split Viewer',
    description: 'Planned simulator for employee and employer payroll contributions across wage levels.',
    category: 'payroll-state-local',
    status: 'planned',
    url: null,
    order: 2,
    featured: true
  },
  {
    slug: 'state-comparison-atlas',
    title: 'State Comparison Atlas',
    description: 'Planned side-by-side analysis of state-level income tax systems and rate structures.',
    category: 'payroll-state-local',
    status: 'planned',
    url: null,
    order: 3,
    featured: true
  },
  {
    slug: 'social-security-inclusion',
    title: 'Social Security Benefit Inclusion',
    description: 'See how much of a Social Security benefit becomes taxable as other income rises — the two thresholds, the 50% and 85% zones, and the ceiling that caps it.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/social-security-inclusion/index.html',
    order: 4,
    featured: true,
    facts: [
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Filing status', value: 'Joint / Single' },
      { label: 'Inclusion zones', value: '3' },
      { label: 'Ceiling', value: '85% of benefit' }
    ]
  },
  {
    slug: 'tax-benefit-rule',
    title: 'The Tax Benefit Rule',
    description: 'See when a state tax refund is taxable — and how three limits in sequence decide how much of it you actually include in income.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/tax-benefit-rule/index.html',
    order: 5,
    featured: true,
    facts: [
      { label: 'Authority', value: 'IRC §111' },
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Limits', value: '3, in sequence' },
      { label: 'Model', value: 'Date-neutral' }
    ]
  },
  {
    slug: 'annuity-exclusion-ratio',
    title: 'Annuity Payments and the Exclusion Ratio',
    description: 'See how each annuity payment splits into tax-free return of your own investment and taxable income — and why the payments turn fully taxable partway through.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/annuity-exclusion-ratio/index.html',
    order: 6,
    featured: true,
    facts: [
      { label: 'Authority', value: 'IRC §72(b)' },
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Splits', value: 'Fixed exclusion ratio' },
      { label: 'Model', value: 'Date-neutral' }
    ]
  }
];
