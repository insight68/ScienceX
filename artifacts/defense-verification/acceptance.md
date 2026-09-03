# ScienceX 答辩案例验收记录

日期：2026-09-03。本记录对应当前源码的本地验收，没有发布安装包。

## 实际浏览器演练

- 页面：http://127.0.0.1:2026/；隔离后端：http://127.0.0.1:3459。
- 隔离项目：`/private/tmp/sciencex-defense-SQcKdL/projects/sciencex-cell-viability-demo`。
- 通过页面创建案例：4 个数据集、4 个实验，创建时没有 Run 或 Artifact。
- 页面点击「运行完整演示」后：4/4 场景符合预期，6 条 Run、15 个产物。
- 正常分析：IC50 = 0.999999960716154 µM，绝对误差约 3.93e-8 µM；正常 Run 与重放一致。
- 数据更新：数据集有 V2，实验和原始 Run 仍使用 V1；页面显示历史输入及重放验证一致。
- 缺孔：保留缺少 A4 的失败 Run，产物为 0，重放按钮不可用。
- 响应不足：Run 已完成，技术证据尚无定论，页面显示响应范围不足的原因。
- 点击「保存演示记录」后，后端写入新的 Markdown 文件；已读取文件确认内容。副本见 `demo-evidence.md`。
- AI 入口已打开对应项目会话并填入只读审阅提示词，未发送模型请求。
- 浏览器最终读取的 warn/error 日志为空。

浏览器及隔离服务仅用于本次演练；临时项目不替代用户自行选择的正式保存位置。答辩时使用完整宽度的桌面窗口。

## 自动检查

通过 `bun run check:impact --files ...` 显式纳入本次涉及的 17 个源文件、测试和手册。无阻塞，选出下面四项：

| 检查 | 结果 | 依据 |
| --- | --- | --- |
| `bun run check:server` | passed | 207 个文件，2171 个测试通过，0 失败；`check-server-final.log` |
| `bun run check:desktop` | passed | 214 个文件，2215 个测试通过，1 跳过；lint 与构建通过；`check-desktop-final.log` |
| `bun run check:persistence-upgrade` | passed | 既有持久化兼容门禁；`check-persistence-upgrade.log` |
| `bun run check:coverage` | passed | 5 个套件通过，policyFailures=0；本次门禁识别的变更行覆盖率 82/83 = 98.8% |
| `git diff --check` | passed | 未发现空白错误 |

覆盖率报告保留了既有插桩进程与全局目标的说明；测试正确性另由上述逐文件服务端门禁核实。详见 `../coverage/2026-09-03T12-32-58-648Z/coverage-report.md`。

新增回归覆盖案例目录碰撞、非法父目录、失败后的保留与重试、真实四场景分析、旧项目兼容、报告保存、接口传输和桌面导航。测试使用临时 HOME、配置和模拟凭据。

## 未执行与边界

- 真实 AI 调用：等待明确的模型额度授权，未声称 AI 审阅完成。
- 人工效率对照：未实测，演示记录保留采集表，没有提效百分比。
- 原生安装包打包/安装验收：not run；源码浏览器验证不等于安装包验收。
- `bun run verify`：not run；本次执行了 impact 要求的所有检查。
- 模拟案例不构成真实药效或独立生物学验证。
- 本任务未执行 commit、push 或发布；工作期间共享仓库的外部提交纳入了部分初版后端文件，验收范围使用显式文件清单保留。

本目录为生成的验证输出，不应提交到 Git。答辩操作和讲述顺序见 `../../tasks/sciencex-defense-demo.md`。
