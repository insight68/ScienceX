# PRD：ScienceX 预装完整实验案例与新手引导

## 0. 文档状态

- **状态**：Confirmed v1，可进入技术拆分
- **功能名称**：完整实验案例 / Complete Experiment Example
- **目标版本**：ScienceX 本地生命科学工作台首个教学案例
- **目标用户**：首次使用 ScienceX 的湿实验研究人员、实验室数据分析人员和计算生命科学初学者
- **案例语言**：中文 UI 与中文引导优先，同时提供中英文案例文档
- **运行边界**：完全本地、无需模型、无需网络、无需 Provider 凭据

### 已确认决策

1. 案例在空状态作为主入口，在已有项目时作为“新建项目”菜单中的次入口；首次启动不自动创建文件。
2. 系统预置项目、模拟数据集和执行就绪的实验定义，但不预置 Run 或分析产物；用户必须亲自运行和重放。
3. V1 只提供一个稳定成功的黄金案例，不在首次体验中混入故意制造的质量警告。
4. 用户选择父目录，ScienceX 创建一个不覆盖现有内容的新子目录。
5. 面向中文新手提供步骤化解释，同时在案例目录中生成中文和英文说明文档。

### 产品边界声明

本功能提供一条完整的**数字实验分析工作流**：研究问题、实验方案、板图、模拟仪器数据、数据版本、确定性分析、结果解释、研究产物、来源链和重放验证。

它不能替代或声称完成真实湿实验中的细胞培养、接种、加药、孵育、读板、仪器校准和生物学重复。所有案例数据必须持续标记为“模拟数据 · 教学用途”，不得被描述为真实化合物药效证据。

## 1. Introduction / Overview

ScienceX 已经具备本地 Research Project、CSV/TSV 数据集注册与快照、细胞活力实验设计、确定性 4PL 剂量—反应分析、不可变 Artifact 和 Run 重放能力。但新用户仍需要自行准备目录、设计实验、生成正确格式的数据、完成字段映射并理解各个工作区之间的关系，首次体验门槛较高。

本功能在应用中预装一个“**SX-101 对 HepG2 细胞 48 小时活力的影响（模拟实验）**”案例。用户点击入口并选择保存位置后，ScienceX 在本地创建一个真实、可编辑的项目副本，并引导用户沿产品真实路径完成：

```text
预装案例目录
  → 创建真实 Research Project
  → 注册并锁定模拟板读数 Dataset Version
  → 创建执行就绪的 Experiment Blueprint
  → 用户运行 4PL 分析
  → 查看 Run、曲线指标与三个 Artifact
  → 用户重放 Run
  → 验证结果 reproducible
  → 引导创建用户自己的实验项目
```

案例不是独立的演示壳、截图或只读沙箱。除了持续显示教学标识外，它与用户自行创建的研究项目共用相同的后端服务、数据库、数据快照、分析器、运行事件和桌面组件。

## 2. Problem Statement

当前首次使用路径存在以下问题：

- 用户必须先理解 Project、Dataset、Experiment、Run 和 Artifact 才能准备一个可运行案例。
- 正确的板图、对照、浓度、复孔和 CSV 字段需要领域知识，容易在首次体验时配置失败。
- 单独展示功能页面不能说明数据版本如何进入实验、Run 如何生成 Artifact、重放如何证明可复现。
- 如果预置一个已完成的 Run，用户会看到结果，却没有执行过关键操作，无法形成可靠的使用心智模型。
- 如果应用自动在首次启动时创建项目，会污染用户目录，也不符合本地项目由用户控制的原则。
- 如果案例结果没有清晰的模拟数据标识，用户可能误把教学数据当作真实科学证据。

因此需要一条安全、确定、可重复、可在数分钟内完成，同时完全复用真实产品路径的引导案例。

## 3. Goals

### G-1：让新用户完成真实产品闭环

首次用户无需准备自己的数据，即可完成 Project → Dataset → Experiment → Run → Artifact → Replay 的完整路径。

### G-2：在三分钟内形成核心心智模型

在支持的桌面环境中，用户从点击入口到看到首次 4PL 分析结果的中位时间不超过 3 分钟，主要交互不超过 7 次。

### G-3：保持来源链和可复现性真实有效

案例 Run 必须由当前确定性分析器现场生成，并记录真实数据版本、实验版本、recipe hash、输入 hash、事件日志和 Artifact hash。重放必须创建新的子 Run，而不是切换一个预置状态。

### G-4：保证本地、安全和不覆盖

案例创建与执行不访问公网、不调用模型、不读取用户凭据、不覆盖任何已有目录或文件，也不自动写入用户未选择的位置。

### G-5：准确传达科学边界

用户能够理解相对 IC50、Hill slope、R²、技术复孔和生物学重复的基本含义，并清楚知道模拟分析成功不等于真实药效成立。

### G-6：建立稳定的端到端验收基线

