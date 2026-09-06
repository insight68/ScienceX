import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// GitHub-compatible slugify (matches github-slugger algorithm)
// Makes heading anchor IDs consistent between VitePress and GitHub rendering
function slugify(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-')
}

const zhSidebar = [
  {
    text: '开始使用',
    items: [
      { text: '指南首页', link: '/guide/' },
      { text: '科研孪生实验台', link: '/guide/research-twin-workbench' },
      { text: '从源码启动 CLI', link: '/guide/quick-start' },
      { text: '配置模型提供商', link: '/guide/env-vars' },
      { text: '配置与数据目录', link: '/guide/storage-layout' },
      { text: '接入第三方模型', link: '/guide/third-party-models' },
      { text: '在任意目录运行 CLI', link: '/guide/global-usage' },
      { text: '安装与接入排障', link: '/guide/faq' },
    ],
  },
  {
    text: '记忆系统',
    collapsed: false,
    items: [
      { text: '概览', link: '/memory/' },
      { text: '使用指南', link: '/memory/01-usage-guide' },
      { text: '实现原理', link: '/memory/02-implementation' },
      { text: 'AutoDream 记忆整合', link: '/memory/03-autodream' },
    ],
  },
  {
    text: 'Science 科研孪生实验台',
    collapsed: false,
    items: [
      { text: '部署与实验执行', link: '/science/01-deployment-and-workflow' },
    ],
  },
  {
    text: '多智能体（Agent）',
    collapsed: false,
    items: [
      { text: '概览', link: '/agent/' },
      { text: '使用指南', link: '/agent/01-usage-guide' },
      { text: '实现原理', link: '/agent/02-implementation' },
      { text: '框架解析', link: '/agent/03-agent-framework' },
    ],
  },
  {
    text: '技能（Skills）',
    collapsed: false,
    items: [
      { text: '使用指南', link: '/skills/01-usage-guide' },
      { text: '实现原理', link: '/skills/02-implementation' },
    ],
  },
  {
    text: '即时通信接入',
    collapsed: false,
    items: [
      { text: '总览', link: '/im/' },
      { text: '微信', link: '/im/wechat' },
      { text: '钉钉', link: '/im/dingtalk' },
      { text: 'Telegram', link: '/im/telegram' },
      { text: '飞书', link: '/im/feishu' },
    ],
  },
  {
    text: '消息通道架构',
    collapsed: false,
    items: [
      { text: '概览', link: '/channel/' },
      { text: '架构解析', link: '/channel/01-channel-system' },
    ],
  },
  {
    text: '桌面操作（Computer Use）',
    collapsed: false,
    items: [
      { text: '功能指南', link: '/features/computer-use' },
      { text: '架构解析', link: '/features/computer-use-architecture' },
    ],
  },
  {
    text: '桌面端',
    collapsed: false,
    items: [
      { text: '概览', link: '/desktop/' },
      { text: '快速上手', link: '/desktop/01-quick-start' },
      { text: '架构设计', link: '/desktop/02-architecture' },
      { text: '功能详解', link: '/desktop/03-features' },
      { text: '安装与构建', link: '/desktop/04-installation' },
      { text: 'H5 访问', link: '/desktop/06-h5-access' },
      { text: 'Electron 迁移调研', link: '/desktop/07-electron-migration-research' },
      { text: 'Electron 迁移任务', link: '/desktop/08-electron-migration-tasks' },
      { text: 'Electron 迁移验证', link: '/desktop/09-electron-migration-validation-checklist' },
      { text: 'Electron 发布与更新', link: '/desktop/10-release-auto-update' },
    ],
  },
  {
    text: '开发者文档',
    collapsed: true,
    items: [
      { text: '贡献与质量门禁', link: '/guide/contributing' },
    ],
  },
  {
    text: '参考',
    collapsed: true,
    items: [
      { text: '源码修复记录', link: '/reference/fixes' },
      { text: '项目结构', link: '/reference/project-structure' },
    ],
  },
]

