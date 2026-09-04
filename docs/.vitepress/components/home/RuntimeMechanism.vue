<script setup lang="ts">
defineProps<{
  ariaLabel: string
  steps: readonly { readonly code: string; readonly title: string; readonly body: string }[]
  memoryLabel: string
  memoryTitle: string
  memoryBody: string
  boundary: string
}>()
</script>

<template>
  <div class="runtime-mechanism" role="group" :aria-label="ariaLabel">
    <ol class="runtime-track">
      <li v-for="(step, index) in steps" :key="step.title">
        <div class="runtime-head">
          <span>{{ step.code }}</span>
          <i aria-hidden="true"></i>
        </div>
        <strong>{{ step.title }}</strong>
        <p>{{ step.body }}</p>
        <b v-if="index < steps.length - 1" aria-hidden="true">→</b>
      </li>
    </ol>

    <div class="runtime-memory">
      <div class="memory-key">
        <small>{{ memoryLabel }}</small>
        <strong>{{ memoryTitle }}</strong>
      </div>
      <p>{{ memoryBody }}</p>
      <span aria-hidden="true">↺</span>
    </div>

    <p class="runtime-boundary"><i aria-hidden="true">!</i>{{ boundary }}</p>
  </div>
</template>

<style scoped>
.runtime-mechanism {
  display: grid;
  gap: 18px;
}

.runtime-track {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--sx-line);
  border-left: 1px solid var(--sx-line);
  list-style: none;
}

.runtime-track li {
  position: relative;
  min-height: 252px;
  padding: 22px 20px;
  border-right: 1px solid var(--sx-line);
  border-bottom: 1px solid var(--sx-line);
  background: color-mix(in srgb, var(--sx-panel) 92%, transparent);
  transition: background .2s ease, transform .2s ease;
}

.runtime-track li:hover {
  z-index: 1;
  background: var(--sx-panel);
  transform: translateY(-4px);
}

.runtime-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.runtime-head span {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .12em;
}

.runtime-head i {
  width: 10px;
  height: 10px;
  border: 2px solid var(--sx-green);
  border-radius: 50%;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--sx-green) 10%, transparent);
}

.runtime-track strong {
  display: block;
  margin-top: 72px;
  color: var(--sx-ink);
  font-family: var(--sx-display);
  font-size: 22px;
}

.runtime-track p {
  margin: 14px 0 0;
  color: var(--sx-muted);
  font-size: 11px;
  line-height: 1.7;
}

.runtime-track b {
  position: absolute;
  z-index: 2;
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
  font-size: 13px;
  font-weight: 500;
}

.runtime-memory {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 34px;
  align-items: center;
  margin: 0 54px;
  padding: 23px 27px;
  color: #fff;
  border-radius: 0 0 12px 12px;
  background: var(--sx-navy);
  box-shadow: 0 18px 38px rgba(2, 39, 32, .12);
}

.memory-key {
  display: grid;
  gap: 4px;
}

.memory-key small {
  color: #6aaa94;
  font-family: var(--sx-mono);
  font-size: 8px;
  letter-spacing: .12em;
}

.memory-key strong {
  color: #fff;
  font-family: var(--sx-display);
  font-size: 21px;
}

.runtime-memory p {
  margin: 0;
  color: #a9c8bc;
  font-size: 11px;
  line-height: 1.7;
}

.runtime-memory > span {
  color: var(--sx-green);
  font-size: 30px;
}

.runtime-boundary {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  color: var(--sx-muted);
  font-size: 11px;
  line-height: 1.6;
}

.runtime-boundary i {
  display: grid;
  flex: 0 0 auto;
  width: 19px;
  height: 19px;
  place-items: center;
  border-radius: 50%;
  color: #503b08;
  background: #f1c656;
  font-family: Georgia, serif;
  font-style: normal;
  font-weight: 800;
}

@media (max-width: 900px) {
  .runtime-track {
    grid-template-columns: 1fr;
    border-top: 0;
  }

  .runtime-track li {
    min-height: auto;
    padding: 20px;
  }

  .runtime-track strong {
    margin-top: 26px;
  }

  .runtime-track b {
    top: auto;
    right: 24px;
    bottom: -15px;
    transform: rotate(90deg);
  }

  .runtime-memory {
    grid-template-columns: 1fr auto;
    gap: 12px 20px;
    margin: 0 0 0 22px;
  }

  .runtime-memory p {
    grid-column: 1 / -1;
  }

  .runtime-memory > span {
    grid-row: 1;
    grid-column: 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .runtime-track li { transition: none; }
}
</style>