同一案例同时作为新手教学资产、后端集成 fixture、桌面真实工作流 smoke 和打包资源可用性检查。

## 4. Target Case Specification

### 4.1 研究问题

> 在模拟的 CCK-8 实验条件下，SX-101 是否随浓度升高降低 HepG2 细胞的相对活力，其相对 IC50 是否位于已测试浓度范围内？

### 4.2 实验协议

| 字段 | 固定值 |
| --- | --- |
| 细胞系 | HepG2 |
| 测试物 | SX-101（虚构化合物） |
| Assay | Cell viability dose response |
| 读出方法 | CCK-8 / OD450 |
| 处理时间 | 48 h |
| 接种密度 | 4,000 cells/well |
| 浓度单位 | µM |
| 浓度 | 0.01、0.1、1、10、100 |
| 技术复孔 | 每组 3 孔 |
| 空白对照 | 有 |
| 溶剂对照 | DMSO，终浓度 0.1% |
| 阳性对照 | Staurosporine |
| 板型 | 96 孔板 |

### 4.3 板图

板图沿用现有实验服务的确定性布局：A、B、C 行对应三个技术复孔，1–8 列依次为：

1. Blank
2. DMSO vehicle control
3. Staurosporine positive control
4. SX-101 0.01 µM
5. SX-101 0.1 µM
6. SX-101 1 µM
7. SX-101 10 µM
8. SX-101 100 µM

总计 24 个已分配孔。模板 CSV 只包含这 24 个孔，字段固定为：

```csv
well,signal
A1,9.6
B1,10
C1,10.4
```

完整数据由一个版本化的确定性生成函数产生，不能在每次创建时加入随机噪声。生成规则、模板版本和预期摘要必须在同一模块中维护，避免说明文档、板图和 CSV 漂移。

### 4.4 预期分析范围

首次 Run 应满足以下范围，而不是依赖不稳定的完整浮点字符串：

- `scope = full-linked-plate`
- `assignedWellCount = 24`
- `ignoredRowCount = 0`
- `blankMeanSignal ≈ 10`
- `vehicleMeanBlankCorrectedSignal ≈ 100`
- 相对 IC50 约为 `1 µM`
- Hill slope 约为 `1.2`
- `R² > 0.99`
- `testedRangePosition = within-range`
- 分析状态为 `completed`
- 首次 Run 的复现状态为 `unchecked`
- 生成 3 个 Artifact：分析报告、归一化孔数据、剂量—反应 JSON
- 重放生成新的 child Run，且 `reproducibilityStatus = reproducible`
- 重放 summary 与首次 Run summary 深度相等

### 4.5 教学解释

引导内容必须说明：

- 相对 IC50 是在本案例的归一化和拟合规则下估算的半最大效应浓度。
- Top、Bottom 和 Hill slope 是 4PL 模型参数，不是独立的生物学结论。
- R² 描述拟合程度，不能单独证明实验设计、样本质量或药效可靠。
- 三个孔是技术复孔，不等于三次独立生物学重复。
- 真实实验还需要预设质控标准、独立生物学重复、仪器与样本质量检查以及适当的统计分析。

## 5. Primary User Journey

1. 用户进入 Science 工作台，在无项目空状态看到“体验完整实验案例”。
2. 用户点击入口，阅读“模拟数据、完全本地、不会覆盖已有文件”的说明。
3. 用户选择一个已有且允许访问的父目录。
4. ScienceX 创建名称不冲突的子目录，并物化真实 Project、Dataset 和 Experiment。
5. 系统打开新项目，在顶部和引导卡中显示“模拟数据 · 教学用途”。
6. 用户查看研究问题、实验方案、板图和 readiness。
7. 用户查看 `plate-reader.csv` 的 `well` 与 `signal` 字段和 24 行模拟数据。
8. 用户点击运行，显式确认 `wellColumn=well`、`signalColumn=signal`。
9. ScienceX 运行现有 `cell-viability-dose-response-v1` recipe，并切换到 Run 结果。
10. 用户查看相对 IC50、Hill slope、R²、运行事件和三个 Artifact。
11. 用户点击“重放为新运行”。
12. ScienceX 创建 child Run，显示 `reproducible`，引导卡进入完成状态。
13. 用户可点击“创建自己的实验项目”；示例项目继续作为普通本地项目保留。

## 6. User Stories

### US-001：定义版本化的内置案例目录

**Description:** 作为开发者，我希望案例由一个受版本控制的类型化目录描述，以便应用、测试和文档使用同一套确定性内容。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 增加唯一案例 ID `cell-viability-dose-response-v1` 和独立 `templateVersion`。
- [ ] 目录包含中英文标题、摘要、研究问题、协议、板图、CSV 生成器、文档生成器和预期结果范围。
- [ ] 生成相同版本案例时，CSV 字节和内容哈希完全一致。
- [ ] 自动测试验证 24 个 CSV 孔位与实验 design 一一对应，无缺失、重复或额外孔位。
- [ ] 自动测试验证案例通过现有 experiment readiness，blocking 和 warning 均为 0。
- [ ] 案例内容编译进本地服务，不依赖运行时网络或开发仓库路径。
- [ ] Typecheck、lint 和相关单元测试通过。

