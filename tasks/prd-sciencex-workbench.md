# PRD: ScienceX 本地计算生命科学工作台

## 0. 文档状态

- **状态**：Draft v1，等待产品评审
- **目标版本**：内部研究 Beta
- **目标周期**：3–6 个月
- **建议团队**：3–5 名工程师，持续由至少 1 名计算生命科学研究人员参与验收
- **目标平台**：macOS、Linux
- **核心工作流**：本地数据 → Notebook 分析 → 图表 → 可审阅报告
- **使用边界**：仅限内部学习与研究原型，不商业化、不公开分发、不使用 “Claude Science” 产品名称

### 已确认决策

1. 产品是基于当前仓库的内部研究原型。
2. 第一目标用户是计算生命科学与生物信息研究人员。
3. 第一条端到端主链路是本地数据分析，而不是文献综述或 HPC。
4. Beta 只支持本地 macOS/Linux 计算，不支持 SSH、Slurm 或云端 GPU。
5. 目标是由 3–5 名工程师在 3–6 个月内形成可用 Beta。

### 术语

- **Research Project（研究项目）**：长期存在的研究上下文，包含数据集、环境、会话、运行、Artifact、报告和审阅结果。
- **Session（会话）**：研究项目中的一次 Agent 对话线程，不是研究状态的唯一存储。
- **Run（运行）**：一组具有确定输入、代码、环境和输出的计算步骤。
- **Artifact（研究产物）**：图表、表格、Notebook、报告或其他可查看、可版本化的科学结果。
- **Provenance（来源链）**：从研究产物回溯到输入数据、代码、环境、命令、模型交互和审批记录的完整链条。
- **Reviewer（审阅器）**：使用确定性检查与独立 Agent 检查计算、图表、报告和可复现性的组件。
- **本地优先**：原始数据和科学计算默认留在本机；模型调用仍可能发送经过用户策略允许的最小上下文。

## 1. Introduction / Overview

ScienceX 将现有的 Claude Code 桌面工作台改造成面向计算生命科学的本地研究环境。研究人员可以注册本地数据集，用自然语言制定分析计划，让 Agent 创建并执行 Jupyter Notebook，查看生成的图表和表格，要求 Agent 修改分析或可视化，并最终生成能够回溯到具体数据、代码和运行记录的研究报告。

当前产品以软件工程为中心：主要对象是代码目录、Git 仓库、会话、文件变更和代码 Diff。科研场景需要不同的核心对象：研究问题、数据集、计算环境、分析运行、图表、证据、报告和审阅问题。ScienceX 必须在保留现有 Agent Runtime、MCP、Skills、权限和桌面通信架构的同时，引入独立的科学领域模型，不能把科研状态继续只保存在聊天记录或工作目录中。

本 Beta 的核心承诺不是“自动得出正确科学结论”，而是：

- 帮助研究人员完成本地分析工作流；
- 让每个输出能够被检查、重放和追责；
- 在发送数据给模型或执行高影响操作前提供明确控制；
- 把 Agent 生成的结果呈现为待验证的研究产物，而不是未经审阅的事实。

## 2. Problem Statement

计算生命科学研究人员通常需要在文件管理器、Jupyter、终端、R/Python 环境、绘图库和文档工具之间切换。分析过程容易出现以下问题：

- Notebook 隐藏状态导致结果无法从头重放；
- 图表与生成图表的代码、数据和环境脱节；
- 报告中的数字难以追溯到具体计算；
- Agent 能生成分析代码，但无法稳定管理运行、版本和失败恢复；
- 原始数据可能被无意发送给外部模型；
- 对话分叉后无法可靠比较两条分析路径；
- 现有代码 Agent 的验证逻辑不能发现统计、图表和科学报告中的问题。

ScienceX 要把这些离散动作变成一个可审计、可重放的本地研究工作流。

## 3. Goals

### G-1：完成本地端到端分析

用户可以创建研究项目、注册本地数据、批准分析计划、执行 Notebook、查看图表和生成报告，不需要离开 ScienceX 完成核心流程。

### G-2：保证来源链完整

所有由系统生成的图表、表格和报告必须能够回溯到 Run、代码快照、环境快照和数据输入。

### G-3：建立可复现性基线

标记为“可复现”的 Run 必须通过干净 Kernel 的 restart-and-run-all 检查，并保留足以在相同平台重新执行的环境与输入信息。

### G-4：控制数据外发

用户能够看到、允许或拒绝将要发送给模型的文件片段、数据摘要和元数据；系统记录每次外发事件。

### G-5：提供科学审阅

系统能够发现常见的不可追溯数字、图表与数据不一致、Notebook 隐藏状态和缺失环境信息，并以结构化问题呈现。

### G-6：形成可扩展的科学平台

第一版只实现本地 Python/Jupyter，但领域模型和接口应允许后续增加 R、科学数据库连接器、专业 Artifact 渲染器和 HPC，而不破坏已有项目。

## 4. Target Users and Personas

### P-1：计算生物学研究人员

- 熟悉 Python/Jupyter 和常见生信文件格式；
- 希望加快探索、绘图和报告撰写；
- 需要检查 Agent 生成的代码和结果；
- 重视可复现性，但不希望手工维护完整 provenance。

### P-2：实验室数据分析人员

- 能理解生物学问题，但编程能力有限；
- 希望通过自然语言生成和修改分析流程；
- 需要把结果交给更资深研究人员复核。

### P-3：方法学审阅者

- 主要查看代码、环境、图表和报告来源；
- 需要快速发现隐藏状态、缺失输入、统计问题和不可追溯结论；
- 不一定参与最初的 Agent 对话。

## 5. Primary User Journey

