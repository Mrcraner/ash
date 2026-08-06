# ASH Pro / Cinema — 本地数字人客户端规格

> 状态：草案（v0.1）  
> 范围：产品档位、云/本地边界、Character Pack、进程拆分、本地 API、渲染切换、硬件与资源策略  
> 非目标：具体模型训练流程、支付渠道对接细节、UE 工程内部美术规范

---

## 1. 目标与原则

### 1.1 产品目标

在保证数字人「性格 / 讲话偏好 / 音色 / 口型 / 可打断」可用的前提下：

- **大模型与渲染全本地**，不上云推理，不调用第三方对话 / TTS / ASR API
- Pro 先交付 **LiveTalking**；Cinema VIP 再支持 **UE Pixel Streaming**
- 客户端内可按硬件与权益 **一键切换渲染后端**
- 训练完成的角色可 **CDN 同步到客户端**，用户可 **自选角色对话**

### 1.2 工程原则

| 原则 | 说明 |
|------|------|
| 云轻本地重 | 云端仅账号、鉴权、支付/VIP、社区、角色目录元数据与下载授权 |
| Go 优先编排 | 会话、权益门闩、下载、角色切换、渲染切换用 Go；Python 仅推理与数字人引擎 |
| 渲染可插拔 | LiveTalking / UE 实现同一 Avatar 适配器，UI 只消费 WebRTC 视频轨 |
| 显存分档 | 按 GPU VRAM 自动选择模型档位，禁止默认拉满 |
| 复用现仓库 | 云端继续 `user` / `community`；本地 runtime 由 `agent` 边界演化 |

---

## 2. 产品档位

| 档位 | 交付形态 | 数字人渲染 | 本地推理 |
|------|----------|------------|----------|
| **普通** | Web（现有 Vite 前端） | 无 / 占位 | 无 |
| **Pro** | Electron 客户端 | **LiveTalking**（默认） | 有 |
| **Cinema VIP** | 同 Electron 客户端 | **UE Pixel Streaming**（可切换） | 有 |

### 2.1 客户端内切换规则

- 入口：控制面板「渲染模式」：`LiveTalking` | `UE Cinema`
- 切换时尽量保留当前 `character_id`、会话记忆、音色配置
- 仅更换：视频 WebRTC 源 + 面部/口型驱动后端
- 若硬件不达标或未下载对应 `render/` 资产：按钮禁用并提示原因
- 权益：`Cinema` 需 VIP；无 VIP 时仅 Pro（LiveTalking）

### 2.2 硬件门槛（写进安装检测）

| 级别 | GPU | 磁盘（含模型） | CPU 建议 | 可用能力 |
|------|-----|----------------|----------|----------|
| 最低 Pro | RTX 3060 **8GB** | ≥ **40GB** 可用 | i5-12400+ | LiveTalking + Wav2Lip + 小模型档 |
| 推荐 Pro | **12GB** VRAM | ≥ 60GB | 同左 | MuseTalk + 更稳 7B |
| 理想 / Cinema | **16GB+** | ≥ 80GB | 同左 | UE Cinema + 更高模型档 |

不达标：允许安装 Electron，但 Pro 推理降级或锁定普通 Web 能力（由 Launcher 检测结果决定）。

---

## 3. 总体架构

```text
┌──────────────────────────── 云端（现有 2C2G ECS）────────────────────────────┐
│  user-service        登录注册 / JWT / VIP·支付 / 设备授权 / 角色下载票据      │
│  community-service   社区交流                                                  │
│  （可选）catalog API 角色清单、版本、CDN 路径（也可挂在 user-service）         │
│  禁止：LLM / TTS / ASR / 向量检索 / UE / LiveTalking 推理                     │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │ HTTPS（鉴权、权益、目录、下载 URL）
┌───────────────────────────────────▼──────────────────────────────────────────┐
│  Electron Shell（打包现有 React HUD + 数字人视频层 + 设置/角色选择）            │
│    ↔ http://127.0.0.1:<runtime>   本地 API                                    │
│    ↔ WebRTC 127.0.0.1             数字人音视频                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  ash-runtime（Go，由 agent-service 边界演化）                                  │
│    会话 / 打断 / 角色切换 / 渲染切换 / 权益门闩 / 下载与完整性校验 / 日志打包   │
│    调用本地 Python Inference Sidecar（HTTP/gRPC）                             │
│    调用 Avatar Adapter：LiveTalking | UE                                      │
├────────────────────────────┬─────────────────────────────────────────────────┤
│  Python Inference          │  Avatar Backends                                  │
│  ASR / LLM / TTS / Emb     │  LiveTalking (WebRTC)  ← Pro 默认                 │
│  （仅本机 loopback）        │  UE5 Pixel Streaming   ← Cinema                   │
│  向量库：Chroma（本地）     │  面部驱动不得跨后端混用（见 §5）                   │
└────────────────────────────┴─────────────────────────────────────────────────┘
```