const enSidebar = [
  {
    text: 'Getting Started',
    items: [
      { text: 'Guide Home', link: '/en/guide/' },
      { text: 'Research Twin Workbench', link: '/en/guide/research-twin-workbench' },
      { text: 'Run the CLI from Source', link: '/en/guide/quick-start' },
      { text: 'Configure a Model Provider', link: '/en/guide/env-vars' },
      { text: 'Configuration & Data', link: '/en/guide/storage-layout' },
      { text: 'Connect a Third-Party Model', link: '/en/guide/third-party-models' },
      { text: 'Run the CLI from Any Directory', link: '/en/guide/global-usage' },
      { text: 'Installation & Provider Troubleshooting', link: '/en/guide/faq' },
    ],
  },
  {
    text: 'Memory System',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/en/memory/' },
      { text: 'Usage Guide', link: '/en/memory/01-usage-guide' },
      { text: 'Implementation', link: '/en/memory/02-implementation' },
      { text: 'AutoDream', link: '/en/memory/03-autodream' },
    ],
  },
  {
    text: 'Science Research Twin Workbench',
    collapsed: false,
    items: [
      { text: 'Deployment & Workflow', link: '/en/science/01-deployment-and-workflow' },
    ],
  },
  {
    text: 'Multi-Agent System',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/en/agent/' },
      { text: 'Usage Guide', link: '/en/agent/01-usage-guide' },
      { text: 'Implementation', link: '/en/agent/02-implementation' },
      { text: 'Framework Deep Dive', link: '/en/agent/03-agent-framework' },
    ],
  },
  {
    text: 'Skills System',
    collapsed: false,
    items: [
      { text: 'Usage Guide', link: '/en/skills/01-usage-guide' },
      { text: 'Implementation', link: '/en/skills/02-implementation' },
    ],
  },
  {
    text: 'Channel System',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/en/channel/' },
      { text: 'Architecture', link: '/en/channel/01-channel-system' },
    ],
  },
  {
    text: 'Computer Use',
    collapsed: false,
    items: [
      { text: 'Guide', link: '/en/features/computer-use' },
      { text: 'Architecture', link: '/en/features/computer-use-architecture' },
    ],
  },
  {
    text: 'Desktop',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/en/desktop/' },
      { text: 'Quick Start', link: '/en/desktop/01-quick-start' },
      { text: 'Architecture', link: '/en/desktop/02-architecture' },
      { text: 'Features', link: '/en/desktop/03-features' },
      { text: 'Installation & Build', link: '/en/desktop/04-installation' },
    ],
  },
  {
    text: 'Developer Documentation',
    collapsed: true,
    items: [
      { text: 'Contributing & Quality Gates', link: '/en/guide/contributing' },
    ],
  },
  {
    text: 'Reference',
    collapsed: true,
    items: [
      { text: 'Source Fixes', link: '/en/reference/fixes' },
      { text: 'Project Structure', link: '/en/reference/project-structure' },
    ],
  },
]

export default withMermaid(defineConfig({
  title: 'ScienceX',
  description: '开源、本地优先的科研孪生实验台，把研究对象、实验条件与证据映射成可运行、可重放、可比较的数字实验。',
  lastUpdated: true,
  base: '/ScienceX/',

  markdown: {
    anchor: {
      slugify,
    },
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 1800,
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/ScienceX/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#062f2a' }],
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-D42DM82263' }],
    ['script', {}, `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-D42DM82263');`],
  ],

  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '下载', link: '/download' },
          { text: '开始使用', link: '/guide/' },
        ],
        sidebar: zhSidebar,
        outline: { label: '页面导航' },
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        darkModeSwitchLabel: '主题',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳转到正文',
        lastUpdated: { text: '最后更新于' },
        docFooter: { prev: '上一页', next: '下一页' },
        footer: {
          message: '基于 MIT 许可证发布。',
          copyright: 'Copyright 2026 ScienceX Contributors',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      description: 'An open-source, local-first AI workbench for traceable research data, analysis runs, and artifacts.',
      themeConfig: {
        editLink: {
          pattern: 'https://github.com/insight68/ScienceX/edit/main/docs/:path',
          text: 'Edit this page on GitHub',
        },
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Download', link: '/en/download' },
          { text: 'Get Started', link: '/en/guide/' },
        ],
        sidebar: enSidebar,
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright 2026 ScienceX Contributors',
        },
      },
    },
  },

  themeConfig: {
    logo: { src: '/images/sciencex-mark.svg', alt: 'ScienceX' },
    editLink: {
      pattern: 'https://github.com/insight68/ScienceX/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索文档',
          },
        },
        locales: {
          en: {
            translations: {
              button: {
                buttonText: 'Search',
                buttonAriaLabel: 'Search documentation',
              },
            },
          },
        },
      },
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/insight68/ScienceX' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026 ScienceX Contributors',
    },
  },
}))
