# ASH · 可视化 AI 全息交互社区

前后端 monorepo：摄像头手势驱动的全息 Web 前端 + Go 微服务后端，目标部署形态为 **单 ECS + Docker Compose**（后续可迁 K8s）。

## 技术选型（本次初始化）

### 前端 `frontend/`

| 能力 | 选型 | 原因 |
|------|------|------|
| 工程底座 | Vite + React 19 + TypeScript | 复杂交互场景下 HMR/构建快，生态完整 |
| 三维 | Three.js + React Three Fiber + Drei | 地球/地形/大量 3D 组件的主流 React 方案 |
| 手部骨架 | `@mediapipe/tasks-vision` | 浏览器端实时 Hand Landmarker |
| 状态 | Zustand | 手势 → 场景模式/缩放/地形高度 高频更新，轻量 |
| 动效 | GSAP | HUD / 场景过渡（后续接入） |
| 音效 | Howler | 电流音效触发 |
| 样式 | Tailwind CSS v4 | HUD 叠层快速搭建 |

> 业务逻辑（MediaPipe 推理循环、手势缩放切地形、电流音效触发等）仅预留模块骨架，未实现。

### 后端 `backend/`

采用 **Go monorepo + Gin + GORM + Viper + Zap** 的企业级分层结构（handler / service / model / router + 共享 `pkg`），按服务独立进程与镜像，后续可平滑替换为 gRPC / 引入 go-zero/Kratos 代码生成而不改目录边界。

| 服务 | 端口（本地） | 说明 |
|------|-------------|------|
| `user-service` | 8001 | 登录/注册/个人中心 + JWT |
| `agent-service` | 8002 | 云侧 Agent 占位（后续能力下沉见 runtime） |
| `community-service` | 8003 | 社区交流 |
| `ash-runtime` | **18765**（仅 `127.0.0.1`） | Pro/Cinema **本机编排空壳**（P0：`/health` + `/doctor`） |

Pro/Cinema 架构规格：[`docs/specs/pro-client-architecture.md`](docs/specs/pro-client-architecture.md)。

数据库：**MySQL 8**。生产/测试库名分离：`ash_prod` / `ash_test`（本地开发 `ash_dev`）。云数据库购买后，只需改各环境 `config.*.yaml` 的 `mysql.host`。

## 目录结构

```text
ash/
├── frontend/                 # Vite Web（后续 Electron 加载同一套 UI）
├── characters/               # Character Pack（样例 ash_demo）
├── docs/specs/               # 产品/架构规格
├── backend/
│   ├── pkg/                  # 共享：config / database / middleware / response / logger
│   ├── services/
│   │   ├── user/
│   │   ├── agent/
│   │   ├── community/
│   │   └── runtime/          # ash-runtime（本机 Pro/Cinema）
│   └── Dockerfile            # 多阶段静态编译，ARG SERVICE=user|agent|community
├── deploy/
├── scripts/                  # MySQL / smoke / runtime-smoke
└── .github/workflows/
```

## 本地开发

### 0. 依赖

- Node 20+
- Go 1.26+
- Docker Desktop（推荐，用于 MySQL；本机无 Docker 时可自装 MySQL 8）

### 1. 启动数据库

**推荐（Docker MySQL 8）：**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-mysql.ps1
```

账号：`ash` / `ash_dev_password`，库 `ash_dev`，端口 `3306`。此时直接使用各服务默认 `configs/config.yaml`（MySQL）。

**本机暂用 Docker/MySQL 时：** 可使用 `configs/config.local.yaml`（SQLite）仅作本地冒烟，部署环境仍为 MySQL：

```powershell
$env:ASH_CONFIG="configs/config.local.yaml"
```

### 2. 启动后端（三个终端）

```powershell
cd backend\services\user; go run .\cmd
cd backend\services\agent; go run .\cmd
cd backend\services\community; go run .\cmd
```

本机 Pro runtime（P0，不依赖 MySQL）：

```powershell
cd backend\services\runtime; go run .\cmd
# 或: make run-runtime
# 冒烟: make smoke-runtime
```

- `GET http://127.0.0.1:18765/health`
- `GET http://127.0.0.1:18765/api/local/v1/doctor`

### 3. 启动前端

```powershell
cd frontend
npm install
npm run dev
```

浏览器打开 Vite 提示的地址（默认 `http://localhost:5173`）。开发代理：

- `/api/user/*` → `8001`
- `/api/agent/*` → `8002`
- `/api/community/*` → `8003`

### 4. 接口冒烟

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
```

或一键本地 Compose：

```powershell
docker compose -f deploy/docker-compose.yml up -d --build
```

## 部署架构（阿里云 ECS）

截图环境：**2 vCPU / 2 GiB**，公网 IP 以控制台为准。资源紧张，Compose 已加 `mem_limit` 与缩小版 InnoDB buffer；**不建议在同一台机器同时拉满 prod+test**，测试环境可按需启停。

| 环境 | 触发 | Web 端口 | 数据库 |
|------|------|----------|--------|
| 生产 | push `main` | `:80` | `ash_prod`（容器或日后 RDS） |
| 测试 | push 其他分支 | `:8080` | `ash_test`（容器 `3307` 映射） |

GitHub Secrets（需配置）：

- `ECS_HOST` — ECS 公网 IP
- `ECS_USER` — SSH 用户（如 `root`）
- `ECS_SSH_KEY` — 私钥
- `ECS_PORT` — 可选，默认 22

服务器首次准备：

```bash
# 安装 Docker + Compose 插件后：
mkdir -p /opt/ash/prod/env /opt/ash/test/env
# 将 deploy/env/*.env.example 复制为 prod.env / test.env 并修改密码
```

镜像策略：CI 构建 → `docker save` 打包上传 ECS → `docker load` + `docker compose up`（无外部镜像仓库，适合当前成本约束；日后可换 ACR）。

## 下一步（路线图）

详见 [`docs/specs/pro-client-architecture.md`](docs/specs/pro-client-architecture.md) §13。

| 阶段 | 内容 |
|------|------|
| **P0（已起步）** | 规格 + `characters/ash_demo` + `ash-runtime` health/doctor |
| **P1** | Electron 壳加载现前端；云登录打通 |
| **P2** | 本地 Python 推理 + LiveTalking WebRTC |
| **P3+** | 多角色 / 记忆 / 显存分档 / UE Cinema |

并行仍可推进：社区能力、手势 HUD、RDS 等 Web 普通档功能。
