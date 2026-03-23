---
paths:
  - "src/**"
  - "*.ts"
  - "*.html"
  - "*.scss"
---
# Frontend Rules — Angular 18

- NgModules architecture (not standalone components) — follow existing patterns
- Components in `src/app/components/` grouped by feature
- Services in `src/app/services/`, models in `src/app/models/`
- SCSS for styling — no inline styles, use component-scoped stylesheets
- No `any` types — TypeScript strict
- Clean up GSAP animations and subscriptions in `ngOnDestroy`
- Lazy-load routes where possible
- All interactive states: default, hover, focus, active, disabled, loading, error, empty
- Accessibility: semantic HTML, visible focus rings, keyboard nav
- Run `npm test` after changes
