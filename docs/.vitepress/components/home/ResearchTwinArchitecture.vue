<script setup lang="ts">
defineProps<{
  ariaLabel: string
  contrastLabel: string
  contrastTitle: string
  contrastBody: string
  layers: readonly {
    readonly code: string
    readonly label: string
    readonly title: string
    readonly body: string
  }[]
  equationLabel: string
  equationTerms: readonly string[]
  boundary: string
}>()
</script>

<template>
  <div class="twin-architecture" role="group" :aria-label="ariaLabel">
    <div class="twin-definition">
      <div class="definition-mark" aria-hidden="true">
        <span>R</span>
        <i></i>
        <span>T</span>
      </div>
      <div>
        <small>{{ contrastLabel }}</small>
        <strong>{{ contrastTitle }}</strong>
        <p>{{ contrastBody }}</p>
      </div>
    </div>

    <ol class="twin-layers">
      <li v-for="(layer, index) in layers" :key="layer.code">
        <div class="layer-head">
          <span>{{ layer.code }}</span>
          <small>{{ layer.label }}</small>
        </div>
        <i aria-hidden="true"></i>
        <h3>{{ layer.title }}</h3>
        <p>{{ layer.body }}</p>
        <b v-if="index < layers.length - 1" aria-hidden="true">→</b>
      </li>
    </ol>

    <div class="twin-equation">
      <small>{{ equationLabel }}</small>
      <div>
        <template v-for="(term, index) in equationTerms" :key="term">
          <strong>{{ term }}</strong>
          <span v-if="index < equationTerms.length - 1" aria-hidden="true">+</span>
        </template>
      </div>
    </div>

    <p class="twin-boundary"><span aria-hidden="true">i</span>{{ boundary }}</p>
  </div>
</template>

<style scoped>
.twin-architecture {
  display: grid;
  gap: 20px;
}

.twin-definition {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 30px;
  align-items: center;
  padding: 28px 32px;
  border: 1px solid var(--sx-line);
  background: color-mix(in srgb, var(--sx-panel) 88%, transparent);
}

.definition-mark {
  display: grid;
  grid-template-columns: 1fr 34px 1fr;
  align-items: center;
  font-family: var(--sx-display);
}

.definition-mark span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--sx-green) 72%, var(--sx-line));
  border-radius: 50%;
  color: var(--sx-ink);
  background: var(--sx-panel);
  font-size: 18px;
  font-weight: 700;
}

.definition-mark i {
  height: 1px;
  background: var(--sx-green);
}

.twin-definition small,
.twin-equation > small {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .13em;
}

.twin-definition strong {
  display: block;
  margin-top: 7px;
  color: var(--sx-ink);
  font-family: var(--sx-display);
  font-size: clamp(23px, 2.5vw, 34px);
  line-height: 1.25;
}

.twin-definition p {
  max-width: 820px;
  margin: 9px 0 0;
  color: var(--sx-muted);
  font-size: 12px;
  line-height: 1.75;
}

.twin-layers {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--sx-line);
  border-left: 1px solid var(--sx-line);
  list-style: none;
}

.twin-layers li {
  position: relative;
  min-height: 272px;
  padding: 20px;
  border-right: 1px solid var(--sx-line);
  border-bottom: 1px solid var(--sx-line);
  background: color-mix(in srgb, var(--sx-panel) 82%, transparent);
  transition: background .2s ease, transform .2s ease;
}

.twin-layers li:hover {
  z-index: 2;
  background: var(--sx-panel);
  transform: translateY(-5px);
}

.layer-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.layer-head span,
.layer-head small {
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
}

.layer-head span { color: var(--sx-green); }
.layer-head small { color: var(--sx-muted); letter-spacing: .08em; }

.twin-layers li > i {
  display: block;
  width: 100%;
  height: 42px;
  margin: 27px 0 22px;
  border-top: 1px solid color-mix(in srgb, var(--sx-green) 64%, transparent);
  background: repeating-linear-gradient(90deg, transparent 0 14px, color-mix(in srgb, var(--sx-green) 18%, transparent) 14px 15px);
  mask-image: linear-gradient(to bottom, #000, transparent);
}

.twin-layers h3 {
  margin: 0;
  color: var(--sx-ink);
  font-family: var(--sx-display);
  font-size: 21px;
}

.twin-layers p {
  margin: 12px 0 0;
  color: var(--sx-muted);
  font-size: 10px;
  line-height: 1.7;
}

.twin-layers b {
  position: absolute;
  z-index: 3;
  top: 48%;
  right: -15px;
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 1px solid var(--sx-line);
  border-radius: 50%;
  color: var(--sx-green);
  background: var(--sx-panel);
  font-size: 12px;
  font-weight: 500;
}

.twin-equation {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 22px;
  align-items: center;
  padding: 22px 26px;
  color: #fff;
  background: var(--sx-navy);
}

.twin-equation div {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
}

.twin-equation strong {
  font-size: 11px;
  font-weight: 650;
}

.twin-equation span {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 12px;
}

.twin-boundary {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  margin: 0;
  color: var(--sx-muted);
  font-size: 11px;
  line-height: 1.65;
}

.twin-boundary span {
  display: grid;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--sx-green) 55%, var(--sx-line));
  border-radius: 50%;
  color: var(--sx-green);
  font-family: Georgia, serif;
  font-size: 9px;
  font-weight: 700;
}

@media (max-width: 960px) {
  .twin-layers { grid-template-columns: 1fr; border-top: 0; }
  .twin-layers li { min-height: auto; }
  .twin-layers li > i { width: 120px; height: 24px; margin: 20px 0 16px; }
  .twin-layers b { top: auto; right: 22px; bottom: -15px; transform: rotate(90deg); }
}

@media (max-width: 640px) {
  .twin-definition { grid-template-columns: 1fr; padding: 24px; }
  .definition-mark { width: 130px; }
  .twin-equation { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .twin-layers li { transition: none; }
}
</style>