1. 用户创建一个 Research Project，并填写研究问题和预期输出。
2. 用户注册一个或多个本地数据文件；ScienceX 计算哈希并提取安全的结构元数据。
3. 用户选择现有 Python 环境，或让 ScienceX 创建项目专用环境。
4. 用户描述分析目标；Science Coordinator 生成结构化分析计划和预计产物。
5. ScienceX 展示需要读取的数据、将发送给模型的上下文以及将执行的计算步骤。
6. 用户批准计划。
7. Agent 创建 Notebook，并通过受控 Kernel 逐步执行。
8. Run 页面实时显示状态、日志、资源占用和生成的 Artifact。
9. 用户在 Artifact Canvas 查看表格和图表，提出自然语言修改。
10. Agent 修改源代码并创建新的 Run/Artifact 版本，不覆盖旧版本。
11. Reviewer 检查可复现性、数字来源和图表一致性。
12. 用户生成 Markdown/HTML 研究报告；报告中的数字和图表可跳转到来源 Run。
13. 用户导出一个包含报告、Notebook、环境锁、manifest 和审阅结果的研究包。

## 6. User Stories

### US-001：创建研究项目

**Description:** 作为研究人员，我希望创建带有研究问题和工作目录的项目，以便把会话、数据、运行和产物组织在同一研究上下文中。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 用户可填写项目名称、研究问题、项目目录和可选描述。
- [ ] 系统生成稳定的 `projectId`，并在项目目录创建版本化的 `.sciencex/project.yaml`。
- [ ] 项目元数据与 Session 分开持久化，删除会话不会删除项目。
- [ ] 重启桌面端后项目仍可恢复。
- [ ] 不认识的持久化字段在读写后仍被保留。
- [ ] Typecheck、迁移测试和持久化升级检查通过。
- [ ] Verify in browser using dev-browser skill.

### US-002：注册本地数据集

**Description:** 作为研究人员，我希望把本地文件注册为数据集，而不是把文件复制进聊天，以便系统能够追踪输入并避免不必要的数据移动。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 用户可选择单文件或目录作为数据集。
- [ ] 系统保存规范路径、大小、修改时间、内容哈希、格式和用户描述。
- [ ] 默认只保存引用，不复制原始数据。
- [ ] 用户可显式选择“托管副本”，副本写入项目的 `datasets/` 目录。
- [ ] 大文件哈希过程可取消，并显示进度。
- [ ] 原文件变化后数据集显示 `changed`，不会静默更新基线哈希。
- [ ] 任意格式均可注册；未知格式显示通用元数据而不是报错。
- [ ] Verify in browser using dev-browser skill.

### US-003：预览数据结构

**Description:** 作为研究人员，我希望在分析前查看数据的列、维度、类型和缺失值摘要，以便确认 Agent 使用了正确输入。

**Priority:** P0

**Acceptance Criteria:**

- [ ] P0 支持 CSV、TSV、JSON 和 Parquet 的结构预览。
- [ ] 预览显示维度、列名、推断类型、缺失值计数和最多 100 行样本。
- [ ] 结构分析在本地执行。
- [ ] 默认不把样本行发送给模型。
- [ ] 预览失败时保留数据集注册并显示可操作错误。
- [ ] 单元测试覆盖空文件、损坏文件、超宽表和混合类型列。
- [ ] Verify in browser using dev-browser skill.

### US-004：支持生命科学数据摘要

**Description:** 作为计算生物学研究人员，我希望系统识别常见生命科学数据格式，以便获得适合该格式的安全摘要和分析建议。

**Priority:** P1

**Acceptance Criteria:**

- [ ] Beta 至少识别 `.h5ad`、`.h5`、`.fasta/.fa`、`.fastq/.fq`、`.bam` 和表达矩阵文本文件。
- [ ] `.h5ad` 摘要包含 obs/var 维度、关键列名、稀疏性和 layer 名称，不加载完整矩阵到模型上下文。
- [ ] BAM/FASTQ 在未安装所需本地工具时显示依赖提示，不自动联网安装。
- [ ] 格式检测使用文件内容或结构化解析器，不只依赖扩展名。
- [ ] 所有格式解析器都有小型脱敏 fixture 测试。

### US-005：选择或创建 Python 环境

**Description:** 作为研究人员，我希望为项目选择一个受控 Python 环境，以便分析依赖不会污染系统环境。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 用户可以选择现有 Python 解释器或创建项目专用环境。
- [ ] 新环境默认位于 `.sciencex/environments/`，不写入系统 Python。
- [ ] 系统记录 Python 版本、平台、已安装包和环境管理方式。
- [ ] 安装依赖前展示包列表、来源和将执行的命令，并要求批准。
- [ ] 离线或安装失败不会破坏已有环境。
- [ ] 环境快照可导出为锁文件或精确包清单。
- [ ] macOS 和 Linux 均有自动化测试或明确的打包 smoke 路径。
- [ ] Verify in browser using dev-browser skill.

### US-006：创建分析计划

**Description:** 作为研究人员，我希望 Agent 在执行前生成可审阅计划，以便我确认输入、方法、输出和潜在数据外发。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 计划包含研究目标、数据集、步骤、方法、预期 Artifact、依赖和风险。
- [ ] 每个步骤标注 `local-compute`、`model-reasoning` 或 `user-review`。
- [ ] 计划列出将要发送给模型的数据摘要和文件片段。
- [ ] 用户可批准、拒绝或要求修改计划。
- [ ] 未批准的计划不能启动 Run。
- [ ] 计划与后续 Run 通过稳定 ID 关联。
- [ ] Verify in browser using dev-browser skill.

### US-007：创建和编辑 Notebook

**Description:** 作为研究人员，我希望 Agent 创建结构清晰的 Jupyter Notebook，以便我可以阅读、修改和在外部 Jupyter 中继续使用。

**Priority:** P0

**Acceptance Criteria:**

- [ ] Agent 可创建、插入、替换和删除 Markdown/Code cell。
- [ ] Notebook 包含目标、输入说明、方法、代码、结果解释和限制章节。
- [ ] Notebook 写入 `notebooks/`，使用标准 `.ipynb` 格式。
- [ ] 编辑前执行 read-before-write 和文件修改冲突检查。
- [ ] 外部修改 Notebook 后，系统要求重新读取或解决冲突。
- [ ] 所有写入均进入 provenance 事件。
- [ ] Verify in browser using dev-browser skill.

### US-008：通过真实 Kernel 执行 Notebook

