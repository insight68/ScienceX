<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { HOME_COPY } from './home/homeContent'
import ProductProof from './home/ProductProof.vue'
import ResearchInsightPanel from './home/ResearchInsightPanel.vue'
import ResearchLoopDiagram from './home/ResearchLoopDiagram.vue'
import ResearchSkills from './home/ResearchSkills.vue'
import ResearchTwinArchitecture from './home/ResearchTwinArchitecture.vue'
import RuntimeMechanism from './home/RuntimeMechanism.vue'

const REPO_PAGE = 'https://github.com/insight68/ScienceX'

const { lang } = useData()
const isEnglish = computed(() => lang.value.toLowerCase().startsWith('en'))
const copy = computed(() => (isEnglish.value ? HOME_COPY.en : HOME_COPY.zh))

function localPath(path: string): string {
  return withBase(`${isEnglish.value ? '/en' : ''}${path}`)
}

const demoGuidePath = computed(() => localPath(
  `/science/01-deployment-and-workflow#${isEnglish.value
    ? 'try-the-built-in-example-in-three-minutes'
    : '先用-3-分钟体验内置案例'}`,
))
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
          <p class="hero-thesis">{{ copy.heroThesis }}</p>
          <p class="hero-intro">{{ copy.intro }}</p>
          <div class="hero-actions">
            <a class="primary-action" :href="demoGuidePath">{{ copy.demo }}</a>
            <a class="secondary-action" href="#research-twin">{{ copy.twinLink }} <span aria-hidden="true">↓</span></a>
          </div>
          <a class="hero-text-action" :href="localPath('/download')">{{ copy.download }} <span aria-hidden="true">↗</span></a>
          <p class="release-note">{{ copy.releaseNote }}</p>
          <ul class="trust-list" :aria-label="copy.trustLabel">
            <li v-for="item in copy.trust" :key="item"><span aria-hidden="true">✓</span>{{ item }}</li>
          </ul>
        </div>

        <div class="proof-window" role="group" :aria-label="copy.proofAria">
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
              <svg viewBox="0 0 320 170">
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

    <nav class="section-nav" :aria-label="copy.navLabel">
      <div class="home-shell">
        <a v-for="item in copy.navItems" :key="item[1]" :href="item[1]">{{ item[0] }}</a>
      </div>
    </nav>

    <main>
      <section id="research-twin" class="twin-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.twinNumber }}</span><p>{{ copy.twinLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.twinTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.twinBody }}</p>
          </div>
          <ResearchTwinArchitecture
            :aria-label="copy.twinAria"
            :contrast-label="copy.twinContrastLabel"
            :contrast-title="copy.twinContrastTitle"
            :contrast-body="copy.twinContrastBody"
            :layers="copy.twinLayers"
            :equation-label="copy.twinEquationLabel"
            :equation-terms="copy.twinEquationTerms"
            :boundary="copy.twinBoundary"
          />
        </div>
      </section>

      <section id="runnable-evidence" class="case-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.caseNumber }}</span><p>{{ copy.caseLabel }}</p></div>
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

      <section id="research-loop" class="loop-section section-pad inverse-section">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.loopNumber }}</span><p>{{ copy.loopLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.loopTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.loopBody }}</p>
          </div>
          <ResearchLoopDiagram
            :aria-label="copy.loopDiagramLabel"
            :nodes="copy.loopNodes"
            :center-title="copy.loopCenter"
            :center-body="copy.loopCenterBody"
            :memory-title="copy.memoryTitle"
            :memory-body="copy.memoryBody"
            :boundary="copy.loopBoundary"
          />
          <div class="feedback-lanes">
            <article v-for="lane in copy.feedbackLanes" :key="lane.tag" :class="lane.status">
              <small>{{ lane.tag }}</small>
              <strong>{{ lane.title }}</strong>
              <p>{{ lane.body }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="research-insight" class="insight-section section-pad inverse-section">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.insightNumber }}</span><p>{{ copy.insightLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.insightTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.insightBody }}</p>
          </div>
          <ResearchInsightPanel
            :aria-label="copy.insightAria"
            :signals="copy.insightSignals"
            :example-label="copy.insightExampleLabel"
            :example-title="copy.insightExampleTitle"
            :rows="copy.insightRows"
            :status-label="copy.insightStatusLabel"
            :status="copy.insightStatus"
            :boundary="copy.insightBoundary"
          />
        </div>
      </section>

      <section id="mechanism" class="mechanism-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.mechanismNumber }}</span><p>{{ copy.mechanismLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.mechanismTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.mechanismBody }}</p>
          </div>
          <RuntimeMechanism
            :aria-label="copy.mechanismAria"
            :steps="copy.mechanismSteps"
            :memory-label="copy.mechanismMemoryLabel"
            :memory-title="copy.memoryTitle"
            :memory-body="copy.memoryBody"
            :boundary="copy.mechanismBoundary"
          />
        </div>
      </section>

      <section id="product-proof" class="product-proof-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.productNumber }}</span><p>{{ copy.productLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.productTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.productBody }}</p>
          </div>
          <ProductProof
            :frames="copy.productFrames"
            :skill-label="copy.productSkillLabel"
            :skill-title="copy.productSkillTitle"
            :skill-body="copy.productSkillBody"
            :skill-preview="copy.productSkillPreview"
            :skill-count="copy.productSkillCount"
            :note="copy.productProofNote"
          />
        </div>
      </section>

      <section id="research-reality" class="reality-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.realityNumber }}</span><p>{{ copy.realityLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.realityTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.realityBody }}</p>
          </div>

          <div class="attention-board">
            <div class="attention-cards">
              <article v-for="(signal, index) in copy.realitySignals" :key="signal.title">
                <div class="attention-card-head"><span>0{{ index + 1 }}</span><small>{{ copy.scenarioOutputLabel }}</small></div>
                <h3>{{ signal.title }}</h3>
                <p>{{ signal.body }}</p>
                <dl>
                  <div><dt>{{ copy.scenarioOutputLabel }}</dt><dd>{{ signal.output }}</dd></div>
                  <div><dt>{{ copy.scenarioOwnerLabel }}</dt><dd>{{ signal.owner }}</dd></div>
                </dl>
                <blockquote><small>{{ copy.scenarioPromptLabel }}</small>{{ signal.prompt }}</blockquote>
              </article>
            </div>
          </div>
          <p class="reality-thesis"><span aria-hidden="true"></span>{{ copy.realityThesis }}</p>
        </div>
      </section>

      <section id="capabilities" class="capabilities-section section-pad">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.capabilitiesNumber }}</span><p>{{ copy.capabilitiesLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.capabilitiesTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.capabilitiesBody }}</p>
          </div>
          <ResearchSkills
            :count="copy.skillCount"
            :count-label="copy.skillCountLabel"
            :groups="copy.skillGroups"
            :environments-label="copy.environmentsLabel"
            :environments="copy.environments"
            :boundary="copy.skillsBoundary"
            :guide-label="copy.skillsGuide"
            :guide-href="localPath('/skills/01-usage-guide')"
          />
        </div>
      </section>

      <section id="human-in-the-loop" class="human-section section-pad inverse-section">
        <div class="home-shell">
          <div class="section-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.humanNumber }}</span><p>{{ copy.humanLabel }}</p></div>
              <h2 class="section-title-lines"><span v-for="line in copy.humanTitle" :key="line">{{ line }}</span></h2>
            </div>
            <p>{{ copy.humanIntro }}</p>
          </div>
          <div class="role-grid">
            <article class="sciencex-role">
              <small>{{ copy.sciencexRoleLabel }}</small><h3>{{ copy.sciencexRole }}</h3>
              <ul><li v-for="item in copy.sciencexTasks" :key="item">{{ item }}</li></ul>
            </article>
            <div class="role-divider" aria-hidden="true"><span>×</span></div>
            <article>
              <small>{{ copy.researcherRoleLabel }}</small><h3>{{ copy.researcherRole }}</h3>
              <ul><li v-for="item in copy.researcherTasks" :key="item">{{ item }}</li></ul>
            </article>
          </div>
          <div class="operating-model">
            <span>{{ copy.operatingModel }}</span>
            <strong>{{ copy.operatingModelBody }}</strong>
          </div>
          <ul class="guardrail-grid" :aria-label="copy.guardrailsLabel">
            <li v-for="(guardrail, index) in copy.guardrails" :key="guardrail"><span>0{{ index + 1 }}</span>{{ guardrail }}</li>
          </ul>
        </div>
      </section>

      <section id="maturity" class="maturity-section section-pad">
        <div class="home-shell">
          <div class="section-heading compact-heading">
            <div>
              <div class="section-kicker"><span>{{ copy.maturityNumber }}</span><p>{{ copy.maturityLabel }}</p></div>
              <h2>{{ copy.maturityTitle }}</h2>
            </div>
            <p>{{ copy.maturityBody }}</p>
          </div>
          <div class="stage-grid">
            <article v-for="(stage, index) in copy.stages" :key="stage.tag" :class="{ current: index === 0 }">
              <div class="stage-head"><span>{{ stage.tag }}</span><small>{{ stage.badge }}</small></div>
              <h3>{{ stage.title }}</h3>
              <p>{{ stage.body }}</p>
              <strong>{{ stage.logic }}</strong>
              <i v-if="index < copy.stages.length - 1" aria-hidden="true">→</i>
            </article>
          </div>
          <p class="maturity-boundary"><span aria-hidden="true">!</span>{{ copy.maturityBoundary }}</p>
        </div>
      </section>

      <section id="start" class="final-section">
        <div class="home-shell final-layout">
          <div>
            <p><span>{{ copy.finalNumber }}</span> ScienceX / RESEARCH TWIN WORKBENCH</p>
            <h2>{{ copy.finalTitle }}</h2>
            <strong>{{ copy.finalBody }}</strong>
            <ol class="start-steps">
              <li v-for="(step, index) in copy.startSteps" :key="step"><span>0{{ index + 1 }}</span>{{ step }}</li>
            </ol>
          </div>
          <div class="starter-panel">
            <small>{{ copy.starterPromptLabel }}</small>
            <blockquote>{{ copy.starterPrompt }}</blockquote>
            <div class="final-actions">
              <a class="primary-action" :href="localPath('/download')">{{ copy.download }}</a>
              <a class="secondary-action light" :href="demoGuidePath">{{ copy.demo }}</a>
              <a class="source-link" :href="REPO_PAGE" target="_blank" rel="noopener noreferrer">{{ copy.source }} ↗</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.sciencex-home {
  --sx-paper: #f4f6f3;
  --sx-panel: #ffffff;
  --sx-section: #fbfcfb;
  --sx-ink: #082e2a;
  --sx-muted: #60716d;
  --sx-line: #d5dfdc;
  --sx-green: #16bf72;
  --sx-green-soft: #e5f3eb;
  --sx-blue: #2468f2;
  --sx-navy: #073b32;
  --sx-display: "Songti SC", STSong, "Noto Serif CJK SC", Georgia, serif;
  --sx-body: "Avenir Next", Avenir, "Noto Sans SC", "Microsoft YaHei", sans-serif;
  --sx-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  min-height: calc(100vh - var(--vp-nav-height));
  color: var(--sx-ink);
  background: var(--sx-paper);
  font-family: var(--sx-body);
}

