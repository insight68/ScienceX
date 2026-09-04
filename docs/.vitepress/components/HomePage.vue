<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

const REPO_PAGE = 'https://github.com/insight68/ScienceX'

const COPY = {
  zh: {
    eyebrow: 'OPEN SOURCE · LOCAL FIRST · TRACEABLE',
    title: ['让研究问题与证据', '始终指向下一步'],
    intro: 'ScienceX 是开源、本地优先的 AI 科研工作台。它保存研究上下文，调用可审阅的工具，并把数据版本、分析运行和研究产物留在同一条研究链路中。',
    download: '下载 ScienceX',
    workflow: '查看研究闭环',
    releaseNote: '最新科研功能请以 Release 说明为准',
    trust: ['本地数据', '开放源码', '跨平台桌面端'],
    proofLabel: '内置案例 · 模拟数据',
    proofQuestionLabel: '研究问题',
    proofQuestion: 'SX-101 是否随浓度升高降低 HepG2 细胞的相对活力？',
    proofDataset: '锁定数据版本',
    proofRun: '确定性 4PL 分析',
    proofEvidence: '技术证据',
    proofVerdict: '支持',
    proofIc50: '相对 IC50',
    proofReplay: '重放验证一致',
    proofArtifacts: '3 个研究产物',
    realityLabel: 'THE REALITY',
    realityTitle: '科研最稀缺的，是研究者的注意力',
    realityBody: '文献、代码、数据和判断散落在不同工具中。一次任务完成后，失败原因、证据关系和下一步往往没有被保留下来。',
    realitySignals: [
      ['资料分散', '时间耗在搜索和筛选'],
      ['进度难追踪', '任务散落在聊天和文档'],
      ['证据链断裂', '思路、实验与结论难以衔接'],
      ['重复解释', '每次对话都要重建上下文'],
    ],
    loopLabel: 'RESEARCH LOOP',
    loopTitle: '结果进入上下文，下一轮研究从这里继续',
    loopBody: 'ScienceX 保存研究状态，执行经过授权的任务，并把输入、过程和产物交给研究者审阅。研究者决定哪些证据成立，以及下一步往哪里走。',
    loopSteps: ['理解问题', '制定计划', '执行分析', '检查证据', '形成下一步'],
    memoryTitle: 'Research Memory',
    memoryBody: '研究目标 · 假设与证据 · 数据版本 · 关键决策 · 结果 · 未解决问题',
    caseLabel: 'RUNNABLE EVIDENCE',
    caseTitle: '一条可以实际运行和重放的研究链路',
    caseBody: '现有的细胞活力教学案例会在本地生成模拟数据，完成版本化实验设计、4PL 分析、技术证据评估和结果重放。它也保留失败与证据不足，而不是只展示成功结果。',
    caseFacts: [
      ['03 MIN', '本地教学案例'],
      ['24 WELLS', '带版本的实验设计'],
      ['SHA-256', '输入与产物哈希'],
      ['REPLAY', '固定原始版本重放'],
    ],
    scenariosTitle: '四个真实运行场景',
    scenarios: [
      ['正常剂量反应', '完成分析并生成 3 个产物', 'passed'],
      ['数据更新', '旧版本仍可固定重放', 'verified'],
      ['缺孔输入', '明确失败，不静默补值', 'blocked'],
      ['弱响应', '运行完成，技术证据尚无定论', 'review'],
    ],
    simulationNote: '模拟数据，仅用于产品教学；不代表真实药效、湿实验验证或科学结论。',
    systemLabel: 'HOW IT WORKS',
    systemTitle: '一套承载研究过程的运行系统',
    systemBody: '模型负责推理。ScienceX 负责保存研究状态、组织能力、连接工具，并留下可检查的执行证据。',
    layers: [
      ['Research Thread', '跨会话保留研究目标、证据、决策和下一步。'],
      ['Skills', '内置科研工作流，也支持安装经过审阅的扩展能力。'],
      ['Tools / MCP', '连接本地文件、代码、计算环境和已配置的外部服务。'],
      ['Provenance', '记录数据版本、参数、运行环境、事件和产物哈希。'],
    ],
    humanLabel: 'HUMAN IN THE LOOP',
    humanTitle: 'ScienceX 负责执行和记录，研究者负责科学判断',
    humanIntro: '高风险操作需要授权，关键证据需要人工复核。AI 审阅由研究者主动发送，不能替代湿实验、统计审查或领域判断。',
    sciencexRole: 'ScienceX',
    sciencexTasks: ['检索、阅读与整理', '编码、计算与比较', '保存过程和候选假设'],
    researcherRole: 'Researcher',
    researcherTasks: ['提出重要问题', '审核关键证据', '作出最终科学判断'],
    roadmapLabel: 'PRODUCT BOUNDARY',
    roadmapTitle: '当前能力与产品路线清楚分开',
    stages: [
      {
        tag: 'NOW',
        title: 'Research Assistant',
        body: '研究线程、本地项目、科研 Skills、数据版本、确定性分析、证据与重放。',
      },
      {
        tag: 'NEXT',
        title: 'Research Agent',
        body: '更完整地组织计划、执行、验证，并在人工确认后更新研究状态。',
      },
      {
        tag: 'VISION',
        title: 'AI Scientist',
        body: '让结果持续影响假设、实验设计和后续研究路线。',
      },
    ],
    nowBadge: '当前可用',
    nextBadge: '下一阶段',
    visionBadge: '长期愿景',
    finalTitle: '从一条可追溯的研究链路开始',
    finalBody: '在自己的设备上创建研究项目，保留数据版本、分析过程与研究产物。',
    source: '查看源代码',
    sourceStart: '从源码体验',
  },
  en: {
    eyebrow: 'OPEN SOURCE · LOCAL FIRST · TRACEABLE',
    title: ['Questions to evidence.', 'Evidence to next steps.'],
    intro: 'ScienceX is an open-source, local-first AI workbench for research. It preserves context, calls reviewable tools, and keeps dataset versions, analysis runs, and artifacts on one traceable research path.',
    download: 'Download ScienceX',
    workflow: 'See the research loop',
    releaseNote: 'Check each Release for the latest included research features',
    trust: ['Local data', 'Open source', 'Cross-platform desktop'],
    proofLabel: 'BUILT-IN EXAMPLE · SIMULATED DATA',
    proofQuestionLabel: 'Research question',
    proofQuestion: 'Does SX-101 reduce HepG2 relative viability as concentration increases?',
    proofDataset: 'Pinned dataset version',
    proofRun: 'Deterministic 4PL analysis',
    proofEvidence: 'Technical evidence',
    proofVerdict: 'Supported',
    proofIc50: 'Relative IC50',
    proofReplay: 'Replay verified',
    proofArtifacts: '3 research artifacts',
    realityLabel: 'THE REALITY',
    realityTitle: 'A researcher’s attention is the scarce resource',
    realityBody: 'Papers, code, data, and decisions live in different tools. When a task ends, the reason it failed, the relationship between evidence, and the next step are often lost.',
    realitySignals: [
      ['Scattered sources', 'Time goes into search and filtering'],
      ['Hidden progress', 'Work is split across chats and documents'],
      ['Broken evidence path', 'Ideas, experiments, and conclusions drift apart'],
      ['Repeated context', 'Every conversation starts with another explanation'],
    ],
    loopLabel: 'RESEARCH LOOP',
    loopTitle: 'Results enter the context for the next research cycle',
    loopBody: 'ScienceX preserves research state, executes authorized work, and gives researchers the inputs, process, and outputs to review. Researchers decide what the evidence supports and where the work goes next.',
    loopSteps: ['Understand', 'Plan', 'Act', 'Verify', 'Continue'],
    memoryTitle: 'Research Memory',
    memoryBody: 'Goals · hypotheses and evidence · dataset versions · decisions · results · open questions',
    caseLabel: 'RUNNABLE EVIDENCE',
    caseTitle: 'A research path you can run and replay',
    caseBody: 'The current cell-viability teaching example generates simulated data locally, then runs a versioned assay design, deterministic 4PL analysis, technical-evidence evaluation, and replay. It preserves failed and inconclusive outcomes instead of showing only success.',
    caseFacts: [
      ['03 MIN', 'Local teaching example'],
      ['24 WELLS', 'Versioned assay design'],
      ['SHA-256', 'Input and artifact hashes'],
      ['REPLAY', 'Pinned-version replay'],
    ],
    scenariosTitle: 'Four actual run scenarios',
    scenarios: [
      ['Dose response', 'Completes analysis and creates 3 artifacts', 'passed'],
      ['Changed data', 'The pinned old version still replays', 'verified'],
      ['Missing well', 'Fails explicitly without filling values', 'blocked'],
      ['Weak response', 'Run completes with inconclusive evidence', 'review'],
    ],
    simulationNote: 'Simulated teaching data. It does not establish efficacy, wet-lab validation, or a scientific conclusion.',
    systemLabel: 'HOW IT WORKS',
    systemTitle: 'A runtime that carries the research process',
    systemBody: 'Models provide reasoning. ScienceX preserves research state, organizes capabilities, connects tools, and leaves execution evidence that people can inspect.',
    layers: [
      ['Research Thread', 'Keep research goals, evidence, decisions, and next steps across sessions.'],
      ['Skills', 'Use bundled research workflows or install reviewed extensions.'],
      ['Tools / MCP', 'Connect local files, code, compute, and configured external services.'],
      ['Provenance', 'Record dataset versions, parameters, environments, events, and artifact hashes.'],
    ],
    humanLabel: 'HUMAN IN THE LOOP',
    humanTitle: 'ScienceX executes and records. Researchers make scientific judgments.',
    humanIntro: 'High-risk actions require authorization, and important evidence requires human review. Researchers send AI review prompts explicitly. AI does not replace wet-lab work, statistical review, or domain judgment.',
    sciencexRole: 'ScienceX',
    sciencexTasks: ['Search, read, and organize', 'Code, compute, and compare', 'Preserve process and candidate hypotheses'],
    researcherRole: 'Researcher',
    researcherTasks: ['Ask important questions', 'Review critical evidence', 'Make the final scientific judgment'],
    roadmapLabel: 'PRODUCT BOUNDARY',
    roadmapTitle: 'Current capability and product direction stay distinct',
    stages: [
      {
        tag: 'NOW',
        title: 'Research Assistant',
        body: 'Research threads, local projects, research Skills, dataset versions, deterministic analysis, evidence, and replay.',
      },
      {
        tag: 'NEXT',
        title: 'Research Agent',
        body: 'Organize planning, execution, and verification more completely, then update research state after human confirmation.',
      },
      {
        tag: 'VISION',
        title: 'AI Scientist',
        body: 'Let results continue to shape hypotheses, experiment design, and the next research direction.',
      },
    ],
    nowBadge: 'Available now',
    nextBadge: 'Next stage',
    visionBadge: 'Long-term vision',
    finalTitle: 'Start with one traceable research path',
    finalBody: 'Create a research project on your own device and preserve its data versions, analysis process, and artifacts.',
    source: 'View source',
    sourceStart: 'Run from source',
  },
} as const