### US-002：列出可用案例

**Description:** 作为桌面用户，我希望客户端读取服务端提供的案例目录，以便界面不硬编码一个不可扩展的演示按钮。

**Priority:** P0

**Acceptance Criteria:**

- [ ] `GET /api/science-examples` 返回案例 ID、模板版本、本地化标题和摘要、assay type、预计耗时及 `localOnly: true`。
- [ ] 列表响应不包含原始数据内容，不创建目录、不创建项目且不改变注册表。
- [ ] 不支持的 locale 回退到英文；中文和繁体中文均可选择中文案例内容。
- [ ] 未知案例 ID 不出现在列表中。
- [ ] API schema 和服务层单元测试覆盖正常列表与 locale 回退。

### US-003：安全物化案例副本

**Description:** 作为用户，我希望选择父目录后创建一个独立案例副本，以便我可以自由操作，同时不会覆盖已有研究文件。

**Priority:** P0

**Acceptance Criteria:**

- [ ] `POST /api/science-examples/:exampleId/materialize` 接收 `parentDir` 与 `locale`，不接受客户端传入协议、CSV 或预期结果。
- [ ] 服务端对父目录执行现有 allowlist、真实路径、符号链接目标、目录类型和可写性检查。
- [ ] 默认子目录名称为本地化的案例名称；发生冲突时依次生成 `-2`、`-3`，永不复用或覆盖已有路径。
- [ ] 使用非递归目录创建锁定最终名称，避免两个并发请求获得同一路径。
- [ ] 在新目录中创建真实 Research Project、数据文件、数据集快照和执行就绪的 Experiment。
- [ ] Experiment 锁定物化时生成的数据集版本。
- [ ] 响应返回 `project`、`dataset`、`experiment` 和 `guide`，不返回 Run 或 Artifact。
- [ ] 成功响应中 `project.rootDir` 为最终子目录，而不是用户选择的父目录。
- [ ] 两次成功请求生成两个不同项目、目录和稳定内容相同的数据文件。
- [ ] 创建流程不调用模型、不读取 Provider 配置、不访问公网。
- [ ] 中途失败时不得删除或修改任何请求前已经存在的文件；新建目录写入明确的 `provisioning-failed` 标记并允许同一请求重试恢复，或在能证明目录仍完全由本次请求拥有时执行范围精确的回滚。
- [ ] 集成测试覆盖目录冲突、并发创建、路径越界、符号链接越界、父路径不存在、父路径不可写和物化中途失败。

### US-004：标记并识别教学项目

**Description:** 作为用户，我希望应用始终识别这是模拟教学项目，以免把案例结果与真实研究混淆。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 项目目录包含 `.sciencex/example.json`，至少记录 `schemaVersion`、`exampleId`、`templateVersion`、`simulatedData: true`、`locale` 和 `materializedAt`。
- [ ] `ScienceProject` API 增加可选的只读 `example` 元数据；普通项目返回 `example: null` 或省略该字段。
- [ ] 无效、未知版本或路径越界的 marker 不得被信任；项目仍可作为普通项目打开，并记录可诊断错误。
- [ ] V1 不为该标记修改 `research.sqlite` schema，不修改普通项目的 project manifest。
- [ ] 读取 marker 不执行其中的路径、命令或任意内容。
- [ ] 自动测试覆盖有效 marker、损坏 JSON、未知字段和普通项目。

### US-005：在空状态提供主入口

**Description:** 作为首次用户，我希望无项目时直接看到完整案例入口，以便不必先理解如何自行准备实验数据。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 无项目空状态同时显示主按钮“体验完整实验案例”和次按钮“创建空白项目”。
- [ ] 案例入口说明预计用时、完全本地、模拟数据和不会覆盖已有文件。
- [ ] 点击后打开案例创建对话框，不立即写入任何目录。
- [ ] 非桌面环境或目录对话框不可用时禁用创建动作，并显示可理解的原因。
- [ ] 创建期间按钮显示 loading 并禁止重复提交。
- [ ] API 失败后对话框保留用户已选父目录，并提供重试。
- [ ] 中英文界面文案完整；其它已支持 locale 不出现缺失 key。
- [ ] 页面和状态测试覆盖空状态、创建中、成功和失败。
- [ ] Verify in browser using dev-browser skill.

### US-006：在已有项目时提供次入口

**Description:** 作为已有用户，我希望随时创建新的教学案例副本，以便重新学习或演示，而不影响当前项目。

**Priority:** P1

**Acceptance Criteria:**

