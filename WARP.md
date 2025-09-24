# WARP.md

Project: Cloner
Owner: Agent Mode (Warp)

Agent Permissions (Standing Consent)

The Agent may perform the following without asking for permission each time:
- Read-only git operations: status, log, diff, show, branch listing
- Create/update/delete local feature branches prefixed with feat/ or infra/ as part of the cloning workflow
- Run project npm scripts: dev, clone, clone:site, clone:compare, playwright:*
- Re-run cloning for known targets and regenerate artifacts under src/clones/<slug>/
- Edit only generated or infra files: scripts/clone*.mjs, src/clones/** (generated), src/pages/ComponentsChecklist.tsx, src/App.tsx, WARP.md, retros/*
- Open original and local pages in the built-in browser to capture console/network information for diagnostics
- Commit local changes with clear messages; push only when explicitly requested

The Agent must ask before:
- Deleting non-feature branches, rebasing shared branches, force-pushing, or removing files outside generated paths
- Modifying production deployment settings or secrets
- Adding heavy dependencies or changing build configuration

Verification Routine (for every clone)
- Open original and local clone; capture and compare console messages; fix clone-only errors first
- Verify hero/media tiles and grid/flex layouts match (sample bounding boxes)
- Confirm no mixed-origin URLs in DOM or CSS
- If needed, apply minimal, slug-scoped CSS shims to restore layout without affecting global styling
