---
"@zayne-labs/callapi": minor
---

🏷️ feat(callapi): introduce CallApiContext Symbol-tagged type system for metadata & extraOptions propagation
✨ feat(callapi): add metaHelper() and extraOptionsHelper() type-only tag helpers
🔌 feat(callapi): add definePluginWithContext<T>() generic factory for context-aware plugins
🧩 feat(callapi): add metaDef and extraOptionsDef fields to CallApiPlugin interface
📦 feat(callapi): export ContextTag, MetaWithContextTag, ExtraOptionsWithContextTag, DefaultMetaObject from index
🔧 refactor(callapi): resolve context early via ResolveBaseCallApiContext / ResolveCallApiContext for proper meta composition
🔧 refactor(callapi): relocate GetCallApiContext / GetCallApiContextRequired exports to callapi-context module
🧪 test(callapi): add metadata.types.test.ts covering metaHelper, definePluginWithContext, metaDef, schema meta integration, plugin composition
🛠️ refactor(apps/dev): migrate client.ts from zod-based defineExtraOptions to typed extraOptionsHelper
📝 docs(plugins): update plugins.mdx for new plugin API and metadata patterns
📝 docs(type-helpers): update type-helpers.mdx with new context helpers
📝 docs(runtime-helpers): update runtime-helpers.mdx
📝 docs(middlewares): update middlewares.mdx
📝 docs(advanced-options): update advanced-options.mdx
📝 docs(seo): update robots, sitemap, structured-data, OG generate, and AI search components
🎨 config(eslint): add unicorn rule ignores for docs content and disable consistent-type-definitions
⬆️ ci: bump pnpm from 12.3.4 to 12.5.1 across all workflows
⬆️ deps: bump @changesets/cli, @eslint-react/eslint-plugin, @next/eslint-plugin-next, @types/node, @zayne-labs/\*, eslint, eslint-plugin-react-refresh, lint-staged, prettier, turbo