- [ ] “新建项目”入口中包含“空白项目”和“从完整实验案例创建”两个明确选项。
- [ ] 创建案例前不改变当前选中的项目。
- [ ] 创建成功后选择新项目；原项目的数据、Run、Artifact 和文件不发生改变。
- [ ] 再次创建案例时不提供破坏性“恢复默认”，而是创建新副本。
- [ ] Store 和页面测试证明成功选择、失败保持原选择和重复创建行为。
- [ ] Verify in browser using dev-browser skill.

### US-007：显示案例身份和步骤引导

**Description:** 作为新用户，我希望看到短小、可操作的步骤引导，以便理解每个真实产品对象在实验中的作用。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 教学项目顶部持续显示“模拟数据 · 教学用途”徽标，不只在首次弹窗显示。
- [ ] 引导卡展示七步：研究问题、实验设计、原始数据、运行分析、解读结果、查看产物、重放验证。
- [ ] 每一步包含一个主动作，可切换到真实 Experiment、Data、Run 或 Artifact 区域。
- [ ] Project、Dataset 和 ready Experiment 三个预置状态显示为已准备，但用户仍可打开查看其内容。
- [ ] 首次 completed dose-response Run 出现后，运行步骤自动完成。
- [ ] 用户进入所选 Run 后展示简短结果解释；解释不生成或保存新的科学结论。
- [ ] 三个目标 Artifact 可见后，产物步骤自动完成。
- [ ] 存在 `parentRunId` 指向案例首次 Run 且状态为 `reproducible` 的 child Run 后，重放步骤自动完成。
- [ ] 引导进度优先由真实领域状态推导；V1 不新增持久化的 localStorage schema。
- [ ] 重启后即使纯浏览步骤回到当前引导位置，已存在的 Run、Artifact 和 replay 完成状态仍能正确恢复。
- [ ] 普通项目不显示教学引导或模拟数据徽标。
- [ ] Verify in browser using dev-browser skill.

### US-008：由用户显式运行案例分析

**Description:** 作为学习者，我希望亲自启动确定性 4PL 分析，以便理解字段映射、输入版本和 Run 的关系。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 物化流程不自动创建 Run 或 Artifact。
- [ ] 引导动作选中预置 Experiment 和 Dataset，并将字段映射建议为 `well` 与 `signal`。
- [ ] 运行按钮沿用现有 `cell-viability-dose-response-v1` API，不调用案例专用分析捷径。
- [ ] 运行前仍展示并允许用户核对字段映射。
- [ ] 分析使用 Experiment 已锁定的数据集版本。
- [ ] 结果符合 4.4 的预期范围并生成三个真实 Artifact。
- [ ] Run 事件依次包含创建、开始、三个 Artifact 创建和完成事件。
- [ ] 现有剂量—反应 API 集成测试扩展案例 fixture，不能只 mock 前端响应。
- [ ] Verify in browser using dev-browser skill.

### US-009：引导用户解释结果而不夸大结论

**Description:** 作为湿实验研究人员，我希望看到与当前结果相邻的科学解释，以便正确理解模型输出及其限制。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 结果区对相对 IC50、Hill slope、Top、Bottom、R² 和 tested-range position 提供简短解释。
- [ ] 明确区分技术复孔和生物学重复。
- [ ] 明确写出“拟合成功不等于真实药效成立”。
- [ ] 文案不使用“证明有效”“确认药效”或等价结论。
- [ ] 解释使用已有 Run summary 的值，不复制一份可能漂移的预置结果作为主结果。
- [ ] 中英文文案通过 key 完整性检查。
- [ ] Verify in browser using dev-browser skill.

### US-010：完成重放和案例收尾

**Description:** 作为学习者，我希望重放首次 Run 并看到可复现状态，以便理解 ScienceX 的可追溯性价值。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 引导中的“验证可复现”调用现有 Run replay API。
- [ ] replay 创建新 Run，保留原 Run，不覆盖原 Artifact。
- [ ] 新 Run 的 `parentRunId` 指向首次 Run，复现状态为 `reproducible`，summary 与父 Run 相同。
- [ ] 完成卡显示用户实际完成的 Project、Dataset version、父子 Run 和 Artifact 数量。
- [ ] 完成卡提供“创建自己的实验项目”和“创建新的案例副本”，不提供删除或重置按钮。
- [ ] “创建自己的实验项目”打开现有空白项目流程，不自动复制模拟数据。
- [ ] Verify in browser using dev-browser skill.

### US-011：生成案例目录中的双语说明

**Description:** 作为用户，我希望案例目录带有可独立阅读的实验说明，以便离开引导 UI 后仍能理解数据、方法和限制。

**Priority:** P1

**Acceptance Criteria:**

