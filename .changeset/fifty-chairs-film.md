---
"@zayne-labs/callapi": patch
---

refactor(callapi): improve type inference and global declarations ♻️

fix(callapi): move `ReadableStream` global declaration to `reset.d.ts` to prevent tsdown for always bundling it 🚚

feat(callapi): use `NoInferUnMasked` helper for over NoInfer for better tooltips ✨

fix(callapi, types): add `NoInfer` usage to sharedOptions type to prevent middlewares and hooks from inferring the data and error as unknown🔧
