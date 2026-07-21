# 配置与数据目录

ScienceX 默认使用 `~/.sciencex` 保存应用数据。项目级配置使用项目根目录下的 `.sciencex/`。旧版 `.claude/` 路径仅作为兼容读取来源，不再是新配置的默认写入位置。

## 用户级目录

```text
~/.sciencex/
├── config/          # Provider、桌面设置、IM 适配器配置
├── credentials/     # OAuth 与其他凭据
├── state/           # 窗口、终端、定时任务和会话映射状态
├── data/            # 索引、追踪、下载与 Science 项目注册表
├── diagnostics/     # 诊断报告
├── runtime/         # 临时运行时文件
└── claude/          # 内嵌 Claude 兼容运行时
    ├── settings.json
    ├── skills/
    ├── agents/
    ├── projects/
    ├── teams/
    └── tasks/
```

`claude/` 子目录是 ScienceX 内嵌运行时的兼容边界。它仍保持 Claude 配置文件的原有结构，但不会再占用用户主目录中的 `~/.claude`。

## 项目级目录

```text
<project>/.sciencex/
├── settings.json
├── settings.local.json
├── scheduled_tasks.json
├── skills/
├── agents/
├── rules/
├── output-styles/
└── worktrees/
```

`settings.local.json`、`scheduled_tasks.json`、`worktrees/` 和 SQLite 临时文件默认不应提交到版本库。团队共享的 `settings.json`、技能、Agent 和规则可以按项目需要提交。

## 环境变量

| 变量 | 用途 |
|------|------|
| `SCIENCEX_HOME` | 覆盖用户级 ScienceX 根目录；默认是 `~/.sciencex` |
| `CLAUDE_CONFIG_DIR` | 仅覆盖内嵌 Claude 兼容运行时目录；旧启动方式仍可使用 |
| `SCIENCEX_LEGACY_CONFIG_DIR` | 指定一次性迁移读取的旧目录；通常无需设置 |

桌面端选择自定义数据目录时，相当于设置 `SCIENCEX_HOME`；兼容运行时自动放在所选目录的 `claude/` 下。

## 从 `.claude` 迁移

首次使用新布局时，ScienceX 会按以下规则复制已知的旧数据：

1. 仅在新目标不存在时复制，已有 `.sciencex` 内容永远优先。
2. 复制采用临时路径和原子重命名，失败不会留下半成品目标。
3. 不跟随符号链接，不复制未知凭据文件。
4. 不删除、不重命名、也不修改旧 `.claude` 内容。
5. 项目配置按类别回退：对应的 `.sciencex` 文件或目录不存在时，才读取 `.claude` 版本；后续写入落到 `.sciencex`。

建议先运行一段时间并确认 Provider、会话、技能、Agent 和定时任务正常，再手动归档旧目录。ScienceX 不会自动删除用户数据。

