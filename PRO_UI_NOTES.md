# HealthLens — Pro UI update

This version keeps the full-stack functionality and changes the report-analysis experience around the project's core UX requirement:

1. Explain the medical terminology in plain, everyday language first.
2. Show the user's reported value and the reference range.
3. Clearly highlight values outside the supplied reference range.
4. Provide general nutrition and wellness information.
5. Explain when the user should consider discussing a result with a healthcare professional.
6. Keep report history and trends for tracking changes over time.

## Visual direction

- Deep navy/near-black background rather than flat black.
- Teal/cyan as the primary HealthLens accent.
- Soft violet as a secondary accent for guidance/education sections.
- Green is reserved for within-range status.
- Amber is reserved for below/above reference-range attention states.
- High-contrast off-white typography and muted blue-gray secondary text.
- Rounded panels, subtle borders, restrained glow, and generous spacing.
- Responsive two-column result cards that become one column on small screens.
- A detailed result sheet opens when a result is selected.

## Important UX change

The report page no longer treats the numeric result as the first thing the user needs to understand. Each result card begins with:

`MEDICAL TERM` → `What is <term>?` → plain-language explanation → reported value/reference range → status → full explanation.

The detailed view contains:

- What is this term?
- Your reported result
- Reference range
- Context for the result
- Why is it measured?
- General nutrition & wellness
- When to discuss it with a healthcare professional
- Educational-use disclaimer
