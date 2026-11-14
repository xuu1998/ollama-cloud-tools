---
locale: zh-CN
---
# Ollama 云搜索与决策

为 new-api 接入 Ollama 云搜索、网页读取和 Clef 云端决策。三个接口均返回 Ollama 原生同步 JSON 结果。搜索工具调用和多轮搜索循环由客户端或 agent 控制。

## 安装与渠道设置

1. 宿主需要支持当前插件 API v1 的 native 路由、同步 `immediate` 完成、`usageProfiles` 和 `json-order@1`。
2. Root 管理员在插件管理页上传 `plugin.js`，启用 `1.0.4`。
3. 新建 **Task Plugin / 任务插件** 渠道（类型 61），选择 **xuu1998_ollama_cloud_tools**。
4. API 地址显式填写 `https://ollama.com`。也可填写可信的 HTTPS 反向代理，支持地址的路径前缀。
5. 渠道密钥填写 **Ollama API key**，不要带 `Bearer `。客户端使用 **new-api 令牌**访问网关。
6. 添加下表中的模型，为渠道设置分组并启用，配置模型或插件专属价格。客户端令牌若限制模型，也要允许对应模型。

本插件通过任务插件的同步完成机制运行，不是“请求处理插件”实例。不需要安装本地 Ollama，不需要下载模型。Clef 云端需要 Ollama 付费套餐或购买使用额度。

### 从 1.0.3 或更早版本迁移

市场发布版本的 key 是 `xuu1998_ollama_cloud_tools`。旧版 `ollama-cloud-tools` 在宿主中是另一个插件身份，上传新版不会自动替换已有绑定。

如已有插件专属价格，先将其复制到新 key 对应的模型价格；然后安装新版，重新选择任务插件渠道以及 New API 渠道中的上游任务插件。多层网关需分别安装并重新绑定。迁移完成后停用旧插件，避免继续走旧渠道。

使用插件专属路径的客户端改为 `/xuu1998_ollama_cloud_tools/...`。没有前缀的原生接口如 `/v1/systemone` 保持可用。

插件已声明内置的 `Ollama` 图标，只上传 `plugin.js` 也能显示。另附适配浅色和深色主题的 `icon.svg`，可在上传界面的图标选项中选择。图形来自 LobeHub Icons，许可见 `LICENSE.icon.txt`。

### 转接另一个 new-api 网关

从 `1.0.2` 起支持 `new_api` 上游，因此可以出现在 **New API 渠道 → 上游任务插件** 列表中。该列表根据本机插件声明筛选，不会自动检查远端是否安装插件。

1. 在两个网关都安装并启用本插件。
2. 上游网关创建直连 Ollama 的任务插件渠道，使用 Ollama API key。
3. 下游网关创建 **New API** 渠道（类型 60），地址填写上游网关根地址，可含部署路径前缀，不要追加 `/v1` 或 `/xuu1998_ollama_cloud_tools`。
4. 下游渠道密钥填写**上游网关的 new-api 令牌**，在“上游任务插件”中选择 `xuu1998_ollama_cloud_tools`。
5. 两侧分组和令牌均需允许所用模型，分别配置各自价格。

转发时插件自动添加 `/xuu1998_ollama_cloud_tools` 专属前缀，保留上游模型映射后的 Clef 名称；真正直连 Ollama 的那一层将云标签归一为对应的模型规格。网关地址允许 HTTP(S)，直连 Ollama 仍要求 HTTPS。

## 支持的模型和接口

| 网关模型名 | 客户端接口 | 功能 |
| --- | --- | --- |
| `ollama-web-search` | `POST /api/web_search` | 云搜索，必填 `query`；`max_results` 默认 5，允许 1–10 |
| `ollama-web-fetch` | `POST /api/web_fetch` | 网页读取，必填 `url` |
| `clef:27b` | `POST /v1/systemone` | 分类、是非概率、按标准评分；推荐使用的明确规格 |
| `clef`、`clef:cloud`、`clef:27b-cloud` | `POST /v1/systemone` | 兼容的 Clef 名称与云标签 |

推荐使用带插件前缀的地址，明确选中本插件：

- `/xuu1998_ollama_cloud_tools/api/web_search`
- `/xuu1998_ollama_cloud_tools/api/web_fetch`
- `/xuu1998_ollama_cloud_tools/v1/systemone`

前缀别名由宿主自动发布。搜索与读取会自动补上网关内部路由模型，客户端无需提交 `model`；也可显式传对应的服务模型名。

推荐在渠道和请求中使用 `clef:27b`，直连时保留这一完整模型名。兼容已有名称：`clef`、`clef:cloud` 直连时发送 `clef`；`clef:27b-cloud` 直连时发送 `clef:27b`。转接 new-api 时保留映射后的名称，避免上游只发布某个别名时选不到渠道。渠道模型映射保持空，或仅在这些受支持名称间映射。本插件仍调用云端地址，不安装本地模型，也不声明 Nimble、Tev 或 Clef Flash 的云端支持。

## 计费与余额预留

插件只上报用量事实，价格和余额结算由 new-api 管理员配置。

