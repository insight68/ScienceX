import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '../stores/settingsStore'
import { translate, useTranslation } from '.'

describe('useTranslation', () => {
  afterEach(() => {
    act(() => {
      useSettingsStore.getState().setLocale('zh')
    })
  })

  it('keeps the translation function stable until the locale changes', () => {
    act(() => {
      useSettingsStore.getState().setLocale('zh')
    })

    const { result, rerender } = renderHook(() => useTranslation())
    const initial = result.current

    rerender()
    expect(result.current).toBe(initial)

    act(() => {
      useSettingsStore.getState().setLocale('en')
    })
    expect(result.current).not.toBe(initial)
  })

  it('resolves every registered locale to its own translation', () => {
    expect(translate('en', 'common.save')).toBe('Save')
    expect(translate('zh', 'common.save')).toBe('保存')
    expect(translate('zh-TW', 'common.save')).toBe('儲存')
    expect(translate('jp', 'common.save')).toBe('保存')
    expect(translate('kr', 'common.save')).toBe('저장')
  })

  it('interpolates params across the new locales', () => {
    expect(translate('jp', 'session.timeMinutes', { n: 5 })).toBe('5 分前')
    expect(translate('kr', 'session.timeMinutes', { n: 5 })).toBe('5분 전')
  })

  it('describes exactly the standard ~/.sciencex mode and an external custom mode', () => {
    expect(translate('en', 'settings.general.storageSystemDescription')).toContain('~/.sciencex')
    expect(translate('zh', 'settings.general.storageSystemDescription')).toContain('~/.sciencex')
    expect(translate('zh-TW', 'settings.general.storageSystemDescription')).toContain('~/.sciencex')
    expect(translate('jp', 'settings.general.storageSystemDescription')).toContain('~/.sciencex')
    expect(translate('kr', 'settings.general.storageSystemDescription')).toContain('~/.sciencex')
    expect(translate('en', 'settings.general.storagePortableTitle')).toContain('custom')
    expect(translate('zh', 'settings.general.storagePortableTitle')).toContain('自定义')
  })

  it('uses ScienceX branding in active settings copy for every locale', () => {
    const locales = ['en', 'zh', 'zh-TW', 'jp', 'kr'] as const
    const brandedKeys = [
      'settings.activity.subtitleLoading',
      'settings.adapters.description',
      'settings.mcp.form.createHint',
      'settings.plugins.emptyHint',
    ] as const

    for (const locale of locales) {
      for (const key of brandedKeys) {
        const copy = translate(locale, key)
        expect(copy).toContain('ScienceX')
        expect(copy).not.toContain('ScienceX')
      }
    }

    for (const locale of ['en', 'jp', 'kr'] as const) {
      const copy = translate(locale, 'settings.mcp.description')
      expect(copy).toContain('ScienceX')
      expect(copy).not.toContain('ScienceX')
    }

    const productActorKeys = [
      'settings.mcp.targetProject.globalHint',
      'settings.agents.description',
      'settings.agents.emptyHint',
      'settings.computerUse.description',
      'settings.computerUse.appsDescription',
      'settings.general.responseLangDescription',
      'settings.general.outputStyleDescription',
      'settings.general.outputStyleBuiltin.default.description',
      'settings.general.outputStyleBuiltin.explanatory.description',
      'settings.general.outputStyleBuiltin.learning.description',
      'permission.allowEditFile',
      'permission.allowEditFileGeneric',
      'permission.allowBash',
      'permission.allowTool',
      'permission.planPreviewTitle',
      'permission.planFeedbackPlaceholder',
      'computerUseApproval.hideWhileWorking',
      'computerUseApproval.hideWhileWorkingRestore',
      'computerUseApproval.tryAgainHint',
      'question.needsInput',
      'permMode.autoAcceptDesc',
      'permMode.autoModeDesc',
      'permMode.enableBypassBody',
      'permMode.enableAutoDetail',
    ] as const

    for (const locale of locales) {
      for (const key of productActorKeys) {
        const copy = translate(locale, key)
        expect(copy).toContain('ScienceX')
        expect(copy).not.toContain('Claude')
      }
    }
  })
})
