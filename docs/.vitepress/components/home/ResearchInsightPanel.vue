<script setup lang="ts">
defineProps<{
  ariaLabel: string
  signals: readonly {
    readonly code: string
    readonly title: string
    readonly body: string
  }[]
  exampleLabel: string
  exampleTitle: string
  rows: readonly {
    readonly label: string
    readonly value: string
  }[]
  statusLabel: string
  status: string
  boundary: string
}>()
</script>

<template>
  <div class="insight-panel" role="group" :aria-label="ariaLabel">
    <div class="signal-grid">
      <article v-for="signal in signals" :key="signal.code">
        <span>{{ signal.code }}</span>
        <h3>{{ signal.title }}</h3>
        <p>{{ signal.body }}</p>
      </article>
    </div>

    <article class="candidate-sheet">
      <div class="sheet-head">
        <div>
          <small>{{ exampleLabel }}</small>
          <h3>{{ exampleTitle }}</h3>
        </div>
        <span>SCIENCEX / NEXT</span>
      </div>
      <dl>
        <div v-for="row in rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
      <div class="decision-state">
        <small>{{ statusLabel }}</small>
        <strong><i aria-hidden="true"></i>{{ status }}</strong>
      </div>
    </article>

    <p class="insight-boundary"><span aria-hidden="true">!</span>{{ boundary }}</p>
  </div>
</template>

<style scoped>
.insight-panel {
  display: grid;
  grid-template-columns: minmax(0, .88fr) minmax(480px, 1.12fr);
  gap: 26px;
}

.signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  padding: 1px;
  background: rgba(147, 211, 187, .2);
}

.signal-grid article {
  min-height: 204px;
  padding: 24px;
  background: #07352e;
}

.signal-grid span,
.candidate-sheet small,
.sheet-head > span,
.decision-state small {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
}

.signal-grid h3 {
  margin: 46px 0 11px;
  color: #f3faf7;
  font-family: var(--sx-display);
  font-size: 21px;
}

.signal-grid p {
  margin: 0;
  color: #96b8ac;
  font-size: 10px;
  line-height: 1.7;
}

.candidate-sheet {
  padding: 28px;
  color: var(--sx-ink);
  border: 1px solid color-mix(in srgb, var(--sx-green) 46%, var(--sx-line));
  background: var(--sx-panel);
  box-shadow: 0 28px 66px rgba(0, 22, 17, .2);
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  align-items: flex-start;
  padding-bottom: 21px;
  border-bottom: 1px solid var(--sx-line);
}

.sheet-head h3 {
  margin: 9px 0 0;
  color: var(--sx-ink);
  font-family: var(--sx-display);
  font-size: 27px;
  line-height: 1.3;
}

.sheet-head > span {
  flex: 0 0 auto;
  padding: 7px 9px;
  color: #fff;
  background: var(--sx-blue);
}

.candidate-sheet dl {
  display: grid;
  margin: 0;
}

.candidate-sheet dl > div {
  display: grid;
  grid-template-columns: 128px 1fr;
  gap: 18px;
  padding: 17px 0;
  border-bottom: 1px solid var(--sx-line);
}

.candidate-sheet dt {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .08em;
}

.candidate-sheet dd {
  margin: 0;
  color: var(--sx-muted);
  font-size: 11px;
  line-height: 1.65;
}

.decision-state {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-top: 20px;
  padding: 16px 18px;
  background: color-mix(in srgb, #f1c656 13%, var(--sx-panel));
}

.decision-state small { color: #9b720e; }
.decision-state strong { display: flex; align-items: center; gap: 9px; color: var(--sx-ink); font-size: 11px; }
.decision-state i { width: 8px; height: 8px; border-radius: 50%; background: #eab83f; box-shadow: 0 0 0 5px rgba(234, 184, 63, .12); }

.insight-boundary {
  grid-column: 1 / -1;
  display: flex;
  gap: 9px;
  align-items: flex-start;
  margin: 0;
  color: #8fb1a5;
  font-size: 11px;
  line-height: 1.65;
}

.insight-boundary span {
  display: grid;
  flex: 0 0 auto;
  width: 19px;
  height: 19px;
  place-items: center;
  border-radius: 50%;
  color: #503b08;
  background: #f1c656;
  font-family: Georgia, serif;
  font-weight: 800;
}

@media (max-width: 940px) {
  .insight-panel { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
  .signal-grid { grid-template-columns: 1fr; }
  .signal-grid article { min-height: 170px; }
  .candidate-sheet { padding: 22px; }
  .sheet-head { align-items: flex-start; flex-direction: column; }
  .candidate-sheet dl > div { grid-template-columns: 1fr; gap: 7px; }
  .decision-state { align-items: flex-start; flex-direction: column; }
}
</style>
