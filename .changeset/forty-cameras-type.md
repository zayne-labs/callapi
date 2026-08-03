---
"@zayne-labs/callapi": patch
---

✨ feat(callapi): improve URL param and query serialization by encoding path segments, normalizing baseURL joins, preserving repeated URLSearchParams values, and replacing duplicate query keys
🧪 test(callapi): add coverage for structured query serialization, repeated query params, normalized baseURL slashes, encoded path params, and repeated placeholder resolution
✨ feat(callapi-plugins): improve logger output with method-aware prefixes, status text, durations, better error formatting, and a new Vitest logger test suite
📝 docs(apps-docs): migrate the docs source pipeline to Satteri, add a copyable Markdown link action, move shared LLM and page-image helpers, and refresh URL helper and migration guidance
⬆️ chore(deps): bump pnpm to 11.18.0, add @fumadocs/satteri, enable plugin test scripts, relax workspace build settings, and align GitHub Actions with the new pnpm version
