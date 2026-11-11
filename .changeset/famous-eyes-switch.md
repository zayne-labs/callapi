---
"@zayne-labs/callapi": patch
---

🌳 refactor(callapi): drop defineEnum wrapper from constants to remove load-time side effects
🧊 refactor(callapi): use `as const satisfies` for fetchSpecificKeys, routeKeyMethods, extraOptionDefaults, and requestOptionDefaults
⚡ perf(callapi): lazily instantiate TextEncoder inside estimateBodySize
🪶 refactor(callapi): inline definePlugin as a standalone generic instead of definePluginWithContext()
🧪 test(callapi): add treeshake.test.ts asserting a single util import stays under 300 bytes
🧰 chore(callapi): tighten size-limit budget from 8kb to 7.5kb and add esbuild devDependency
🔧 chore(turbo): rename knip task to lint:knip, drop lint:eslint:dev, and disable lint:eslint caching
🧹 chore(scripts): collapse lint:eslint:dev into lint:eslint and build packages upfront in the root lint script
⚙️ chore(eslint): enable automatic TypeScript config discovery via `typescript: true`
📐 chore(dev): narrow tsconfig include to ts/tsx files only
⬆️ deps: bump @ai-sdk/react, @fumadocs/satteri, ai, fumadocs-core, fumadocs-mdx, fumadocs-ui, motion, next, takumi-js, @zayne-labs/toolkit-\*, @next/eslint-plugin-next, eslint-plugin-better-tailwindcss, eslint-plugin-react-you-might-not-need-an-effect, vite