:global(.dark .sciencex-home) {
  --sx-paper: #081f1c;
  --sx-panel: #0c2924;
  --sx-section: #0a2420;
  --sx-ink: #eff8f4;
  --sx-muted: #a9c0b7;
  --sx-line: #294a43;
  --sx-green-soft: #10342c;
}

.home-shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
.section-pad { padding: 108px 0; scroll-margin-top: calc(var(--vp-nav-height) + 48px); }
h1, h2, h3, p { margin-top: 0; }
h1, h2 { font-family: var(--sx-display); }
h2 { margin-bottom: 0; color: var(--sx-ink); font-size: clamp(36px, 4.4vw, 58px); font-weight: 700; letter-spacing: -.045em; line-height: 1.14; }
.section-title-lines span { display: block; }

.section-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, .76fr);
  gap: 82px;
  align-items: end;
  margin-bottom: 52px;
}

.section-heading > p {
  margin: 0;
  color: var(--sx-muted);
  font-size: 15px;
  line-height: 1.85;
}

.section-kicker {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 18px;
}

.section-kicker span {
  display: grid;
  width: 31px;
  height: 24px;
  place-items: center;
  border-radius: 5px;
  color: #fff;
  background: #087147;
  font-family: var(--sx-mono);
  font-size: 10px;
  font-weight: 800;
}

