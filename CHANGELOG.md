---
changelogVersion: 1
plugin: "xuu1998_ollama_cloud_tools"
version: "1.0.4"
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.0.4]

### Added

- Search the web, fetch public pages, and run Clef cloud decisions through native JSON endpoints.
- Use `clef:27b` for choice, yes/no probability, and score questions, with compatible Clef aliases.
- Connect directly to Ollama Cloud or proxy another new-api gateway, with input validation and host-managed usage billing.

### Changed

- Use the community plugin key `xuu1998_ollama_cloud_tools` and its `/xuu1998_ollama_cloud_tools` gateway prefix.

### Migration

- If upgrading from the unpublished `ollama-cloud-tools` identity, copy any plugin-specific prices to `xuu1998_ollama_cloud_tools::<model>` before enabling requests.
- Install the new identity on each gateway, rebind Task Plugin channels and New API upstream-plugin selections, and disable the old identity once migration is complete.
- Update clients using the old plugin prefix to `/xuu1998_ollama_cloud_tools`; native paths such as `/v1/systemone` remain available.
