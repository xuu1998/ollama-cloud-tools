---
changelogVersion: 1
plugin: "xuu1998_ollama_cloud_tools"
version: "1.0.5"
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.0.5]

### Fixed

- Community catalogs can read plugin metadata without executing JavaScript: the manifest now contains only literal values.
- Static source readers can recognize the task-plugin part after removing runtime references to the exported manifest.
