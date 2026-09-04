<script setup lang="ts">
import { withBase } from 'vitepress'

type ProductFrame = {
  code: string
  label: string
  title: string
  body: string
  image: string
  alt: string
}

defineProps<{
  frames: readonly ProductFrame[]
  skillLabel: string
  skillTitle: string
  skillBody: string
  skillPreview: readonly string[]
  skillCount: string
  note: string
}>()
</script>

<template>
  <div class="product-evidence-grid">
    <article
      v-for="(frame, index) in frames"
      :key="frame.code"
      :class="['product-evidence-card', { primary: index === 0 }]"
    >
      <div class="product-screen">
        <div class="screen-bar" aria-hidden="true">
          <span><i></i><i></i><i></i></span>
          <strong>ScienceX / {{ frame.label }}</strong>
          <small>LOCAL</small>
        </div>
        <img :src="withBase(frame.image)" :alt="frame.alt" loading="lazy" />
      </div>
      <div class="product-card-copy">
        <span>{{ frame.code }}</span>
        <div>
          <h3>{{ frame.title }}</h3>
          <p>{{ frame.body }}</p>
        </div>
      </div>
    </article>

    <article class="product-evidence-card skill-proof-card">
      <div class="skill-proof-head">
        <span>{{ skillLabel }}</span>
        <strong>{{ skillCount }}</strong>
      </div>
      <h3>{{ skillTitle }}</h3>
      <p>{{ skillBody }}</p>
      <div class="skill-proof-list" aria-hidden="true">
        <span v-for="skill in skillPreview" :key="skill">/{{ skill }}</span>
      </div>
      <div class="skill-proof-foot"><i></i> ScienceX CAPABILITY INDEX</div>
    </article>
  </div>
  <p class="product-proof-note">{{ note }}</p>
</template>

<style scoped>
.product-evidence-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(320px, .78fr);
  gap: 20px;
}

.product-evidence-card {
  overflow: hidden;
  border: 1px solid var(--sx-line);
  border-radius: 15px;
  background: var(--sx-panel);
  box-shadow: 0 22px 52px rgba(8, 46, 42, .07);
}

.product-evidence-card.primary {
  grid-row: span 2;
}

.product-screen {
  overflow: hidden;
  border-bottom: 1px solid var(--sx-line);
  background: #e8edf1;
}

.screen-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  color: #60716d;
  background: #f8faf9;
  font-family: var(--sx-mono);
  font-size: 7px;
  letter-spacing: .09em;
}

.screen-bar > span {
  display: flex;
  gap: 5px;
}

.screen-bar i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c3ceca;
}

.screen-bar i:first-child { background: var(--sx-green); }
.screen-bar strong { font-size: inherit; }
.screen-bar small { justify-self: end; color: #21855d; font-size: inherit; }

.product-screen img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  object-position: top center;
}

.primary .product-screen img { aspect-ratio: 16 / 11.2; }

.product-card-copy {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 14px;
  padding: 23px 24px 25px;
}

.product-card-copy > span {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 9px;
  font-weight: 800;
}

.product-card-copy h3,
.skill-proof-card h3 {
  margin: 0;
  color: var(--sx-ink);
  font-family: var(--sx-display);
  font-size: 24px;
  line-height: 1.2;
}

.product-card-copy p,
.skill-proof-card > p {
  margin: 9px 0 0;
  color: var(--sx-muted);
  font-size: 11px;
  line-height: 1.7;
}

.skill-proof-card {
  position: relative;
  min-height: 330px;
  padding: 27px;
  color: #fff;
  border-color: rgba(105, 220, 173, .34);
  background:
    linear-gradient(rgba(93, 206, 161, .075) 1px, transparent 1px),
    linear-gradient(90deg, rgba(93, 206, 161, .075) 1px, transparent 1px),
    #063a31;
  background-size: 28px 28px;
}

.skill-proof-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 20px;
  color: #7bc8aa;
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .11em;
}

.skill-proof-head strong {
  color: #68e1af;
  font-size: 30px;
  line-height: .8;
}

.skill-proof-card h3 {
  max-width: 320px;
  margin-top: 31px;
  color: #fff;
}

.skill-proof-card > p { color: #a9c9bd; }

.skill-proof-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 24px;
}

.skill-proof-list span {
  padding: 7px 9px;
  border: 1px solid rgba(119, 216, 178, .22);
  color: #c3ded4;
  background: rgba(1, 27, 23, .38);
  font-family: var(--sx-mono);
  font-size: 7px;
}

.skill-proof-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(119, 216, 178, .18);
  color: #6ba68f;
  font-family: var(--sx-mono);
  font-size: 7px;
  letter-spacing: .09em;
}

.skill-proof-foot i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sx-green);
  box-shadow: 0 0 0 5px rgba(22, 191, 114, .1);
}

.product-proof-note {
  margin: 18px 0 0;
  color: var(--sx-muted);
  font-size: 10px;
  line-height: 1.6;
}

@media (max-width: 880px) {
  .product-evidence-grid { grid-template-columns: 1fr; }
  .product-evidence-card.primary { grid-row: auto; }
  .skill-proof-card { min-height: 0; }
}

@media (max-width: 540px) {
  .product-card-copy { grid-template-columns: 1fr; padding: 19px; }
  .product-card-copy h3, .skill-proof-card h3 { font-size: 21px; }
  .skill-proof-card { padding: 22px; }
  .screen-bar strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}
</style>
