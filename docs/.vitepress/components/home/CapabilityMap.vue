<script setup lang="ts">
defineProps<{
  skillsTitle: string
  skillsBody: string
  skills: readonly { readonly code: string; readonly title: string; readonly body: string }[]
  toolsTitle: string
  toolsBody: string
  tools: readonly { readonly title: string; readonly body: string }[]
  centerTitle: string
  boundary: string
}>()
</script>

<template>
  <div class="capability-map">
    <section class="skills-panel" :aria-labelledby="`skills-${skills.length}`">
      <header>
        <div>
          <small>SKILLS</small>
          <h3 :id="`skills-${skills.length}`">{{ skillsTitle }}</h3>
        </div>
        <p>{{ skillsBody }}</p>
      </header>
      <div class="skill-grid">
        <article v-for="skill in skills" :key="skill.title">
          <span>{{ skill.code }}</span>
          <strong>{{ skill.title }}</strong>
          <p>{{ skill.body }}</p>
        </article>
      </div>
    </section>

    <section class="tools-panel" :aria-labelledby="`tools-${tools.length}`">
      <header>
        <div>
          <small>TOOLS / MCP</small>
          <h3 :id="`tools-${tools.length}`">{{ toolsTitle }}</h3>
        </div>
        <p>{{ toolsBody }}</p>
      </header>
      <div class="tool-map">
        <div class="agent-core" aria-hidden="true">
          <i></i>
          <strong>{{ centerTitle }}</strong>
          <small>AUTHORIZED RUNTIME</small>
        </div>
        <ul>
          <li v-for="(tool, index) in tools" :key="tool.title">
            <span>0{{ index + 1 }}</span>
            <div><strong>{{ tool.title }}</strong><small>{{ tool.body }}</small></div>
          </li>
        </ul>
      </div>
    </section>

    <p class="capability-boundary"><span aria-hidden="true">LOCK</span>{{ boundary }}</p>
  </div>
</template>

<style scoped>
.capability-map {
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(390px, .78fr);
  gap: 20px;
}

.skills-panel,
.tools-panel {
  padding: 28px;
  border: 1px solid var(--sx-line);
  border-radius: 14px;
  background: color-mix(in srgb, var(--sx-panel) 92%, transparent);
  box-shadow: 0 22px 54px rgba(5, 45, 37, .06);
}

header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, .7fr);
  gap: 26px;
  align-items: end;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--sx-line);
}

header small {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .14em;
}

header h3 {
  margin: 8px 0 0;
  color: var(--sx-ink);
  font-family: var(--sx-display);
  font-size: 24px;
  line-height: 1.2;
}

header > p {
  margin: 0;
  color: var(--sx-muted);
  font-size: 10px;
  line-height: 1.65;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-top: 24px;
  border-top: 1px solid var(--sx-line);
  border-left: 1px solid var(--sx-line);
}

.skill-grid article {
  min-height: 202px;
  padding: 18px 14px;
  border-right: 1px solid var(--sx-line);
  border-bottom: 1px solid var(--sx-line);
  background: color-mix(in srgb, var(--sx-panel) 82%, transparent);
  transition: background .2s ease, transform .2s ease;
}

.skill-grid article:hover {
  z-index: 1;
  background: var(--sx-panel);
  transform: translateY(-3px);
}

.skill-grid article > span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--sx-green) 42%, var(--sx-line));
  border-radius: 50%;
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 13px;
  font-weight: 800;
}

.skill-grid strong {
  display: block;
  margin-top: 42px;
  color: var(--sx-ink);
  font-size: 13px;
}

.skill-grid p {
  margin: 9px 0 0;
  color: var(--sx-muted);
  font-size: 9px;
  line-height: 1.55;
}

.tools-panel header {
  grid-template-columns: 1fr;
  gap: 10px;
}

.tool-map {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 18px;
  align-items: center;
  margin-top: 24px;
}

.agent-core {
  display: grid;
  aspect-ratio: 1;
  min-height: 140px;
  place-content: center;
  padding: 18px;
  border-radius: 50%;
  color: #fff;
  text-align: center;
  background: radial-gradient(circle at 32% 26%, rgba(38, 191, 118, .55), transparent 50%), var(--sx-navy);
  box-shadow: 0 18px 42px rgba(5, 47, 41, .18);
}

.agent-core i {
  width: 12px;
  height: 12px;
  margin: 0 auto 15px;
  border-radius: 50%;
  background: var(--sx-green);
  box-shadow: 0 0 0 8px rgba(22, 191, 114, .12);
}

.agent-core strong {
  font-family: var(--sx-display);
  font-size: 22px;
  line-height: 1.05;
}

.agent-core small {
  margin-top: 9px;
  color: #82b09f;
  font-family: var(--sx-mono);
  font-size: 7px;
  letter-spacing: .09em;
}

.tool-map ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tool-map li {
  display: grid;
  grid-template-columns: 25px 1fr;
  gap: 9px;
  align-items: center;
  padding: 8px 9px;
  border: 1px solid var(--sx-line);
  background: color-mix(in srgb, var(--sx-panel) 76%, transparent);
}

.tool-map li > span {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 7px;
}

.tool-map li div {
  display: grid;
  gap: 1px;
}

.tool-map li strong {
  color: var(--sx-ink);
  font-size: 10px;
}

.tool-map li small {
  color: var(--sx-muted);
  font-size: 8px;
}

.capability-boundary {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0;
  padding: 15px 20px;
  border: 1px solid color-mix(in srgb, var(--sx-green) 24%, var(--sx-line));
  border-radius: 10px;
  color: var(--sx-muted);
  background: color-mix(in srgb, var(--sx-green-soft) 72%, transparent);
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}

.capability-boundary span {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
}

@media (max-width: 1080px) {
  .capability-map {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .skills-panel,
  .tools-panel {
    padding: 20px;
  }

  header {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .skill-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .skill-grid article {
    min-height: 166px;
  }

  .skill-grid strong {
    margin-top: 26px;
  }

  .skill-grid article:last-child {
    grid-column: 1 / -1;
  }

  .tool-map {
    grid-template-columns: 1fr;
  }

  .agent-core {
    min-height: 150px;
    border-radius: 12px;
  }

  .capability-boundary {
    align-items: flex-start;
    justify-content: flex-start;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skill-grid article { transition: none; }
}
</style>