- [ ] 物化后生成 `README.zh-CN.md`、`README.en.md`、`protocol/assay-plan.md`、`expected/expected-results.md` 和 `data/plate-reader.csv`。
- [ ] README 说明目录结构、如何在 ScienceX 中运行、模拟数据边界和不应形成的结论。
- [ ] assay plan 列出协议、板图、对照和技术复孔定义。
- [ ] expected results 只描述允许范围，并明确标记“参考说明，不是已执行 Run 的输出”。
- [ ] 文档中的字段、剂量、孔位和预期范围由同一案例目录数据生成或通过一致性测试验证。
- [ ] 文档中不包含外部链接作为完成案例的必要条件。
- [ ] `bun run check:docs` 只在案例被纳入正式 docs 导航时选中；项目目录内生成的 Markdown 由服务测试验证。

### US-012：保证开发、打包和离线环境行为一致

**Description:** 作为维护者，我希望案例在源码开发和打包 sidecar 中都可用，以免发布后入口存在但模板缺失。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 案例主体通过 TypeScript 模块或构建明确包含的资源进入 sidecar；不得依赖 `process.cwd()` 指向源码仓库。
- [ ] 若使用外部静态资源，桌面打包配置显式声明资源，并有 package-smoke 验证。
- [ ] 在无网络、无模型凭据和临时配置目录环境中可完成物化、分析和重放。
- [ ] 测试不得读取真实 `~/.claude`、Keychain、Provider 或用户项目。
- [ ] 临时测试目录在测试结束后显式清理。
- [ ] `bun run check:impact` 选择的 server、desktop、provider/chat contract 或 package smoke 检查全部通过。

### US-013：完成真实桌面教学旅程验收

**Description:** 作为发布验收人员，我希望通过真实桌面或浏览器路径完成整个案例，以便验证单元测试不能证明的跨进程交互和可用性。

**Priority:** P0

**Acceptance Criteria:**

- [ ] 从无项目空状态开始，选择临时父目录并成功创建案例。
- [ ] 界面显示模拟数据标识、24 行数据和 ready Experiment。
- [ ] 用户通过 UI 运行分析，看到相对 IC50、R² 和三个 Artifact。
- [ ] 用户通过 UI 重放，看到新的 reproducible child Run。
- [ ] 第二次创建案例得到新目录，第一次案例保持不变。
- [ ] 记录截图或测试证据，并注明这是本地模拟案例，不是 live-provider 或真实湿实验验证。
- [ ] Verify in browser using dev-browser skill.

## 7. Functional Requirements

### 7.1 案例目录与数据

- **FR-1:** 系统必须内置唯一 V1 案例 `cell-viability-dose-response-v1`。
- **FR-2:** 案例目录必须有独立 `templateVersion`，其变化不能修改已经物化的旧案例内容。
- **FR-3:** 同一模板版本必须产生字节确定的 CSV、协议和参考结果文档。
- **FR-4:** 案例必须使用虚构化合物 SX-101 和明确的模拟数据标识。
- **FR-5:** 案例 CSV 必须只有 `well`、`signal` 两列和 24 个已分配孔。
- **FR-6:** 案例设计必须由当前 `ScienceExperimentService` 判定为 ready，且无 blocking/warning issue。
- **FR-7:** 案例预期结果必须使用范围断言，浮点序列不得作为用户可见的绝对真值。

### 7.2 API 与物化

- **FR-8:** 系统必须提供只读案例列表 API。
- **FR-9:** 系统必须提供服务端控制内容的案例物化 API；客户端只能选择案例 ID、父目录和 locale。
- **FR-10:** 父目录必须已存在、是目录、可写，并通过当前文件系统 allowlist 与 symlink 目标检查。
- **FR-11:** 系统必须在父目录下创建新的子目录，不能把 `.sciencex` 直接写入用户选择的父目录。
- **FR-12:** 目录冲突时必须生成新名称，不能要求用户同意覆盖。
- **FR-13:** 物化必须复用当前 Project、Dataset 和 Experiment 领域服务，禁止直接伪造客户端 Store 数据。
- **FR-14:** 数据集注册必须生成不可变快照和内容哈希。
- **FR-15:** Experiment 必须链接并锁定物化时生成的数据集版本。
- **FR-16:** 物化成功时项目中不能存在 analysis run 或 artifact 数据。
- **FR-17:** 物化失败不得更改请求前存在的数据，并必须给出可重试的错误状态。
- **FR-18:** 同一个 materialize 请求在客户端 loading 期间必须防止重复提交；服务端仍须正确处理并发创建。

### 7.3 教学项目识别

- **FR-19:** 每个物化案例必须包含 `.sciencex/example.json` marker。
- **FR-20:** 服务端必须把经过验证的 marker 映射为可选 `ScienceProject.example` 元数据。
- **FR-21:** marker 只能用于展示和引导，不能扩大路径、模型、MCP、Shell 或数据读取权限。
- **FR-22:** 普通项目的行为、数据库 schema 和显示不得因该功能发生变化。

### 7.4 桌面交互

