# GitHub Profile README — 设计文档

- **作者**：陈亚男（@ching7）
- **日期**：2026-05-28
- **载体**：`github.com/ching7/ching7` Profile README（Markdown + 第三方 SVG + GitHub Actions）
- **状态**：待评审（brainstorming 输出，未进入 implementation plan）

---

## 0. 目标与非目标

### 目标
在 GitHub Profile README 上整合三个功能：
1. **在线技术档案**：基于本人简历提炼的 Tech Profile（工作经历 / 代表项目 / 技能矩阵），技术展示导向，非求职简历
2. **GitHub 封面**：活跃度卡片（github-readme-stats / streak / top-langs / summary-cards）
3. **仓库 Dashboard**：个人仓库按方向分类 + Starred 精选带中文点评

### 非目标
- **不**做求职简历：不展示 PII（电话/邮箱/年龄/籍贯/院校）、不展示具体雇主公司名、不展示客户/甲方银行名、不放简历 PDF
- **不**搭建独立网站：纯 README，不用 GitHub Pages、Next.js
- **不**接入第三方授权服务（wakatime / codetime）
- **不**做实时刷新：每日 cron + push 触发即可，不追求秒级新鲜度

### 成功标准
- Profile 首页 30 秒内能让访客抓住"AI 应用架构师 / 金融大模型落地"的定位
- 新增一条 starred 点评仅需在 `categories.yml` 加 1 行 + push
- Workflow 单次跑通时间 ≤ 60 秒
- 简历 PDF 不需要被读者点开，README 已覆盖所有技术信息

---

## 1. 整体架构与目录结构

```
ching7/                                       ← GitHub 用户名仓库（README 展示在 Profile 主页）
├── .github/workflows/
│   └── update-readme.yml                     ← 每日 cron + workflow_dispatch + push 触发
├── scripts/
│   ├── fetch-github.mjs                      ← 调 GitHub API 拉个人/starred 仓库元数据
│   └── render-readme.mjs                     ← 读模板 + categories.yml + cache → 输出 README.md
├── data/
│   ├── categories.yml                        ← ★ 唯一手动维护文件：分类规则 + 中文点评
│   └── cache.json                            ← API 缓存（脚本写入，提交进 git 便于离线渲染）
├── templates/
│   └── README.template.md                    ← 含 <!--START_SECTION:xxx--> 占位标记的母版
├── README.md                                 ← 渲染产物（被脚本覆写，不要手动改）
├── package.json
└── package-lock.json
```

**数据流**：

```
[GitHub API] ─→ fetch-github.mjs ─→ data/cache.json
                                          │
[data/categories.yml] ────────────────────┤
                                          ├─→ render-readme.mjs ─→ README.md
[templates/README.template.md] ───────────┘                            │
                                                                       ▼
                                                              git commit & push
```

**核心解耦原则**：模板 / 数据 / 渲染逻辑三层分离 — 改文案改 `templates/`，改分类改 `categories.yml`，改样式改 `render-readme.mjs`，互不干扰。

---

## 2. README 区段结构（v5 — 活跃度置顶）

```markdown
# 陈亚男 · AI Application Architect

<!--START_SECTION:hero-->
> 金融行业大模型落地 · RAG / Multi-Agent · 8 年经验

[领域徽章：LLM / RAG / LangGraph / MCP / Cloud-Native]
[语言徽章：Java / Python / Go]
<!--END_SECTION:hero-->

## 📊 数据画像
<!--START_SECTION:stats-->
github-readme-stats + streak-stats + top-langs + profile-summary-cards
<!--END_SECTION:stats-->

## 🗂 我的项目（GitHub 仓库分类）
<!--START_SECTION:my-repos-->
（自动生成）
<!--END_SECTION:my-repos-->

## ⭐ 精选收藏（Starred 带中文点评）
<!--START_SECTION:starred-->
（自动生成）
<!--END_SECTION:starred-->

## 💼 Tech Profile
<!--START_SECTION:experience-->
### 代表项目（折叠 details）
- 金融行业智能体平台 — 架构师 — RAG / LangGraph / MCP
- AI 训推一体平台 — 应用架构师 — K8s / 算力调度
- 金融行业智能呼叫中心 — 研发组长 — FreeSWITCH / 高并发

### 工作经历
| 时间 | 组织 | 角色 | 技术方向 |
| --- | --- | --- | --- |
| 2021.05 – Now | 头部 AI 平台公司 | AI 系统架构师 | 大模型平台 / Agent / RAG |
| 2018.07 – 2021.05 | 金融 SaaS 上市公司 | Java 工程师 | 金融基础架构 / 高并发 |

### 技能矩阵
- **LLM Engineering**: RAG · LangGraph · MCP · AgentSkills · Embedding · Fine-tuning
- **架构与基建**: Docker · K8s · Skywalking · 双中心双活
- **后端**: SpringBoot · Dubbo · MySQL · Redis · ES · ZK
- **领域专长**: 金融大模型落地 · 高并发调优 · IPD · 团队管理
<!--END_SECTION:experience-->

## 🪶 关于我
<!--START_SECTION:narrative-->
（200 字技术叙事 — 见 §4）
<!--END_SECTION:narrative-->

---
<!--START_SECTION:footer-->
Last updated by GitHub Action · YYYY-MM-DD
<!--END_SECTION:footer-->
```