**Description:** 作为研究人员，我希望在 ScienceX 中执行 Notebook，以便输出、错误和运行顺序被统一记录。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 系统通过项目绑定的 Jupyter Kernel 执行代码，而不是只修改 Notebook JSON。
- [ ] 支持逐 cell、从当前 cell 向下和 restart-and-run-all。
- [ ] UI 流式显示 stdout、stderr、富输出和执行状态。
- [ ] 用户可取消正在执行的 cell 或整个 Run。
- [ ] 每个 cell 记录执行序号、开始时间、结束时间和状态。
- [ ] Kernel 崩溃时 Run 标记失败，并保留此前日志和输出。
- [ ] 执行超时可配置，默认不会无限挂起。
- [ ] 使用真实本地 Kernel 完成桌面 smoke 测试。
- [ ] Verify in browser using dev-browser skill.

### US-009：创建可追溯 Run

**Description:** 作为审阅者，我希望每次分析都有完整 Run 记录，以便确定一个结果究竟如何生成。

**Priority:** P0

**Acceptance Criteria:**

- [ ] Run 记录项目、Session、计划、父 Run、输入、Notebook、环境和输出。
- [ ] Run 使用明确状态机，非法状态转换被拒绝。
- [ ] 运行时捕获命令、代码哈希、环境哈希、输入哈希、随机种子、日志和退出码。
- [ ] Run manifest 使用 append-only 事件生成，不能通过普通 UI 覆盖历史。
- [ ] Run 详情页能从 Artifact 跳转并反向显示所有 Artifact。
- [ ] 崩溃恢复测试证明未完成 Run 会被标记为 `interrupted`，而不是永久 `running`。
- [ ] Verify in browser using dev-browser skill.

### US-010：判定可复现状态

**Description:** 作为研究人员，我希望系统区分“曾成功运行”和“可从干净状态重放”，以便避免把隐藏状态当成可复现结果。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 只有 restart-and-run-all 成功的 Notebook Run 才能标记为 `reproducible`。
- [ ] 环境、输入或 Notebook 变化后原状态变为 `stale`，历史记录保留。
- [ ] 检查报告列出缺失输入、环境差异、非确定性步骤和未固定随机种子。
- [ ] 用户不能手动把失败 Run 改成 `reproducible`。
- [ ] 同一 fixture 在干净临时目录中可以自动重放。

### US-011：注册 Artifact

**Description:** 作为研究人员，我希望系统自动识别 Run 生成的图表、表格和报告，以便统一查看和追踪版本。

**Priority:** P0

**Acceptance Criteria:**

- [ ] P0 支持 PNG、SVG、CSV、Parquet、Markdown、HTML 和 `.ipynb` Artifact。
- [ ] 每个 Artifact 包含类型、内容哈希、创建时间、生成 Run、代码引用、环境引用和输入引用。
- [ ] 同一 Artifact 的修改创建新版本，不覆盖旧文件或数据库记录。
- [ ] Artifact 文件变化后状态显示 `modified-outside-sciencex`。
- [ ] Artifact 删除采用可恢复状态；物理删除需要独立确认。
- [ ] Verify in browser using dev-browser skill.

### US-012：在 Artifact Canvas 查看研究产物

**Description:** 作为研究人员，我希望在聊天旁边查看图表、表格和 Notebook，以便不离开研究上下文审阅结果。

**Priority:** P0

**Acceptance Criteria:**

- [ ] Science 模式右侧主面板提供 Figures、Tables、Notebook、Report、Runs 和 Review 标签。
- [ ] 图片支持缩放、平移、下载和版本切换。
- [ ] 表格支持列类型、排序、筛选和受限行数预览。
- [ ] Notebook 支持 cell 导航、代码/输出折叠和跳转到执行 Run。
- [ ] 面板保留 Methods/Files 入口，但 Git Diff 不是默认首页。
- [ ] 不可信 HTML 在 sandbox iframe 中渲染，并设置严格 CSP。
- [ ] 桌面 1280×720 和 1920×1080 均无关键控件遮挡。
- [ ] Verify in browser using dev-browser skill.

### US-013：用自然语言修改图表

**Description:** 作为研究人员，我希望对图表提出修改要求，以便 Agent 修改生成代码并重新运行，而不是直接编辑图片。

**Priority:** P1

**Acceptance Criteria:**

- [ ] 用户可以针对某个 Artifact 版本发起修改请求。
- [ ] 系统定位生成图表的代码和输入 Run。
- [ ] Agent 修改源代码后创建子 Run 和新 Artifact 版本。
- [ ] UI 显示代码差异、旧图和新图。
- [ ] 原始 Artifact 保留且可恢复为当前版本。
- [ ] 修改无法安全映射到生成代码时，系统明确要求人工选择代码位置。
- [ ] Verify in browser using dev-browser skill.

### US-014：生成研究报告

**Description:** 作为研究人员，我希望从已批准的 Artifact 和 Run 生成研究报告，以便分享结果并继续人工编辑。

**Priority:** P0

**Acceptance Criteria:**

- [ ] P0 生成 Markdown 报告，P1 可生成 HTML/PDF。
- [ ] 报告至少包含问题、数据、方法、结果、限制和可复现性说明。
- [ ] 图表以稳定 Artifact 引用插入，而不是复制无来源图片。
- [ ] 数字性结论必须关联 Artifact、表格单元或 Run 输出。
- [ ] 无来源结论显示醒目标记，不允许以 `reviewed` 状态导出。
- [ ] 报告编辑产生版本历史。
- [ ] Verify in browser using dev-browser skill.

### US-015：审阅计算和数字来源

**Description:** 作为审阅者，我希望系统检查报告中的数字是否能追溯到计算结果，以便发现 Agent 编造或误抄的数值。

**Priority:** P0

**Acceptance Criteria:**

- [ ] Reviewer 提取报告中的数字、百分比、样本量、p 值和区间。
- [ ] 每个数字被标记为 `traceable`、`mismatch` 或 `untraceable`。
- [ ] 确定性匹配优先于模型判断。
- [ ] Reviewer 不能把没有来源的数字自动标为通过。
- [ ] 用户可跳转到相关 Run、表格或代码。
- [ ] 测试 fixture 包含正确数字、舍入差异、单位错误和无来源数字。
- [ ] Verify in browser using dev-browser skill.

### US-016：审阅图表与代码一致性

