<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useData } from 'vitepress'

const REPO = 'insight68/ScienceX'
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO}/releases`
const REPO_PAGE = `https://github.com/${REPO}`

type PlatformFamily = 'macos' | 'windows' | 'linux'
type Architecture = 'arm64' | 'x64'

interface LocalizedText {
  zh: string
  en: string
}

interface PlatformBuild {
  id: string
  family: PlatformFamily
  architecture: Architecture
  label: LocalizedText
  hint: LocalizedText
  primaryRe: RegExp
  secondaryRe: RegExp | null
  primaryExt: string
  secondaryExt: string | null
}

interface PlatformGroup {
  family: PlatformFamily
  name: string
  description: LocalizedText
  buildIds: string[]
}

const BUILDS: PlatformBuild[] = [
  {
    id: 'macos-arm64',
    family: 'macos',
    architecture: 'arm64',
    label: { zh: 'Apple 芯片', en: 'Apple Silicon' },
    hint: { zh: 'ARM64 · M1–M4 及后续芯片', en: 'ARM64 · M1–M4 and later' },
    primaryRe: /-mac-arm64\.dmg$/i,
    secondaryRe: /-mac-arm64\.zip$/i,
    primaryExt: 'dmg',
    secondaryExt: 'zip',
  },
  {
    id: 'macos-x64',
    family: 'macos',
    architecture: 'x64',
    label: { zh: 'Intel 芯片', en: 'Intel processor' },
    hint: { zh: 'x64 · Intel Core 系列', en: 'x64 · Intel Core processors' },
    primaryRe: /-mac-x64\.dmg$/i,
    secondaryRe: /-mac-x64\.zip$/i,
    primaryExt: 'dmg',
    secondaryExt: 'zip',
  },
  {
    id: 'win-x64',
    family: 'windows',
    architecture: 'x64',
    label: { zh: 'Windows x64', en: 'Windows x64' },
    hint: { zh: '大多数 Intel / AMD 电脑', en: 'Most Intel and AMD PCs' },
    primaryRe: /-win-x64\.exe$/i,
    secondaryRe: null,
    primaryExt: 'exe',
    secondaryExt: null,
  },
  {
    id: 'win-arm64',
    family: 'windows',
    architecture: 'arm64',
    label: { zh: 'Windows ARM64', en: 'Windows ARM64' },
    hint: { zh: 'Snapdragon 等 ARM 设备', en: 'Snapdragon and other ARM PCs' },
    primaryRe: /-win-arm64\.exe$/i,
    secondaryRe: null,
    primaryExt: 'exe',
    secondaryExt: null,
  },
  {
    id: 'linux-x64',
    family: 'linux',
    architecture: 'x64',
    label: { zh: 'Linux x86_64', en: 'Linux x86_64' },
    hint: { zh: 'Intel / AMD 64 位设备', en: '64-bit Intel and AMD devices' },
    primaryRe: /-linux-x86_64\.AppImage$/i,
    secondaryRe: /-linux-amd64\.deb$/i,
    primaryExt: 'AppImage',
    secondaryExt: 'deb',
  },
  {
    id: 'linux-arm64',
    family: 'linux',
    architecture: 'arm64',
    label: { zh: 'Linux ARM64', en: 'Linux ARM64' },
    hint: { zh: 'aarch64 / ARM 服务器与电脑', en: 'aarch64 / ARM servers and PCs' },
    primaryRe: /-linux-arm64\.AppImage$/i,
    secondaryRe: /-linux-arm64\.deb$/i,
    primaryExt: 'AppImage',
    secondaryExt: 'deb',
  },
]

const PLATFORM_GROUPS: PlatformGroup[] = [
  {
    family: 'macos',
    name: 'macOS',
    description: { zh: '适用于 Apple 芯片与 Intel Mac', en: 'For Apple Silicon and Intel Macs' },
    buildIds: ['macos-arm64', 'macos-x64'],
  },
  {
    family: 'windows',
    name: 'Windows',
    description: { zh: '适用于 x64 与 ARM64 电脑', en: 'For x64 and ARM64 PCs' },
    buildIds: ['win-x64', 'win-arm64'],
  },
  {
    family: 'linux',
    name: 'Linux',
    description: { zh: '提供 AppImage 与 Debian 软件包', en: 'AppImage and Debian packages' },
    buildIds: ['linux-x64', 'linux-arm64'],
  },
]

interface GhAsset {
  name: string
  size: number
  browser_download_url: string
}

interface GhRelease {
  tag_name: string
  published_at: string
  created_at: string
  html_url: string
  assets: GhAsset[]
}

interface BuildCard extends PlatformBuild {
  primary: GhAsset | null
  secondary: GhAsset | null
}

interface DetectedPlatform {
  family: PlatformFamily
  architecture: Architecture | null
}

interface UserAgentDataLike {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string }>
}

