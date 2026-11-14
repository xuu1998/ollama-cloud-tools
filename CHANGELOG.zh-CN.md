---
changelogVersion: 1
plugin: "xuu1998_ollama_cloud_tools"
version: "1.0.4"
locale: "zh-CN"
---
# Changelog

## [1.0.4]

### Added

- 通过原生 JSON 接口调用云搜索、读取公开网页和执行 Clef 云端决策。
- 使用 `clef:27b` 进行分类、是非概率和评分判定，同时兼容已有 Clef 名称。
- 支持直连 Ollama 云端或转接另一个 new-api 网关，提供输入校验并由宿主管理用量计费。

### Changed

- 使用社区插件 key `xuu1998_ollama_cloud_tools`，网关专属前缀改为 `/xuu1998_ollama_cloud_tools`。

### Migration

- 从尚未在市场发布的 `ollama-cloud-tools` 升级时，如已有插件专属价格，先复制到 `xuu1998_ollama_cloud_tools::<model>`，再开放请求。
- 在各层网关安装新插件身份，重新绑定任务插件渠道及 New API 上游插件选项，迁移完成后停用旧身份。
- 使用旧插件前缀的客户端改为 `/xuu1998_ollama_cloud_tools`；`/v1/systemone` 等原生路径仍可使用。