### 顺序逻辑

| 顺序 | 区段 | 服务的访客问题 |
|---|---|---|
| 1 | 📊 数据画像 | "你活跃吗？维度怎样？"（第一印象） |
| 2 | 🗂 我的项目 | "你写过什么代码？" |
| 3 | ⭐ 精选收藏 | "你的技术品味？" |
| 4 | 💼 Tech Profile | "你的工作背景与技能？" |
| 5 | 🪶 关于我 | "你是谁、为什么？" |

### 脱敏规则

| 简历原文 | README 呈现 |
|---|---|
| 科大讯飞 | 头部 AI 平台公司 |
| 恒生电子 | 金融 SaaS 上市公司 |
| 星火智能体平台 V1.0 | 金融行业智能体平台 |
| 星火智算平台 V2.1 | AI 训推一体平台 |
| 智能呼叫中心 V1.0/V1.1 | 金融行业智能呼叫中心 |
| 招行 / 建行 / 中行 / 邮储 | 头部国有大行 / 股份制银行（仅在必要时提及） |
| 奖项（2022 最佳团队/最佳个人） | 删除 |
| 邮箱 / 电话 / 年龄 / 籍贯 / 院校 / 毕业时间 | 全部删除 |

工程数字指标（5W+ 日呼、500+ 并发、85% 微调准确率、200 路 → 1000 路、40+ 人团队）**保留**，是技术含金量证据，不涉及主体身份。

---

## 3. `categories.yml` 数据模型

唯一手动维护的文件。修改后 push → Action 重渲染。

```yaml
# data/categories.yml

# ============ 1. 个人仓库 ============
my_repos:
  uncategorized_strategy: include              # include / hide
  uncategorized_title: 其他探索

  categories:
    - id: llm-apps
      title: LLM 应用
      description: 大模型应用层探索（可选）
      repos:
        - name: my-rag-playground              # 仓库名（owner 默认 ching7）
          comment: 一句话点评 — 解决了什么 / 学到了什么
          pin: true                            # 可选：置顶
        - name: agent-toolbox
          comment: 自用 Agent 工具集合

    - id: infra
      title: 工程基建
      repos:
        - name: k8s-notes
          comment: 生产排错笔记

# ============ 2. Starred 收藏 ============
starred:
  uncategorized_strategy: hide                 # 默认隐藏未点评的 starred

  categories:
    - id: llm-agent
      title: LLM / Agent 框架
      description: 多智能体编排与 LLM 应用开发框架
      repos:
        - id: langchain-ai/langgraph           # starred 用 owner/repo 全路径
          comment: 工作流编排清晰，生产在用
        - id: microsoft/autogen
          comment: 多智能体协作的标杆参考

    - id: rag
      title: RAG 与向量检索
      repos:
        - id: deepset-ai/haystack
          comment: 工程化 RAG 套件

    - id: inference
      title: 模型推理与部署
      repos: []                                # 空分类占位

    - id: fin-ai
      title: 金融 × AI
      repos: []

# ============ 3. 全局渲染选项 ============
options:
  max_per_category: 30
  columns: [name, comment, stars, language, updated]
  sort: yaml_order                             # yaml_order / stars_desc / updated_desc
  show_archived: false
  description_in_table: false
```

### 字段语义

