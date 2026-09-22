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
    featured: true
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
  }
];
