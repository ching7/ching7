# 陈亚男 · AI Application Architect

<!--START_SECTION:hero-->
![LLM](https://img.shields.io/badge/-LLM-blueviolet?style=flat-square) ![RAG](https://img.shields.io/badge/-RAG-blue?style=flat-square) ![LangGraph](https://img.shields.io/badge/-LangGraph-green?style=flat-square) ![MCP](https://img.shields.io/badge/-MCP-orange?style=flat-square) ![Cloud-Native](https://img.shields.io/badge/-Cloud--Native-1f6feb?style=flat-square) ![Java](https://img.shields.io/badge/-Java-red?style=flat-square&logo=oracle) ![Python](https://img.shields.io/badge/-Python-yellow?style=flat-square&logo=python) ![Go](https://img.shields.io/badge/-Go-00ADD8?style=flat-square&logo=go)
<!--END_SECTION:hero-->

<!--START_SECTION:narrative-->
AI 应用架构师，做金融场景的大模型落地。

从呼叫中心的高并发起家，那时候 jstack 用得比 IDE 还熟，每天修 OOM 修到怀疑人生。后来转去搞大模型平台，发现 OOM 没躲过去，只是变成了显存版。

技术上最近在折腾模型微调、RAG 平台、Multi-Agent 编排、国产化适配。习惯把可观测性做扎实了再谈架构——没有 APM 的系统跟黑盒没区别。

带过 40+ 人的团队，看到白板就想画架构图，算是职业病。

再往下是数据画像、写过的代码、star 了但还没看完的仓库，以及过往项目。
<!--END_SECTION:narrative-->

## 📊 数据画像

<!--START_SECTION:stats-->
<img src="https://streak-stats.demolab.com/?user=ching7&theme=solarized-light&hide_border=true&locale=zh_CN" />

<img src="https://ghchart.rshah.org/859900/ching7" alt="ching7's contribution graph" />
<!--END_SECTION:stats-->

## 🗂 我的项目

<!--START_SECTION:my-repos-->
### 其他探索

| 仓库 | 点评 | ⭐ | 语言 | 最后更新 |
| --- | --- | --- | --- | --- |
| [ching7/ppt2video](https://github.com/ching7/ppt2video) | PPT 转 MP4 小工具，TTS + FFmpeg 拼出来的，意外多人 star | 37 | Java | 3 周前 |
| [ching7/prompt-me](https://github.com/ching7/prompt-me) | 一个基于福格行为模型（B=MAP）的行为操作系统，通过记录、提示、分析和AI教练，帮助用户把目标变成持续行动，最终形成习惯与自律 | 1 | JavaScript | 2 周前 |
| [ching7/ai-roundtable](https://github.com/ching7/ai-roundtable) | Chrome 扩展，实现真正的 AI 圆桌会议。还支持让单个 AI 扮演多个内置角色自我互评 | 1 | JavaScript | 3 周前 |
| [ching7/smartisan-mall-simple](https://github.com/ching7/smartisan-mall-simple) | Vue 练手 — 锤子科技官网仿写 | 1 | Vue | 3 年前 |
| [ching7/fastDFSStudy](https://github.com/ching7/fastDFSStudy) | FastDFS 上传下载 demo，分布式存储入门时的笔记 | 1 | Java | 5 年前 |
<!--END_SECTION:my-repos-->

## ⭐ 精选收藏

<!--START_SECTION:starred-->
_(暂无内容)_
<!--END_SECTION:starred-->

## 💼 Tech Profile

<!--START_SECTION:experience-->
### 代表项目

<details>
<summary><b>金融行业智能体平台 — 架构师 — 2024.05 至今</b></summary>

面向金融行业客服与内部管理的智能体平台。覆盖知识问答、客户意图识别、信贷审核等业务场景。

**技术栈：** Docker / K8s · RAG · LangGraph · AgentSkills · MCP · SpringBoot · 国产化

**个人贡献：**
- 主导整体 APM / Skywalking 监控体系搭建，覆盖应用性能、机器性能、链路监控、服务拓扑
- 负责高并发场景下系统性能超时与 OOM 问题的编码优化
- 设计 RAG 底层平台抽象，支撑多 Agent 按需调用，降低重复建设
- 采用 ReAct 模式 + LangGraph 双模式架构，适配不同复杂度业务

</details>

<details>
<summary><b>AI 训推一体平台 — 应用架构师 — 2024.05 至今</b></summary>

面向金融、央国企客户的通用 AI 训练 / 行业大模型训练推理 / 开发服务一体平台，含智管 / 智训 / 智运三大模块。

**技术栈：** Docker / K8s · Harbor · SpringBoot · ES · Zookeeper · 自研网关注册配置中心 · 国产化

**个人贡献：**
- 应用场景接入、模型微调训练 POC 开发
- 网关对接、存储对接方案开发
- 异构资源统一管理与算力调度集成

</details>

<details>
<summary><b>金融行业智能呼叫中心 — 研发组长 — 2021.05 至 2024.05</b></summary>

基于 FreeSWITCH 自研 CTI / ACD 路由组件，结合 TTS / ASR / 知识库等智能化能力，打造 200 座席、1000 通话并发能力的呼叫中心。

**技术栈：** SpringBoot · MySQL · Redis · Dubbo · Nacos · Arthas · FreeSWITCH

**个人贡献：**
- 完成智能呼叫中心 0-1 搭建；并发性能从单机 50 路提升到单机 200 路，最终扩展到集群 1000 路
- 完成坐席工作台单体服务向微服务架构的演进
- 基于 Doris + DolphinScheduler 完成时数仓建设，构建 30+ 张实时统计报表，200+ 指标数据实时计算
- 担任研发经理 / 架构师，进行研发进度跟踪、方案架构设计、并发优化
- 带领常驻研测试 15+、峰值 40+ 研测人员，完成多场景试运营

</details>

### 工作经历

| 时间 | 组织 | 角色 | 技术方向 |
| --- | --- | --- | --- |
| 2021.05 – Now | 头部 AI 平台公司 | AI 系统架构师 | 大模型平台 / Agent / RAG |
| 2018.07 – 2021.05 | 金融 SaaS 上市公司 | Java 工程师 | 金融基础架构 / 高并发 |

### 技能矩阵

- **LLM Engineering**: RAG · LangGraph · MCP · AgentSkills · Embedding · Fine-tuning
- **架构与基建**: Docker · K8s · Skywalking · 双中心双活 · 异地灾备
- **后端**: SpringBoot · Dubbo · MySQL · Redis · ES · Zookeeper
- **领域专长**: 金融大模型落地 · 高并发系统调优 · IPD 流程 · 团队管理（40+）
<!--END_SECTION:experience-->

---

<!--START_SECTION:footer-->
_Last updated by GitHub Action · 2026-06-30_
<!--END_SECTION:footer-->
</content>
