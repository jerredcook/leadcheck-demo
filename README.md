# LeadCheck — demo

A plain-language interface for **what public testing has found about lead in everyday products** — spices, pots, dishes, toys, cosmetics, remedies — with a source on every finding.

> **This is a prototype with a demonstration dataset.** Each entry is drawn from the public record (FDA, CPSC, CDC, NYC Health Department, Pure Earth's Rapid Market Screening, and peer-reviewed studies) with its source attached. It is **general information, not medical advice**. If you think a child has been exposed to lead, contact their doctor — a blood lead test is the way to know. In the US, Poison Help is 1-800-222-1222 (free, 24/7).

## Design principles

- **"Not listed" is an unknown, never an all-clear.** Most products have never been tested; absence from a database is not a pass.
- **Every value carries a basis stamp** — total content, leach test, market screening, or recall — and bases are never compared to each other.
- **Category-first**, because product-level coverage is sparse and a bare lookup would falsely reassure.
- **Respect the tradition, target the adulteration** in all copy about remedies and ceremonial cosmetics.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # static build in dist/
```

Deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml` on every push to `main`.
