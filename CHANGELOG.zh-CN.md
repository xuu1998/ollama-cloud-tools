---
changelogVersion: 1
plugin: "xuu1998_ollama_cloud_tools"
version: "1.0.5"
locale: "zh-CN"
---
# Changelog

## [1.0.5]

### Fixed

- 元数据改为仅含字面量，社区市场无需执行 JavaScript 即可读取插件声明。
- 移除运行时对导出元数据的引用，使静态源码读取器能够识别任务插件能力。