.section-kicker p {
  margin: 0;
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .15em;
}

.inverse-section { color: #fff; background: var(--sx-navy); }
.inverse-section h2 { color: #fff; }
.inverse-section .section-heading > p { color: #acc9bf; }

.home-hero {
  position: relative;
  overflow: hidden;
  color: #fff;
  background: #062f2a;
}

.hero-grid {
  position: absolute;
  inset: 0;
  opacity: .62;
  background-image: linear-gradient(rgba(82, 201, 159, .085) 1px, transparent 1px), linear-gradient(90deg, rgba(82, 201, 159, .085) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(100deg, #000 15%, rgba(0, 0, 0, .42) 76%, transparent);
  pointer-events: none;
}

.home-hero::after {
  position: absolute;
  right: -250px;
  bottom: -330px;
  width: 480px;
  height: 480px;
  border: 1px solid rgba(36, 104, 242, .5);
  border-radius: 50%;
  box-shadow: 0 0 0 82px rgba(36, 104, 242, .045), 0 0 0 164px rgba(22, 191, 114, .025);
  content: '';
}

.hero-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(420px, .96fr);
  gap: 72px;
  align-items: center;
  min-height: 690px;
  padding: 82px 0 78px;
}

.hero-copy { animation: enter-up .58s ease-out both; }
.eyebrow { display: flex; align-items: center; gap: 11px; margin-bottom: 24px; color: #9fe2c5; font-family: var(--sx-mono); font-size: 10px; font-weight: 800; letter-spacing: .12em; }
.eyebrow span { width: 8px; height: 8px; border-radius: 50%; background: var(--sx-green); box-shadow: 0 0 0 6px rgba(22, 191, 114, .12); }
.home-hero h1 { max-width: 760px; margin: 0; color: #fff; font-size: clamp(48px, 5.2vw, 72px); font-weight: 700; letter-spacing: -.055em; line-height: 1.08; }
.home-hero h1 > span { display: block; }
.title-accent { color: #67daa9; }
.hero-thesis { max-width: 720px; margin: 27px 0 0; color: #f0faf6; font-family: var(--sx-display); font-size: 21px; font-weight: 700; letter-spacing: -.025em; line-height: 1.5; }
.hero-intro { max-width: 690px; margin: 13px 0 0; color: #bfd4cd; font-size: 15px; line-height: 1.82; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 13px; margin-top: 31px; }
.primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px; border-radius: 7px; font-size: 14px; font-weight: 750; text-decoration: none; transition: transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease; }
.primary-action { color: #fff; background: var(--sx-blue); box-shadow: 0 14px 28px rgba(16, 42, 112, .22); }
.primary-action:hover { color: #fff; background: #3b79fa; transform: translateY(-2px); }
.secondary-action { gap: 9px; color: #ddf4eb; border: 1px solid rgba(207, 239, 226, .32); background: rgba(255, 255, 255, .04); }
.secondary-action:hover { color: #fff; border-color: rgba(207, 239, 226, .65); background: rgba(255, 255, 255, .08); transform: translateY(-2px); }
.hero-text-action { display: inline-flex; gap: 8px; margin-top: 18px; color: #79b9a3; font-size: 11px; text-decoration: none; }
.hero-text-action:hover { color: #a9e3ce; }
.release-note { margin: 9px 0 0; color: #77988d; font-size: 10px; }
.trust-list { display: flex; flex-wrap: wrap; gap: 24px; margin: 28px 0 0; padding: 20px 0 0; border-top: 1px solid rgba(178, 222, 205, .18); list-style: none; color: #b8cfc7; font-size: 11px; }
.trust-list li { display: flex; align-items: center; gap: 7px; }
.trust-list span { color: var(--sx-green); font-weight: 900; }

.proof-window { position: relative; overflow: hidden; border: 1px solid rgba(133, 208, 180, .36); background: rgba(4, 37, 33, .82); box-shadow: 0 40px 84px rgba(0, 16, 13, .34); backdrop-filter: blur(16px); animation: enter-up .58s .12s ease-out both; }
.proof-window::before, .proof-window::after { position: absolute; width: 18px; height: 18px; border-color: var(--sx-green); content: ''; }
.proof-window::before { top: -1px; left: -1px; border-top: 2px solid; border-left: 2px solid; }
.proof-window::after { right: -1px; bottom: -1px; border-right: 2px solid; border-bottom: 2px solid; }
.window-bar { display: flex; align-items: center; gap: 11px; padding: 15px 18px; border-bottom: 1px solid rgba(164, 214, 195, .17); color: #89aa9e; font-family: var(--sx-mono); font-size: 8px; font-weight: 800; letter-spacing: .1em; }
.window-mark { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 7px; color: #fff; background: var(--sx-blue); letter-spacing: -.08em; }
.local-state { display: flex; align-items: center; gap: 6px; margin-left: auto; color: #9fe2c5; }
.local-state i { width: 6px; height: 6px; border-radius: 50%; background: var(--sx-green); }
.proof-question { padding: 20px 22px; border-bottom: 1px solid rgba(164, 214, 195, .17); background: rgba(22, 191, 114, .055); }
.proof-question small { display: block; margin-bottom: 7px; color: #79a397; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.proof-question strong { display: block; color: #f2faf6; font-size: 14px; line-height: 1.55; }
.proof-pipeline { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 8px; align-items: center; padding: 17px 22px; color: #a7c1b8; font-size: 8px; text-align: center; }
.proof-pipeline span { display: grid; min-height: 38px; place-items: center; padding: 6px; border: 1px solid rgba(164, 214, 195, .16); background: rgba(255, 255, 255, .025); }
.proof-pipeline b { color: var(--sx-green); font-weight: 500; }
.proof-result { display: grid; grid-template-columns: minmax(0, 1fr) 112px; gap: 18px; padding: 6px 22px 20px; }
.curve-wrap { min-width: 0; }
.curve-wrap svg { display: block; width: 100%; height: auto; overflow: visible; }
.curve-wrap .axis { fill: none; stroke: #57786e; stroke-width: 1; }
.curve-wrap .guide { fill: none; stroke: rgba(124, 162, 150, .2); stroke-width: 1; stroke-dasharray: 4 5; }
.curve-wrap .area { fill: url(#area-gradient); }
.curve-wrap .curve { fill: none; stroke: var(--sx-green); stroke-width: 3; stroke-linecap: round; }
.curve-wrap circle { fill: #062f2a; stroke: #75e5b4; stroke-width: 2; }
.curve-axis { display: flex; justify-content: space-between; padding-left: 8px; color: #65877c; font-family: var(--sx-mono); font-size: 8px; }
.metric-stack { display: grid; align-content: center; gap: 12px; margin: 0; }
.metric-stack div { padding: 12px; border-left: 2px solid var(--sx-green); background: rgba(255, 255, 255, .035); }
.metric-stack dt { color: #7da195; font-size: 8px; font-weight: 800; letter-spacing: .08em; }
.metric-stack dd { margin: 5px 0 0; color: #f5fbf8; font-family: var(--sx-mono); font-size: 12px; font-weight: 700; }
.proof-foot { display: flex; justify-content: space-between; gap: 16px; padding: 15px 22px; border-top: 1px solid rgba(164, 214, 195, .17); color: #9ab9ae; font-size: 9px; }
.proof-foot span { display: flex; align-items: center; gap: 7px; }
.verified-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sx-green); box-shadow: 0 0 0 4px rgba(22, 191, 114, .1); }

.section-nav { position: sticky; z-index: 12; top: var(--vp-nav-height); border-bottom: 1px solid var(--sx-line); background: color-mix(in srgb, var(--sx-panel) 88%, transparent); backdrop-filter: blur(18px); }
.section-nav .home-shell { display: flex; align-items: center; gap: 0; overflow-x: auto; scrollbar-width: none; }
.section-nav .home-shell::-webkit-scrollbar { display: none; }
.section-nav a { flex: 0 0 auto; padding: 14px 24px; border-left: 1px solid var(--sx-line); color: var(--sx-muted); font-size: 10px; font-weight: 700; text-decoration: none; }
.section-nav a:last-child { border-right: 1px solid var(--sx-line); }
.section-nav a:hover { color: var(--sx-green); background: color-mix(in srgb, var(--sx-green-soft) 62%, transparent); }

.twin-section, .reality-section, .maturity-section, .mechanism-section { background: var(--sx-section); }
.product-proof-section { background: var(--sx-paper); }
.attention-board { display: grid; gap: 22px; }
.attention-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--sx-line); border-left: 1px solid var(--sx-line); }
.attention-cards article { display: flex; min-height: 390px; flex-direction: column; padding: 22px; border-right: 1px solid var(--sx-line); border-bottom: 1px solid var(--sx-line); background: color-mix(in srgb, var(--sx-panel) 84%, transparent); }
.attention-card-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.attention-cards span { color: var(--sx-green); font-family: var(--sx-mono); font-size: 9px; font-weight: 800; }
.attention-card-head small { color: var(--sx-muted); font-family: var(--sx-mono); font-size: 7px; font-weight: 800; letter-spacing: .09em; }
.attention-cards h3 { margin: 34px 0 10px; color: var(--sx-ink); font-family: var(--sx-display); font-size: 24px; }
.attention-cards p { margin: 0; color: var(--sx-muted); font-size: 11px; line-height: 1.65; }
.attention-cards dl { display: grid; gap: 13px; margin: 28px 0 0; }
.attention-cards dl div { padding-top: 11px; border-top: 1px solid var(--sx-line); }
.attention-cards dt { color: var(--sx-green); font-family: var(--sx-mono); font-size: 7px; font-weight: 800; letter-spacing: .08em; }
.attention-cards dd { margin: 5px 0 0; color: var(--sx-ink); font-size: 10px; line-height: 1.5; }
.attention-cards blockquote { margin: auto 0 0; padding: 14px 0 0 13px; border: 0; border-left: 2px solid var(--sx-green); color: var(--sx-muted); font-size: 9px; line-height: 1.55; }
.attention-cards blockquote small { display: block; margin-bottom: 5px; color: var(--sx-green); font-family: var(--sx-mono); font-size: 7px; font-weight: 800; letter-spacing: .08em; }
.reality-thesis { display: flex; align-items: center; gap: 13px; margin: 22px 0 0; padding: 19px 22px; border-radius: 9px; color: #e8f8f1; background: var(--sx-navy); font-size: 13px; font-weight: 700; line-height: 1.55; }
.reality-thesis span { width: 9px; height: 9px; border-radius: 50%; background: var(--sx-green); box-shadow: 0 0 0 6px rgba(22, 191, 114, .12); }

.loop-section { background: #063a31; }
.feedback-lanes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 26px; }
.feedback-lanes article { position: relative; min-height: 150px; padding: 24px 26px; border: 1px solid rgba(146, 208, 185, .24); background: rgba(255, 255, 255, .035); }
.feedback-lanes article.current { border-top: 3px solid var(--sx-green); }
.feedback-lanes article.connect { border-style: dashed; border-color: rgba(97, 194, 224, .54); }
.feedback-lanes small { color: var(--sx-green); font-family: var(--sx-mono); font-size: 8px; font-weight: 800; letter-spacing: .11em; }
.feedback-lanes article.connect small { color: #6ac8e3; }
.feedback-lanes strong { display: block; margin-top: 28px; color: #f4faf7; font-family: var(--sx-display); font-size: 22px; }
.feedback-lanes p { margin: 11px 0 0; color: #9bbcaf; font-family: var(--sx-mono); font-size: 9px; line-height: 1.7; }

.insight-section { background: #071f1b; }

.maturity-section { border-bottom: 1px solid var(--sx-line); }
.compact-heading { margin-bottom: 42px; }
.stage-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stage-grid article { position: relative; display: flex; min-height: 240px; flex-direction: column; padding: 27px; border: 1px solid var(--sx-line); border-radius: 14px; background: color-mix(in srgb, var(--sx-panel) 88%, transparent); }
.stage-grid article.current { border-color: color-mix(in srgb, var(--sx-green) 70%, var(--sx-line)); background: color-mix(in srgb, var(--sx-green-soft) 56%, var(--sx-panel)); box-shadow: inset 0 3px 0 var(--sx-green); }
.stage-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.stage-head > span { color: var(--sx-green); font-family: var(--sx-mono); font-size: 10px; font-weight: 800; letter-spacing: .12em; }
.stage-head small { padding: 5px 8px; border: 1px solid var(--sx-line); color: var(--sx-muted); font-size: 8px; }
.stage-grid h3 { margin: 39px 0 15px; color: var(--sx-ink); font-family: var(--sx-display); font-size: 27px; }
.stage-grid p { margin: 0; color: var(--sx-muted); font-size: 11px; line-height: 1.72; }
.stage-grid article > strong { margin-top: auto; padding-top: 24px; color: var(--sx-green); font-family: var(--sx-mono); font-size: 8px; letter-spacing: .04em; }
.stage-grid article > i { position: absolute; z-index: 2; top: 48%; right: -23px; display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid var(--sx-line); border-radius: 50%; color: var(--sx-green); background: var(--sx-panel); font-style: normal; }
.maturity-boundary { display: flex; align-items: flex-start; gap: 10px; margin: 24px 0 0; color: var(--sx-muted); font-size: 11px; line-height: 1.65; }
.maturity-boundary span { display: grid; flex: 0 0 auto; width: 19px; height: 19px; place-items: center; border-radius: 50%; color: #503b08; background: #f1c656; font-family: Georgia, serif; font-weight: 800; }

.case-section { background: var(--sx-paper); }
.case-grid { display: grid; grid-template-columns: minmax(0, .76fr) minmax(520px, 1.24fr); gap: 24px; }
.case-facts { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid var(--sx-line); border-left: 1px solid var(--sx-line); }
.case-facts article { min-height: 132px; padding: 22px; border-right: 1px solid var(--sx-line); border-bottom: 1px solid var(--sx-line); background: color-mix(in srgb, var(--sx-panel) 60%, transparent); }
.case-facts strong { display: block; color: var(--sx-blue); font-family: var(--sx-mono); font-size: 19px; }
.case-facts span { display: block; margin-top: 22px; color: var(--sx-muted); font-size: 11px; line-height: 1.5; }
.scenario-panel { padding: 12px 27px 16px; border: 1px solid var(--sx-line); background: var(--sx-panel); box-shadow: 0 22px 50px rgba(8, 46, 42, .06); }
.scenario-title { margin: 0; padding: 10px 0 17px; color: var(--sx-muted); font-family: var(--sx-mono); font-size: 9px; font-weight: 800; letter-spacing: .12em; }
.scenario-row { display: grid; grid-template-columns: 11px 145px minmax(0, 1fr); gap: 13px; align-items: center; padding: 18px 0; border-top: 1px solid var(--sx-line); }
.scenario-status { width: 8px; height: 8px; border-radius: 50%; }
.scenario-status.passed, .scenario-status.verified { background: var(--sx-green); box-shadow: 0 0 0 4px rgba(22, 191, 114, .1); }
.scenario-status.blocked { background: #df7359; }
.scenario-status.review { background: #eab83f; }
.scenario-row strong { color: var(--sx-ink); font-size: 13px; }
.scenario-row small { color: var(--sx-muted); font-size: 11px; line-height: 1.5; }
.simulation-note { display: flex; align-items: flex-start; gap: 10px; margin: 24px 0 0; color: color-mix(in srgb, #8c6814 78%, var(--sx-ink)); font-size: 11px; line-height: 1.6; }
.simulation-note span { display: grid; flex: 0 0 auto; width: 19px; height: 19px; place-items: center; border-radius: 50%; color: #503b08; background: #f1c656; font-family: Georgia, serif; font-weight: 800; }

.capabilities-section { background: var(--sx-green-soft); }

.human-section { background: #052f29; }
.role-grid { display: grid; grid-template-columns: 1fr 80px 1fr; align-items: stretch; }
.role-grid article { min-height: 310px; padding: 31px; border: 1px solid rgba(146, 208, 185, .24); border-radius: 14px; background: rgba(255, 255, 255, .035); }
.role-grid article.sciencex-role { border-color: rgba(92, 224, 167, .48); background: rgba(22, 191, 114, .09); }
.role-grid small { color: var(--sx-green); font-family: var(--sx-mono); font-size: 8px; font-weight: 800; letter-spacing: .12em; }
.role-grid h3 { margin: 15px 0 0; color: #fff; font-family: var(--sx-display); font-size: 31px; }
.role-grid ul { display: grid; gap: 10px; margin: 64px 0 0; padding: 0; list-style: none; color: #b3cdc3; font-size: 12px; }
.role-grid li { position: relative; padding-left: 18px; }
.role-grid li::before { position: absolute; top: .55em; left: 0; width: 7px; height: 7px; border: 1px solid var(--sx-green); border-radius: 50%; content: ''; }
.role-divider { display: grid; place-items: center; }
.role-divider span { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid rgba(132, 198, 174, .3); border-radius: 50%; color: var(--sx-green); background: #06261f; font-family: Georgia, serif; font-size: 21px; }
.operating-model { display: grid; grid-template-columns: 220px 1fr; gap: 28px; align-items: center; margin: 23px 78px 0; padding: 19px 24px; border-top: 1px solid rgba(146, 208, 185, .25); color: #fff; background: rgba(1, 25, 20, .3); }
.operating-model span { color: #5d9d87; font-family: var(--sx-mono); font-size: 8px; font-weight: 800; letter-spacing: .12em; }
.operating-model strong { color: #b9d2c8; font-size: 11px; line-height: 1.6; }

.guardrail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin: 19px 0 0;
  padding: 1px;
  list-style: none;
  background: rgba(146, 208, 185, .19);
}

.guardrail-grid li {
  display: flex;
  gap: 11px;
  align-items: center;
  min-height: 66px;
  padding: 14px 16px;
  color: #c7dcd4;
  background: #07352e;
  font-size: 10px;
  line-height: 1.45;
}

.guardrail-grid span { color: var(--sx-green); font-family: var(--sx-mono); font-size: 8px; font-weight: 800; }

.final-section { padding: 74px 0; color: #fff; background: #071d1a; scroll-margin-top: calc(var(--vp-nav-height) + 48px); }
.final-layout { display: grid; grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr); gap: 60px; align-items: center; }
.final-layout > div > p { display: flex; align-items: center; gap: 10px; margin: 0 0 13px; color: #5ca98e; font-family: var(--sx-mono); font-size: 9px; font-weight: 800; letter-spacing: .13em; }
.final-layout > div > p span { display: grid; width: 29px; height: 22px; place-items: center; border-radius: 4px; color: #fff; background: #087147; }
.final-layout h2 { margin: 0; color: #fff; font-size: clamp(34px, 4vw, 52px); }
.final-layout > div > strong { display: block; max-width: 650px; margin-top: 17px; color: #90aaa1; font-size: 13px; font-weight: 500; line-height: 1.7; }
.start-steps { display: grid; gap: 9px; margin: 25px 0 0; padding: 0; list-style: none; }
.start-steps li { display: flex; gap: 12px; align-items: center; color: #b7ccc4; font-size: 10px; }
.start-steps span { color: var(--sx-green); font-family: var(--sx-mono); font-size: 8px; font-weight: 800; }
.starter-panel { padding: 25px; border: 1px solid rgba(132, 198, 174, .25); background: rgba(255, 255, 255, .035); }
.starter-panel > small { color: var(--sx-green); font-family: var(--sx-mono); font-size: 8px; font-weight: 800; letter-spacing: .11em; }
.starter-panel blockquote { margin: 14px 0 22px; padding: 0 0 0 16px; border: 0; border-left: 2px solid var(--sx-green); color: #d3e3dd; font-size: 11px; line-height: 1.7; }
.final-actions { display: grid; grid-template-columns: auto auto; gap: 11px; align-items: center; }
.secondary-action.light { color: #dcebe5; }
.source-link { grid-column: 1 / -1; justify-self: end; color: #6ea48f; font-size: 11px; text-decoration: none; }
.source-link:hover { color: #9fe2c5; }

a:focus-visible { outline: 3px solid color-mix(in srgb, var(--sx-green) 72%, #fff); outline-offset: 4px; }
@keyframes enter-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 1080px) {
  .hero-layout { grid-template-columns: 1fr; gap: 50px; }
  .proof-window { max-width: 720px; }
  .section-heading { grid-template-columns: 1fr; gap: 22px; align-items: start; }
  .section-heading > p { max-width: 760px; }
  .attention-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stage-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stage-grid article:nth-child(2) > i { display: none; }
  .case-grid { grid-template-columns: 1fr; }
  .final-layout { grid-template-columns: 1fr; }
  .final-actions { justify-self: start; }
  .source-link { justify-self: start; }
}

@media (max-width: 760px) {
  .home-shell { width: min(100% - 30px, 1180px); }
  .section-pad { padding: 76px 0; }
  h2 { font-size: clamp(35px, 10vw, 48px); }
  .hero-layout { min-height: auto; padding: 62px 0 56px; }
  .home-hero h1 { font-size: clamp(40px, 12vw, 56px); }
  .hero-thesis { font-size: 18px; }
  .hero-intro { font-size: 15px; }
  .trust-list { gap: 12px 18px; }
  .proof-result { grid-template-columns: 1fr; }
  .metric-stack { grid-template-columns: repeat(2, 1fr); }
  .proof-pipeline { grid-template-columns: 1fr; }
  .proof-pipeline b { display: none; }
  .feedback-lanes { grid-template-columns: 1fr; }
  .section-nav a { padding: 13px 18px; }
  .attention-cards { grid-template-columns: 1fr; }
  .attention-cards article { min-height: 360px; }
  .attention-cards h3 { margin-top: 28px; }
  .stage-grid { grid-template-columns: 1fr; }
  .stage-grid article:nth-child(2) > i { display: grid; }
  .stage-grid article { min-height: 245px; }
  .stage-grid article > i { top: auto; right: 25px; bottom: -23px; transform: rotate(90deg); }
  .case-facts { grid-template-columns: 1fr 1fr; }
  .scenario-row { grid-template-columns: 11px 1fr; }
  .scenario-row small { grid-column: 2; }
  .role-grid { grid-template-columns: 1fr; gap: 14px; }
  .role-divider { height: 38px; }
  .role-grid article { min-height: 270px; }
  .role-grid ul { margin-top: 50px; }
  .operating-model { grid-template-columns: 1fr; gap: 8px; margin: 18px 0 0; }
  .guardrail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .final-actions { grid-template-columns: 1fr; width: 100%; }
  .final-actions a { width: 100%; }
  .source-link { grid-column: auto; justify-self: start; width: auto !important; }
}

@media (max-width: 430px) {
  .home-hero h1 { font-size: 38px; }
  .hero-actions { align-items: stretch; flex-direction: column; }
  .hero-actions a { width: 100%; }
  .proof-foot { align-items: flex-start; flex-direction: column; }
  .attention-cards { grid-template-columns: 1fr; }
  .attention-cards article { min-height: 340px; }
  .case-facts { grid-template-columns: 1fr; }
  .guardrail-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
</style>