| 字段 | 个人仓库 | starred | 说明 |
|---|---|---|---|
| `name` / `id` | `name: repo-name` | `id: owner/repo` | owner 是否需要前缀的区别 |
| `comment` | 必填 | 必填 | 无点评不进 dashboard |
| `pin` | 可选 | 可选 | 置顶；同 pin 内部按 yaml 顺序 |
| `uncategorized_strategy` | 推荐 `include` | 推荐 `hide` | 个人仓库可控 / star 量大 |

### 渲染产物示意

```markdown
### LLM / Agent 框架
多智能体编排与 LLM 应用开发框架

| 仓库 | 点评 | ⭐ | 语言 | 最后更新 |
| --- | --- | --- | --- | --- |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | 工作流编排清晰，生产在用 | 14.2k | Python | 3 天前 |
| [microsoft/autogen](https://github.com/microsoft/autogen) | 多智能体协作的标杆参考 | 38.1k | Python | 1 天前 |
```

后三列由脚本注入，用户不维护。

---

## 4. 200 字技术叙事

### 终稿（约 175 字，浓度："收住的自嘲 + 去 AI 味"）

> AI 应用架构师，做金融场景的大模型落地。
>
> 从呼叫中心的高并发起家，那时候 jstack 用得比 IDE 还熟，每天修 OOM 修到怀疑人生。后来转去搞大模型平台，发现 OOM 没躲过去，只是变成了显存版。
>
> 技术上最近在折腾模型微调、RAG 平台、Multi-Agent 编排、国产化适配。习惯把可观测性做扎实了再谈架构——没有 APM 的系统跟黑盒没区别。
>
> 带过 40+ 人的团队，看到白板就想画架构图，算是职业病。
>
> 下面是写过的代码，以及一些 star 了但还没看完的仓库。

### 风格定位
- **第一人称、技术博客口吻**，非求职话术
- **克制的自嘲**：jstack 续命、OOM 显存版、白板职业病、star 不读
- **去 AI 味**：句长不匀、删括号注释、删工整对仗、删宣言式「信奉」
- **保留硬核词**：jstack / OOM / APM / RAG / LangGraph / MCP，技术 credibility 不掉

---

## 5. 脚本与 Workflow 架构

### 5.1 `fetch-github.mjs`

| 项 | 内容 |
|---|---|
| 输入 | `GITHUB_TOKEN`（env）、目标用户 `ching7`（硬编码或 env） |
| 输出 | `data/cache.json` |
| API 调用 | `GET /users/ching7/repos?type=owner&per_page=100`（分页）+ `GET /users/ching7/starred?per_page=100`（分页） |
| 提取白名单字段 | `full_name / name / description / language / stargazers_count / pushed_at / archived / fork / topics / html_url` |
| Rate Limit | 认证 5000/h，单次跑 ~10-20 个请求 |
| 失败策略 | API 报错 → 复用上次 cache.json + footer 标 `⚠️ data may be stale`，不阻断渲染 |

**字段白名单**是 PII 防护硬卡点：脚本只抽固定 10 个字段写入 cache，杜绝意外把 commit author email 之类的写进去。

### 5.2 `render-readme.mjs`

**伪代码**：
```
template = read('templates/README.template.md')
categories = yaml.parse(read('data/categories.yml'))
cache = JSON.parse(read('data/cache.json'))

sections = {
  stats:    renderStats(),                   // 静态 SVG 链接，无 categories 依赖
  'my-repos': renderRepos(cache.owned, categories.my_repos),
  starred:  renderRepos(cache.starred, categories.starred),
  footer:   renderFooter(cache.fetched_at),
}

result = template
for (key, content) in sections:
  result = result.replace(
    new RegExp(`(<!--START_SECTION:${key}-->)[\\s\\S]*?(<!--END_SECTION:${key}-->)`),
    `$1\n${content}\n$2`
  )

write('README.md', result)
```

**联表渲染**（renderRepos）：
```
for category in section.categories:
  matched = []
  for listed_repo in category.repos:
    meta = lookupCache(listed_repo.id_or_name)
    if not meta: warn(); continue
    matched.push({...listed_repo, ...meta})
  
  apply: sort / max_per_category / pin
  output: H3 + description + Markdown 表格

handle uncategorized:
  if strategy == 'include':
    其他 category 渲染 cache 中未被引用的仓库
  else: skip
```

**幂等**：相同输入 → 相同输出，便于 git diff 审阅。

### 5.3 Workflow `update-readme.yml`

