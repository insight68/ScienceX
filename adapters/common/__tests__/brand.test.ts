import { describe, expect, it } from 'bun:test'
import { resolve } from 'node:path'

describe('IM outward branding', () => {
  it('does not expose the retired product name in adapter replies or card titles', async () => {
    const adaptersRoot = resolve(import.meta.dir, '../..')
    const outwardFiles = [
      'dingtalk/index.ts',
      'dingtalk/permission-card.ts',
      'feishu/index.ts',
      'telegram/commands.ts',
      'telegram/index.ts',
      'wechat/index.ts',
      'whatsapp/index.ts',
    ]
    const source = (
      await Promise.all(
        outwardFiles.map(file => Bun.file(resolve(adaptersRoot, file)).text()),
      )
    ).join('\n')

    const retiredOutwardCopy = [
      'Claude Code Desktop',
      "title: 'Claude Code'",
      'Claude Code 需要权限确认',
      'Claude Code 桌面端',
      'Claude Code Bot 已就绪',
      'Claude Code WhatsApp 已就绪',
      '发送消息即可与 Claude 对话',
    ]

    for (const copy of retiredOutwardCopy) {
      expect(source).not.toContain(copy)
    }
    expect(source).toContain('ScienceX 桌面端')
    expect(source).toContain("title: 'ScienceX'")
  })
})