- **FR-23:** 无项目状态必须优先展示案例入口，同时保留空白项目入口。
- **FR-24:** 已有项目时必须能从新建入口创建案例副本。
- **FR-25:** 目录选择确认前不得执行任何文件写入。
- **FR-26:** 创建成功后必须选中新案例项目并进入引导的当前步骤。
- **FR-27:** 教学项目所有核心页面必须持续显示模拟数据徽标。
- **FR-28:** 七步引导必须链接到现有 Experiment、Data、Run 和 Artifact 页面。
- **FR-29:** Run、Artifact 和 replay 进度必须从真实服务端状态推导，不能由单独的“已完成”布尔值伪造。
- **FR-30:** V1 不新增持久化 onboarding store；需要恢复的核心完成度从项目领域状态恢复。

### 7.5 分析与重放

- **FR-31:** 用户必须显式触发首次 4PL 分析。
- **FR-32:** 分析必须调用现有 `cell-viability-dose-response-v1` recipe，字段映射为 `well` 与 `signal`。
- **FR-33:** 首次分析必须产生真实 Run、事件日志、manifest 和三个 Artifact。
- **FR-34:** 参考结果文档不得被登记为 Run Artifact，也不得显示为已经执行的结果。
- **FR-35:** 用户必须显式触发 replay。
- **FR-36:** replay 必须生成新的 child Run，并使用原始锁定输入验证 summary 可复现。

### 7.6 本地性与科学沟通

- **FR-37:** 案例列表、物化、运行和重放均不得发起模型调用或网络请求。
- **FR-38:** 功能不得读取真实用户密钥、模型 Provider、聊天记录或其他项目数据。
- **FR-39:** 中文与英文说明必须明确：数据模拟、化合物虚构、教学用途、不能形成药效结论。
- **FR-40:** UI 必须解释技术复孔不等于生物学重复，以及 R² 不等于实验有效性证明。

## 8. UX and Content Design

### 8.1 空状态层级

空状态建议采用一张主要教学卡和一个较弱的空白项目动作：

```text
┌──────────────────────────────────────────────┐
│  用一个完整实验案例认识 ScienceX             │
│  模拟 CCK-8 数据 · 约 3 分钟 · 完全本地       │
│                                              │
│  [体验完整实验案例]     [创建空白项目]         │
└──────────────────────────────────────────────┘
```

不能用“立即得到药效结论”“AI 自动做实验”等表述。

### 8.2 创建确认

确认对话框需要同时展示：

- 将创建一个新的子目录；
- 现有文件不会被覆盖；
- 数据为模拟数据；
- 不调用模型、不联网；
- 用户可以保留、修改或自行删除创建后的副本；
- 目录冲突时系统会自动使用新名称。

### 8.3 项目内引导

引导卡应尽量嵌入现有工作台，不使用遮挡整页的连续 tour。每步只包含：

- 当前目标；
- 为什么需要这一步；
- 一个进入真实功能的按钮；
- 从真实状态推导的完成标记。

引导允许收起；模拟数据徽标不能被收起。

### 8.4 完成状态

完成不是“得到药效结论”，而是：

> 你已经用锁定的数据版本完成了一次确定性剂量—反应分析，并通过重放验证结果可复现。

完成卡下一步提供：

1. 创建自己的空白实验项目；
2. 创建新的案例副本；
3. 继续查看当前项目的来源链与 Artifact。

## 9. Technical Considerations

### 9.1 推荐模块边界

建议新增：

```text
src/server/science-examples/
├── catalog.ts
└── cellViabilityDoseResponseV1.ts

src/server/services/
└── scienceExampleService.ts
```

- `catalog.ts` 只暴露经过验证的案例描述符。
- `cellViabilityDoseResponseV1.ts` 保存协议、确定性板数据和中英文文档生成函数，使 Bun 编译后不依赖源码相对路径。
- `scienceExampleService.ts` 负责父目录校验后的名称分配、物化编排、marker 和失败恢复。
- `scienceWorkspaceService`、`scienceExperimentService` 和 `scienceAnalysisService` 继续拥有各自领域状态，不把案例特例写进分析器。

如果实现选择静态文件而非 TypeScript 字符串，必须同步修改 sidecar/package resources 并增加打包 smoke；不能只在开发模式通过。

### 9.2 推荐 API

```http
GET /api/science-examples?locale=zh-CN

POST /api/science-examples/cell-viability-dose-response-v1/materialize
Content-Type: application/json

{
  "parentDir": "/allowed/existing/directory",
  "locale": "zh-CN"
}
```

成功响应：

```json
{
  "project": {},
  "dataset": {},
  "experiment": {},
  "guide": {
    "exampleId": "cell-viability-dose-response-v1",
    "templateVersion": 1,
    "recommendedWellColumn": "well",
    "recommendedSignalColumn": "signal"
  }
}
```

### 9.3 不做数据库迁移的 V1 方案

V1 使用 `.sciencex/example.json` 表达案例身份，列表项目时按白名单 schema 读取为可选字段。这样不增加 `research.sqlite` migration，也不会让普通项目承担教学字段。

