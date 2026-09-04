<script setup lang="ts">
defineProps<{
  ariaLabel: string
  nodes: readonly { readonly title: string; readonly subtitle: string }[]
  centerTitle: string
  centerBody: string
  memoryTitle: string
  memoryBody: string
  boundary: string
}>()
</script>

<template>
  <div class="research-loop-figure" role="group" :aria-label="ariaLabel">
    <div class="loop-orbit">
      <svg class="loop-path" viewBox="0 0 600 460" aria-hidden="true">
        <defs>
          <marker id="sciencex-loop-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0 0L8 4L0 8Z" fill="currentColor" />
          </marker>
        </defs>
        <path d="M306 51Q408 57 476 137" />
        <path d="M484 153Q513 230 478 304" />
        <path d="M466 321Q401 398 312 405" />
        <path d="M288 405Q196 398 136 321" />
        <path d="M124 304Q88 230 116 153" />
        <path d="M124 137Q190 57 294 51" />
      </svg>

      <ol class="loop-nodes">
        <li v-for="(node, index) in nodes" :key="node.title" :class="`node-${index + 1}`">
          <span>0{{ index + 1 }}</span>
          <strong>{{ node.title }}</strong>
          <small>{{ node.subtitle }}</small>
        </li>
      </ol>

      <div class="loop-center" aria-hidden="true">
        <i></i>
        <strong>{{ centerTitle }}</strong>
        <small>{{ centerBody }}</small>
      </div>
    </div>

    <div class="loop-memory">
      <div>
        <small>STATE LAYER</small>
        <strong>{{ memoryTitle }}</strong>
      </div>
      <p>{{ memoryBody }}</p>
    </div>
    <p class="loop-boundary"><span aria-hidden="true">i</span>{{ boundary }}</p>
  </div>
</template>

<style scoped>
.research-loop-figure {
  display: grid;
  gap: 18px;
}

.loop-orbit {
  position: relative;
  width: min(100%, 760px);
  height: 500px;
  margin: 0 auto;
}

.loop-path {
  position: absolute;
  inset: 18px 50%;
  width: 600px;
  height: 460px;
  overflow: visible;
  color: var(--sx-green);
  transform: translateX(-50%);
}

.loop-path path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  marker-end: url(#sciencex-loop-arrow);
  opacity: .72;
}

.loop-nodes {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.loop-nodes li {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 174px;
  min-height: 92px;
  align-content: center;
  padding: 14px 16px;
  border: 1px solid rgba(160, 220, 198, .3);
  border-radius: 12px;
  background: rgba(4, 37, 33, .94);
  box-shadow: 0 18px 38px rgba(0, 20, 16, .18);
  transition: border-color .2s ease, background .2s ease, transform .2s ease;
}

.loop-nodes li:hover {
  border-color: rgba(92, 224, 167, .78);
  background: rgba(14, 67, 56, .96);
}

.loop-nodes li > span {
  color: var(--sx-green);
  font-family: var(--sx-mono);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
}

.loop-nodes strong {
  margin-top: 7px;
  color: #f2faf6;
  font-size: 14px;
}

.loop-nodes small {
  margin-top: 2px;
  color: #7da99a;
  font-family: var(--sx-mono);
  font-size: 8px;
}

.node-1 { top: 0; left: 50%; transform: translateX(-50%); }
.node-2 { top: 104px; right: 0; }
.node-3 { right: 8px; bottom: 64px; }
.node-4 { bottom: 0; left: 50%; transform: translateX(-50%); }
.node-5 { bottom: 64px; left: 8px; }
.node-6 { top: 104px; left: 0; }
.node-1:hover, .node-4:hover { transform: translateX(-50%) translateY(-3px); }
.node-2:hover, .node-3:hover, .node-5:hover, .node-6:hover { transform: translateY(-3px); }

.loop-center {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  display: grid;
  width: 204px;
  height: 204px;
  place-content: center;
  padding: 24px;
  border: 1px solid rgba(92, 224, 167, .58);
  border-radius: 50%;
  text-align: center;
  background: radial-gradient(circle at 35% 25%, rgba(24, 139, 95, .42), transparent 58%), #052a25;
  box-shadow: 0 0 0 22px rgba(22, 191, 114, .035), 0 30px 70px rgba(0, 18, 14, .22);
  transform: translate(-50%, -50%);
}

.loop-center i {
  width: 9px;
  height: 9px;
  margin: 0 auto 13px;
  border-radius: 50%;
  background: var(--sx-green);
  box-shadow: 0 0 0 7px rgba(22, 191, 114, .12);
}

.loop-center strong {
  color: #fff;
  font-family: var(--sx-display);
  font-size: 27px;
  line-height: 1.05;
}

.loop-center small {
  margin-top: 9px;
  color: #8db8aa;
  font-size: 10px;
  line-height: 1.5;
}

.loop-memory {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 38px;
  align-items: center;
  padding: 23px 28px;
  border-left: 3px solid var(--sx-green);
  background: #04261f;
}

.loop-memory > div {
  display: grid;
  gap: 4px;
}

.loop-memory small {
  color: #5d8c7d;
  font-family: var(--sx-mono);
  font-size: 8px;
  letter-spacing: .12em;
}

.loop-memory strong {
  color: #f3faf7;
  font-family: var(--sx-display);
  font-size: 21px;
}

.loop-memory p {
  margin: 0;
  color: #a9c8bc;
  font-size: 12px;
  line-height: 1.7;
}

.loop-boundary {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 0;
  color: #81a99a;
  font-size: 11px;
  line-height: 1.65;
}

.loop-boundary span {
  display: grid;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid rgba(92, 224, 167, .38);
  border-radius: 50%;
  color: var(--sx-green);
  font-family: Georgia, serif;
  font-size: 10px;
  font-weight: 700;
}

@media (max-width: 820px) {
  .loop-orbit {
    height: auto;
  }

  .loop-path {
    display: none;
  }

  .loop-nodes {
    position: relative;
    display: grid;
    gap: 10px;
    padding-left: 28px;
  }

  .loop-nodes::before {
    position: absolute;
    top: 28px;
    bottom: 28px;
    left: 8px;
    width: 1px;
    background: linear-gradient(var(--sx-green), rgba(22, 191, 114, .12));
    content: '';
  }

  .loop-nodes li,
  .node-1,
  .node-2,
  .node-3,
  .node-4,
  .node-5,
  .node-6 {
    position: relative;
    inset: auto;
    width: 100%;
    min-height: 74px;
    transform: none;
  }

  .loop-nodes li::before {
    position: absolute;
    top: 50%;
    left: -25px;
    width: 9px;
    height: 9px;
    border: 2px solid var(--sx-navy);
    border-radius: 50%;
    background: var(--sx-green);
    content: '';
    transform: translateY(-50%);
  }

  .loop-nodes li:hover,
  .node-1:hover,
  .node-4:hover {
    transform: translateY(-2px);
  }

  .loop-center {
    position: relative;
    inset: auto;
    width: 100%;
    height: auto;
    min-height: 142px;
    margin-bottom: 18px;
    border-radius: 14px;
    transform: none;
  }

  .loop-memory {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loop-nodes li { transition: none; }
}
</style>
