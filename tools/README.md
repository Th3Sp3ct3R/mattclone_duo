# Tools

Development-only utilities live here. They are intentionally outside `apps/*` and `packages/*`
unless they become reusable runtime code.

## Endpoint mappers

The legacy `julius/skills/*` and `.claude/skills/*` endpoint mappers are not production
services. Keep any future ADB/CDP endpoint-mapping work in this tools area so it does not
pollute the runtime monorepo or package dependency graph.

