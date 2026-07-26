<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

// ── 仓库配置（部署到其他项目时改这两行即可）──
const REPO = 'insight68/ScienceX'
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO}/releases`
const REPO_PAGE = `https://github.com/${REPO}`

// ── 平台矩阵（资产命名规则见 .github/workflows/release-desktop.yml）──
interface Platform {
  id: string
  name: string
  arch: string
  family: 'macos' | 'windows' | 'linux'
  icon: 'apple' | 'windows' | 'linux'
  primaryRe: RegExp
  secondaryRe: RegExp | null
  primaryExt: string
  secondaryExt: string | null
}

const PLATFORMS: Platform[] = [
  { id: 'macos-arm64', name: 'macOS', arch: 'Apple Silicon · ARM64', family: 'macos', icon: 'apple', primaryRe: /-mac-arm64\.dmg$/i, secondaryRe: /-mac-arm64\.zip$/i, primaryExt: 'dmg', secondaryExt: 'zip' },
  { id: 'macos-x64', name: 'macOS', arch: 'Intel · x64', family: 'macos', icon: 'apple', primaryRe: /-mac-x64\.dmg$/i, secondaryRe: /-mac-x64\.zip$/i, primaryExt: 'dmg', secondaryExt: 'zip' },
  { id: 'win-x64', name: 'Windows', arch: 'x64', family: 'windows', icon: 'windows', primaryRe: /-win-x64\.exe$/i, secondaryRe: null, primaryExt: 'exe', secondaryExt: null },
  { id: 'win-arm64', name: 'Windows', arch: 'ARM64', family: 'windows', icon: 'windows', primaryRe: /-win-arm64\.exe$/i, secondaryRe: null, primaryExt: 'exe', secondaryExt: null },
  { id: 'linux-x64', name: 'Linux', arch: 'x86_64', family: 'linux', icon: 'linux', primaryRe: /-linux-x86_64\.AppImage$/i, secondaryRe: /-linux-amd64\.deb$/i, primaryExt: 'AppImage', secondaryExt: 'deb' },
  { id: 'linux-arm64', name: 'Linux', arch: 'ARM64', family: 'linux', icon: 'linux', primaryRe: /-linux-arm64\.AppImage$/i, secondaryRe: /-linux-arm64\.deb$/i, primaryExt: 'AppImage', secondaryExt: 'deb' },
]

// ── GitHub API 类型 ──
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

// ── 状态 ──
const loading = ref(true)
const error = ref(false)
const release = ref<GhRelease | null>(null)

interface CardData extends Platform {
  primary: GhAsset | null
  secondary: GhAsset | null
}
const cards = ref<CardData[]>([])

// ── OS 检测 ──
const detected = ref<{ family: string; arch: string; platformId: string } | null>(null)

function detectOs() {
  if (typeof navigator === 'undefined') return null
  const ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '')
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K|Mac OS X/i.test(ua)
  const isWin = /Win32|Win64|Windows|WinCE/i.test(ua)
  const isLinux = /Linux|X11|CrOS/i.test(ua) && !/Android/i.test(ua)
  let family: 'macos' | 'windows' | 'linux' | null = null
  if (isMac) family = 'macos'
  else if (isWin) family = 'windows'
  else if (isLinux) family = 'linux'
  if (!family) return null
  let arch: 'arm64' | 'x64' = 'x64'
  if (family === 'macos') arch = /arm64|aarch64/i.test(ua) || !/Intel/i.test(ua) ? 'arm64' : 'x64'
  else if (family === 'windows') arch = /ARM|ARM64|WoW64/i.test(ua) && !/x64/.test(ua) ? 'arm64' : 'x64'
  else if (family === 'linux') arch = /aarch64|arm64/i.test(ua) ? 'arm64' : 'x64'
  return { family, arch, platformId: `${family}-${arch}` }
}

const detectedPlatformId = computed(() => detected.value?.platformId ?? null)
const detectedLabel = computed(() => {
  if (!detected.value) return null
  const famMap: Record<string, string> = { macos: 'macOS', windows: 'Windows', linux: 'Linux' }
  const archMap: Record<string, string> = { arm64: 'ARM64', x64: 'x64' }
  return `${famMap[detected.value.family]} · ${archMap[detected.value.arch]}`
})