**Description:** 作为审阅者，我希望系统检查图表是否与其生成代码和数据一致，以便发现轴、标签或样本量错误。

**Priority:** P1

**Acceptance Criteria:**

- [ ] Reviewer 检查轴标签、单位、图例、样本量和代码中的绘图配置。
- [ ] 对结构化 Plotly/Vega Artifact 使用确定性规则读取数据和配置。
- [ ] 对静态图片的视觉检查明确标记为模型判断，不能作为唯一证据。
- [ ] 每个问题包含严重级别、对象引用、观察结果和建议修正。
- [ ] 自动修正必须生成新 Run/Artifact 版本。

### US-017：查看并解决 Review 问题

**Description:** 作为研究人员，我希望集中处理 Reviewer 发现的问题，以便知道报告是否达到可分享状态。

**Priority:** P0

**Acceptance Criteria:**

- [ ] Review 面板按 error、warning、info 分组。
- [ ] 问题可跳转到 Report、Artifact、Run、Notebook cell 或 Dataset。
- [ ] 用户可标记 `resolved`、`accepted-risk` 或 `false-positive`，必须填写理由。
- [ ] Reviewer 重新运行不会删除人工裁决。
- [ ] 存在未解决 error 时报告不能标记为 `reviewed`。
- [ ] Verify in browser using dev-browser skill.

### US-018：分叉分析路径

**Description:** 作为研究人员，我希望从一个 Run 分叉不同分析方法，以便比较方案而不改变原结果。

**Priority:** P1

**Acceptance Criteria:**

- [ ] 用户可从已完成 Run 创建 Branch。
- [ ] Branch 引用相同输入快照和父环境，但拥有独立 Notebook、Run 和 Artifact。
- [ ] 修改一个 Branch 不改变另一个 Branch 的 manifest 或文件。
- [ ] UI 可并排比较两个 Branch 的方法、运行状态和 Artifact。
- [ ] 分叉关系在导出包中保留。
- [ ] Verify in browser using dev-browser skill.

### US-019：预览和控制模型数据外发

**Description:** 作为数据拥有者，我希望知道模型将看到什么，以便防止原始或敏感数据被意外发送。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 每个模型请求生成可读的 egress preview，列出文件、字段、行数、字节数和脱敏操作。
- [ ] 默认禁止发送完整注册数据集。
- [ ] 数据样本、完整文件或大段表格需要显式批准。
- [ ] 用户可以按项目创建允许规则，但规则必须有清晰范围。
- [ ] 被拒绝的外发不会降级为其他隐式发送方式。
- [ ] 每次允许、拒绝和实际外发均进入审计日志。
- [ ] 测试覆盖 prompt、附件、Tool result、MCP result 和 Agent 间消息。
- [ ] Verify in browser using dev-browser skill.

### US-020：导出可复现研究包

**Description:** 作为研究人员，我希望导出可供同事检查的研究包，以便在没有完整聊天应用的情况下复核方法和结果。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 导出包包含报告、Notebook、Run manifest、环境锁、Artifact manifest 和 Review 结果。
- [ ] 默认不复制外部大型数据，只包含路径、哈希和获取说明。
- [ ] 用户可选择包含托管数据副本，并看到导出大小。
- [ ] 包内生成 `README.md`，说明如何重放和已知限制。
- [ ] 所有 manifest 路径使用包内相对路径或明确的 external reference。
- [ ] 导出后执行完整性校验并输出校验和。
- [ ] 在临时目录解包后可运行自动验证命令。
- [ ] Verify in browser using dev-browser skill.

### US-021：恢复中断的研究状态

**Description:** 作为研究人员，我希望应用崩溃或重启后仍能看到进行中的运行和已生成产物，以便不丢失研究记录。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 启动时扫描未终止 Run 并标记 `interrupted`。
- [ ] 已写入的日志、cell 输出和 Artifact 不被删除。
- [ ] 用户可以从最后安全步骤重新运行，但不会伪装成原 Run 的继续。
- [ ] 数据库和 manifest 写入使用原子替换或事务。
- [ ] 人为终止进程的集成测试证明项目可恢复。

### US-022：查看研究审计时间线

**Description:** 作为审阅者，我希望查看项目的重要事件，以便知道谁在何时批准、执行、修改和审阅了什么。

**Priority:** P1

**Acceptance Criteria:**

- [ ] 时间线显示计划审批、数据外发、环境变更、Run、Artifact 版本和 Review 裁决。
- [ ] 每个事件有稳定 ID、时间、操作者、对象引用和结果。
- [ ] 默认隐藏密钥、Token 和原始敏感数据。
- [ ] 时间线可按事件类型和对象筛选。
- [ ] 审计导出不会包含被安全策略排除的秘密。
- [ ] Verify in browser using dev-browser skill.

## 7. Functional Requirements

### 7.1 Research Project

- **FR-1:** 系统必须把 Research Project 作为独立于 Session 的持久化对象。
- **FR-2:** 每个项目必须包含稳定 ID、名称、研究问题、目录、创建时间、更新时间和 schemaVersion。
- **FR-3:** 一个项目可以包含多个 Session、Dataset、Run、Artifact、Report 和 Branch。
- **FR-4:** 删除 Session 不得级联删除 Dataset、Run、Artifact 或 Report。
- **FR-5:** 所有持久化 shape 变化必须提供向前迁移并保留未知字段。

### 7.2 Dataset Registry

- **FR-6:** 数据集必须支持外部引用和托管副本两种模式。
- **FR-7:** 系统必须保存数据内容哈希或可解释的分块哈希策略。
- **FR-8:** 数据变化必须产生状态变化，不能静默重写已完成 Run 的输入版本。
- **FR-9:** 读取数据必须经过项目数据访问策略。
- **FR-10:** 预览服务必须限制读取行数、内存和响应大小。
- **FR-11:** 原始数据不得因为聊天附件或 Tool result 被隐式完整发送给模型。

### 7.3 Environment and Kernel

- **FR-12:** 每个 Run 必须绑定 EnvironmentSnapshot。
- **FR-13:** EnvironmentSnapshot 必须记录解释器、版本、平台、包清单和锁文件哈希。
- **FR-14:** 环境创建和依赖安装必须要求用户批准具体命令。
- **FR-15:** Kernel 必须按项目隔离，并支持启动、停止、中断和重启。
- **FR-16:** Kernel 输出必须同时写入 Notebook 和 Run event stream。
- **FR-17:** 退出应用时必须安全终止或明确记录仍在运行的本地进程。

