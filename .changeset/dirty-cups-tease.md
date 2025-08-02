---
"@zayne-labs/callapi": minor
---

refactor(plugins): rename `init` to `setup` and improve type safety

♻️ refactor(plugins): rename `PluginInitContext` to `PluginSetupContext` and `init` hook to `setup`
✨ feat(types): enhance type safety in response handling
🔧 fix(types): improve generic type handling in response parsers
📝 docs: update plugin documentation to reflect API changes

feat(url): ✨ enhance URL parameter handling and dedupe logic

- 🛠️ Improve URL parameter merging for both array and object params
- 🔄 Support both `:param` and `{param}` URL parameter patterns
- 🧹 Clean up and optimize dedupe cache implementation
- 🏗️ Update page actions with better caching and error handling
- 📝 Update related documentation and examples
