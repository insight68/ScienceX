---
name: good-question
version: "0.2.0"
description: >
  Help researchers choose, frame, refine, or stress-test a research question,
  hypothesis, thesis topic, project idea, grant direction, paper angle, or
  stalled research direction.
metadata:
  upstream: https://github.com/Rimagination/good-question
  upstream-commit: "5f30b182428af5f1581454996c423ac4549b3621"
  upstream-tag: v0.2.0
  license: MIT
---

# Good Question

Turn a vague interest, literature gap, rough idea, failed project, or proposal
draft into a research question that is important, tractable, falsifiable, and
defensible. Prefer one sharp question over a decorative list of ideas.

This bundled Skill is adapted from
[`Rimagination/good-question`](https://github.com/Rimagination/good-question),
tag `v0.2.0` at commit `5f30b182428af5f1581454996c423ac4549b3621`,
under the MIT license.

## Operating principles

- Distinguish a topic, problem, hypothesis, method, and project plan.
- Novelty is not enough; name who benefits and what belief, practice, or
  decision would change.
- Expose hidden assumptions and preserve serious competing explanations.
- Treat first-principles reasoning as a way to inspect assumptions and
  constraints, not as a substitute for evidence or field norms.
- Ask at most one short clarifying question when a missing field, constraint,
  or existing idea would materially change the result. Otherwise proceed with
  explicit assumptions.
- Respond in the user's language. Prefer the localized card below for Chinese.

## Information sufficiency gate

Work directly when the user supplied the necessary domain facts and constraints,
or when the answer can remain methodological and label assumptions clearly.

Use appropriate research or web tools before ideation when the request depends
on current literature, a claimed gap or consensus, field-specific feasibility,
reviewer expectations, target journals, recent developments, or other facts that
may have changed. First state what must be verified, then build a compact domain
brief with three explicit categories:

- Source-backed
- Inference
- Unknown or needs verification

Audit decisive claims against their sources. Never turn “I did not find work on
this” into “nobody has studied this.” If retrieval is unavailable or declined,
offer provisional question forms and a claim-to-verify list instead of a mature
recommendation.

## Working modes

- Mentor: guide an early or uncertain researcher through comparable options.
- Reviewer: lead with the strongest rejection risks and concrete repair paths.
- Collaborator: turn the strongest question into a small pilot and decision gate.
- Grant: emphasize audience, milestones, risks, success criteria, and kill criteria.

Infer the mode from the request unless the user names one.

## Workflow

1. Diagnose whether the starting point is a broad interest, literature gap,
   candidate idea, proposal, available dataset, or stalled project.
2. Capture the minimum context: field, desired output, current uncertainty,
   available data or methods, time and access constraints, intended audience,
   and biggest risk.
3. Generate several candidates using different lenses: importance, challenged
   assumptions, rival mechanisms, boundary conditions, changed circumstances,
   structural analogy, simpler baselines, and stakeholder perspectives.
4. For each candidate, name the question, the tension it exposes, and the first
   observation that could weaken it.
5. Score the promising candidates from 1–5 on importance, feasibility,
   falsifiability, evidence leverage, originality, and value of a negative result.
6. Reject or rewrite candidates that are method-first, novelty-only, impossible
   under the stated constraints, lack a beneficiary, have no real rival or
   falsifier, or teach nothing when negative.
7. Pressure-test the finalists as a skeptical editor, reviewer, principal
   investigator, or committee member. Repair, park, or discard fatal weaknesses.
8. Return one to three Good Question Cards. If execution is requested, add a
   short pilot plan with milestones and decision gates.

## Good Question Card

For Chinese users, prefer:

```markdown
## 好问题卡

**暂定题目：** ...
**核心研究问题：** ...
**为什么值得做：** ...
**它挑战了什么默认假设：** ...
**竞争性解释：** H1 ...；H2 ...；H3 ...
**关键判别证据或实验：** ...
**什么结果会推翻它：** ...
**两周内可做的初步验证：** ...
**需要的数据或资源：** ...
**最强评审质疑：** ...
**下一步动作：** ...
```

For other languages, localize the same fields rather than forcing English.

## Boundaries

- Do not invent domain consensus, novelty, feasibility, or citations.
- Do not protect a favorite hypothesis by weakening its rivals or falsifier.
- Do not inflate every idea into a viable project; recommend rewriting,
  parking, or abandoning weak candidates when warranted.
- If a separate scientific-story skill is available, use this Skill to settle
  what should be asked and tested before handing off narrative organization.