### 7.4 Analysis Plans and Runs

- **FR-18:** 分析计划必须在执行前持久化。
- **FR-19:** 未批准的计划不得启动计算。
- **FR-20:** Run 状态只能按照定义的状态机转换。
- **FR-21:** Run 必须记录完整输入、代码、环境、日志、输出和审批引用。
- **FR-22:** Run 历史必须 append-only；修正使用新 Run。
- **FR-23:** 取消 Run 必须向子进程发送终止信号，并在超时后升级终止策略。
- **FR-24:** 崩溃后遗留的 `running` Run 必须恢复为 `interrupted`。
- **FR-25:** 系统必须支持 restart-and-run-all 可复现性检查。

### 7.5 Artifact Registry and Canvas

- **FR-26:** 每个 Artifact 必须绑定 producingRunId、contentHash、codeRef、environmentRef 和 inputRefs。
- **FR-27:** Artifact 修改必须产生不可变版本记录。
- **FR-28:** Science 模式必须以 Artifact Canvas 作为默认右侧工作区。
- **FR-29:** 不可信 HTML 必须在禁用 Node 集成的 sandbox 中渲染。
- **FR-30:** 图表修改请求必须回到源代码和新 Run，不能直接改写静态图片。
- **FR-31:** Artifact 外部修改必须可检测并向用户显示。

### 7.6 Reports and Review

- **FR-32:** 报告中的图表必须使用 Artifact 引用。
- **FR-33:** 报告中的关键数字必须保存 source binding。
- **FR-34:** ReviewIssue 必须包含严重级别、类别、对象、证据、建议和状态。
- **FR-35:** 未解决 error 时报告不得进入 `reviewed` 状态。
- **FR-36:** 自动修正必须创建新对象版本并保留修改前状态。
- **FR-37:** 确定性审阅规则的结果必须与模型审阅结果分别展示。
- **FR-38:** 模型审阅不得被表述为科学正确性保证。

### 7.7 Branching

- **FR-39:** Branch 必须记录父 Run、基线 Dataset 和 EnvironmentSnapshot。
- **FR-40:** Branch 文件写入必须隔离，不能改变父 Branch 的 manifest。
- **FR-41:** Branch 比较必须至少展示方法、代码、环境、运行状态和 Artifact 差异。

### 7.8 Data Egress and Permissions

- **FR-42:** 所有发送给外部模型的项目数据必须经过统一 Data Egress 层。
- **FR-43:** Egress preview 必须在批准前生成，并与实际 payload 做一致性校验。
- **FR-44:** 系统必须记录批准人、规则、payload 摘要、目标 provider 和时间。
- **FR-45:** 密钥、环境变量和认证头必须在日志、Trace、Artifact 和导出中脱敏。
- **FR-46:** MCP、Skill 和脚本不得绕过 Egress 与文件权限层。
- **FR-47:** 默认权限策略必须拒绝向项目目录外写入分析产物，除非用户批准。

### 7.9 Export and Recovery

- **FR-48:** 导出包必须包含机器可读 manifest 和人类可读 README。
- **FR-49:** 导出包必须标明外部数据依赖和未包含内容。
- **FR-50:** 导出完成后必须验证文件哈希和引用完整性。
- **FR-51:** 项目数据库写入必须使用事务，关键 manifest 写入必须原子化。
- **FR-52:** 系统必须提供项目健康检查，发现缺文件、哈希变化和损坏记录。

## 8. Non-Goals / Out of Scope

Beta 明确不包含：

- 商业化、公开发布或重新分发当前仓库构建产物；
- 使用 “Claude Science” 作为产品名称或仿制其视觉品牌；
- Windows 支持；
- SSH、Slurm、PBS、Kubernetes 或云端 GPU；
- 自动管理实验室仪器或执行湿实验；
- 临床诊断、治疗决策或面向患者的建议；
- HIPAA、GxP、21 CFR Part 11 或其他受监管合规声明；
- 多人实时协作、组织管理或云同步；
- 60 个科学连接器或全生命科学数据库覆盖；
- 原生 3D 蛋白、化学结构和基因组浏览器；这些属于后续专业 Artifact 阶段；
- 完整 RStudio 替代；R 执行可作为 Beta 后增量；
- 自动接受 Reviewer 结论或自动发布研究结果；
- 保证 Agent 生成的结论、统计方法或生物学解释正确；
- IM、H5、定时任务等现有能力的 Science 专项适配。

## 9. Design Considerations

### 9.1 信息架构

Science 模式使用三栏布局：

1. **左栏：Research Navigator**
   - Projects
   - Datasets
   - Notebooks
   - Runs
   - Artifacts
   - Reports
   - Reviews
2. **中栏：Conversation and Agent Activity**
   - 对话
   - 分析计划
   - 工具调用
   - 权限与数据外发审批
   - Agent/Reviewer 状态
3. **右栏：Artifact Canvas**
   - Figures
   - Tables
   - Notebook
   - Report
   - Methods/Files
   - Provenance

### 9.2 交互原则

- Chat 是控制界面，Artifact 才是主要研究输出。
- 所有高影响动作先展示计划和影响范围。
- 不用绿色“成功”暗示科学正确，只表示计算成功。
- “运行成功”“可复现”“Reviewer 无 error”“人工批准”使用不同状态。
- 任何修正都形成新版本，旧版本始终可见。
- 数据外发提示必须具体说明内容，而不是只显示“允许访问文件”。
- 对不熟悉编程的用户隐藏实现噪声，但保留一键查看代码、命令和日志。

### 9.3 可访问性与平台

- 支持键盘操作、可见焦点和屏幕阅读器标签。
- 图表状态不能只依赖颜色；必须有文本或图标。
- macOS 和 Linux 使用相同项目格式。
- 目标最小桌面尺寸为 1280×720。

## 10. Technical Considerations

### 10.1 推荐分层

保留现有 Electron Host → Bun Server Sidecar → Agent/CLI Runtime 三层结构，新增科学领域层：

