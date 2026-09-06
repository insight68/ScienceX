权限改版验收记录 — 2026-09-06

菜单固定为「请求审批」「自动审批」「完全访问」。没有保存过默认权限的新安装使用自动审批；已有默认值和旧会话权限保持原语义，旧版选项不再出现在菜单中。

「先做计划」独立于权限菜单。规划期间限制项目修改，只允许当前计划文件写入；退出规划恢复之前的执行权限。使用已有 session-meta 历史保存恢复信息，没有新增持久化格式。刷新及清空占位会话后仍可恢复。

自动审批保留常规文件编辑的自动执行，识别到的删除、外发、发布和不透明执行请求交给用户。审查器判定风险或无法判断时，交互会话改为人工审批；无人可审批时拒绝执行。明确禁止规则继续生效。完全访问的说明保留系统权限边界。

权限选择器使用实际 SVG 图标并保留完整标签。首次主动切入自动审批仍显示说明，接受后不重复显示；完全访问在启用时确认，并持续显示醒目标记。审批按钮调整为「仅本次允许」。五种语言的相关菜单及说明已同步。

验证结果：

- passed：bun run check:desktop，类型检查、214 个测试文件、2,228 项通过、1 项跳过，以及构建。
- failed：bun run check:server 最后一次完整运行有 2,215 项通过、1 项会话预热超时。
- passed：隔离环境单独重跑完整 conversations.test.ts，93 项通过，0 失败；包括 REST -> WebSocket -> 假 CLI 的计划权限传递。
- passed：bun run check:chat-contract。
- passed：bun run check:persistence-upgrade。
- passed：bun run check:coverage，5 个范围通过，策略失败 0；报告统计的变更行覆盖率为 96.65%。覆盖率采集不替代逐文件正确性检查，详见 coverage 报告备注。
- passed：bun run check:docs（执行时的工作区快照；文档由其他任务并行修改，本任务没有修改文档）。
- passed：modeRestrictions.test.ts，33 项；覆盖删除、外发、发布、命令包装、PowerShell 别名/动态执行、计划文件链接和无人审批拒绝。PowerShell 解析结果使用固定夹具。
- passed：启用 TRANSCRIPT_CLASSIFIER 后单独执行 permissions.autoMode.test.ts，16 项通过、1 项跳过；permissionSetup.autoMode.test.ts，14 项通过、1 项跳过。审查模型全部使用模拟响应。
- passed：git diff --check。
- reported：bun run check:impact 选择 desktop/server/chat-contract/docs/coverage；PR 标签门槛提示需要 allow-cli-core-change。当前没有创建 PR，不宣称 PR-ready。
- not run：真实模型、原生安装包、部署、发布；没有提交、推送、切换分支。

真实浏览器验收使用临时 HOME、临时研究目录、本机独立端口和假 CLI。已实际点击验证新默认权限、三项菜单、计划新会话、刷新恢复、退出计划、完全访问确认及显示、自动审批首次说明和再次切换无重复弹窗。假 CLI 不生成真实研究结果；未访问真实用户配置或消耗真实模型额度。

界面截图：permissions.png。

本任务修改的文件：

- desktop/src/__tests__/generalSettings.test.tsx
- desktop/src/api/sessions.ts
- desktop/src/components/chat/ChatInput.tsx
- desktop/src/components/chat/MessageList.test.tsx
- desktop/src/components/chat/chatBlocks.test.tsx
- desktop/src/components/controls/PermissionModeSelector.test.tsx
- desktop/src/components/controls/PermissionModeSelector.tsx
- desktop/src/i18n/index.test.tsx
- desktop/src/i18n/locales/en.ts
- desktop/src/i18n/locales/jp.ts
- desktop/src/i18n/locales/kr.ts
- desktop/src/i18n/locales/zh-TW.ts
- desktop/src/i18n/locales/zh.ts
- desktop/src/pages/EmptySession.test.tsx
- desktop/src/pages/EmptySession.tsx
- desktop/src/stores/chatStore.test.ts
- desktop/src/stores/chatStore.ts
- desktop/src/stores/sessionStore.ts
- desktop/src/stores/settingsStore.ts
- desktop/src/types/chat.ts
- src/server/__tests__/conversations.test.ts
- src/server/__tests__/e2e/business-flow.test.ts
- src/server/__tests__/sessions.test.ts
- src/server/__tests__/settings.test.ts
- src/server/__tests__/websocket-handler.test.ts
- src/server/api/sessions.ts
- src/server/services/conversationService.ts
- src/server/services/sessionService.ts
- src/server/services/settingsService.ts
- src/server/ws/events.ts
- src/server/ws/handler.ts
- src/services/tools/toolHooks.autoMode.test.ts
- src/services/tools/toolHooks.ts
- src/utils/permissions/permissionSetup.autoMode.test.ts
- src/utils/permissions/permissionSetup.ts
- src/utils/permissions/permissions.autoMode.test.ts
- src/utils/permissions/permissions.test.ts
- src/utils/permissions/permissions.ts
- src/utils/permissions/modeRestrictions.ts
- src/utils/permissions/modeRestrictions.test.ts
