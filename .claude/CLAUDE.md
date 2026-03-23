# xomware-frontend

> Landing page and command center for the Xomware platform — [xomware.com](https://xomware.com)

## What This Is
Angular SPA serving as the main hub for xomware.com. Includes an animated monster mascot, app directory cards, agent status scene, command center dashboard (issue board, CI monitor, analytics, kanban, PR dashboard), and coming-soon teasers.

## Stack
- Angular 18, TypeScript, SCSS
- GSAP + ScrollTrigger (animations)
- Lottie (agent animations)
- markdown-it (markdown rendering)

## Key Commands
```bash
npm start           # dev server (127.0.0.1:4200)
npm run build:prod  # production build
npm test            # unit tests
```

## Important Paths
```
src/app/
  app.component.*                    # root layout + routing shell
  app.module.ts                      # root module
  components/
    landing/                         # hero, nav, app cards, footer
    monster/                         # animated mascot (CSS keyframes)
    agent-scene/                     # agent blob, status modal
    agent-status/                    # agent status indicator
    command-center/                  # dashboard (auth-gated)
      issue-board/                   # GitHub issues across repos
      ci-monitor/                    # CI/CD status
      kanban/                        # kanban board
      analytics-dashboard/           # analytics
      pr-dashboard/                  # PR review dashboard (also top-level)
      releases/                      # release tracking
      pixel-office/                  # pixel art office scene
      activity-log/                  # activity feed
      infra-dashboard/               # infra status
      config-viewer/                 # config viewer
      file-editor/                   # file editor
      auth-gate/                     # command center auth
    coming-soon/                     # coming-soon cards + caution tape
    pr-dashboard/                    # standalone PR dashboard
  services/                          # data services
  guards/                            # route guards
  models/                            # TypeScript interfaces
  pipes/                             # Angular pipes
```

## Project Config
```yaml
pm_tool: none
base_branch: master
test_commands:
  - npm test
build_commands:
  - npm run build:prod
```

## Constraints
- Auto-deploys on push to master via GitHub Actions → S3 + CloudFront (invalidates `/`, `/index.html`, `/status/board`, `/command`)
- Keep monster animation CSS performant — avoid layout thrashing
- GSAP ScrollTrigger animations must clean up on destroy to prevent memory leaks

## Lessons