```text
desktop/src/science/
  components/
  pages/
  stores/
  types/

src/science/
  orchestrator/
  agents/
  tools/
  policies/
  provenance/

src/server/api/
  research-projects.ts
  datasets.ts
  runs.ts
  artifacts.ts
  reviews.ts
  compute.ts

src/server/services/
  researchProjectService.ts
  datasetService.ts
  environmentService.ts
  computeBroker.ts
  provenanceService.ts
  artifactService.ts
  reviewService.ts
```

不要把软件工程 Coordinator 直接改写成科学 Prompt。应通过独立 Product Mode 选择科学 Agent、工具和 UI，避免破坏现有 CLI 行为。

### 10.2 持久化

推荐：

- `.sciencex/project.yaml`：小型、人类可读、版本化的项目元数据；
- `.sciencex/research.sqlite`：Dataset、Run、Artifact、Review 和索引；
- `runs/<runId>/events.jsonl`：append-only 运行事件；
- `runs/<runId>/run.json`：由事件投影得到的完整 manifest；
- `artifacts/`：托管 Artifact；
- `notebooks/`：标准 Notebook；
- `reports/`：版本化报告。

SQLite 可优先评估 Bun 内置能力，避免为原型新增重量级数据库依赖。任何持久化 shape 变化必须包含 schema version、迁移和旧 fixture 测试。

### 10.3 建议核心数据模型

#### ResearchProject

```ts
type ResearchProject = {
  id: string
  schemaVersion: number
  name: string
  question: string
  description?: string
  rootDir: string
  createdAt: string
  updatedAt: string
  policyId: string
}
```

#### DatasetVersion

```ts
type DatasetVersion = {
  id: string
  datasetId: string
  mode: 'external-reference' | 'managed-copy'
  canonicalPath: string
  format: string
  sizeBytes: number
  contentHash: string
  modifiedAt: string
  metadata: Record<string, unknown>
  status: 'ready' | 'changed' | 'missing' | 'unreadable'
}
```

#### EnvironmentSnapshot

```ts
type EnvironmentSnapshot = {
  id: string
  kind: 'python'
  interpreterPath: string
  pythonVersion: string
  platform: string
  packageLockPath?: string
  packageLockHash: string
  createdAt: string
}
```

#### AnalysisRun

```ts
type AnalysisRun = {
  id: string
  projectId: string
  sessionId?: string
  planId: string
  parentRunId?: string
  branchId?: string
  status: RunStatus
  inputDatasetVersionIds: string[]
  environmentSnapshotId: string
  notebookPath: string
  notebookHash: string
  randomSeeds: Record<string, number | string>
  startedAt?: string
  completedAt?: string
  reproducibilityStatus: 'unchecked' | 'reproducible' | 'failed' | 'stale'
}
```

#### ArtifactVersion

```ts
type ArtifactVersion = {
  id: string
  artifactId: string
  version: number
  kind: 'figure' | 'table' | 'notebook' | 'report' | 'other'
  mimeType: string
  contentPath: string
  contentHash: string
  producingRunId: string
  codeRef?: string
  inputRefs: string[]
  environmentSnapshotId: string
  createdAt: string
  reviewStatus: 'unreviewed' | 'has-errors' | 'has-warnings' | 'reviewed'
}
```

#### ReviewIssue

```ts
type ReviewIssue = {
  id: string
  projectId: string
  category: 'calculation' | 'traceability' | 'artifact' | 'reproducibility' | 'method'
  severity: 'error' | 'warning' | 'info'
  subjectType: 'run' | 'artifact' | 'report' | 'notebook-cell' | 'dataset'
  subjectId: string
  title: string
  evidence: string
  suggestion?: string
  source: 'deterministic-check' | 'reviewer-agent' | 'human'
  status: 'open' | 'resolved' | 'accepted-risk' | 'false-positive'
  resolutionReason?: string
}
```

### 10.4 API 草案

| 方法 | Endpoint | 用途 |
|---|---|---|
| GET/POST | `/api/research-projects` | 列表、创建项目 |
| GET/PATCH | `/api/research-projects/:id` | 读取、修改项目 |
| GET/POST | `/api/research-projects/:id/datasets` | 注册、列出数据集 |
| GET | `/api/datasets/:id/preview` | 获取受限本地预览 |
| POST | `/api/research-projects/:id/plans` | 创建分析计划 |
| POST | `/api/plans/:id/approve` | 批准计划 |
| GET/POST | `/api/research-projects/:id/environments` | 环境列表、创建 |
| GET/POST | `/api/research-projects/:id/runs` | 列表、启动 Run |
| POST | `/api/runs/:id/cancel` | 取消 Run |
| POST | `/api/runs/:id/replay` | 从干净状态重放 |
| GET | `/api/runs/:id/events` | 运行事件与日志 |
| GET | `/api/research-projects/:id/artifacts` | Artifact 列表 |
| GET | `/api/artifacts/:id/versions/:version` | 获取 Artifact 版本 |
| POST | `/api/artifacts/:id/refine` | 基于源代码创建修改计划 |
| GET/POST | `/api/research-projects/:id/reports` | 列表、创建报告 |
| POST | `/api/reports/:id/review` | 运行审阅 |
| GET/PATCH | `/api/reviews/:id/issues` | 查看、裁决问题 |
| POST | `/api/research-projects/:id/export` | 导出研究包 |
| GET/POST | `/api/research-projects/:id/egress-rules` | 数据外发策略 |

Run 进度、Kernel 输出、Artifact 创建和 Review 更新使用现有 WebSocket 基础设施扩展事件类型，不为每个领域重新建立传输层。

### 10.5 Agent 角色

P0：

- `science-coordinator`
- `data-analyst`
- `notebook-engineer`
- `report-writer`
- `reproducibility-reviewer`
- `calculation-reviewer`

P1：

- `bioinformatics-specialist`
- `figure-reviewer`
- `methodology-reviewer`

所有 Reviewer 必须输出结构化 ReviewIssue。Reviewer Agent 不得拥有直接覆盖原 Artifact、报告或 Notebook 的权限。

### 10.6 Scientific Skills