### 3.1 与现有仓库映射

| 现有路径 | 职责变化 |
|----------|----------|
| `backend/services/user` | 云端保留；扩展 VIP、设备授权、角色下载票据（后续迭代） |
| `backend/services/community` | 云端保留 |
| `backend/services/agent` | **本地 runtime 主演进点**（开发期仍可 `go run`；发布进 Electron 附属进程） |
| `frontend/` | Electron 加载的 UI；增加角色选择、渲染切换、本地视频层 |
| 新增（规划） | `desktop/` Electron 工程；`runtime/python/` 推理与 LiveTalking 适配；`characters/` 样例包格式 |

---

## 4. 进程与端口（本机）

默认全部绑定 `127.0.0.1`，不对外网暴露。

| 进程 | 建议端口 | 语言 | 说明 |
|------|----------|------|------|
| Electron UI | — | TS | 壳 + 现前端 |
| `ash-runtime` | `18765` | Go | 本地唯一业务入口 |
| Python inference | `18766` | Python | ASR/LLM/TTS/Embedding/RAG |
| LiveTalking | `18767` | Python | WebRTC + `/human` 等 |
| UE Pixel Streaming | UE 默认 / 可配置 | C++ | 仅 Cinema；`-RenderOffScreen` |

`ash-runtime` 负责拉起/健康检查/优雅退出子进程；用户只感知「打开 ASH」。

---

## 5. 渲染后端与面部驱动（禁止混用）

| 后端 | 画面 | 口型/表情驱动 | 音频源 |
|------|------|---------------|--------|
| LiveTalking | 说话人视频 WebRTC | 引擎内 Wav2Lip / MuseTalk 等 | 本地 TTS PCM |
| UE Cinema | UE Pixel Streaming | **Audio2Face / Blendshape**（非 MuseTalk） | 同一路本地 TTS |

**禁止**：把 MuseTalk / SoulX 标成「UE 面部驱动」。  
两条链共享的是 **TTS 音频 + 角色人格**，不是同一份脸部资产。

Avatar 适配器接口（逻辑）：

```text
AvatarBackend
  Start(session, character, render_mode) -> webrtc_offer_endpoint
  Speak(text | audio, interrupt=bool)
  Interrupt()
  SwitchCharacter(character_id)
  Stop()
  Health() / VramHint()
```

---

## 6. Character Pack（角色包）

### 6.1 目录约定

```text
characters/<character_id>/
  manifest.json           # 必填：元数据、版本、兼容 runtime
  persona.json            # 必填：性格、讲话偏好、禁忌、开场白
  voice/
    ref.wav               # 克隆参考音（或配置指向本地 TTS 音色 id）
    tts.json              # TTS 引擎与参数
  llm/
    adapter.safetensors   # 可选：人设 LoRA（需匹配底座模型版本）
    llm.json              # 底座型号、量化档、采样参数
  memory/
    seed/                 # 可选：初始知识文档
  render/
    livetalking/          # Pro 必填（若该角色支持 Pro）
      avatar_id           # 或形象资源目录
      config.json
    ue/                   # Cinema 可选
      notes.json          # MetaHuman/关卡/绑定说明或资源指针
  checksums.sha256
```

### 6.2 `manifest.json` 字段（最小集）

