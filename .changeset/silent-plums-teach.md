---
"@zayne-labs/callapi": patch
---

refactor(core): 🔄 Reorganize utility functions and improve code structure

- refactor(utils): Move helpers.ts to utils/external/body.ts
- feat(utils): Add new external utility modules for define and guards
- refactor(core): Remove defineHelpers.ts in favor of utils/external/define.ts
- refactor(utils): Delete utils/index.ts and create utils/external/index.ts
- docs(validation): Update validation documentation
- chore(dev): Update client and server code in dev app
- chore(plugins): Modify logger implementation
