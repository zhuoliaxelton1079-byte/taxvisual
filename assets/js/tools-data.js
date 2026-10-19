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
    taxYear: '2025',
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
    taxYear: '2025 / 2026 (reviewed)',
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
    taxYear: 'No year selected - user-supplied amounts',
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
      { label: 'Model', value: 'User-supplied amounts; no year selected' }
    ]
  },
  {
    slug: 'annuity-exclusion-ratio',
    taxYear: 'No year selected - user-supplied life expectancy',
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
      { label: 'Model', value: 'User-supplied amounts; no year selected' }
    ]
  },
  {
    slug: 'charitable-deduction-limits',
    taxYear: '2025 mechanics - not a complete 2026 calculation',
    title: 'Charitable Deduction Limits',
    description: 'See why a charitable deduction is not capped by one percentage — five classes of gift, each with its own ceiling, all drawing on one 50%-of-AGI pool in a fixed order, and what carries forward.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/charitable-deduction-limits/index.html',
    order: 7,
    featured: true,
    facts: [
      { label: 'Authority', value: 'IRC §170(b)' },
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Ceilings', value: '60/50/30/20% of AGI' },
      { label: 'Carryover', value: '5 years' }
    ]
  },
  {
    slug: 'qbi-deduction',
    taxYear: 'No year selected - opens on 2024 worksheet defaults',
    title: 'The QBI Deduction',
    description: 'See what happens to the 20% qualified business income deduction at the taxable-income threshold — a wage-and-property ceiling phasing in for an ordinary business, the income itself phasing out for a service business.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/qbi-deduction/index.html',
    order: 8,
    featured: true,
    facts: [
      { label: 'Authority', value: 'IRC §199A' },
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Limits', value: 'Wage/property, SSTB, 20% of TI' },
      { label: 'Model', value: 'User-supplied amounts; no year selected' }
    ]
  },
  {
    slug: 'comprehensive-tax-calculation',
    taxYear: '2025',
    title: 'Comprehensive Tax Calculation',
    description: 'See why taxable income is stacked rather than pooled — ordinary income fills the brackets from the bottom, each class of capital gain sits on top of it, and every slice pays the lower of its ordinary rate and its own preferential ceiling.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/comprehensive-tax-calculation/index.html',
    order: 9,
    featured: true,
    facts: [
      { label: 'Authority', value: 'IRC §1(h), §1(j)' },
      { label: 'Tax year', value: '2025' },
      { label: 'Filing status', value: 'All four' },
      { label: 'Gain classes', value: '25 / 28 / 0-15-20%' }
    ]
  },
  {
    slug: 'section-121-exclusion',
    taxYear: 'Date-based model - no annual tax table',
    title: 'Home-Sale Exclusion',
    description: 'Walk a home sale through the tests for excluding up to $250,000 ($500,000 joint) of gain — ownership, use, the two-year look-back — and see the reduced exclusion shrink in proportion to the shortest period out of 24 months, with the tree and the chart moving together.',
    category: 'property-transactions',
    status: 'live',
    url: 'tools/section-121-exclusion/index.html',
    order: 10,
    featured: false,
    facts: [
      { label: 'Authority', value: 'IRC §121; Treas. Reg. §1.121-1, -3' },
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Limits', value: '$250,000 / $500,000' },
      { label: 'Model', value: 'Date-based; no annual tax table' }
    ]
  },
  {
    slug: 'retirement-contribution-limits',
    taxYear: '2025 / 2026 (reviewed)',
    title: 'Retirement Contribution Limits',
    description: 'Find the most one taxpayer can put into every plan at once: a 401(k) or 403(b) with a match, a SEP or solo 401(k) for a side business, a governmental 457(b), IRAs and a spousal IRA. Set a target to see the best order to fill them, which cross-plan limit binds and how the plan contributions lower MAGI for the Roth and the IRA deduction.',
    category: 'individual-income-tax',
    status: 'live',
    url: 'tools/retirement-contribution-limits/index.html',
    order: 11,
    featured: false,
    facts: [
      { label: 'Authority', value: 'IRC §§402(g), 404(a)(3), 415(c), 457(e)(15), 219, 408A' },
      { label: 'Jurisdiction', value: 'US federal' },
      { label: 'Accounts', value: '401(k)/403(b), SEP, solo 401(k), 457(b), IRA, Roth IRA, spousal IRA' },
      { label: 'Tax year', value: '2025 / 2026' }
    ]
  }
];