const { lang } = useData()
const isEnglish = computed(() => lang.value.toLowerCase().startsWith('en'))
const copy = computed(() => (isEnglish.value ? COPY.en : COPY.zh))

function localPath(path: string): string {
  return withBase(`${isEnglish.value ? '/en' : ''}${path}`)
}

function stageBadge(index: number): string {
  if (index === 0) return copy.value.nowBadge
  if (index === 1) return copy.value.nextBadge
  return copy.value.visionBadge
}
</script>

<template>
  <div class="sciencex-home">
    <section class="home-hero" aria-labelledby="sciencex-home-title">
      <div class="hero-grid" aria-hidden="true"></div>
      <div class="home-shell hero-layout">
        <div class="hero-copy">
          <p class="eyebrow"><span></span>{{ copy.eyebrow }}</p>
          <h1 id="sciencex-home-title">
            <span>{{ copy.title[0] }}</span>
            <span class="title-accent">{{ copy.title[1] }}</span>
          </h1>
          <p class="hero-intro">{{ copy.intro }}</p>
          <div class="hero-actions">
            <a class="primary-action" :href="localPath('/download')">{{ copy.download }}</a>
            <a class="secondary-action" href="#research-loop">{{ copy.workflow }} <span aria-hidden="true">↓</span></a>
          </div>
          <p class="release-note">{{ copy.releaseNote }}</p>
          <ul class="trust-list" aria-label="ScienceX product attributes">
            <li v-for="item in copy.trust" :key="item"><span aria-hidden="true">✓</span>{{ item }}</li>
          </ul>
        </div>

        <div class="proof-window" aria-label="ScienceX simulated cell viability example">
          <div class="window-bar">
            <span class="window-mark">SX</span>
            <span>{{ copy.proofLabel }}</span>
            <span class="local-state"><i></i>LOCAL</span>
          </div>
          <div class="proof-question">
            <small>{{ copy.proofQuestionLabel }}</small>
            <strong>{{ copy.proofQuestion }}</strong>
          </div>
          <div class="proof-pipeline" aria-hidden="true">
            <span>{{ copy.proofDataset }}</span><b>→</b><span>{{ copy.proofRun }}</span><b>→</b><span>{{ copy.proofEvidence }}</span>
          </div>
          <div class="proof-result">
            <div class="curve-wrap" aria-hidden="true">
              <svg viewBox="0 0 320 170" role="img">
                <defs>
                  <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#1bcb7b" stop-opacity=".25" />
                    <stop offset="1" stop-color="#1bcb7b" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path class="axis" d="M24 18V146H302" />
                <path class="guide" d="M24 54H302M24 96H302" />
                <path class="area" d="M30 31 C72 31 91 34 117 48 C153 67 161 107 190 126 C218 144 258 143 296 143 L296 146 L30 146Z" />
                <path class="curve" d="M30 31 C72 31 91 34 117 48 C153 67 161 107 190 126 C218 144 258 143 296 143" />
                <circle cx="54" cy="31" r="4" /><circle cx="104" cy="42" r="4" /><circle cx="155" cy="90" r="4" /><circle cx="207" cy="135" r="4" /><circle cx="274" cy="142" r="4" />
              </svg>
              <div class="curve-axis"><span>0.01</span><span>1</span><span>100 µM</span></div>
            </div>
            <dl class="metric-stack">
              <div><dt>{{ copy.proofVerdict }}</dt><dd>R² &gt; 0.99</dd></div>
              <div><dt>{{ copy.proofIc50 }}</dt><dd>≈ 1 µM</dd></div>
            </dl>
          </div>
          <div class="proof-foot">
            <span><i class="verified-dot"></i>{{ copy.proofReplay }}</span>
            <span>{{ copy.proofArtifacts }}</span>
          </div>
        </div>
      </div>
    </section>

    <main>
      <section id="research-reality" class="reality-section section-pad">
        <div class="home-shell reality-layout">
          <div class="section-copy">
            <p class="section-label">{{ copy.realityLabel }}</p>
            <h2>{{ copy.realityTitle }}</h2>
            <p>{{ copy.realityBody }}</p>
          </div>
          <div class="signal-list">
            <article v-for="(signal, index) in copy.realitySignals" :key="signal[0]">
              <span>0{{ index + 1 }}</span>
              <div><h3>{{ signal[0] }}</h3><p>{{ signal[1] }}</p></div>
            </article>
          </div>
        </div>
      </section>

      <section id="research-loop" class="loop-section section-pad">
        <div class="home-shell">
          <div class="section-heading inverse-heading">
            <div>
              <p class="section-label">{{ copy.loopLabel }}</p>
              <h2>{{ copy.loopTitle }}</h2>
            </div>
            <p>{{ copy.loopBody }}</p>
          </div>
          <ol class="loop-track">
            <li v-for="(step, index) in copy.loopSteps" :key="step">
              <span>0{{ index + 1 }}</span>
              <strong>{{ step }}</strong>
              <i v-if="index < copy.loopSteps.length - 1" aria-hidden="true">→</i>
            </li>
          </ol>
          <div class="memory-bar">
            <div><small>STATE LAYER</small><strong>{{ copy.memoryTitle }}</strong></div>
            <p>{{ copy.memoryBody }}</p>
          </div>
        </div>
      </section>

      <section id="runnable-evidence" class="case-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <p class="section-label">{{ copy.caseLabel }}</p>
              <h2>{{ copy.caseTitle }}</h2>
            </div>
            <p>{{ copy.caseBody }}</p>
          </div>
          <div class="case-grid">
            <div class="case-facts">
              <article v-for="fact in copy.caseFacts" :key="fact[0]">
                <strong>{{ fact[0] }}</strong><span>{{ fact[1] }}</span>
              </article>
            </div>
            <div class="scenario-panel">
              <p class="scenario-title">{{ copy.scenariosTitle }}</p>
              <div v-for="scenario in copy.scenarios" :key="scenario[0]" class="scenario-row">
                <span :class="['scenario-status', scenario[2]]" aria-hidden="true"></span>
                <strong>{{ scenario[0] }}</strong>
                <small>{{ scenario[1] }}</small>
              </div>
            </div>
          </div>
          <p class="simulation-note"><span aria-hidden="true">!</span>{{ copy.simulationNote }}</p>
        </div>
      </section>

      <section id="system" class="system-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <p class="section-label">{{ copy.systemLabel }}</p>
              <h2>{{ copy.systemTitle }}</h2>
            </div>
            <p>{{ copy.systemBody }}</p>
          </div>
          <div class="system-map">
            <div class="system-core"><span>ScienceX</span><strong>Research Runtime</strong></div>
            <article v-for="(layer, index) in copy.layers" :key="layer[0]">
              <span>0{{ index + 1 }}</span>
              <h3>{{ layer[0] }}</h3>
              <p>{{ layer[1] }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="human-in-the-loop" class="human-section section-pad">
        <div class="home-shell">
          <div class="human-intro">
            <p class="section-label">{{ copy.humanLabel }}</p>
            <h2>{{ copy.humanTitle }}</h2>
            <p>{{ copy.humanIntro }}</p>
          </div>
          <div class="role-grid">
            <article class="sciencex-role">
              <small>EXECUTION</small><h3>{{ copy.sciencexRole }}</h3>
              <ul><li v-for="item in copy.sciencexTasks" :key="item">{{ item }}</li></ul>
            </article>
            <div class="role-divider" aria-hidden="true"><span>×</span></div>
            <article>
              <small>JUDGMENT</small><h3>{{ copy.researcherRole }}</h3>
              <ul><li v-for="item in copy.researcherTasks" :key="item">{{ item }}</li></ul>
            </article>
          </div>
        </div>
      </section>

      <section id="roadmap" class="roadmap-section section-pad">
        <div class="home-shell">
          <div class="section-heading inverse-heading">
            <div>
              <p class="section-label">{{ copy.roadmapLabel }}</p>
              <h2>{{ copy.roadmapTitle }}</h2>
            </div>
          </div>
          <div class="stage-grid">
            <article v-for="(stage, index) in copy.stages" :key="stage.tag" :class="{ current: index === 0 }">
              <div class="stage-head"><span>{{ stage.tag }}</span><small>{{ stageBadge(index) }}</small></div>
              <h3>{{ stage.title }}</h3>
              <p>{{ stage.body }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="start" class="final-section">
        <div class="home-shell final-layout">
          <div><p>SCIENCEX / RESEARCH WORKBENCH</p><h2>{{ copy.finalTitle }}</h2><span>{{ copy.finalBody }}</span></div>
          <div class="final-actions">
            <a class="primary-action" :href="localPath('/download')">{{ copy.download }}</a>
            <a class="secondary-action light" :href="localPath('/guide/quick-start')">{{ copy.sourceStart }}</a>
            <a class="source-link" :href="REPO_PAGE" target="_blank" rel="noopener noreferrer">{{ copy.source }} ↗</a>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.sciencex-home {
  --sx-paper: #f6f8f6;
  --sx-panel: #ffffff;
  --sx-ink: #082e2a;
  --sx-muted: #667773;
  --sx-line: #d5dfdc;
  --sx-green: #16bf72;
  --sx-green-soft: #e4f5ed;
  --sx-blue: #2468f2;
  --sx-navy: #073b32;
  min-height: calc(100vh - var(--vp-nav-height));
  color: var(--sx-ink);
  background: var(--sx-paper);
  font-family: "Avenir Next", Avenir, "Noto Sans SC", "Microsoft YaHei", sans-serif;
}

.home-shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
.section-pad { padding: 110px 0; }
.section-label { margin: 0 0 17px; color: var(--sx-green); font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
h1, h2, h3, p { margin-top: 0; }
h1, h2 { font-family: "Songti SC", STSong, "Noto Serif CJK SC", Georgia, serif; }
h2 { margin-bottom: 0; color: var(--sx-ink); font-size: clamp(36px, 4.6vw, 60px); font-weight: 700; letter-spacing: -.045em; line-height: 1.15; }

.home-hero { position: relative; overflow: hidden; color: #fff; background: #062f2a; }
.hero-grid { position: absolute; inset: 0; opacity: .62; background-image: linear-gradient(rgba(82, 201, 159, .085) 1px, transparent 1px), linear-gradient(90deg, rgba(82, 201, 159, .085) 1px, transparent 1px); background-size: 44px 44px; mask-image: linear-gradient(100deg, #000 15%, rgba(0, 0, 0, .42) 76%, transparent); pointer-events: none; }
.home-hero::after { position: absolute; width: 480px; height: 480px; right: -250px; bottom: -330px; border: 1px solid rgba(36, 104, 242, .5); border-radius: 50%; box-shadow: 0 0 0 82px rgba(36, 104, 242, .045), 0 0 0 164px rgba(22, 191, 114, .025); content: ""; }
.hero-layout { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(420px, .96fr); gap: 72px; align-items: center; min-height: 670px; padding: 88px 0 84px; }
.hero-copy { animation: enter-up .58s ease-out both; }
.eyebrow { display: flex; align-items: center; gap: 11px; margin-bottom: 24px; color: #9fe2c5; font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.eyebrow span { width: 8px; height: 8px; border-radius: 50%; background: var(--sx-green); box-shadow: 0 0 0 6px rgba(22, 191, 114, .12); }
.home-hero h1 { max-width: 760px; margin: 0; color: #fff; font-size: clamp(48px, 5.2vw, 72px); font-weight: 700; letter-spacing: -.055em; line-height: 1.08; }
.home-hero h1 > span { display: block; }
.title-accent { color: #67daa9; }
.hero-intro { max-width: 690px; margin: 27px 0 0; color: #bfd4cd; font-size: 17px; line-height: 1.8; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 34px; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px; border-radius: 7px; font-size: 14px; font-weight: 750; text-decoration: none; transition: transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease; }
.primary-action { color: #fff; background: var(--sx-blue); box-shadow: 0 14px 28px rgba(16, 42, 112, .22); }
.primary-action:hover { color: #fff; background: #3b79fa; transform: translateY(-2px); }
.secondary-action { gap: 9px; color: #ddf4eb; border: 1px solid rgba(207, 239, 226, .32); background: rgba(255, 255, 255, .04); }
.secondary-action:hover { color: #fff; border-color: rgba(207, 239, 226, .65); background: rgba(255, 255, 255, .08); transform: translateY(-2px); }
.release-note { margin: 13px 0 0; color: #819f95; font-size: 11px; }
.trust-list { display: flex; flex-wrap: wrap; gap: 24px; margin: 32px 0 0; padding: 22px 0 0; border-top: 1px solid rgba(178, 222, 205, .18); list-style: none; color: #b8cfc7; font-size: 12px; }
.trust-list li { display: flex; align-items: center; gap: 7px; }
.trust-list span { color: var(--sx-green); font-weight: 900; }

.proof-window { position: relative; overflow: hidden; border: 1px solid rgba(133, 208, 180, .36); background: rgba(4, 37, 33, .82); box-shadow: 0 40px 84px rgba(0, 16, 13, .34); backdrop-filter: blur(16px); animation: enter-up .58s .12s ease-out both; }
.proof-window::before, .proof-window::after { position: absolute; width: 18px; height: 18px; border-color: var(--sx-green); content: ""; }
.proof-window::before { top: -1px; left: -1px; border-top: 2px solid; border-left: 2px solid; }
.proof-window::after { right: -1px; bottom: -1px; border-right: 2px solid; border-bottom: 2px solid; }
.window-bar { display: flex; align-items: center; gap: 11px; padding: 15px 18px; border-bottom: 1px solid rgba(164, 214, 195, .17); color: #89aa9e; font-family: "SFMono-Regular", Consolas, monospace; font-size: 9px; font-weight: 800; letter-spacing: .1em; }
.window-mark { display: grid; width: 26px; height: 26px; place-items: center; color: #fff; border-radius: 7px; background: var(--sx-blue); letter-spacing: -.08em; }
.local-state { display: flex; align-items: center; gap: 6px; margin-left: auto; color: #9fe2c5; }
.local-state i { width: 6px; height: 6px; border-radius: 50%; background: var(--sx-green); }
.proof-question { padding: 20px 22px; border-bottom: 1px solid rgba(164, 214, 195, .17); background: rgba(22, 191, 114, .055); }
.proof-question small { display: block; margin-bottom: 7px; color: #79a397; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.proof-question strong { display: block; color: #f2faf6; font-size: 14px; line-height: 1.55; }
.proof-pipeline { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 8px; align-items: center; padding: 17px 22px; color: #a7c1b8; font-size: 9px; text-align: center; }
.proof-pipeline span { min-height: 38px; display: grid; place-items: center; padding: 6px; border: 1px solid rgba(164, 214, 195, .16); background: rgba(255, 255, 255, .025); }
.proof-pipeline b { color: var(--sx-green); font-weight: 500; }
.proof-result { display: grid; grid-template-columns: minmax(0, 1fr) 112px; gap: 18px; padding: 6px 22px 20px; }
.curve-wrap { min-width: 0; }
.curve-wrap svg { display: block; width: 100%; height: auto; overflow: visible; }
.curve-wrap .axis { fill: none; stroke: #57786e; stroke-width: 1; }
.curve-wrap .guide { fill: none; stroke: rgba(124, 162, 150, .2); stroke-width: 1; stroke-dasharray: 4 5; }
.curve-wrap .area { fill: url(#area-gradient); }
.curve-wrap .curve { fill: none; stroke: var(--sx-green); stroke-width: 3; stroke-linecap: round; }
.curve-wrap circle { fill: #062f2a; stroke: #75e5b4; stroke-width: 2; }
.curve-axis { display: flex; justify-content: space-between; padding-left: 8px; color: #65877c; font-family: "SFMono-Regular", Consolas, monospace; font-size: 8px; }
.metric-stack { display: grid; align-content: center; gap: 12px; margin: 0; }
.metric-stack div { padding: 12px; border-left: 2px solid var(--sx-green); background: rgba(255, 255, 255, .035); }
.metric-stack dt { color: #7da195; font-size: 8px; font-weight: 800; letter-spacing: .08em; }
.metric-stack dd { margin: 5px 0 0; color: #f5fbf8; font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; font-weight: 700; }
.proof-foot { display: flex; justify-content: space-between; gap: 16px; padding: 15px 22px; border-top: 1px solid rgba(164, 214, 195, .17); color: #9ab9ae; font-size: 9px; }
.proof-foot span { display: flex; align-items: center; gap: 7px; }
.verified-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sx-green); box-shadow: 0 0 0 4px rgba(22, 191, 114, .1); }

.reality-section { background: #fbfcfb; }
.reality-layout { display: grid; grid-template-columns: minmax(0, .9fr) minmax(500px, 1.1fr); gap: 100px; align-items: start; }
.section-copy > p:last-child, .section-heading > p, .human-intro > p:last-child { color: var(--sx-muted); font-size: 15px; line-height: 1.85; }
.section-copy > p:last-child { max-width: 560px; margin: 28px 0 0; }
.signal-list { border-top: 1px solid var(--sx-line); }
.signal-list article { display: grid; grid-template-columns: 42px 150px 1fr; gap: 18px; align-items: center; padding: 21px 0; border-bottom: 1px solid var(--sx-line); }
.signal-list article > span { color: var(--sx-green); font-family: "SFMono-Regular", Consolas, monospace; font-size: 11px; font-weight: 800; }
.signal-list article div { display: contents; }
.signal-list h3 { margin: 0; color: var(--sx-ink); font-size: 14px; }
.signal-list p { margin: 0; color: var(--sx-muted); font-size: 12px; line-height: 1.55; }

.loop-section, .roadmap-section { color: #fff; background: var(--sx-navy); }
.section-heading { display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, .78fr); gap: 86px; align-items: end; margin-bottom: 54px; }
.section-heading > p { margin: 0; }
.inverse-heading h2 { color: #fff; }
.inverse-heading > p { color: #acc9bf; }
.loop-track { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.loop-track li { position: relative; min-height: 126px; padding: 19px 18px; border: 1px solid rgba(166, 221, 201, .22); background: rgba(255, 255, 255, .03); }
.loop-track li:first-child, .loop-track li:last-child { border-color: rgba(22, 191, 114, .75); background: rgba(22, 191, 114, .095); }
.loop-track span { display: block; color: #65b99a; font-family: "SFMono-Regular", Consolas, monospace; font-size: 9px; }
.loop-track strong { display: block; margin-top: 38px; color: #f4fbf8; font-size: 14px; }
.loop-track i { position: absolute; z-index: 2; top: 50%; right: -17px; color: var(--sx-green); font-style: normal; transform: translateY(-50%); }
.memory-bar { display: grid; grid-template-columns: 210px 1fr; gap: 40px; align-items: center; margin: 24px 0 0 92px; padding: 24px 30px; border-left: 3px solid var(--sx-green); background: #04261f; }
.memory-bar div { display: grid; gap: 5px; }
.memory-bar small { color: #538477; font-family: "SFMono-Regular", Consolas, monospace; font-size: 8px; letter-spacing: .12em; }
.memory-bar strong { font-family: "Songti SC", STSong, Georgia, serif; font-size: 21px; }
.memory-bar p { margin: 0; color: #a9c8bc; font-size: 13px; line-height: 1.7; }

.case-section { background: var(--sx-paper); }
.case-grid { display: grid; grid-template-columns: minmax(0, .76fr) minmax(520px, 1.24fr); gap: 24px; }
.case-facts { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid var(--sx-line); border-left: 1px solid var(--sx-line); }
.case-facts article { min-height: 132px; padding: 22px; border-right: 1px solid var(--sx-line); border-bottom: 1px solid var(--sx-line); background: rgba(255, 255, 255, .52); }
.case-facts strong { display: block; color: var(--sx-blue); font-family: "SFMono-Regular", Consolas, monospace; font-size: 19px; }
.case-facts span { display: block; margin-top: 22px; color: var(--sx-muted); font-size: 11px; line-height: 1.5; }
.scenario-panel { padding: 12px 27px 16px; border: 1px solid var(--sx-line); background: var(--sx-panel); box-shadow: 0 22px 50px rgba(8, 46, 42, .06); }
.scenario-title { margin: 0; padding: 10px 0 17px; color: var(--sx-muted); font-family: "SFMono-Regular", Consolas, monospace; font-size: 9px; font-weight: 800; letter-spacing: .12em; }
.scenario-row { display: grid; grid-template-columns: 11px 145px minmax(0, 1fr); gap: 13px; align-items: center; padding: 18px 0; border-top: 1px solid var(--sx-line); }
.scenario-status { width: 8px; height: 8px; border-radius: 50%; }
.scenario-status.passed, .scenario-status.verified { background: var(--sx-green); box-shadow: 0 0 0 4px rgba(22, 191, 114, .1); }
.scenario-status.blocked { background: #df7359; }
.scenario-status.review { background: #eab83f; }
.scenario-row strong { font-size: 13px; }
.scenario-row small { color: var(--sx-muted); font-size: 11px; line-height: 1.5; }
.simulation-note { display: flex; align-items: flex-start; gap: 10px; margin: 24px 0 0; color: #765e24; font-size: 11px; line-height: 1.6; }
.simulation-note span { display: grid; flex: 0 0 auto; width: 19px; height: 19px; place-items: center; border-radius: 50%; color: #503b08; background: #f1c656; font-family: Georgia, serif; font-weight: 800; }

.system-section { background: #fbfcfb; }
.system-map { display: grid; grid-template-columns: 1.15fr repeat(4, 1fr); border-top: 1px solid var(--sx-line); border-left: 1px solid var(--sx-line); }
.system-map > * { min-height: 250px; padding: 25px; border-right: 1px solid var(--sx-line); border-bottom: 1px solid var(--sx-line); }
.system-core { display: flex; flex-direction: column; justify-content: space-between; color: #fff; background: var(--sx-navy); }
.system-core span { color: #67daa9; font-family: "SFMono-Regular", Consolas, monospace; font-size: 10px; font-weight: 800; letter-spacing: .1em; }
.system-core strong { max-width: 170px; font-family: "Songti SC", STSong, Georgia, serif; font-size: 28px; line-height: 1.15; }
.system-map article > span { color: var(--sx-green); font-family: "SFMono-Regular", Consolas, monospace; font-size: 10px; }
.system-map h3 { margin: 74px 0 14px; font-size: 15px; }
.system-map p { margin: 0; color: var(--sx-muted); font-size: 11px; line-height: 1.65; }

.human-section { background: var(--sx-green-soft); }
.human-intro { max-width: 850px; }
.human-intro > p:last-child { max-width: 760px; margin: 28px 0 0; }
.role-grid { display: grid; grid-template-columns: 1fr 80px 1fr; gap: 0; align-items: stretch; margin-top: 55px; }
.role-grid article { min-height: 330px; padding: 34px; border: 1px solid rgba(8, 46, 42, .16); border-radius: 28px; background: rgba(255, 255, 255, .7); }
.role-grid article.sciencex-role { background: #d4eee2; }
.role-grid small { color: var(--sx-green); font-family: "SFMono-Regular", Consolas, monospace; font-size: 9px; font-weight: 800; letter-spacing: .12em; }
.role-grid h3 { margin: 16px 0 0; font-family: "Songti SC", STSong, Georgia, serif; font-size: 32px; }
.role-grid ul { margin: 96px 0 0; padding: 0; list-style: none; color: #405953; font-size: 14px; line-height: 1.9; }
.role-divider { display: grid; place-items: center; }
.role-divider span { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid rgba(8, 46, 42, .22); border-radius: 50%; color: var(--sx-green); background: var(--sx-paper); font-family: Georgia, serif; font-size: 21px; }

.roadmap-section { background: #052f29; }
.stage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.stage-grid article { min-height: 280px; padding: 28px; border: 1px solid rgba(155, 214, 192, .2); border-radius: 24px; background: rgba(255, 255, 255, .025); }
.stage-grid article.current { border-color: rgba(22, 191, 114, .7); background: rgba(22, 191, 114, .09); }
.stage-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.stage-head > span { color: var(--sx-green); font-family: "SFMono-Regular", Consolas, monospace; font-size: 12px; font-weight: 800; letter-spacing: .1em; }
.stage-head small { padding: 5px 8px; border: 1px solid rgba(153, 210, 189, .2); color: #9dc2b5; font-size: 8px; }
.stage-grid h3 { margin: 76px 0 18px; color: #fff; font-family: "Songti SC", STSong, Georgia, serif; font-size: 26px; }
.stage-grid p { margin: 0; color: #a7c5ba; font-size: 12px; line-height: 1.75; }

.final-section { padding: 76px 0; color: #fff; background: #071d1a; }
.final-layout { display: grid; grid-template-columns: 1fr auto; gap: 60px; align-items: center; }
.final-layout > div > p { margin: 0 0 13px; color: #5ca98e; font-family: "SFMono-Regular", Consolas, monospace; font-size: 9px; font-weight: 800; letter-spacing: .13em; }
.final-layout h2 { margin: 0; color: #fff; font-size: clamp(34px, 4vw, 52px); }
.final-layout > div > span { display: block; max-width: 650px; margin-top: 17px; color: #90aaa1; font-size: 13px; line-height: 1.7; }
.final-actions { display: grid; grid-template-columns: auto auto; gap: 11px; align-items: center; }
.secondary-action.light { color: #dcebe5; }
.source-link { grid-column: 1 / -1; justify-self: end; color: #6ea48f; font-size: 11px; text-decoration: none; }
.source-link:hover { color: #9fe2c5; }

a:focus-visible { outline: 3px solid color-mix(in srgb, var(--sx-green) 72%, #fff); outline-offset: 4px; }
@keyframes enter-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1060px) {
  .hero-layout { grid-template-columns: 1fr; gap: 54px; }
  .proof-window { max-width: 720px; }
  .reality-layout { grid-template-columns: 1fr; gap: 58px; }
  .section-heading { grid-template-columns: 1fr; gap: 24px; align-items: start; }
  .case-grid { grid-template-columns: 1fr; }
  .system-map { grid-template-columns: repeat(2, 1fr); }
  .system-core { grid-row: span 2; }
  .final-layout { grid-template-columns: 1fr; }
  .final-actions { justify-self: start; }
  .source-link { justify-self: start; }
}

@media (max-width: 760px) {
  .home-shell { width: min(100% - 30px, 1180px); }
  .section-pad { padding: 76px 0; }
  .hero-layout { min-height: auto; padding: 62px 0 56px; }
  .home-hero h1 { font-size: clamp(42px, 12vw, 58px); }
  .hero-intro { font-size: 15px; }
  .trust-list { gap: 12px 18px; }
  .proof-result { grid-template-columns: 1fr; }
  .metric-stack { grid-template-columns: repeat(2, 1fr); }
  .proof-pipeline { grid-template-columns: 1fr; }
  .proof-pipeline b { display: none; }
  .signal-list article { grid-template-columns: 34px 1fr; }
  .signal-list article div { display: block; }
  .signal-list p { margin-top: 5px; }
  .loop-track { grid-template-columns: 1fr; }
  .loop-track li { min-height: 82px; }
  .loop-track strong { margin-top: 20px; }
  .loop-track i { display: none; }
  .memory-bar { grid-template-columns: 1fr; gap: 12px; margin-left: 24px; }
  .case-facts { grid-template-columns: 1fr 1fr; }
  .scenario-row { grid-template-columns: 11px 1fr; }
  .scenario-row small { grid-column: 2; }
  .system-map { grid-template-columns: 1fr; }
  .system-map > * { min-height: 200px; }
  .system-core { min-height: 230px; grid-row: auto; }
  .system-map h3 { margin-top: 48px; }
  .role-grid { grid-template-columns: 1fr; gap: 16px; }
  .role-divider { height: 42px; }
  .role-grid article { min-height: 270px; }
  .role-grid ul { margin-top: 64px; }
  .stage-grid { grid-template-columns: 1fr; }
  .stage-grid article { min-height: 235px; }
  .stage-grid h3 { margin-top: 52px; }
  .final-actions { grid-template-columns: 1fr; width: 100%; }
  .final-actions a { width: 100%; }
  .source-link { grid-column: auto; justify-self: start; width: auto !important; }
}

@media (max-width: 430px) {
  .home-hero h1 { font-size: 39px; }
  .hero-actions { align-items: stretch; flex-direction: column; }
  .hero-actions a { width: 100%; }
  .proof-foot { align-items: flex-start; flex-direction: column; }
  .case-facts { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
</style>
