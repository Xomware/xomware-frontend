# Plan: xomware-claude-setup

**Status**: Ready
**Created**: 2026-03-23
**Last updated**: 2026-03-23

## Summary
Fork the shared `claude-setup` repo into a Xomware-only version at `/Users/dom/Code/xomware-claude-setup`. Strip all ACP/Notion-specific content, rewrite PM integration to use GitHub Projects (XomBoard, project #2), and hardcode Xomware org conventions. The result is a standalone repo that can be pushed to `Xomware/xomware-claude-setup` and used to bootstrap any Xomware project.

## Approach
Copy the existing `claude-setup` repo as a starting point, then surgically remove ACP-specific files and rewrite PM-facing commands/templates. No brainstorm needed — the scope is well-defined and the source material is fully mapped.

## Affected Files / Components

### Files to COPY AS-IS (no changes)

| Source File | Why |
|------------|-----|
| `global/agents/*.md` (all 14 agents) | Universal — no org-specific content |
| `global/commands/brainstorm.md` | Universal |
| `global/commands/catchup.md` | Universal |
| `global/commands/commit.md` | Universal |
| `global/commands/compound.md` | Universal |
| `global/commands/end-session.md` | Universal |
| `global/commands/execute.md` | Universal |
| `global/commands/fix.md` | Universal |
| `global/commands/orchestrate.md` | Universal |
| `global/commands/plan.md` | Universal |
| `global/commands/pr.md` | Universal |
| `global/commands/research.md` | Universal |
| `global/commands/review.md` | Universal |
| `global/commands/setup.md` | Universal |
| `global/commands/status.md` | Universal |
| `global/commands/sync-memory.md` | Universal |
| `global/commands/test.md` | Universal |
| `global/commands/audit-config.md` | Universal |
| `global/hooks/check-runtime.sh` | Universal |
| `global/hooks/guard-bash.js` | Universal |
| `global/hooks/track-changes.js` | Universal |
| `global/hooks/session-end.js` | Universal |
| `global/skills/api-route.md` | Universal |
| `global/skills/backend-standards.md` | Universal |
| `global/skills/frontend-standards.md` | Universal |
| `global/skills/infra-standards.md` | Universal |
| `global/skills/ios-standards.md` | Universal |
| `global/skills/anthropic-api.md` | Universal |
| `global/skills/database.md` | Universal |
| `global/skills/docker-deploy.md` | Universal |
| `global/skills/elixir.md` | Universal |
| `global/skills/env-config.md` | Universal |
| `global/skills/error-handling.md` | Universal |
| `global/skills/logging.md` | Universal |
| `global/skills/mcp.md` | Universal |
| `global/skills/nodejs.md` | Universal |
| `global/skills/phoenix.md` | Universal |
| `global/skills/python.md` | Universal |
| `global/skills/terraform.md` | Universal |
| `global/skills/testing.md` | Universal |
| `global/skills/ts-component.md` | Universal |
| `project-template/.claude/settings.json` | Universal (no Notion refs) |
| `project-template/.claude/memory/session-log.md` | Universal |
| `project-template/.claude/rules/.gitkeep` | Universal |
| `project-template/.claude/rules/backend.md` | Universal |
| `project-template/.claude/rules/frontend.md` | Universal |
| `project-template/.claude/rules/infra.md` | Universal |
| `project-template/.claude/rules/ios.md` | Universal |
| `project-template/docs/architecture.md` | Universal |
| `project-template/docs/reference/*.md` (all 4) | Universal |
| `project-template/docs/workflows/*.md` (all 3) | Universal |
| `.gitignore` | Universal |

### Files to DELETE (not copied)

| Source File | Why |
|------------|-----|
| `global/commands/backlog-notion.md` | Notion-specific |
| `global/commands/update-notion-task.md` | Notion-specific |
| `global/commands/set-org.md` | Multi-org switcher, single org doesn't need it |
| `global/skills/infisical.md` | ACP secrets manager |
| `global/skills/microsoft-graph.md` | ACP Microsoft integration |
| `examples/` directory | Does not exist yet, but ensure nothing is created |

### Files to REWRITE

| File | Change | Why |
|------|--------|-----|
| `global/commands/work-issue.md` | Replace all `pm_tool: notion` branches with `pm_tool: github-projects` using `gh project` CLI | PM integration |
| `global/commands/board.md` | Replace Notion query with `gh api graphql` against XomBoard | PM integration |
| `global/CLAUDE.md` | Rewrite identity to Xomware context, remove Notion Task Discipline section, update "What I'm Building" | Org identity |
| `global/settings.json` | Copy as-is (already clean — no Notion MCP refs) | Verified clean |
| `project-template/.claude/CLAUDE.md` | Update Project Config template: `pm_tool: github-projects` default, add `github_project_number` and `github_project_owner` fields, remove all Notion config comments | PM integration |
| `project-template/.claude/rules/org.md` | Replace skeleton with concrete Xomware org conventions | Single org |
| `project-template/.claude/prompts/ci-triage.md` | Replace Notion MCP references with `gh project` CLI calls for board integration | PM integration |
| `project-template/.github/workflows/claude-issues.yml` | Remove Notion MCP install/config steps, update allowedTools to drop Notion MCP, add `gh project` permissions | PM integration |
| `bin/install-claude-setup` | No changes needed (generic, path-based) | Already clean |
| `bin/init-claude-setup` | No changes needed (generic, template-based) | Already clean |
| `bin/update-claude-setup` | Change default `SCAN_DIR` from `$HOME/dev/arete` to `$HOME/Code` | Xomware project location |
| `bin/claude-setup` | Remove set-org menu option (#4), remove Notion command references from `show_reference()`, update PM section to show GitHub Projects commands | Single org, no Notion |

### Files to ADD NEW

| File | What | Why |
|------|------|-----|
| `project-template/.github/workflows/add-to-board.yml` | Auto-add opened issues to XomBoard | Board automation |
| `global/commands/backlog.md` | Create GitHub issue + add to XomBoard + create branch (replaces `backlog-notion.md`) | GitHub Projects equivalent of backlog-notion |

## Implementation Steps

- [ ] Step 1 — Create `/Users/dom/Code/xomware-claude-setup` directory, `git init`, set up `.gitignore`
- [ ] Step 2 — Copy all as-is files from the table above (agents, universal commands, hooks, skills, project-template files)
- [ ] Step 3 — Rewrite `global/CLAUDE.md`: change identity to "Dominick @ Xomware", update mission/building section for personal projects, remove "Notion Task Discipline" section, replace with "GitHub Projects Discipline" (update board item before marking Done, post completion comments on issues)
- [ ] Step 4 — Rewrite `global/commands/work-issue.md`:
  - Step 1 (Load Context): Remove Notion lookup. Add: check if issue is on XomBoard via `gh api graphql`, read Status/App/Category/Priority fields
  - Step 3 (Update PM): Replace Notion update with `gh project item-edit` to set Status to "In Progress"
  - Step 6 (Update PM with Plan): Replace Notion subtask update with posting plan summary as issue comment + updating board item
  - Step 8 (Do the Work): Remove `infisical` from infra-specialist preloads
  - Step 11 (Update PM Task): Replace Notion content update with: post completion comment on issue, move board item to "Done" or "In Review" via `gh project item-edit`
  - All `pm_tool: notion` conditionals become `pm_tool: github-projects`
- [ ] Step 5 — Rewrite `global/commands/board.md`:
  - Remove entire "If `pm_tool: notion`" section
  - New primary flow: query XomBoard via `gh api graphql` to get all items with Status, App, Category, Priority fields
  - Group by Status column (Backlog, Up Next, In Progress, In Review, Done)
  - Display in same table format with App and Priority columns
  - Keep summary section (tasks per status, highest priority backlog item, suggestion)
  - Fallback: if `pm_tool: none`, show `gh issue list` grouped by labels
- [ ] Step 6 — Create `global/commands/backlog.md` (new, replaces backlog-notion):
  - Read Project Config for `github_project_number`, `github_project_owner`, `base_branch`
  - Accept feature name or description as argument
  - Create GitHub issue with `gh issue create`
  - Add to XomBoard with `gh project item-add {number} --owner {owner} --url {issue_url}`
  - Set board fields (Priority, App, Category) via `gh project item-edit`
  - Create branch off base_branch: `{type}/{issue#}-{short-desc}`
  - Push branch to remote
- [ ] Step 7 — Rewrite `project-template/.claude/CLAUDE.md`:
  - Change `pm_tool: none` default to `pm_tool: github-projects`
  - Add `github_project_number: 2` and `github_project_owner: Xomware`
  - Remove all Notion config comments (`notion_datasource`, `notion_project`, etc.)
  - Update integration command references: replace `/backlog-notion`, `/update-notion-task` with `/backlog`, `/board`
- [ ] Step 8 — Write `project-template/.claude/rules/org.md` with Xomware conventions:
  - GitHub org: Xomware, user: domgiordano
  - PM: GitHub Issues + XomBoard (project #2)
  - All repos: branch-protected, PRs required
  - Board workflow: `add-to-board.yml` auto-adds issues
  - OpenClaw is deprecated
  - Secrets: `.env` local, env vars in hosting platform
  - CI/CD: GitHub Actions, deploy on merge to main/master
- [ ] Step 9 — Rewrite `project-template/.claude/prompts/ci-triage.md`:
  - Replace "If Notion MCP tools are available AND pm_tool is 'notion'" with "If pm_tool is 'github-projects'"
  - Replace Notion task creation with: `gh project item-add` to add issue to board, `gh project item-edit` to set fields
  - Update the triage output template: PM Task row shows "Added to XomBoard" or N/A
- [ ] Step 10 — Rewrite `project-template/.github/workflows/claude-issues.yml`:
  - Remove "Install Notion MCP" step
  - Remove "Set up Notion MCP config" step
  - Remove `NOTION_TOKEN` env var references
  - Remove Notion MCP tools from `--allowedTools`
  - Add `Bash(gh project:*)` to allowedTools
  - Add `BOARD_TOKEN: ${{ secrets.BOARD_TOKEN }}` env var for project access
- [ ] Step 11 — Create `project-template/.github/workflows/add-to-board.yml`:
  - Trigger on `issues: [opened]`
  - Single step: `gh project item-add 2 --owner Xomware --url "${{ github.event.issue.html_url }}"`
  - Uses `BOARD_TOKEN` secret
- [ ] Step 12 — Rename all bin scripts with `xom-` prefix: `claude-setup` → `xom-claude-setup`, `init-claude-setup` → `xom-init-claude-setup`, `update-claude-setup` → `xom-update-claude-setup`, `install-claude-setup` → `xom-install-claude-setup`. Update all internal cross-references to match. Change default `SCAN_DIR` from `$HOME/dev/arete` to `$HOME/Code`.
- [ ] Step 13 — Update `bin/xom-claude-setup`:
  - Remove option 4 (set-org) from interactive menu, renumber remaining options
  - Update `show_reference()`: remove `/backlog-notion`, `/update-notion-task`, `/set-org` entries; add `/backlog` entry
  - Remove `examples/org-*.md` scanning logic
  - Update domain specialist list: remove "(preloads: ... infisical)" from infra-specialist description if present
  - All internal references use `xom-` prefix naming
- [ ] Step 14 — Verify: run `grep -ri notion` across the entire new repo to catch any straggling references
- [ ] Step 15 — Verify: run `grep -ri infisical` and `grep -ri microsoft-graph` to confirm clean removal
- [ ] Step 16 — `git add .`, commit: "Initial fork of claude-setup for Xomware org"
- [ ] Step 17 — Create `Xomware/xomware-claude-setup` repo on GitHub, add remote, push

## Out of Scope
- Migrating existing Xomware projects to use this setup (separate task per project)
- Building a shared "core" library between claude-setup and xomware-claude-setup
- GitHub Projects GraphQL query optimization or caching
- Any changes to the original `claude-setup` repo
- Creating a `BOARD_TOKEN` PAT or configuring it in GitHub secrets (manual step)

## Risks / Tradeoffs
- **Drift between repos**: The two setup repos will diverge over time. Universal improvements to agents/skills/commands need to be applied to both. Accepted — keeping them separate is simpler than a shared-core abstraction for 2 orgs.
- **GraphQL complexity**: `gh api graphql` for GitHub Projects is more verbose than `gh issue list`. The board command will need a tested GraphQL query for XomBoard fields. Mitigation: write and test the query in step 5 before moving on.
- **BOARD_TOKEN scope**: The PAT needs `project` scope at the org level. If not configured, board commands and the add-to-board workflow will silently fail. Mitigation: document the required token setup in the repo README or org.md.
- **No examples directory**: The original repo references `examples/org-*.md` in multiple places (set-org command, claude-setup interactive menu). Removing set-org and examples means those code paths need to be fully stripped, not just left dead.

## Open Questions (Resolved)
- [x] Keep personal sections (Working Style, Code Defaults, Lessons) in global CLAUDE.md — tweak for Xomware context but preserve preferences
- [x] BOARD_TOKEN already exists as org-level secret (configured 2026-03-23)
- [x] `backlog` command uses labels only — no GitHub issue type GraphQL

## Skills / Agents to Use
- **executor**: Primary agent for running this plan — mostly file creation and editing across ~50 files
- **infra-specialist**: For the GitHub Actions workflow files (claude-issues.yml, add-to-board.yml)
- **code-reviewer**: Final pass after all changes to catch straggling Notion/ACP references