const COPY = {
  zh: {
    eyebrow: 'ScienceX Desktop · 本地科研工作台',
    title: '把科研工作台，\n装到自己的电脑上',
    subtitle: '在本地整理实验数据、延续研究线程，并保留可追溯的运行与产物。选择与你设备匹配的安装包即可开始。',
    latestVersion: '最新版本',
    releasedAt: '发布时间',
    packages: '安装包',
    packageCount: '3 个系统 · 6 种架构',
    syncing: '正在同步 GitHub Release',
    allVersions: '查看全部版本',
    sourceCode: '查看源代码',
    flowLabel: 'LOCAL RESEARCH WORKSPACE',
    flowQuestion: '研究问题',
    flowData: '实验数据',
    flowRun: '分析运行',
    flowArtifact: '研究产物',
    localStatus: 'LOCAL · TRACEABLE · OPEN',
    chooseTitle: '选择适合你设备的版本',
    chooseSubtitle: 'ScienceX 支持 macOS、Windows 和 Linux。架构不确定时，可先查看下方的判断方法。',
    detected: '检测到你正在使用',
    detectedExact: '已为你标出匹配版本',
    detectedFamily: '浏览器无法可靠判断处理器架构，请按芯片类型选择',
    recommended: '匹配此设备',
    download: '下载',
    openReleases: '前往 Releases',
    otherFormat: '其他格式',
    awaitingMetadata: '正在获取文件名与大小，仍可前往 Releases 下载。',
    missingMetadata: '未获取到文件直链，请在 Releases 中选择对应架构。',
    fetchErrorTitle: '暂时无法同步最新版本信息',
    fetchErrorBody: '平台与架构选择仍然可用。下载按钮将带你前往 GitHub Releases，不会出现空白页。',
    retry: '重新同步',
    architectureTitle: '不确定该选哪个架构？',
    architectureSubtitle: '只需确认处理器类型，不需要理解复杂的系统信息。',
    macGuide: '打开“ > 关于本机”。看到 Apple M 系列请选择 ARM64；看到 Intel 请选择 x64。',
    windowsGuide: '打开“设置 > 系统 > 系统信息”，查看“系统类型”。大多数电脑使用 x64。',
    linuxGuide: '在终端运行 uname -m。x86_64 选择 x64；aarch64 或 arm64 选择 ARM64。',
    installTitle: '首次安装前，请留意系统提示',
    installBody: '不同版本的签名状态可能不同。若 macOS 显示开发者验证、Windows 显示 SmartScreen，请先核对该版本的 Release 说明与文件名，再决定是否继续。',
    releaseNotes: '查看发布与安装说明',
    trustLocal: '本地优先',
    trustLocalBody: '研究项目、表格和运行记录保存在你的设备上。',
    trustOpen: '公开发布',
    trustOpenBody: '安装包与版本记录统一托管于 GitHub Releases。',
    trustCross: '跨平台',
    trustCrossBody: '覆盖 macOS、Windows、Linux 的主流处理器架构。',
  },
  en: {
    eyebrow: 'ScienceX Desktop · Local research workbench',
    title: 'Bring your research workbench\nto your own computer',
    subtitle: 'Organize experimental data locally, continue research threads, and preserve traceable runs and artifacts. Choose the build that matches your device.',
    latestVersion: 'Latest version',
    releasedAt: 'Released',
    packages: 'Packages',
    packageCount: '3 systems · 6 architectures',
    syncing: 'Syncing GitHub Release',
    allVersions: 'View all versions',
    sourceCode: 'View source',
    flowLabel: 'LOCAL RESEARCH WORKSPACE',
    flowQuestion: 'Research question',
    flowData: 'Experimental data',
    flowRun: 'Analysis run',
    flowArtifact: 'Research artifact',
    localStatus: 'LOCAL · TRACEABLE · OPEN',
    chooseTitle: 'Choose the build for your device',
    chooseSubtitle: 'ScienceX supports macOS, Windows, and Linux. If you are unsure about your architecture, use the quick guide below.',
    detected: 'Detected',
    detectedExact: 'The matching build is highlighted',
    detectedFamily: 'Your browser cannot reliably identify the processor architecture; choose by chip type',
    recommended: 'Matches this device',
    download: 'Download',
    openReleases: 'Open Releases',
    otherFormat: 'Other format',
    awaitingMetadata: 'Fetching file names and sizes. Downloads remain available from Releases.',
    missingMetadata: 'No direct link was returned. Choose the matching architecture on Releases.',
    fetchErrorTitle: 'Latest release details are temporarily unavailable',
    fetchErrorBody: 'Platform and architecture guidance still works. Download buttons will open GitHub Releases instead of leaving this page empty.',
    retry: 'Try again',
    architectureTitle: 'Not sure which architecture to choose?',
    architectureSubtitle: 'You only need to identify the processor type—no specialist system knowledge required.',
    macGuide: 'Open “Apple menu > About This Mac.” Choose ARM64 for Apple M-series chips and x64 for Intel.',
    windowsGuide: 'Open “Settings > System > About” and find “System type.” Most PCs use x64.',
    linuxGuide: 'Run uname -m in a terminal. Choose x64 for x86_64, or ARM64 for aarch64 and arm64.',
    installTitle: 'Review system prompts before first install',
    installBody: 'Signing status can vary by release. If macOS shows a developer verification warning or Windows shows SmartScreen, verify the release notes and file name before proceeding.',
    releaseNotes: 'Read release and install notes',
    trustLocal: 'Local first',
    trustLocalBody: 'Research projects, tables, and run records stay on your device.',
    trustOpen: 'Open releases',
    trustOpenBody: 'Installers and version history are published through GitHub Releases.',
    trustCross: 'Cross-platform',
    trustCrossBody: 'Builds cover mainstream macOS, Windows, and Linux architectures.',
  },
} as const