```json
{
  "character_id": "ash_v1",
  "display_name": "ASH",
  "version": "1.2.0",
  "runtime_compat": ">=0.1.0",
  "llm_base": "qwen3-8b",
  "supports": ["livetalking", "ue"],
  "size_bytes": 0,
  "preview_image": "preview.jpg"
}
```

### 6.3 跨后端共享与不共享

| 内容 | Pro / Cinema 是否共用 |
|------|------------------------|
| persona / 偏好 / 禁忌 | 共用 |
| 音色 / TTS 配置 | 共用 |
| 长期记忆（按 user+character） | 共用 |
| LoRA（若底座一致） | 共用 |
| `render/livetalking` 与 `render/ue` | **各备一份** |

同一角色在两档可以「听起来像同一个人、长得按后端资产不同」；产品文案需避免承诺「一张脸训练一次通吃」。

---

## 7. 角色同步与用户选择

### 7.1 云端职责（元数据 only）

- 角色目录：`character_id`、版本、changelog、CDN 路径、所需档位（Pro/Cinema）
- 下载票据：短时签名 URL 或 token（校验登录 + VIP）
- **不托管** 对话内容、向量库、模型推理

### 7.2 客户端流程

1. 登录 → 拉取「已授权角色列表」
2. 用户选择角色 → 若本地无包或版本落后 → 下载（断点续传）→ 校验 `checksums.sha256`
3. 激活角色 → runtime 加载 persona/voice/(可选 LoRA) → 按当前渲染模式加载对应 `render/*`
4. 后台可预下载；失败可重试；损坏则重新拉取

### 7.3 用户自由选择

- UI 提供角色列表（预览图、简介、已下载/未下载、Pro/Cinema 支持标记）
- 切换角色：结束或挂起当前说话 → 切换 pack → 新开或迁移 session（记忆按 `user_id + character_id` 隔离）

---

## 8. 本地 API（`ash-runtime`，Go）

统一前缀：`http://127.0.0.1:18765/api/local/v1`  
响应风格对齐现有 `pkg/response`（`code` / `message` / `data`）。

### 8.1 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 进程与子服务健康 |
| GET | `/doctor` | GPU、VRAM、磁盘、驱动、端口；返回档位建议 |
| POST | `/logs/bundle` | 打包脱敏诊断日志 |

### 8.2 权益与会话（门闩）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/session` | 使用云端 JWT 换本地 session；校验 VIP |
| GET | `/entitlement` | 返回 Pro / Cinema 是否可用 |

离线策略（建议）：权益缓存宽限 **72h**，逾期锁定 Pro/Cinema 推理（普通 UI 可保留）。

### 8.3 角色

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/characters` | 本地已安装 + 云端授权合并视图 |
| POST | `/characters/:id/install` | 触发下载安装 |
| GET | `/characters/:id/install/progress` | 进度 |
| POST | `/characters/:id/activate` | 激活角色 |
| GET | `/characters/active` | 当前角色 |

### 8.4 对话与语音

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/text` | 文本对话（流式可用 SSE/WS，实现阶段再定） |
| POST | `/chat/audio` | 上传/流式音频 → ASR → 对话 |
| POST | `/talk/interrupt` | 打断当前播报与口型 |
| GET | `/memory/:character_id/status` | 记忆库状态（可选） |

编排路径（全本地）：

```text
音频/文本 → ASR(可选) → LLM(人设+RAG) → TTS → Avatar.Speak
任意时刻 → Interrupt
```