- 搜索、网页读取：每次成功调用上报 `requests: 1`。
- 决策：上报 `requests`、`input_tokens`、`output_tokens`。两个 token 数来自 Ollama 返回的 `usage`，保留合法的 `output_tokens: 0`。
- 决策提交前按**每题 65,536 个输入 token**保守预留，输出预留为零；同步完成后按 Ollama 的实际用量结算。由于分题评分可能重复计入共享上下文，多题调用的预留金额可能明显大于最终消费，需要足够的网关余额。
- 按次计费可使用 `u("requests")`；按输入 token 计费的表达式形如 `u("input_tokens") * 每百万token美元单价 / 1000000`，保存时必须把中文单价说明替换为实际数字。任务插件表达式直接返回美元金额。
- Ollama 当前文档说明云决策按输入 token 收费。跟随该口径时，输出 token 价格设为零；仍可在用量事实中保留输出统计。
- 上游 HTTP 错误由宿主管理，失败任务不申报成功用量。

## 请求示例

均发给自己的 new-api 网关，使用：

```http
Authorization: Bearer <NEW_API_TOKEN>
Content-Type: application/json
```

云搜索，`POST /xuu1998_ollama_cloud_tools/api/web_search`：

```json
{"query":"Ollama 云端决策接口文档","max_results":3}
```

返回 `results` 数组，每条包含 `title`、`url`、`content`。

网页读取，`POST /xuu1998_ollama_cloud_tools/api/web_fetch`：

```json
{"url":"https://ollama.com/"}
```

返回 `title`、`content`、`links`。

云端决策，`POST /xuu1998_ollama_cloud_tools/v1/systemone`：

```json
{
  "model": "clef:27b",
  "state": {"ticket": "生产支付接口持续返回 500，所有客户均无法付款。"},
  "questions": {
    "urgent": {
      "type": "noul",
      "instructions": "是否需要立即处理？"
    },
    "team": {
      "type": "choice",
      "instructions": "由哪个团队处理？",
      "criteria": {"engineering": "软件故障", "billing": "退款与账单咨询"}
    },
    "severity": {
      "type": "score",
      "instructions": "问题有多严重？",
      "criteria": ["轻微", "一般", "严重"]
    }
  }
}
```

`noul` 返回“是”的概率，不是布尔值。`score` 返回从零开始的等级概率加权平均值，上例范围为 0–2。`confidence` 表示概率分布的集中程度，不等同于答案正确率。

## 限制

- 只支持同步 JSON，没有 Chat Completions 伪装、流式输出、视频、生成工具参数、自动搜索循环，也不会自动按决策结果选择其他渠道。
- `state` 和问题 `instructions` 支持非空字符串、JSON 对象或数组。
- 一次 1–64 个问题；问题名为 1–100 个 ASCII 字母、数字、`_`、`.`、`-`。分类为 2–26 个选项；评分为 2–10 个有序等级；是非问题可选填 `false`、`true` 描述。
- 最多四张 raw base64 图片，每张解码后不超过 4 MiB，合计不超过 8 MiB。不接受图片 URL、data URL。总 JSON 正文不超过 13 MiB。图片格式、每张 1600 万像素限制和模型 65,536 token 上下文窗口由 Ollama 校验；网关自身可能还有更小的正文限制。
- 网页地址支持 HTTP(S) 公网 DNS 名和标准 IPv4；不接受 IPv6 字面地址、内嵌凭据和明显的内网地址。域名解析与网页跳转仍由 Ollama 服务端检查。
- 未支持的字段直接拒绝，不静默丢弃。
- 原生路由声明 `retainResult: false`：只当次返回结果，不保留结果正文供之后查询；宿主仍记录任务及计费元数据，原有请求日志策略照常适用。所有任务即时完成，不执行轮询。
- 不保留结果的原生路由使用宿主下载大小限制，避开默认 1 MiB 的持久化结果上限。通用 `/v1/tasks/:pluginKey` 接口仍受默认上限约束；本插件应使用上面的原生接口。

## 本地验证

不需要安装 npm 依赖，Node.js 22+ 即可：

```powershell
npm test
npm run fixtures
```

有宿主可执行文件时：

```sh
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture fixtures/golden.json
```

也可直接借用旁边的 new-api 源码运行真实注册器和 JS 沙箱：

```powershell
.\tools\check-host.ps1 -NewApiPath '..\new-api'
```

脚本只在本插件目录编译被忽略的 `tools/plugincheck.exe`，不会往 new-api 源码目录写入文件；可用 `-GoCommand` 指定 Go 可执行文件。

可再调用宿主实际 Markdown 解析器检查市场文档：

```powershell
node tools/check-marketplace.mjs --new-api '..\new-api' --owner xuu1998
```

需要该宿主的 `web/node_modules` 已安装。此检查包含插件 key 的 owner 前缀、版本一致性，以及中英文 README、CHANGELOG 的格式。

安装到网关后，可以明确执行真实冒烟：

```powershell
$env:NEW_API_BASE_URL = 'https://自己的网关地址'
$env:NEW_API_KEY = '<NEW_API_TOKEN>'
node tools/smoke.mjs --all
```

会执行三次真实调用并产生使用量。也可单独使用 `--search`、`--fetch`、`--decision`。脚本从环境变量读取令牌，不打印令牌；项目不附带任何真实密钥。

## 参考资料

核对日期：2026-11-14。

- [云搜索和网页读取](https://docs.ollama.com/capabilities/web-search)
- [云端决策说明](https://docs.ollama.com/capabilities/decision)
- [System One API](https://docs.ollama.com/api/systemone)
- [Clef 模型](https://ollama.com/library/clef)

## 插件市场提交

仓库路径填写 `xuu1998/ollama-cloud-tools`，根目录版本标签为 `v1.0.4`。每个版本标签下，`plugin.js`、README 和 CHANGELOG 位于同一目录；标签版本需与插件 `meta.version` 一致。
