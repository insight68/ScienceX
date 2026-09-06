# ScienceX Research Twin Workbench

ScienceX is positioned as an **open-source, local-first research twin workbench**.

For a focused research object, it organizes dataset versions, experimental conditions, computational models, run evidence, and research decisions into digital experiments that can run, replay, and be compared. Results can return to research state and support testable candidate directions for the next cycle.

> **Core proposition:** Reproduce research digitally. Move the next cycle forward as evidence returns.

## What is a research twin?

A ScienceX research twin is not an experiment screenshot, a 3D visualization, or an ordinary workflow. It is an inspectable correspondence between a research object and its digital research state.

A minimum viable research twin has five layers:

1. **Object layer:** research object, scientific question, observables, and data structure.
2. **Experiment layer:** variables, controls, conditions, protocol versions, and acceptance criteria.
3. **Execution layer:** models, algorithms, tools, parameters, environments, and authorization state.
4. **Evidence layer:** inputs, outputs, logs, sources, hashes, failures, and uncertainty.
5. **Decision layer:** researcher-approved boundaries, open questions, and next hypotheses.

A result without conditions and versions is not a research twin. A workflow without replayable evidence is not one either.

## Product hierarchy

| Level | Meaning |
| --- | --- |
| ScienceX | The research twin workbench that carries projects and twin units |
| Research twin | The continuously updated digital research state of a focused research object |
| Experiment twin | One version-pinned experiment or computational run that can execute, compare, and replay |

## What is validated today

The built-in cell-viability teaching case forms a **digital experiment twin unit**:

```text
Versioned experiment design
    ↓
Pinned simulated dataset
    ↓
Deterministic 4PL analysis
    ↓
Technical evidence and Artifacts
    ↓
Replay against the original version
```

The case preserves successful dose response, changed-data versions, explicit missing-well failure, and completed-but-inconclusive weak response. Its simulated data are for product teaching only; they do not establish efficacy, wet-lab validation, or a scientific conclusion.

## How evidence supports the next step

ScienceX does not treat “insight” as a conclusion generated from nowhere. Candidate next steps should come from differences such as:

- missing controls, replicates, conditions, or source support;
- variables most likely to affect the result;
- changes in data, design, parameters, and output across Runs;
- differences in object, conditions, or measurement between external literature and local results.

A candidate output should state its evidence basis, current gap, proposed validation, and operating boundary. At the current stage, these suggestions require a researcher-configured and authorized model or tool and must be reviewed by the researcher. They are not autonomous scientific discoveries and do not start real experiments automatically.

## Digital loop and real-world feedback

ScienceX currently validates a researcher-driven digital experiment loop: pin versions, run analyses, preserve technical evidence, create artifacts, and replay comparisons.

Returning data from a real instrument, ELN, LIMS, or observation requires a dedicated connector, identity and permission controls, protocol adaptation, data-quality checks, and calibration. MCP provides an extension interface; it does not by itself demonstrate that an instrument is connected.

The current product does not claim:

- generic laboratory instrument control;
- unattended wet-lab operation;
- automatic model-weight training or updates;
- autonomous scientific sign-off;
- a real-world digital twin that works across every scientific discipline.

## Researcher and ScienceX responsibilities

ScienceX organizes research state, executes authorized work, compares Runs, preserves technical evidence, and proposes candidate interpretations and next steps.

Researchers define important questions, review experiment designs, judge whether evidence is credible, authorize high-risk or real-world actions, and accept, revise, or reject candidate hypotheses. Researchers remain responsible for final scientific conclusions.

## Maturity path

| Stage | Position |
| --- | --- |
| Now | Digital experiment twin: versions, runs, evidence, artifacts, and replay |
| Next | Domain research twin: stable domain data structures, specialist models, and evaluation rules |
| Connect | Real-world feedback twin: validated ELN, LIMS, instrument, or observational-data connections |
| Vision | Research twin network: multiple candidate paths compared under researcher governance |

Research Assistant, Research Agent, and AI Scientist describe the maturity of an AI role. A research twin describes the product object managed by ScienceX. They are related, but they are not the same concept.

## Try it

For a first session, run the [built-in three-minute teaching case](../science/01-deployment-and-workflow.md#try-the-built-in-example-in-three-minutes). Inspect the dataset version, Run, technical evidence, Artifacts, and Replay before defining the inputs, variables, output metrics, and acceptance criteria for your own research object.