### 8.5 渲染

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/render/modes` | 当前硬件与权益下可用模式 |
| POST | `/render/mode` | body: `{ "mode": "livetalking" \| "ue" }` |
| GET | `/render/webrtc` | 返回当前后端的 offer/连接指引（或代理 LiveTalking `/offer`） |

---

## 9. Python 推理边界

仅本机服务，由 Go runtime 拉起。

| 模块 | 职责 | 约束 |
|------|------|------|
| ASR | 语音转写 | 本地权重 |
| LLM | 人格对话、工具调用 | 本地；可选 LoRA |
| TTS | 合成 / 克隆 | 本地；禁止 Edge 等在线 TTS |
| Embedding + Chroma | 长期记忆 RAG | 数据目录在用户机器 |
| LiveTalking 适配 | 口型与 WebRTC | Pro 默认 |

模型档位（示例，实现时可调）：

| VRAM | ASR | LLM | TTS | LiveTalking 模型 |
|------|-----|-----|-----|------------------|
| 8GB | 小模型 | ≤7B Q4 | 轻量或 SoVITS 小配置 | **Wav2Lip** |
| 12GB | 同左或更强 | 7B Q5 / 8B 量化 | 更高音质 | **MuseTalk** |
| 16GB+ | 更强 | 8B/14B 量化（慎开） | 同左 | MuseTalk；可并行评估 UE |

同一时刻避免「UE + 大 LLM + MuseTalk」叠满；Cinema 模式下应 **卸载 LiveTalking 模型**，Pro 模式下 **不驻留 UE**。

---

## 10. Electron 客户端

### 10.1 职责

- 加载现有 React UI（待机、HUD、鉴权、社区入口等）
- 数字人 `<video>` / WebRTC 层
- 角色选择、渲染切换、下载进度、硬件提示
- 拉起并守护 `ash-runtime`（或由安装器注册服务）

### 10.2 与 Web 普通档关系

- 同一套前端代码：`import.meta.env` / runtime 探测区分 Web vs Electron
- Web：只打云端 `user` / `community` /（若有）只读接口
- Electron：云端鉴权 + 本地 `18765` 能力

### 10.3 安装与售后

- 安装包：UI + runtime + Python 嵌入环境；**模型与角色包 CDN 分发**
- `doctor` 结果展示在设置页；一键导出日志包
- 更新通道：runtime/UI 小版本；模型/角色大包独立更新

---

## 11. 延迟与体验验收（本机环回）

| 指标 | 目标 |
|------|------|
| 打断生效 | &lt; 200ms |
| TTS 首包可播 | &lt; 500–800ms |
| 口型相对音频偏差 | &lt; 80ms |
| 切换角色（已下载） | &lt; 3s 可开聊（不含大模型冷加载则另计） |
| 切换渲染模式 | &lt; 10s（含卸载/加载后端） |

---

## 12. 安全与合规

- 本地 API 仅 loopback；拒绝非本机 Origin（Electron 场景用严格策略）
- 云端 JWT 不进 Python 日志；诊断包脱敏
- 角色包与权重：**许可证清单**（框架 Apache-2.0 ≠ 所有权重可商用）入库 `docs/licenses/`
- 设备授权：限制同账号同时激活客户端数量（云端策略，后续）

---

## 13. 分阶段落地（仓库实施顺序）

| 阶段 | 交付 | 验证 |
|------|------|------|
| **P0** | 本文规格；Character Pack 样例目录；本地 API 空壳（Go） | `doctor` + `health` 可调 |
| **P1** | Electron 壳加载现前端；云登录打通 | 登录后进 HUD |
| **P2** | Python 最小推理（LLM+TTS）+ LiveTalking WebRTC 进 UI | 文本驱动说话、可打断 |
| **P3** | 角色包安装/激活/多角色切换；本地 Chroma 记忆 | 换角色人格与音色变化 |
| **P4** | 显存分档与模型热卸载 | 8GB 机器可稳定 Pro |
| **P5** | UE Adapter + Cinema 切换 + VIP 门闩 | 按钮切换两路 WebRTC |
| **P6** | CDN 目录同步、差分更新、日志打包售后 | 新角色不发安装包即可下发 |

---

## 14. 明确不做（本规格）

- 云端托管用户对话全文作为主存储
- 云端 GPU 推理或第三方语音/LLM API 作为主路径
- 第一版同时默认驻留 LiveTalking + UE
- macOS / 核显作为 Pro/Cinema 官方支持（可仅 Web 普通档）

---

## 15. 待决清单（实现前需钉死）

1. 本地流式协议：SSE vs WebSocket（聊天 token / TTS 分片）
2. 向量库最终选定：Chroma（规格默认）是否锁死
3. 底座模型版本与 LoRA 兼容矩阵文件格式
4. Cinema 最低 VRAM 是否强制 12GB 还是 16GB
5. 角色包签名公钥是否由云端下发轮换

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 | 2026-08-06 | 初稿：与现有 monorepo 对齐的 Pro/Cinema 落地规格 |