marker 必须只读解析，不接受其中覆盖 `rootDir`、数据路径或 recipe。未知字段被忽略，未知 schema 版本降级为普通项目并显示诊断信息。

### 9.4 失败与恢复

物化是短操作，但会跨文件系统、项目注册表和项目数据库，不能假设天然原子。实现前必须选择并测试一种明确策略：

1. **推荐：可恢复 provision。** 先以排他创建保留最终目录，写入 provisioning marker，逐步通过现有服务创建对象；每步记录稳定 ID。重试读取 marker 并补齐缺失步骤，ready 后替换 marker 状态。
2. **可选：精确回滚。** 只有当服务能证明目录和注册记录完全由本次请求创建、且没有用户新增内容时，才回滚本次对象；不得使用宽泛递归删除。

不能在失败时静默留下一个看似成功但缺少 Dataset 或 Experiment 的案例。

### 9.5 进度推导

V1 不增加 localStorage 持久化字段。引导使用：

- marker 判断是否为案例项目；
- Dataset/Experiment 判断案例已准备；
- completed recipe Run 判断分析已运行；
- Artifact registry 判断产物已生成；
- parent/child Run 与 reproducibility status 判断重放已完成；
- 纯浏览步骤只作为当前桌面会话中的导航提示。

这避免引入持久化升级，同时保证重启后科学上重要的进度仍准确。

### 9.6 性能

- 案例列表响应目标 `< 50 ms`，不访问项目目录。
- 在本地 SSD 的支持设备上，物化目标 `< 1 s`，不含用户选择目录的时间。
- 4PL 分析沿用当前本地确定性性能边界。
- CSV 很小，不引入新的大文件或内存策略。

### 9.7 安全

- 遵守现有 `isAllowedFilesystemPath` 与 canonical path 规则。
- 不根据 locale、案例标题或客户端输入直接拼接未清理路径。
- 不执行模板中的命令，不解析任意脚本。
- 测试全部使用临时 `CLAUDE_CONFIG_DIR` 和临时项目目录。
- 案例身份不授予额外 Shell、MCP、Agent 或模型权限。

## 10. Delivery Plan

### Phase 1：案例目录与后端物化

- 实现类型化案例目录和确定性内容。
- 实现 list/materialize API。
- 添加 marker 识别与 `ScienceProject.example`。
- 完成路径、冲突、失败恢复和端到端后端测试。

**退出条件：** 只使用 API 即可在临时目录得到真实 Project、Dataset 和 ready Experiment，且没有 Run。

### Phase 2：桌面入口与创建流程

- 扩展 desktop types/API/store。
- 改造空状态和已有项目新建入口。
- 增加目录选择、确认、loading、错误和成功选择流程。
- 完成中文、英文及其它 locale key。

**退出条件：** 用户可以通过桌面 UI 安全创建并打开案例副本。

### Phase 3：项目内引导与科学解释

- 增加模拟数据徽标和七步引导卡。
- 把动作连接到现有 tab、Experiment、Dataset、Run、Artifact 和 replay。
- 增加结果解释和完成状态。

**退出条件：** 用户无需外部说明即可完成首次 Run 和 replay。

### Phase 4：打包与真实旅程验收

- 验证开发与打包 sidecar 中案例一致。
- 完成真实浏览器/桌面 smoke。
- 运行 `bun run check:impact` 选择的全部最小检查。
- 记录未运行的 live-provider/真实湿实验证据为明确 `not run`，不能用本地案例替代。

**退出条件：** 无网络和无 Provider 环境下，从空状态到 reproducible replay 全链路通过。

## 11. Success Metrics

### 产品指标

- 至少 90% 的内部新用户无需外部帮助即可完成案例。
- 从点击入口到首次 completed Run 的中位时间不超过 3 分钟。
- 从案例创建到首次 completed Run 的主要交互不超过 7 次，到 replay reproducible 不超过 9 次。
- 完成后的用户能够回答：Dataset version、Experiment、Run、Artifact 和 replay 各自表示什么。

### 质量指标

- 100% 离线完成，无模型调用、网络请求或 Provider 凭据依赖。
- 100% 物化请求不覆盖请求前已有的文件或目录。
- 同一模板版本的 CSV hash 在开发、测试和打包构建中一致。
- 每次成功案例分析产生 1 个 completed Run 和恰好 3 个 Artifact。
- replay 产生新 child Run，summary 相同且状态为 reproducible。
- 普通 Science 项目相关回归测试保持通过。

### 科学沟通指标

- 所有案例入口、项目标题区和文档均显示模拟数据边界。
- 产品文案中不存在把 R²、4PL 拟合或相对 IC50 描述为真实药效证明的语句。
- 验收记录明确区分模拟数字工作流、真实湿实验和 live-provider 验证。

## 12. Non-Goals / Out of Scope