// ── 拉取 ──
async function load() {
  loading.value = true
  error.value = false
  try {
    const res = await fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: GhRelease = await res.json()
    release.value = data
    const assets = Array.isArray(data.assets) ? data.assets : []
    cards.value = PLATFORMS.map((p) => {
      const secRe = p.secondaryRe
      return {
        ...p,
        primary: assets.find((a) => p.primaryRe.test(a.name)) ?? null,
        secondary: secRe ? assets.find((a) => secRe.test(a.name)) ?? null : null,
      }
    })
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  detected.value = detectOs()
  load()
})

// ── 工具函数 ──
function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(1)} MB`
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

const releaseVersion = computed(() => {
  const tag = release.value?.tag_name || ''
  return tag.replace(/^v/, '') || '—'
})
const releaseDate = computed(() => release.value?.published_at || release.value?.created_at)
</script>

<template>
  <div class="page">
    <!-- ── Hero ── -->
    <section class="hero">
      <div class="hero-grid" aria-hidden="true"></div>
      <div class="hero-inner">
        <p class="eyebrow">
          <span class="dot"></span>
          ScienceX Desktop
        </p>
        <h1 class="title">下载 ScienceX</h1>
        <p class="subtitle">macOS、Windows、Linux 原生桌面客户端，自动同步最新发布版本。</p>

        <div class="meta" v-if="!loading && !error">
          <div class="meta-cell">
            <span class="meta-label">最新版本</span>
            <span class="meta-value mono">v{{ releaseVersion }}</span>
          </div>
          <div class="meta-sep"></div>
          <div class="meta-cell">
            <span class="meta-label">发布于</span>
            <span class="meta-value">{{ formatDate(releaseDate) }}</span>
          </div>
          <div class="meta-sep"></div>
          <a class="meta-link" :href="RELEASES_PAGE" target="_blank" rel="noopener noreferrer">
            全部版本 <span class="arrow">→</span>
          </a>
        </div>
      </div>
    </section>

    <!-- ── 检测到操作系统 ── -->
    <transition name="fade">
      <div v-if="detectedLabel" class="detected">
        <span class="detected-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </span>
        <span>检测到你在使用 <strong>{{ detectedLabel }}</strong></span>
      </div>
    </transition>

    <!-- ── 加载中 ── -->
    <div v-if="loading" class="status">
      <div class="spinner" aria-hidden="true"></div>
      <p>正在获取最新版本…</p>
      <div class="skeleton-grid">
        <div v-for="i in 6" :key="i" class="skel-card">
          <div class="skel-line skel-icon"></div>
          <div class="skel-line skel-title"></div>
          <div class="skel-line skel-sub"></div>
          <div class="skel-line skel-btn"></div>
        </div>
      </div>
    </div>

    <!-- ── 加载失败 ── -->
    <div v-else-if="error" class="status error-status">
      <div class="error-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.5"/></svg>
      </div>
      <h3>无法获取版本信息</h3>
      <p>你可以直接前往 GitHub Releases 下载安装包。</p>
      <div class="error-actions">
        <a class="btn btn-primary" :href="RELEASES_PAGE" target="_blank" rel="noopener noreferrer">打开 GitHub Releases</a>
        <button class="btn btn-ghost" @click="load">重试</button>
      </div>
    </div>

    <!-- ── 平台卡片 ── -->
    <section v-else class="grid" aria-label="平台下载">
      <article
        v-for="card in cards"
        :key="card.id"
        class="card"
        :class="{
          'card-recommended': detectedPlatformId === card.id,
          'card-unavailable': !card.primary,
        }"
      >
        <div v-if="detectedPlatformId === card.id" class="rec-badge">为你推荐</div>

        <header class="card-head">
          <div class="card-icon" :class="`icon-${card.icon}`" aria-hidden="true">
            <svg v-if="card.icon === 'apple'" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.82 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.82 3.15-.46 7.81 1.3 10.37.86 1.25 1.89 2.66 3.23 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.28 3.13-2.54.98-1.45 1.39-2.85 1.41-2.93-.03-.01-2.7-1.04-2.73-4.11zM14.6 4.59c.71-.86 1.19-2.06 1.06-3.26-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.43z"/></svg>
            <svg v-else-if="card.icon === 'windows'" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 5.1l7.4-1v7.4H3V5.1zM3 12.6h7.4V20l-7.4-1v-6.4zM11.4 4l9.6-1.3v8.9h-9.6V4zM11.4 12.6h9.6v8.9L11.4 20v-7.4z"/></svg>
            <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2c-2.2 0-3.5 1.6-3.5 3.8 0 1.2.4 2.2.9 3.2.3.6.6 1.2.6 1.8 0 .8-.5 1.4-1.2 2.1-1 .9-2.3 2-2.3 4.1 0 .4.1.8.2 1.2.3.9.9 1.5 1.7 1.9.6.3 1.3.4 2 .4.5 0 1-.1 1.5-.1s1 .1 1.5.1c.7 0 1.4-.1 2-.4.8-.4 1.4-1 1.7-1.9.1-.4.2-.8.2-1.2 0-2.1-1.3-3.2-2.3-4.1-.7-.7-1.2-1.3-1.2-2.1 0-.6.3-1.2.6-1.8.5-1 .9-2 .9-3.2C15.5 3.6 14.2 2 12 2zm-1.2 3.4c.4 0 .7.5.7 1.1s-.3 1.1-.7 1.1-.7-.5-.7-1.1.3-1.1.7-1.1zm2.4 0c.4 0 .7.5.7 1.1s-.3 1.1-.7 1.1-.7-.5-.7-1.1.3-1.1.7-1.1z"/></svg>
          </div>
          <div class="card-title-block">
            <h3 class="card-title">{{ card.name }}</h3>
            <p class="card-arch">{{ card.arch }}</p>
          </div>
        </header>

        <template v-if="card.primary">
          <div class="file-row">
            <div class="file-info">
              <span class="file-ext mono">.{{ card.primaryExt }}</span>
              <span class="file-size">{{ formatSize(card.primary.size) }}</span>
            </div>
            <a
              class="btn btn-primary btn-block"
              :href="card.primary.browser_download_url"
              :download="card.primary.name"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下载
            </a>
          </div>

          <a
            v-if="card.secondary"
            class="secondary"
            :href="card.secondary.browser_download_url"
            :download="card.secondary.name"
          >
            <span class="secondary-label">其他格式:</span>
            <span class="mono secondary-ext">.{{ card.secondaryExt }}</span>
            <span class="secondary-size">{{ formatSize(card.secondary.size) }}</span>
          </a>
        </template>

        <div v-else class="card-empty">
          <span class="empty-text">—</span>
        </div>
      </article>
    </section>

    <!-- ── 底部 ── -->
    <section v-if="!loading && !error" class="foot">
      <p class="foot-note">文件大小由 GitHub 提供，请选择与你的 CPU 架构匹配的安装包。</p>
      <nav class="foot-links">
        <a :href="REPO_PAGE" target="_blank" rel="noopener noreferrer">源代码 →</a>
      </nav>
    </section>
  </div>
</template>

<style>
:root {
  --brand: #d97757;
  --brand-soft: rgba(217, 119, 87, 0.14);
  --brand-strong: #c0653f;
  --bg: #ffffff;
  --bg-alt: #f7f6f3;
  --surface: #ffffff;
  --surface-2: #f2f1ed;
  --border: rgba(60, 60, 60, 0.12);
  --text-1: #1a1a1a;
  --text-2: #4a4a4a;
  --text-3: #7a7a7a;
  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --radius: 14px;
  --radius-sm: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --brand: #e08868;
    --brand-soft: rgba(224, 136, 104, 0.16);
    --brand-strong: #d97757;
    --bg: #161616;
    --bg-alt: #1c1c1c;
    --surface: #1e1e1e;
    --surface-2: #262626;
    --border: rgba(255, 255, 255, 0.1);
    --text-1: #f0f0f0;
    --text-2: #c0c0c0;
    --text-3: #909090;
  }
}

.page {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 64px;
  color: var(--text-1);
  background: var(--bg);
  min-height: 100vh;
}

.mono { font-family: var(--mono); font-feature-settings: 'tnum' 1; }

/* ── Hero ── */
.hero {
  position: relative;
  padding: 56px 0 36px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 32px;
  overflow: hidden;
}
.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%);
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%);
  opacity: 0.5;
  pointer-events: none;
}
.hero-inner { position: relative; }
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--brand);
  text-transform: uppercase;
}
.dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 4px var(--brand-soft);
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--brand-soft); }
  50% { box-shadow: 0 0 0 6px transparent; }
}
.title {
  margin: 0 0 14px;
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.03em;
  color: var(--text-1);
}
.subtitle {
  margin: 0 0 28px;
  font-size: 17px;
  line-height: 1.6;
  color: var(--text-2);
  max-width: 620px;
}
.meta {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.meta-cell { display: flex; flex-direction: column; gap: 4px; }
.meta-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
}
.meta-value { font-size: 16px; font-weight: 600; color: var(--text-1); }
.meta-value.mono { font-size: 18px; }
.meta-sep { width: 1px; height: 28px; background: var(--border); }
.meta-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand);
  transition: gap 0.2s ease;
}
.meta-link:hover { gap: 10px; }

/* ── 检测条 ── */
.detected {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin-bottom: 24px;
  border: 1px solid var(--brand-soft);
  background: var(--brand-soft);
  border-radius: 999px;
  font-size: 13px;
  color: var(--text-2);
}
.detected strong { color: var(--brand); font-weight: 700; }
.detected-icon { display: inline-flex; color: var(--brand); }

/* ── 状态 / 加载 / 错误 ── */
.status { text-align: center; padding: 40px 0; color: var(--text-2); }
.status p { margin: 16px 0 0; font-size: 14px; }
.spinner {
  width: 28px; height: 28px;
  margin: 0 auto;
  border: 2.5px solid var(--border);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 36px;
}
.skel-card {
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
.skel-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 37%, var(--surface-2) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.skel-icon { width: 36px; height: 36px; border-radius: 8px; margin-bottom: 16px; }
.skel-title { width: 50%; height: 16px; margin-bottom: 8px; }
.skel-sub { width: 70%; margin-bottom: 20px; }
.skel-btn { width: 100%; height: 38px; }

.error-status { padding: 56px 0; }
.error-icon {
  width: 56px; height: 56px;
  margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
}
.error-status h3 { margin: 0 0 8px; font-size: 18px; color: var(--text-1); }
.error-status p { margin: 0 0 24px; }
.error-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

/* ── 卡片网格 ── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}
.card:hover {
  border-color: var(--brand);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -12px rgba(0, 0, 0, 0.18);
}
.card-recommended {
  border-color: var(--brand);
  box-shadow: 0 0 0 1px var(--brand), 0 8px 28px -10px var(--brand-soft);
}
.card-unavailable { opacity: 0.55; }
.card-unavailable:hover { border-color: var(--border); transform: none; box-shadow: none; }

.rec-badge {
  position: absolute;
  top: -10px; right: 18px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  background: var(--brand);
  border-radius: 999px;
  white-space: nowrap;
}

.card-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.card-icon {
  flex: none;
  width: 42px; height: 42px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text-1);
}
.card-recommended .card-icon { background: var(--brand-soft); color: var(--brand); }
.card-title { margin: 0; font-size: 17px; font-weight: 700; color: var(--text-1); }
.card-arch { margin: 2px 0 0; font-size: 12px; color: var(--text-3); font-family: var(--mono); }

.file-row { margin-bottom: 14px; }
.file-info { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.file-ext {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.file-size { font-size: 13px; color: var(--text-3); font-family: var(--mono); }

.secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-top: auto;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-2);
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.secondary:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-soft); }
.secondary-label { color: var(--text-3); }
.secondary-ext { font-weight: 600; }
.secondary-size { margin-left: auto; color: var(--text-3); }

.card-empty { margin-top: auto; padding: 18px 0; text-align: center; }
.empty-text { color: var(--text-3); font-family: var(--mono); }

/* ── 按钮 ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  height: 38px;
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.1s;
}
.btn:active { transform: translateY(1px); }
.btn-block { width: 100%; }
.btn-primary {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}
.btn-primary:hover { background: var(--brand-strong); border-color: var(--brand-strong); }
.btn-ghost {
  background: transparent;
  color: var(--text-1);
  border-color: var(--border);
}
.btn-ghost:hover { border-color: var(--brand); color: var(--brand); }

/* ── 底部 ── */
.foot {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.foot-note { margin: 0; font-size: 12px; color: var(--text-3); max-width: 560px; }
.foot-links { display: flex; gap: 20px; }
.foot-links a {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
}
.foot-links a:hover { text-decoration: underline; text-underline-offset: 3px; }

/* ── 过渡 ── */
.fade-enter-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.fade-enter-from { opacity: 0; transform: translateY(-4px); }

/* ── 响应式 ── */
@media (max-width: 640px) {
  .page { padding: 0 16px 48px; }
  .hero { padding: 36px 0 28px; }
  .meta { gap: 14px; }
  .meta-sep { display: none; }
  .grid { grid-template-columns: 1fr; }
  .foot { flex-direction: column; align-items: flex-start; }
}
</style>