```yaml
name: Update README

on:
  schedule:
    - cron: '0 16 * * *'                    # UTC 16:00 ≈ 北京时间 0:00
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'data/categories.yml'               # 改分类立即生效
      - 'templates/**'
      - 'scripts/**'

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: node scripts/fetch-github.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: node scripts/render-readme.mjs
      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add README.md data/cache.json
          git diff --staged --quiet || git commit -m "chore: refresh README $(date -u +%Y-%m-%d)"
          git push
```

### 5.4 依赖清单（package.json）

```json
{
  "type": "module",
  "scripts": {
    "fetch": "node scripts/fetch-github.mjs",
    "render": "node scripts/render-readme.mjs",
    "build": "npm run fetch && npm run render"
  },
  "dependencies": {
    "@octokit/rest": "^21.0.0",
    "yaml": "^2.5.0"
  }
}
```

仅两个依赖。模板替换用原生正则，不引模板引擎。

### 5.5 关键设计决策

1. **cache.json 提交进 git**：本地 `npm run render` 离线可跑，便于改 categories 后预览；代价是 cache 变更产生 commit 噪声 — 接受
2. **fetch / render 解耦**：local 调试只跑 render 即可，不必每次打 GitHub API
3. **失败软降级**：API 挂了不让 workflow 红 — 用上次缓存渲染，footer 标 stale
4. **PII 防护**：白名单字段抽取，杜绝意外暴露
5. **未配置仓库兜底**：根据 `uncategorized_strategy` 决定进"其他"或隐藏

### 5.6 性能预算

- API 拉取：2-3 秒
- 渲染：< 1 秒
- 单次 workflow：~30 秒
- 月度 Actions 消耗：~15 分钟（free tier 2000 分钟/月）

---

## 6. 第三方 SVG 服务清单（数据画像区使用）

| 服务 | URL 形式 | 提供内容 |
|---|---|---|
| github-readme-stats | `https://github-readme-stats.vercel.app/api?username=ching7&theme=...` | 综合统计卡片（commits/PRs/issues/stars） |
| github-readme-streak-stats | `https://github-readme-streak-stats.herokuapp.com/?user=ching7` | 连续提交天数 |
| github-readme-stats(top-langs) | `https://github-readme-stats.vercel.app/api/top-langs/?username=ching7` | 语言分布 |
| github-profile-summary-cards | `https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=ching7` | 活跃时段、生产力、语言统计 |

均为只读 SVG 服务，无需注册、无需 API Key。

---

## 7. 维护工作流（用户日常操作）

**场景 A：新 star 了一个想推荐的仓库**
```diff
   categories:
     - id: llm-agent
       repos:
+        - id: new-org/cool-framework
+          comment: 看完源码受启发的点 — XXX
```
1 行 diff → push → 1 分钟后 README 更新。

**场景 B：新建了一个个人仓库**
- 啥都不做 → 自动落入"其他探索"
- 想分类 + 点评 → 在对应 category 下加 `name + comment`

**场景 C：批量挑 starred**
- Action 在 `cache.json` 里留全量 starred 清单（含 description）
- 翻 cache.json，挑值得点评的，复制到 `categories.yml`

**场景 D：改简历内容**
- 改 `templates/README.template.md` 里的 `experience` 区段
- push → 渲染

---

## 8. 开放问题（实现阶段决定）

1. **Hero 徽章具体选哪些 shields.io 颜色 / 风格**：实现时定，brainstorming 阶段不锁
2. **代表项目折叠 details 的展开内容**：从简历提炼，实现阶段写细
3. **stats 卡片的 theme**：默认 / dark / radical 等，最终配色决定
4. **`fetch-github.mjs` 是否抓 README.md 内容**：当前不抓，仅元数据；后续如需"基于 README 自动总结"可扩展
5. **是否支持多语言（中英双 README）**：暂不做，目标受众明确为中文圈

---

## 9. 不在本 spec 中的工作

- 简历 PDF 的本地存放（不放进 git 仓库）
- GitHub Pages 独立站点（明确放弃，仅 Profile README）
- 任何动态后端服务（无 server）

---

## 附：术语表

| 缩写 | 全称 |
|---|---|
| RAG | Retrieval-Augmented Generation |
| MCP | Model Context Protocol |
| APM | Application Performance Monitoring |
| IPD | Integrated Product Development（华为产品研发流程） |
| PDT | Product Development Team |
| POC | Proof of Concept |
| PII | Personally Identifiable Information |
