# 验证记录

日期：2026-11-14。

验证使用旁边的 new-api 源码，宿主提交为 `c8a04e809`。

## 已执行

- `node --test tests/contract.test.mjs`：67 项通过，0 项失败。
- `tools/check-host.ps1`：实际宿主注册器接受 `ollama-cloud-tools@1.0.0`，实际 JS 沙箱回放 62/62 个 golden fixture。
- `node --check plugin.js`、`node --check tools/smoke.mjs`：语法检查通过。
- `tools/check-host.ps1`：PowerShell AST 语法检查通过。
- `node tools/smoke.mjs --help`：脚本入口与用法显示正常，未发起网络请求。
- 独立子代理只读核对宿主的路由、上下文、immediate 完成、结果保留和计费路径。已修复按次价格倍率问题，并使用 `retainResult: false` 避免原生网页结果受到默认 1 MiB 持久化上限限制。
- 完工后核对 new-api 的 `git status`，与开始前相同，未改动宿主源码。

## 测试覆盖

搜索及网页读取的请求归一、参数边界；决策三种问题类型、云端模型别名、64 题边界、图片 4 MiB/8 MiB 边界、JSON 正文 13 MiB 边界；输入顺序和参数不变性；同步结果；真实 token 用量与零值；按次定价的倍率隔离；不执行轮询。

## 尚未验证

没有使用真实 Ollama API key 或 new-api 令牌，没有上传安装、发布或调用生产网关。真实云端认证、账号套餐与额度、网络可达性、实际返回值及线上端到端结算需要安装后执行 `tools/smoke.mjs` 并核对网关用量日志。

大响应当次返回和不保留正文已核对宿主代码路径；本轮没有启动完整网关对超过 1 MiB 的网页做 HTTP 端到端测试。

## 1.0.1 图标补充

- `meta.icon` 声明为 `Ollama`，已对照宿主安装的 LobeHub 图标目录确认名称存在。
- 同目录附带 3,304 字节 `icon.svg`，保留 LobeHub MIT 许可；SVG 使用媒体查询适配深色背景。
- 已通过宿主 `ValidateIconImage` 的实际 SVG 上传格式校验。
- 67 项 Node 测试、宿主 `1.0.1` 注册校验和 62/62 个宿主 fixture 再次通过。

## 1.0.2 New API 上游选择修复

- 根因：渠道表单调用 `supportsNewAPIUpstream`，只接受 `upstreams` 包含 `new_api` 的本地插件；旧版未声明，因此被过滤。
- 增加 `upstreams: ["vendor", "new_api"]`，转接网关时使用插件专属 URL 前缀及网关令牌，保留映射后的云模型名。仅网关上游允许 HTTP 地址。
- 修复前已复现：三个转发测试失败，宿主 `SupportsUpstream("new_api")` 返回 false。
- 修复后：71 项 Node 测试通过；宿主接受 `1.0.2`，实际 `Meta.SupportsUpstream` 验证可绑定 New API 渠道；SVG 校验通过；66/66 个宿主 fixture 通过。
- 尚未上传实际运行的网关，也未执行两层网关到 Ollama 的真实网络联调。

## 1.0.3 明确的 27B 模型名

- 增加 `clef:27b` 和 `clef:27b-cloud`，覆盖模型列表、输入校验、操作识别、请求构建和决策用量 schema。
- `clef:27b` 直连时保留完整规格；带云标签的明确 27B 名称直连归一为 `clef:27b`，网关转发保留映射后的名称。已有 `clef`、`clef:cloud` 继续兼容。
- 修复前六个 27B 用例全部失败；修复后 77 项 Node 测试、72/72 个真实宿主 fixture、插件注册、New API 绑定能力和 SVG 校验全部通过。
- 冒烟脚本与主请求示例改用 `clef:27b`。本轮未调用真实云端账号。

## 公开仓库发布检查

- 文档中的个人绝对路径已替换为相对路径示例；测试使用保留示例域名和虚拟凭据，不携带真实网关地址或密钥。
- 本地编译器探测逻辑改为通用 Go 命令或显式 `-GoCommand` 参数。
- 编译产物、环境文件、日志和内部设计草稿排除出版本控制，图标保留原始 MIT 许可声明。
- 调整后再次通过 77 项 Node 测试、72/72 个宿主 fixture、插件注册、New API 上游绑定能力与图标格式校验。

## 1.0.4 社区市场规范

- 插件身份改为 `xuu1998_ollama_cloud_tools`，包版本及发布标签对应 `1.0.4`。专属前缀、网关转发、冒烟脚本及请求示例已同步更新。
- CHANGELOG 改为单版本说明，补齐 `changelogVersion`、`plugin`、`version`、`locale` 元数据和简体中文译文。
- 新增 `tools/check-marketplace.mjs`，调用宿主实际 README/CHANGELOG 解析器检查，不修改宿主源码。
- 修改前已确认四项转发用例因旧路径失败，文档检查因 key 不符合 owner 命名和缺少 changelog front matter 失败。
- 修改后 77 项 Node 测试、72/72 个宿主 fixture、4 项市场文档解析检查、插件注册、New API 绑定能力及 SVG 校验全部通过。
- 已说明旧 key 是不同插件身份，需要迁移插件专属价格、重新绑定渠道，并更新专属 URL 前缀。未操作实际网关或代为提交插件市场。
