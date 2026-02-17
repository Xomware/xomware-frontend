# Xomware

Landing page and hub for the Xomware platform at [xomware.com](https://xomware.com).

## Xomware Ecosystem

| App | URL | Frontend | Backend | Infrastructure |
|-----|-----|----------|---------|----------------|
| **Xomware** (Hub) | [xomware.com](https://xomware.com) | **this repo** | - | [xomware-infrastructure](https://github.com/domgiordano/xomware-infrastructure) |
| **Xomify** | [xomify.xomware.com](https://xomify.xomware.com) | [xomify-frontend](https://github.com/domgiordano/xomify-frontend) | [xomify-backend](https://github.com/domgiordano/xomify-backend) | [xomify-infrastructure](https://github.com/domgiordano/xomify-infrastructure) |
| **Xomcloud** | [xomcloud.xomware.com](https://xomcloud.xomware.com) | [xomcloud-frontend](https://github.com/domgiordano/xomcloud-frontend) | [xomcloud-backend](https://github.com/domgiordano/xomcloud-backend) | [xomcloud-infrastructure](https://github.com/domgiordano/xomcloud-infrastructure) |
| **Xomper** | [xomper.xomware.com](https://xomper.xomware.com) | [xomper-front-end](https://github.com/domgiordano/xomper-front-end) | [xomper-back-end](https://github.com/domgiordano/xomper-back-end) | [xomper-infrastructure](https://github.com/domgiordano/xomper-infrastructure) |

## Overview

Dark-themed landing page with animated mascot monster that reacts to hovering over app cards. Built with Angular 16 to match the rest of the Xomware stack.

### Features

- Painted brush-stroke X logo with cyan branding
- Animated monster mascot with context-aware states:
  - **Idle** - breathes, blinks, looks around
  - **Sleep** - eyes close, Z's float up after 10s of no interaction
  - **Headphones** - bobs head to music (xomify hover)
  - **DJ** - scratches turntables (xomcloud hover)
  - **Football** - runs with helmet on (xomper hover)
- App cards with per-brand color accents (purple, orange, emerald)
- Responsive layout (3-column desktop, stacked mobile)
- GitHub profile link

## Tech Stack

- **Framework:** Angular 16
- **Styling:** SCSS with design system variables
- **Animations:** CSS keyframes on inline SVG
- **Hosting:** S3 + CloudFront
- **CI/CD:** GitHub Actions (auto-deploy on push to `master`)

## Getting Started

```bash
npm install
npm start
# Open http://127.0.0.1:4200
```

## Build

```bash
npm run build:prod
```

Output goes to `dist/xomware/` for S3 deployment.

## Deployment

Pushes to `master` trigger the GitHub Actions workflow which:

1. Builds the Angular app in production mode
2. Syncs the build output to `s3://xomware.com`
3. Sets `index.html` as non-cacheable
4. Invalidates CloudFront cache

Manual deploys can be triggered via `workflow_dispatch`.

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |

## Project Structure

```
src/app/
  app.component.*         # Landing page layout, card hover logic
  components/
    monster/              # SVG monster with animation states
```

## Design System

| Token | Color |
|-------|-------|
| Brand Cyan | `#00b4d8` |
| Xomify Purple | `#9c0abf` |
| Xomcloud Orange | `#ff6b35` |
| Xomper Emerald | `#00ffab` |
| Background | `#0a0a14` |