首批 Skills 应围绕 golden workflow，而不是追求数量：

- `tabular-qc`
- `expression-matrix-qc`
- `single-cell-rna-qc`
- `exploratory-visualization`
- `statistical-summary`
- `reproducible-notebook`
- `figure-style-review`
- `research-report`

Skill 必须声明：

- 输入格式和前置条件；
- 需要的包和版本范围；
- 可能产生的数据外发；
- 确定性检查；
- 输出 Artifact 类型；
- 已知限制和禁止用途。

### 10.7 Golden Workflows

Beta 至少包含三套小型、脱敏、可离线执行的验收项目：

1. **表型/实验结果表格**：CSV → QC → 描述统计 → 图表 → Markdown 报告。
2. **表达矩阵**：表达矩阵 + metadata → 过滤 → PCA/聚类 → 差异摘要 → 报告。
3. **小型单细胞数据**：`.h5ad` → QC → 过滤 → embedding → marker 表 → 图表与方法说明。

自动化测试使用合成 fixture；真实公共数据仅用于人工 Beta 验收，不作为必须联网的 CI 测试。

## 11. Non-Functional Requirements

### 11.1 性能

- **NFR-1:** 10 GB 数据文件注册不应完整加载到内存。
- **NFR-2:** 数据预览必须有内存、行数和执行时间上限。
- **NFR-3:** 1,000 个 Run、5,000 个 Artifact 的项目列表操作目标 P95 小于 500 ms，不含内容渲染。
- **NFR-4:** UI 日志使用虚拟化或分段加载，不能因长时间 Run 卡死。

### 11.2 可靠性

- **NFR-5:** 关键数据库操作使用事务。
- **NFR-6:** manifest 和锁文件使用原子写入。
- **NFR-7:** 所有子进程支持取消、超时和退出清理。
- **NFR-8:** 应用崩溃不应破坏已完成 Run 和 Artifact。

### 11.3 安全与隐私

- **NFR-9:** 测试不得读取或修改真实用户 `~/.claude`、密钥、项目或数据。
- **NFR-10:** 所有测试使用临时 HOME/配置目录和合成数据。
- **NFR-11:** API Key 和秘密不得出现在日志、Trace、SQLite、Artifact 或导出包。
- **NFR-12:** 不可信 HTML、Notebook 富输出和 SVG 必须经过安全策略处理。
- **NFR-13:** 外部模型请求必须能够证明经过统一 egress policy。

### 11.4 可维护性

- **NFR-14:** 科学领域代码不得散落在现有软件工程 prompt 和组件中，应使用显式 Science Product Mode。
- **NFR-15:** 生产变化必须有同区域回归测试。
- **NFR-16:** 新持久化对象必须包含 schema 版本、迁移和旧 fixture。
- **NFR-17:** 不为 P0 添加与本地 Python/Jupyter 主链路无关的基础设施。

## 12. Success Metrics

### 产品指标

- **SM-1:** 80% 以上的内部试用者能在不打开外部 Jupyter 的情况下完成 golden workflow。
- **SM-2:** 从创建项目到第一个可查看图表的中位时间小于 15 分钟，不含环境首次安装时间。
- **SM-3:** 80% 以上的图表修改可通过 Artifact → 源代码 → 新 Run 链路完成。
- **SM-4:** 内部研究人员认为来源链“足以复核”的任务比例达到 90%。

### 质量指标

- **SM-5:** 100% 托管 Artifact 具有 producing Run、输入、代码和环境引用。
- **SM-6:** Golden workflow 干净重放成功率不低于 95%。
- **SM-7:** 对人工植入的不可追溯数字和环境缺失问题，Reviewer 检出率不低于 90%。
- **SM-8:** 自动化 egress 测试中未经批准的数据外发为 0。
- **SM-9:** 崩溃恢复测试中已完成 Run/Artifact 丢失为 0。
- **SM-10:** 未解决 Review error 的报告被错误标记为 `reviewed` 的数量为 0。

## 13. Delivery Plan

### Milestone 0：范围、架构与安全基线（第 1–2 周）

- 完成数据模型和 ADR。
- 确定三个 golden workflow fixture。
- 确定 Python/Jupyter 集成方式。
- 完成 Data Egress 威胁模型。
- 建立 Science Product Mode 和 feature flag 方案。
- 明确内部研究用途和分发限制。

**Exit Criteria:** 架构评审通过；所有 P0 Story 有 owner 和测试策略。

### Milestone 1：Project、Dataset、Environment（第 3–6 周）

- US-001、US-002、US-003、US-005。
- Research Project 数据库与迁移。
- Dataset Registry 和安全预览。
- Python 环境检测与项目环境创建。

**Exit Criteria:** 可在 macOS/Linux 创建项目、注册 fixture、创建环境并重启恢复。

### Milestone 2：Plan、Kernel、Run、Provenance（第 7–11 周）

- US-006、US-007、US-008、US-009、US-010、US-019。
- Jupyter Kernel bridge。
- Run 状态机和事件日志。
- Data Egress preview/approval。

**Exit Criteria:** 表格 golden workflow 可从计划执行到 restart-and-run-all，且无未记录外发。

### Milestone 3：Artifact、Report、Review（第 12–16 周）

- US-011、US-012、US-014、US-015、US-017。
- Artifact Canvas。
- 报告来源绑定。
- 计算和可复现性 Reviewer。

**Exit Criteria:** 三个 golden workflow 生成可追溯图表和报告，并能发现植入问题。

### Milestone 4：版本、导出和 Beta 稳定性（第 17–20 周）

- US-013、US-016、US-018、US-020、US-021、US-022 中的 Beta 必需项。
- Artifact 修改与分支比较。
- 研究包导出。
- 崩溃恢复、性能、安装包 smoke。

**Exit Criteria:** 内部试用者能够在两种操作系统上完成主流程，所有 P0 指标达到发布阈值。

第 21–24 周作为缺陷修复、域专家反馈和范围缓冲，不承诺在此阶段加入 HPC 或云计算。

## 14. Team Workstreams

建议拆成四条可并行、文件所有权相对清晰的工作流：

1. **Research Platform**
   - Project、Dataset、SQLite、迁移、Export、Recovery。