const { lang } = useData()
const isEnglish = computed(() => lang.value.toLowerCase().startsWith('en'))
const copy = computed(() => (isEnglish.value ? COPY.en : COPY.zh))
const localeKey = computed<'zh' | 'en'>(() => (isEnglish.value ? 'en' : 'zh'))

const loading = ref(true)
const releaseError = ref(false)
const release = ref<GhRelease | null>(null)
const detected = ref<DetectedPlatform | null>(null)

function isGhAsset(value: unknown): value is GhAsset {
  if (!value || typeof value !== 'object') return false
  const asset = value as Record<string, unknown>
  return typeof asset.name === 'string'
    && typeof asset.size === 'number'
    && typeof asset.browser_download_url === 'string'
}

function isGhRelease(value: unknown): value is GhRelease {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.tag_name === 'string'
    && typeof candidate.html_url === 'string'
    && Array.isArray(candidate.assets)
    && candidate.assets.every(isGhAsset)
}

function cardFor(build: PlatformBuild): BuildCard {
  const assets = release.value?.assets ?? []
  return {
    ...build,
    primary: assets.find(asset => build.primaryRe.test(asset.name)) ?? null,
    secondary: build.secondaryRe
      ? assets.find(asset => build.secondaryRe?.test(asset.name)) ?? null
      : null,
  }
}

const buildCards = computed(() => BUILDS.map(cardFor))
const groupedCards = computed(() => PLATFORM_GROUPS.map(group => ({
  ...group,
  builds: group.buildIds
    .map(id => buildCards.value.find(build => build.id === id))
    .filter((build): build is BuildCard => Boolean(build)),
})))

function parseArchitecture(signal: string): Architecture | null {
  if (/arm64|aarch64|armv8/i.test(signal)) return 'arm64'
  if (/x86_64|amd64|x64|x86/i.test(signal)) return 'x64'
  return null
}

async function detectPlatform(): Promise<DetectedPlatform | null> {
  if (typeof navigator === 'undefined') return null

  const nav = navigator as Navigator & { userAgentData?: UserAgentDataLike }
  const platformSignal = `${nav.userAgentData?.platform ?? ''} ${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`
  let family: PlatformFamily | null = null

  if (/Macintosh|MacIntel|MacPPC|Mac68K|Mac OS X|macOS/i.test(platformSignal)) family = 'macos'
  else if (/Win32|Win64|Windows|WinCE/i.test(platformSignal)) family = 'windows'
  else if (/Linux|X11|CrOS/i.test(platformSignal) && !/Android/i.test(platformSignal)) family = 'linux'
  if (!family) return null

  let architecture: Architecture | null = null
  try {
    const highEntropy = await nav.userAgentData?.getHighEntropyValues?.(['architecture', 'bitness'])
    architecture = parseArchitecture(`${highEntropy?.architecture ?? ''} ${highEntropy?.bitness ?? ''}`)
  } catch {
    architecture = null
  }

  if (!architecture && /arm64|aarch64|armv8/i.test(platformSignal)) architecture = 'arm64'
  if (!architecture && family !== 'macos') architecture = parseArchitecture(platformSignal) ?? 'x64'

  return { family, architecture }
}

