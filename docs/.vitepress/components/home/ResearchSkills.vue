<script setup lang="ts">
type SkillGroup = {
  code: string
  title: string
  body: string
  skills: readonly string[]
}

type Environment = {
  title: string
  body: string
}

defineProps<{
  count: string
  countLabel: string
  groups: readonly SkillGroup[]
  environmentsLabel: string
  environments: readonly Environment[]
  boundary: string
  guideLabel: string
  guideHref: string
}>()
</script>

<template>
  <div class="skills-index-head">
    <div><strong>{{ count }}</strong><span>{{ countLabel }}</span></div>
    <a :href="guideHref">{{ guideLabel }} <span aria-hidden="true">↗</span></a>
  </div>

  <div class="skills-index-grid">
    <article v-for="group in groups" :key="group.code">
      <div class="skill-group-head"><span>{{ group.code }}</span><small>{{ group.skills.length }}</small></div>
      <h3>{{ group.title }}</h3>
      <p>{{ group.body }}</p>
      <ul>
        <li v-for="skill in group.skills" :key="skill">/{{ skill }}</li>
      </ul>
    </article>
  </div>

  <div class="environment-strip">
    <span>{{ environmentsLabel }}</span>
    <div>
      <article v-for="environment in environments" :key="environment.title">
        <strong>{{ environment.title }}</strong>
        <small>{{ environment.body }}</small>
      </article>
    </div>
  </div>
  <p class="skills-boundary"><span aria-hidden="true">!</span>{{ boundary }}</p>
</template>

<style scoped>
.skills-index-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 28px;
  margin-bottom: 25px;
}

.skills-index-head > div {
  display: flex;
  align-items: end;
  gap: 13px;
}

.skills-index-head strong {
  color: var(--sx-green);
  font-family: var(--sx-display);
  font-size: 66px;
  line-height: .8;
}

.skills-index-head span {
  max-width: 170px;
  color: var(--sx-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.skills-index-head a {
  color: var(--sx-ink);
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
}

.skills-index-head a span { color: var(--sx-green); }
.skills-index-head a:hover { color: var(--sx-green); }

.skills-index-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--sx-line);
  border-left: 1px solid var(--sx-line);
}

.skills-index-grid article {
  min-height: 305px;
  padding: 24px;
  border-right: 1px solid var(--sx-line);
  border-bottom: 1px solid var(--sx-line);
  background: color-mix(in srgb, var(--sx-panel) 82%, transparent);
}

.skill-group-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 9px;
  font-weight: 800;
}

.skill-group-head small {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 1px solid var(--sx-line);
  border-radius: 50%;
  color: var(--sx-muted);
  font-size: 8px;
}

.skills-index-grid h3 {
  margin: 31px 0 7px;
  color: var(--sx-ink);
  font-family: var(--sx-display);
  font-size: 22px;
}

.skills-index-grid p {
  margin: 0;
  color: var(--sx-muted);
  font-size: 10px;
  line-height: 1.6;
}

.skills-index-grid ul {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 25px 0 0;
  padding: 0;
  list-style: none;
}

.skills-index-grid li {
  padding: 7px 8px;
  border: 1px solid color-mix(in srgb, var(--sx-green) 20%, var(--sx-line));
  color: color-mix(in srgb, var(--sx-ink) 80%, var(--sx-green));
  background: color-mix(in srgb, var(--sx-green-soft) 48%, transparent);
  font-family: var(--sx-mono);
  font-size: 7px;
  line-height: 1.2;
}

.environment-strip {
  display: grid;
  grid-template-columns: 170px 1fr;
  gap: 24px;
  align-items: stretch;
  margin-top: 22px;
  padding: 22px;
  border: 1px solid var(--sx-line);
  background: var(--sx-panel);
}

.environment-strip > span {
  align-self: center;
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .11em;
}

.environment-strip > div {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.environment-strip article {
  padding: 10px 12px;
  border-left: 2px solid var(--sx-green);
  background: color-mix(in srgb, var(--sx-paper) 76%, transparent);
}

.environment-strip strong,
.environment-strip small { display: block; }
.environment-strip strong { color: var(--sx-ink); font-size: 10px; }
.environment-strip small { margin-top: 4px; color: var(--sx-muted); font-size: 8px; line-height: 1.4; }

.skills-boundary {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 15px 0 0;
  color: var(--sx-muted);
  font-size: 10px;
  line-height: 1.6;
}

.skills-boundary span {
  display: grid;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 50%;
  color: #0a352b;
  background: #f2c657;
  font-family: Georgia, serif;
  font-weight: 800;
}

@media (max-width: 980px) {
  .skills-index-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .environment-strip { grid-template-columns: 1fr; }
}

@media (max-width: 650px) {
  .skills-index-head { align-items: start; flex-direction: column; }
  .skills-index-grid { grid-template-columns: 1fr; }
  .skills-index-grid article { min-height: 0; }
  .environment-strip > div { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 420px) {
  .environment-strip > div { grid-template-columns: 1fr; }
}
</style>