2. **Compute Runtime**
   - Environment、Kernel、Run、Provenance、进程控制。
3. **Desktop Experience**
   - Science Mode、Research Navigator、Artifact Canvas、Review UI。
4. **Agent and Evaluation**
   - Coordinator、Skills、Reviewer、golden workflows、数据外发评测。

若只有 3 名工程师，Agent/Evaluation 由 Research Platform 负责人兼任，并将 P1 Story 延后。若有 5 名工程师，第五人优先投入安全、测试和 Linux 打包，而不是增加连接器数量。

## 15. Verification Strategy

### 单元测试

- 数据模型和迁移。
- Dataset 哈希和格式检测。
- Run 状态机。
- Provenance event → manifest 投影。
- Artifact 版本解析。
- Review 数字提取和 deterministic rules。
- Egress payload 与 preview 一致性。

### 集成测试

- 使用临时项目目录和临时 `CLAUDE_CONFIG_DIR`。
- 使用小型真实 Jupyter Kernel 执行固定 Notebook。
- 模型、MCP 和网络请求全部使用 mock/loopback。
- 覆盖取消、Kernel 崩溃、应用重启和文件外部修改。
- 覆盖旧项目 fixture 的迁移。

### 桌面 E2E

- 创建项目。
- 注册数据。
- 创建/选择环境。
- 批准计划和 egress。
- 执行 Notebook。
- 打开 Artifact。
- 生成和审阅报告。
- 导出研究包。
- 在临时目录验证研究包。

### 科学评测

- 每个 golden workflow 提供期望统计量和图表属性。
- 在报告中植入错误数字、错误单位和缺失来源，测量 Reviewer 检出率。
- 在 Notebook 中植入隐藏状态，证明 restart-and-run-all 能发现。
- 人工域专家检查方法、解释和限制是否被正确呈现。

### 最低工程检查

开发期间运行最窄相关测试；每个交付批次运行：

- `bun run check:impact`
- 持久化变化运行 `bun run check:persistence-upgrade`
- Server 变化运行被影响检查选中的 server lane
- Desktop 变化运行被影响检查选中的 desktop/chat lane
- 真实浏览器/桌面 smoke 记录实际路径

只有在明确要求 PR-ready 时才运行完整 `bun run verify`。真实模型调用必须单独授权，不属于确定性 CI。

## 16. Risks and Mitigations

### R-1：源码和产品定位风险

**风险：** 当前仓库声明来自泄露源码，并禁止商业使用、复制竞品和重新分发。

**缓解：** 仅限内部研究原型；不公开构建产物；不使用 Anthropic 产品名称；商业化前进行法律评审并独立重建。

### R-2：科学正确性被 UI 状态误导

**风险：** “成功运行”容易被用户理解为结论正确。

**缓解：** 严格区分运行、可复现、自动审阅和人工批准；界面不使用单一通过状态。

### R-3：Notebook 隐藏状态

**风险：** cell 执行顺序导致结果无法重现。

**缓解：** restart-and-run-all 才能标记可复现；记录执行顺序和 Kernel 状态。

### R-4：数据泄露

**风险：** Agent 可能通过 prompt、Tool result、附件或 MCP 隐式发送原始数据。

**缓解：** 统一 Data Egress 层；实际 payload 校验；默认拒绝完整数据；覆盖所有消息路径的测试。

### R-5：环境安装不可预测

**风险：** Conda/Python 包、编译依赖和平台差异造成失败。

**缓解：** P0 优先 Python/uv 或明确的现有解释器；依赖安装审批；缓存失败不破坏旧环境；golden workflow 固定依赖。

### R-6：Artifact 渲染攻击面

**风险：** HTML、SVG、Notebook 输出可执行脚本或访问本地资源。

**缓解：** sandbox iframe、CSP、协议 allowlist、禁用 Node integration、对 SVG 和 HTML 做安全处理。

### R-7：范围膨胀

**风险：** 生命科学格式、数据库和工作流数量巨大。

**缓解：** Beta 只围绕三个 golden workflow；新连接器、HPC、R 和专业 3D 渲染必须通过单独范围评审。

## 17. Open Questions

以下问题不阻塞 PRD v1，但必须在 Milestone 0 结束前回答：

1. 第一个内部试用团队更接近单细胞、转录组、蛋白组还是通用统计分析？
2. Python 环境默认采用项目专用 `uv`，还是优先接管实验室已有 Conda 环境？
3. Beta 是否只使用 Anthropic 官方模型，还是保留现有多 Provider 选择？
4. 数据外发规则是每次批准，还是允许项目级“只发送 schema/汇总统计”规则？
5. `.sciencex` 是否允许与研究目录一起备份，还是默认放在用户配置目录并只保存路径引用？
6. P0 报告只需要 Markdown，还是必须包含 PDF 导出？
7. `.h5ad` 单细胞 workflow 是否属于 P0 发布门槛，还是 P1 Beta 增量？
8. 内部使用是否包含受限制的人类基因组数据；如果包含，需要先增加更严格的项目策略和审计要求。
9. 研究包的主要消费者是另一台 ScienceX、普通 Jupyter 用户，还是只做人工审阅？
10. 是否要求所有 Agent 生成的 Python 代码同时生成普通 `.py` 脚本，减少 Notebook 锁定？

## 18. Beta Release Gate

只有同时满足以下条件才能标记内部 Beta：

- [ ] 所有 P0 User Story 验收通过。
- [ ] 三个 golden workflow 至少两个完全通过，第三个不存在数据安全或丢失类阻塞问题。
- [ ] Egress 自动化测试中未经批准的原始数据外发为 0。
- [ ] 所有 Artifact 具有完整 Run、代码、环境和输入引用。
- [ ] restart-and-run-all 可识别隐藏状态 fixture。
- [ ] 崩溃和重启不会丢失已完成 Run 与 Artifact。
- [ ] macOS 和 Linux 各完成一次真实桌面端到端 smoke。
- [ ] 数据持久化迁移和旧 fixture 测试通过。
- [ ] 不包含真实用户密钥、真实患者数据或开发者真实 `~/.claude` 状态。
- [ ] 内部使用说明明确声明研究原型、非临床用途、非科学正确性保证和禁止分发。