async function loadRelease() {
  loading.value = true
  releaseError.value = false
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`)

    const data: unknown = await response.json()
    if (!isGhRelease(data)) throw new Error('GitHub API returned an unexpected response')
    release.value = data
  } catch {
    releaseError.value = true
  } finally {
    window.clearTimeout(timeout)
    loading.value = false
  }
}

onMounted(() => {
  void detectPlatform().then(value => {
    detected.value = value
  })
  void loadRelease()
})

const releaseVersion = computed(() => {
  const tag = release.value?.tag_name ?? ''
  return tag ? `v${tag.replace(/^v/, '')}` : 'GitHub Release'
})

const releaseDate = computed(() => release.value?.published_at || release.value?.created_at)
const directPackageCount = computed(() => buildCards.value.filter(build => build.primary).length)
const detectedBuildId = computed(() => {
  if (!detected.value?.architecture) return null
  const prefix = detected.value.family === 'windows' ? 'win' : detected.value.family
  return `${prefix}-${detected.value.architecture}`
})

const detectedLabel = computed(() => {
  if (!detected.value) return null
  const familyName = PLATFORM_GROUPS.find(group => group.family === detected.value?.family)?.name
  const architecture = detected.value.architecture === 'arm64' ? 'ARM64' : detected.value.architecture === 'x64' ? 'x64' : ''
  return [familyName, architecture].filter(Boolean).join(' · ')
})

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(1)} MB`
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(isEnglish.value ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function localized(value: LocalizedText): string {
  return value[localeKey.value]
}

function isRecommended(build: BuildCard): boolean {
  return detectedBuildId.value === build.id
}
</script>

<template>
  <div class="download-page">
    <section class="hero" aria-labelledby="download-title">
      <div class="hero-grid" aria-hidden="true"></div>
      <div class="hero-shell">
        <div class="hero-copy">
          <p class="eyebrow"><span class="status-light"></span>{{ copy.eyebrow }}</p>
          <h1 id="download-title">{{ copy.title }}</h1>
          <p class="hero-subtitle">{{ copy.subtitle }}</p>

          <div class="hero-actions">
            <a class="primary-action" href="#platform-downloads">
              {{ copy.chooseTitle }}
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M18 13l-6 6-6-6"/></svg>
            </a>
            <a class="text-action" :href="RELEASES_PAGE" target="_blank" rel="noopener noreferrer">{{ copy.allVersions }} ↗</a>
          </div>

          <dl class="release-meta">
            <div>
              <dt>{{ copy.latestVersion }}</dt>
              <dd class="mono">{{ loading ? '…' : releaseVersion }}</dd>
            </div>
            <div>
              <dt>{{ copy.releasedAt }}</dt>
              <dd>{{ loading ? '…' : formatDate(releaseDate) }}</dd>
            </div>
            <div>
              <dt>{{ copy.packages }}</dt>
              <dd>{{ directPackageCount ? `${directPackageCount} / 6` : copy.packageCount }}</dd>
            </div>
          </dl>
        </div>

        <div class="research-map" aria-hidden="true">
          <div class="map-head">
            <span>{{ copy.flowLabel }}</span>
            <span class="map-code mono">SX / 01</span>
          </div>
          <div class="map-question">
            <span class="map-index mono">01</span>
            <span>{{ copy.flowQuestion }}</span>
          </div>
          <div class="map-flow">
            <div class="map-node">
              <span class="node-dot"></span>
              <small>DATASET</small>
              <strong>{{ copy.flowData }}</strong>
            </div>
            <span class="map-arrow">→</span>
            <div class="map-node">
              <span class="node-dot"></span>
              <small>RUN</small>
              <strong>{{ copy.flowRun }}</strong>
            </div>
            <span class="map-arrow">→</span>
            <div class="map-node">
              <span class="node-dot"></span>
              <small>ARTIFACT</small>
              <strong>{{ copy.flowArtifact }}</strong>
            </div>
          </div>
          <div class="map-foot mono">
            <span>{{ copy.localStatus }}</span>
            <span>SHA-256 · ✓</span>
          </div>
        </div>
      </div>
    </section>

    <div class="content-shell">
      <div v-if="loading" class="sync-banner" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <span>{{ copy.syncing }}</span>
      </div>
      <div v-else-if="releaseError" class="sync-banner sync-error" role="alert">
        <span class="alert-mark" aria-hidden="true">!</span>
        <div>
          <strong>{{ copy.fetchErrorTitle }}</strong>
          <p>{{ copy.fetchErrorBody }}</p>
        </div>
        <button type="button" @click="loadRelease">{{ copy.retry }}</button>
      </div>

      <div v-if="detectedLabel" class="detected-banner">
        <span class="detected-symbol" aria-hidden="true">◎</span>
        <span>{{ copy.detected }} <strong>{{ detectedLabel }}</strong></span>
        <span class="detected-detail">{{ detectedBuildId ? copy.detectedExact : copy.detectedFamily }}</span>
      </div>

      <section id="platform-downloads" class="download-section" aria-labelledby="platform-heading">
        <div class="section-heading">
          <div>
            <p class="section-kicker mono">01 / DOWNLOAD</p>
            <h2 id="platform-heading">{{ copy.chooseTitle }}</h2>
          </div>
          <p>{{ copy.chooseSubtitle }}</p>
        </div>

        <div class="platform-grid" :aria-busy="loading">
          <article
            v-for="group in groupedCards"
            :key="group.family"
            class="platform-card"
            :class="{ 'detected-family': detected?.family === group.family }"
          >
            <header class="platform-head">
              <div class="platform-icon" aria-hidden="true">
                <svg v-if="group.family === 'macos'" viewBox="0 0 24 24" width="23" height="23" fill="currentColor"><path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.82 3.15-.46 7.81 1.3 10.37.86 1.25 1.89 2.66 3.23 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.28 3.13-2.54.98-1.45 1.39-2.85 1.41-2.93-.03-.01-2.7-1.04-2.73-4.11zM14.6 4.59c.71-.86 1.19-2.06 1.06-3.26-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.43z"/></svg>
                <svg v-else-if="group.family === 'windows'" viewBox="0 0 24 24" width="23" height="23" fill="currentColor"><path d="M3 5.1l7.4-1v7.4H3V5.1zM3 12.6h7.4V20l-7.4-1v-6.4zM11.4 4l9.6-1.3v8.9h-9.6V4zM11.4 12.6h9.6v8.9L11.4 20v-7.4z"/></svg>
                <svg v-else viewBox="0 0 24 24" width="23" height="23" fill="currentColor"><path d="M12 2c-2.2 0-3.5 1.6-3.5 3.8 0 1.2.4 2.2.9 3.2.3.6.6 1.2.6 1.8 0 .8-.5 1.4-1.2 2.1-1 .9-2.3 2-2.3 4.1 0 .4.1.8.2 1.2.3.9.9 1.5 1.7 1.9.6.3 1.3.4 2 .4.5 0 1-.1 1.5-.1s1 .1 1.5.1c.7 0 1.4-.1 2-.4.8-.4 1.4-1 1.7-1.9.1-.4.2-.8.2-1.2 0-2.1-1.3-3.2-2.3-4.1-.7-.7-1.2-1.3-1.2-2.1 0-.6.3-1.2.6-1.8.5-1 .9-2 .9-3.2C15.5 3.6 14.2 2 12 2zm-1.2 3.4c.4 0 .7.5.7 1.1s-.3 1.1-.7 1.1-.7-.5-.7-1.1.3-1.1.7-1.1zm2.4 0c.4 0 .7.5.7 1.1s-.3 1.1-.7 1.1-.7-.5-.7-1.1.3-1.1.7-1.1z"/></svg>
              </div>
              <div>
                <h3>{{ group.name }}</h3>
                <p>{{ localized(group.description) }}</p>
              </div>
              <span v-if="detected?.family === group.family" class="family-mark">✓</span>
            </header>

            <div class="build-list">
              <section
                v-for="build in group.builds"
                :key="build.id"
                class="build-option"
                :class="{ recommended: isRecommended(build) }"
              >
                <div class="build-heading">
                  <div>
                    <h4>{{ localized(build.label) }}</h4>
                    <p>{{ localized(build.hint) }}</p>
                  </div>
                  <span v-if="isRecommended(build)" class="recommend-badge">{{ copy.recommended }}</span>
                </div>

                <div v-if="build.primary" class="asset-line mono" :title="build.primary.name">
                  <span>{{ build.primary.name }}</span>
                  <strong>{{ formatSize(build.primary.size) }}</strong>
                </div>
                <p v-else class="asset-placeholder">{{ loading ? copy.awaitingMetadata : copy.missingMetadata }}</p>

                <div class="build-actions">
                  <a
                    class="download-button"
                    :class="{ fallback: !build.primary }"
                    :href="build.primary?.browser_download_url || RELEASES_PAGE"
                    :target="build.primary ? undefined : '_blank'"
                    rel="noopener noreferrer"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
                    {{ build.primary ? `${copy.download} .${build.primaryExt}` : copy.openReleases }}
                  </a>
                  <a
                    v-if="build.secondary"
                    class="secondary-link"
                    :href="build.secondary.browser_download_url"
                    rel="noopener noreferrer"
                  >
                    {{ copy.otherFormat }} .{{ build.secondaryExt }} · {{ formatSize(build.secondary.size) }}
                  </a>
                </div>
              </section>
            </div>
          </article>
        </div>
      </section>

      <section class="architecture-section" aria-labelledby="architecture-heading">
        <div class="section-heading compact">
          <div>
            <p class="section-kicker mono">02 / ARCHITECTURE</p>
            <h2 id="architecture-heading">{{ copy.architectureTitle }}</h2>
          </div>
          <p>{{ copy.architectureSubtitle }}</p>
        </div>

        <div class="guide-grid">
          <article>
            <span class="guide-number mono">A</span>
            <h3>macOS</h3>
            <p>{{ copy.macGuide }}</p>
          </article>
          <article>
            <span class="guide-number mono">B</span>
            <h3>Windows</h3>
            <p>{{ copy.windowsGuide }}</p>
          </article>
          <article>
            <span class="guide-number mono">C</span>
            <h3>Linux</h3>
            <p>{{ copy.linuxGuide }}</p>
            <code>uname -m</code>
          </article>
        </div>
      </section>

      <section class="install-note" aria-labelledby="install-heading">
        <span class="install-symbol" aria-hidden="true">i</span>
        <div>
          <h2 id="install-heading">{{ copy.installTitle }}</h2>
          <p>{{ copy.installBody }}</p>
        </div>
        <a :href="release?.html_url || RELEASES_PAGE" target="_blank" rel="noopener noreferrer">{{ copy.releaseNotes }} ↗</a>
      </section>

      <section class="trust-grid" aria-label="ScienceX download principles">
        <article>
          <span class="trust-icon" aria-hidden="true">⌂</span>
          <div><h3>{{ copy.trustLocal }}</h3><p>{{ copy.trustLocalBody }}</p></div>
        </article>
        <article>
          <span class="trust-icon" aria-hidden="true">◇</span>
          <div><h3>{{ copy.trustOpen }}</h3><p>{{ copy.trustOpenBody }}</p></div>
        </article>
        <article>
          <span class="trust-icon" aria-hidden="true">⌘</span>
          <div><h3>{{ copy.trustCross }}</h3><p>{{ copy.trustCrossBody }}</p></div>
        </article>
      </section>

      <footer class="download-footer">
        <span class="mono">SCIENCEX / DESKTOP</span>
        <nav>
          <a :href="RELEASES_PAGE" target="_blank" rel="noopener noreferrer">{{ copy.allVersions }} ↗</a>
          <a :href="REPO_PAGE" target="_blank" rel="noopener noreferrer">{{ copy.sourceCode }} ↗</a>
        </nav>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.download-page {
  --dl-accent: #2f67e8;
  --dl-accent-strong: #1e4db9;
  --dl-cyan: #37d5c8;
  --dl-navy: #0a1631;
  --dl-ink: #17213a;
  --dl-muted: #667089;
  --dl-line: #dce2ee;
  --dl-paper: #f4f7fb;
  --dl-panel: #ffffff;
  color: var(--dl-ink);
  background: var(--dl-paper);
  min-height: calc(100vh - var(--vp-nav-height));
  font-family: "Avenir Next", "Noto Sans SC", "Microsoft YaHei", sans-serif;
}

:global(.dark) .download-page {
  --dl-accent: #78a0ff;
  --dl-accent-strong: #a9c0ff;
  --dl-cyan: #48d9ce;
  --dl-navy: #071024;
  --dl-ink: #edf2ff;
  --dl-muted: #a1abc2;
  --dl-line: #293652;
  --dl-paper: #0b1222;
  --dl-panel: #111b30;
}

.mono {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-feature-settings: "tnum" 1;
}

.hero {
  position: relative;
  overflow: hidden;
  color: #fff;
  background: var(--dl-navy);
  border-bottom: 1px solid rgba(120, 160, 255, 0.32);
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(120, 160, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120, 160, 255, 0.1) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to right, #000 20%, rgba(0, 0, 0, 0.62) 72%, transparent 100%);
  pointer-events: none;
}

.hero::after {
  position: absolute;
  width: 380px;
  height: 380px;
  right: -170px;
  bottom: -260px;
  border: 1px solid rgba(55, 213, 200, 0.42);
  border-radius: 50%;
  box-shadow: 0 0 0 64px rgba(55, 213, 200, 0.04), 0 0 0 128px rgba(55, 213, 200, 0.025);
  content: "";
}

.hero-shell,
.content-shell {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
}

.hero-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(400px, 0.95fr);
  gap: 72px;
  align-items: center;
  min-height: 570px;
  padding: 74px 0 68px;
}

.hero-copy {
  animation: enter-up 0.55s ease-out both;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 23px;
  color: #b9caff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.status-light {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dl-cyan);
  box-shadow: 0 0 0 5px rgba(55, 213, 200, 0.12);
}

.hero h1 {
  max-width: 720px;
  margin: 0;
  white-space: pre-line;
  color: #fff;
  font-family: "Songti SC", STSong, "Noto Serif CJK SC", serif;
  font-size: clamp(43px, 5.4vw, 70px);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 1.08;
}

.hero-subtitle {
  max-width: 660px;
  margin: 25px 0 0;
  color: #b8c3dc;
  font-size: 17px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  margin-top: 34px;
}

.primary-action,
.download-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 46px;
  border-radius: 7px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.primary-action {
  padding: 0 21px;
  color: #071024;
  background: var(--dl-cyan);
  box-shadow: 0 12px 28px rgba(55, 213, 200, 0.14);
}

.primary-action:hover {
  color: #071024;
  background: #68e4da;
  transform: translateY(-2px);
}

.text-action {
  color: #dce5ff;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.text-action:hover { color: var(--dl-cyan); }

.release-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  max-width: 620px;
  margin: 42px 0 0;
  padding-top: 22px;
  border-top: 1px solid rgba(185, 202, 255, 0.2);
}

.release-meta div { padding-right: 18px; }
.release-meta div + div { padding-left: 18px; border-left: 1px solid rgba(185, 202, 255, 0.2); }
.release-meta dt { color: #8290ad; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.release-meta dd { margin: 6px 0 0; color: #fff; font-size: 14px; font-weight: 700; }

.research-map {
  position: relative;
  padding: 22px;
  border: 1px solid rgba(145, 174, 244, 0.34);
  background: rgba(17, 31, 64, 0.78);
  box-shadow: 0 34px 70px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(16px);
  animation: enter-up 0.55s 0.12s ease-out both;
}

.research-map::before,
.research-map::after {
  position: absolute;
  width: 15px;
  height: 15px;
  border-color: var(--dl-cyan);
  content: "";
}

.research-map::before { top: -1px; left: -1px; border-top: 2px solid; border-left: 2px solid; }
.research-map::after { right: -1px; bottom: -1px; border-right: 2px solid; border-bottom: 2px solid; }
.map-head, .map-foot { display: flex; justify-content: space-between; align-items: center; }
.map-head { padding-bottom: 16px; border-bottom: 1px solid rgba(145, 174, 244, 0.22); color: #b9caff; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; }
.map-code { color: #6f7f9f; }
.map-question { display: flex; align-items: center; gap: 14px; margin: 24px 0; padding: 14px 16px; border-left: 2px solid var(--dl-cyan); background: rgba(55, 213, 200, 0.06); color: #eef3ff; font-weight: 700; }
.map-index { color: var(--dl-cyan); font-size: 11px; }
.map-flow { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 10px; align-items: stretch; }
.map-node { position: relative; min-width: 0; padding: 18px 12px 15px; border: 1px solid rgba(145, 174, 244, 0.24); background: rgba(7, 16, 36, 0.55); }
.map-node small { display: block; margin-bottom: 7px; color: #7282a1; font-family: "SFMono-Regular", Consolas, monospace; font-size: 9px; letter-spacing: 0.08em; }
.map-node strong { display: block; color: #eef3ff; font-size: 13px; }
.node-dot { position: absolute; top: 8px; right: 8px; width: 5px; height: 5px; border-radius: 50%; background: var(--dl-cyan); }
.map-arrow { align-self: center; color: #637394; }
.map-foot { margin-top: 26px; padding-top: 15px; border-top: 1px solid rgba(145, 174, 244, 0.22); color: #7282a1; font-size: 9px; letter-spacing: 0.06em; }

.content-shell { padding: 36px 0 68px; }

.sync-banner,
.detected-banner {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 18px;
  padding: 13px 16px;
  border: 1px solid var(--dl-line);
  background: var(--dl-panel);
  color: var(--dl-muted);
  font-size: 13px;
}

.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid var(--dl-line);
  border-top-color: var(--dl-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.sync-error { align-items: flex-start; border-color: rgba(217, 119, 87, 0.48); background: rgba(217, 119, 87, 0.07); }
.sync-error strong { color: var(--dl-ink); }
.sync-error p { margin: 3px 0 0; line-height: 1.5; }
.sync-error button { margin-left: auto; padding: 5px 10px; border: 1px solid var(--dl-line); border-radius: 5px; color: var(--dl-ink); background: var(--dl-panel); cursor: pointer; }
.alert-mark { display: grid; flex: 0 0 auto; width: 21px; height: 21px; place-items: center; border-radius: 50%; color: #fff; background: #d97757; font-weight: 800; }
.detected-banner { border-left: 3px solid var(--dl-accent); }
.detected-banner strong { color: var(--dl-accent-strong); }
.detected-symbol { color: var(--dl-accent); font-size: 18px; }
.detected-detail { margin-left: auto; color: var(--dl-muted); }

.download-section,
.architecture-section { padding-top: 46px; scroll-margin-top: calc(var(--vp-nav-height) + 20px); }
.section-heading { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 0.72fr); gap: 48px; align-items: end; margin-bottom: 26px; }
.section-heading.compact { margin-bottom: 20px; }
.section-kicker { margin: 0 0 10px; color: var(--dl-accent); font-size: 11px; font-weight: 700; letter-spacing: 0.09em; }
.section-heading h2 { margin: 0; color: var(--dl-ink); font-family: "Songti SC", STSong, "Noto Serif CJK SC", serif; font-size: clamp(28px, 3vw, 38px); letter-spacing: -0.025em; line-height: 1.2; }
.section-heading > p { margin: 0; color: var(--dl-muted); font-size: 14px; line-height: 1.7; }

.platform-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.platform-card { position: relative; overflow: hidden; border: 1px solid var(--dl-line); background: var(--dl-panel); box-shadow: 0 13px 34px rgba(23, 33, 58, 0.055); animation: enter-up 0.46s ease-out both; }
.platform-card:nth-child(2) { animation-delay: 0.06s; }
.platform-card:nth-child(3) { animation-delay: 0.12s; }
.platform-card.detected-family { border-color: color-mix(in srgb, var(--dl-accent) 56%, var(--dl-line)); box-shadow: inset 0 3px 0 var(--dl-accent), 0 16px 38px rgba(47, 103, 232, 0.1); }
.platform-head { display: flex; align-items: center; gap: 13px; min-height: 88px; padding: 18px; border-bottom: 1px solid var(--dl-line); background-image: linear-gradient(90deg, rgba(47, 103, 232, 0.055), transparent 60%); }
.platform-icon { display: grid; flex: 0 0 auto; width: 43px; height: 43px; place-items: center; border: 1px solid var(--dl-line); color: var(--dl-accent-strong); background: var(--dl-panel); }
.platform-head h3 { margin: 0; color: var(--dl-ink); font-size: 18px; }
.platform-head p { margin: 2px 0 0; color: var(--dl-muted); font-size: 11px; line-height: 1.4; }
.family-mark { display: grid; width: 23px; height: 23px; margin-left: auto; place-items: center; border-radius: 50%; color: #fff; background: var(--dl-accent); font-size: 12px; }
.build-list { padding: 0 18px; }
.build-option { position: relative; padding: 20px 0; }
.build-option + .build-option { border-top: 1px solid var(--dl-line); }
.build-option.recommended::before { position: absolute; top: 0; bottom: 0; left: -18px; width: 3px; background: var(--dl-cyan); content: ""; }
.build-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.build-heading h4 { margin: 0; color: var(--dl-ink); font-size: 14px; }
.build-heading p { margin: 4px 0 0; color: var(--dl-muted); font-size: 11px; line-height: 1.45; }
.recommend-badge { flex: 0 0 auto; padding: 3px 6px; border: 1px solid color-mix(in srgb, var(--dl-cyan) 55%, transparent); color: #087d76; background: color-mix(in srgb, var(--dl-cyan) 11%, transparent); font-size: 9px; font-weight: 800; }
:global(.dark) .recommend-badge { color: #7fe8e0; }
.asset-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 13px; color: var(--dl-muted); font-size: 9px; }
.asset-line span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-line strong { flex: 0 0 auto; color: var(--dl-ink); font-weight: 600; }
.asset-placeholder { min-height: 32px; margin: 12px 0 0; color: var(--dl-muted); font-size: 10px; line-height: 1.45; }
.build-actions { display: flex; flex-direction: column; gap: 9px; margin-top: 13px; }
.download-button { width: 100%; min-height: 40px; color: #fff; background: var(--dl-accent); font-size: 13px; }
.download-button:hover { color: #fff; background: var(--dl-accent-strong); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(47, 103, 232, 0.18); }
.download-button.fallback { color: var(--dl-accent-strong); border: 1px solid var(--dl-line); background: transparent; box-shadow: none; }
.download-button.fallback:hover { color: #fff; border-color: var(--dl-accent); background: var(--dl-accent); }
.secondary-link { align-self: center; color: var(--dl-muted); font-size: 10px; text-decoration: none; }
.secondary-link:hover { color: var(--dl-accent-strong); text-decoration: underline; text-underline-offset: 3px; }

.architecture-section { margin-top: 30px; }
.guide-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--dl-line); background: var(--dl-panel); }
.guide-grid article { position: relative; min-height: 180px; padding: 24px; }
.guide-grid article + article { border-left: 1px solid var(--dl-line); }
.guide-number { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid var(--dl-line); color: var(--dl-accent); font-size: 11px; }
.guide-grid h3 { margin: 18px 0 8px; color: var(--dl-ink); font-size: 15px; }
.guide-grid p { margin: 0; color: var(--dl-muted); font-size: 12px; line-height: 1.7; }
.guide-grid code { display: inline-block; margin-top: 12px; padding: 4px 8px; border: 1px solid var(--dl-line); color: var(--dl-accent-strong); background: var(--dl-paper); font-size: 11px; }

.install-note { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 16px; align-items: center; margin-top: 46px; padding: 21px 22px; border: 1px solid rgba(217, 119, 87, 0.42); background: rgba(217, 119, 87, 0.07); }
.install-symbol { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; color: #fff; background: #d97757; font-family: Georgia, serif; font-weight: 700; }
.install-note h2 { margin: 0; color: var(--dl-ink); font-size: 15px; }
.install-note p { margin: 5px 0 0; color: var(--dl-muted); font-size: 12px; line-height: 1.65; }
.install-note a { color: #b05236; font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap; }
:global(.dark) .install-note a { color: #ee9c7f; }

.trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 22px; }
.trust-grid article { display: flex; gap: 13px; padding: 18px; border: 1px solid var(--dl-line); background: color-mix(in srgb, var(--dl-panel) 72%, transparent); }
.trust-icon { display: grid; flex: 0 0 auto; width: 29px; height: 29px; place-items: center; color: var(--dl-accent); border: 1px solid var(--dl-line); font-size: 14px; }
.trust-grid h3 { margin: 0; color: var(--dl-ink); font-size: 13px; }
.trust-grid p { margin: 4px 0 0; color: var(--dl-muted); font-size: 11px; line-height: 1.55; }

.download-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--dl-line); color: var(--dl-muted); font-size: 10px; letter-spacing: 0.08em; }
.download-footer nav { display: flex; gap: 22px; }
.download-footer a { color: var(--dl-accent-strong); font-family: "Avenir Next", "Noto Sans SC", sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0; text-decoration: none; }

a:focus-visible,
button:focus-visible { outline: 3px solid color-mix(in srgb, var(--dl-cyan) 70%, #fff); outline-offset: 3px; }

@keyframes enter-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1020px) {
  .hero-shell { grid-template-columns: 1fr; gap: 48px; min-height: auto; }
  .research-map { max-width: 680px; }
  .platform-grid { grid-template-columns: 1fr; }
  .platform-card { display: grid; grid-template-columns: 240px minmax(0, 1fr); }
  .platform-head { min-height: 100%; border-right: 1px solid var(--dl-line); border-bottom: 0; align-items: flex-start; }
  .build-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .build-option + .build-option { border-top: 0; border-left: 1px solid var(--dl-line); padding-left: 18px; }
}

@media (max-width: 720px) {
  .hero-shell,
  .content-shell { width: min(100% - 30px, 1180px); }
  .hero-shell { padding: 54px 0 48px; }
  .hero h1 { font-size: clamp(38px, 12vw, 54px); }
  .hero-subtitle { font-size: 15px; }
  .research-map { padding: 16px; }
  .map-flow { grid-template-columns: 1fr; }
  .map-arrow { display: none; }
  .release-meta { grid-template-columns: 1fr; gap: 15px; }
  .release-meta div + div { padding-left: 0; border-left: 0; }
  .section-heading { grid-template-columns: 1fr; gap: 12px; align-items: start; }
  .platform-card { display: block; }
  .platform-head { border-right: 0; border-bottom: 1px solid var(--dl-line); }
  .build-list { display: block; }
  .build-option + .build-option { border-top: 1px solid var(--dl-line); border-left: 0; padding-left: 0; }
  .guide-grid, .trust-grid { grid-template-columns: 1fr; }
  .guide-grid article + article { border-top: 1px solid var(--dl-line); border-left: 0; }
  .install-note { grid-template-columns: auto 1fr; }
  .install-note a { grid-column: 2; white-space: normal; }
  .detected-banner { align-items: flex-start; flex-wrap: wrap; }
  .detected-detail { width: 100%; margin-left: 29px; }
  .download-footer { align-items: flex-start; gap: 18px; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
</style>