- 不自动创建案例，不自动选择默认用户目录。
- 不自动运行分析或重放。
- 不预置已完成 Run、Artifact 或伪造的运行事件。
- 不调用模型生成结论、计划或解释。
- 不提供真实药物、患者、临床或未脱敏实验数据。
- 不在 V1 同时预装第二个异常/QC 警告案例。
- 不实现案例商城、下载中心或远程模板更新。
- 不提供破坏性的“重置案例”；重新开始通过创建新副本完成。
- 不扩展新的 assay 类型、统计模型或图表引擎。
- 不声称完成真实实验操作，不提供自动化移液、仪器控制或 LIMS 集成。
- 不声称符合 GLP、GMP、21 CFR Part 11 或任何监管认证。
- 不把本功能的 mock/fixture 结果当作真实科研结论或 live-provider 证据。

## 13. Test and Verification Matrix

| 层级 | 必须验证的证据 |
| --- | --- |
| 目录单测 | 案例 ID/版本、确定性 hash、24 孔对应、readiness、预期范围 |
| 服务单测 | 唯一命名、marker schema、locale 回退、失败恢复 |
| API 集成 | list、materialize、真实 Project/Dataset/Experiment、无初始 Run/Artifact |
| 分析集成 | 4PL 数值范围、三个 Artifact、事件顺序、manifest 与输入版本 |
| Replay 集成 | child Run、原输入版本、summary 相等、reproducible |
| 路径安全 | allowlist、realpath、symlink、冲突、并发、不可写父目录、不覆盖 |
| Desktop store | 创建成功选择、失败保留当前项目、引导状态推导 |
| Desktop page | 空状态、已有项目入口、badge、七步动作、完成卡、本地化 |
| Browser/Desktop | 用户实际完成创建、查看、运行、产物、重放和二次创建 |
| Package smoke | 打包 sidecar 无源码目录、无网络、无 Provider 时仍可使用案例 |
| Impact gate | `bun run check:impact` 选中的全部命令 |
| Final review | `git diff --check`、`git diff`、`git status --short` |

## 14. Risks and Mitigations

### R-1：案例成为独立演示分支

**风险：** 案例绕过真实服务，长期与产品行为漂移。

**缓解：** 物化只负责生成输入和调用现有领域服务；运行和重放不允许案例专用捷径。

### R-2：打包后找不到模板

**风险：** 开发模式依赖源码相对路径，发布后资源缺失。

**缓解：** 首选编译进 sidecar 的类型化模块；如用静态资产，必须显式打包并加入 package smoke。

### R-3：物化跨存储边界失败

**风险：** 留下半成品目录或注册表记录。

**缓解：** 使用 provisioning marker 和幂等恢复；不做不能证明范围的递归清理。

### R-4：用户误解模拟结果

**风险：** 把漂亮曲线或高 R² 当作药效证据。

**缓解：** 入口、项目、结果和文档持续显示模拟数据边界，并加入复孔、拟合和真实实验限制解释。

### R-5：引导进度与真实状态不一致

**风险：** UI 标记完成但 Run/Artifact 不存在。

**缓解：** 核心进度从服务端领域对象推导，不新增独立持久化完成标志。

### R-6：为案例修改核心 schema 造成过度设计

**风险：** 一个教学功能引入项目数据库迁移和普通项目兼容负担。

**缓解：** V1 使用可选 marker 和 API 派生字段；只有未来需要查询、统计或编辑案例元数据时再评估正式 schema。

## 15. Open Questions

以下问题不阻塞 V1，进入实现拆分时按默认建议执行：

1. **是否在结果区渲染一张真实曲线图？**
   - 默认：复用当前已有结果展示；若当前 UI 只有数值和曲线点，曲线可视化另立小型 UI story，不阻塞案例物化。
2. **是否记录匿名完成指标？**
   - 默认：不新增遥测。先用内部可用性测试测量完成时间，避免改变隐私边界。
3. **是否在后续版本加入异常案例？**
   - 默认：V1 完成并稳定后，另立 PRD 设计缺孔、重复孔或高复孔变异的进阶案例。
4. **中英文之外的案例文档如何处理？**
   - 默认：UI key 覆盖仓库已有 locale，目录中的长文档只提供中文和英文。

## 16. Definition of Done

只有同时满足以下条件，功能才能被称为完成：

- 用户可在桌面端按需创建不覆盖的案例副本。
- 创建结果是真实 Project、锁定 Dataset Version 和 ready Experiment，且初始没有 Run/Artifact。
- 用户通过真实 UI 和现有 recipe 完成分析，得到预期范围内的结果与三个 Artifact。
- 用户通过真实 replay 创建 reproducible child Run。
- 模拟数据和非真实药效边界在入口、项目和文档中持续可见。
- 开发和打包 sidecar 均能在离线、无 Provider 环境完成全链路。
- 同区域回归测试、真实浏览器/桌面 smoke、`bun run check:impact`、`git diff --check` 全部通过。
- 交付说明明确列出 passed、failed、skipped、blocked 和 not run，且不把模拟案例说成真实湿实验验证。
