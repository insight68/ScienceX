import fs from 'node:fs/promises'
import path from 'node:path'
import { Presentation, PresentationFile } from '@oai/artifact-tool'
import { finalizePresentation } from '/Users/chunjun/.codex/plugins/cache/openai-primary-runtime/presentations/26.903.11726/skills/presentations/container_tools/artifact_tool_utils.mjs'

const workspaceRoot = '/Users/chunjun/Desktop/Build/Agent-harness/ScienceX'
const taskRoot = path.join(workspaceRoot, '.codex-pptx', 'sciencex-home-talk')
const candidatePath = path.join(taskRoot, '.codex-finalizer', 'ScienceX-home-talk.candidate.pptx')
const finalPath = '/Users/chunjun/Desktop/Build/Agent-harness/ScienceX/output/presentations/ScienceX_科研工作台_品牌首页演讲版.pptx'
const receiptPath = path.join(taskRoot, '.codex-finalizer', 'ScienceX-home-talk.validation.json')
const productImagePath = '/private/tmp/sciencex-product-ui.png'
const caseImagePath = '/private/tmp/sciencex-case-details-v3.png'

const W = 1280
const H = 720
const C = {
  deep: '#003A32',
  darker: '#002821',
  ink: '#063A32',
  green: '#00C86F',
  greenDark: '#008F52',
  mint: '#E5F7ED',
  mint2: '#F0FAF4',
  paper: '#F7F9F5',
  white: '#FFFFFF',
  muted: '#64736E',
  line: '#CCD9D2',
  blue: '#2B68F2',
  amber: '#F0B32A',
  coral: '#E86E4A',
  gray: '#AAB5B0',
}

const FONT_TITLE = 'Songti SC'
const FONT_BODY = 'Heiti SC'
const FONT_LATIN = 'Avenir Next'

function addShape(slide, geometry, position, fill = 'none', lineFill = 'none', lineWidth = 0, extra = {}) {
  return slide.shapes.add({
    geometry,
    position,
    fill,
    line: { style: 'solid', fill: lineFill, width: lineWidth },
    ...extra,
  })
}

function addText(slide, text, position, options = {}) {
  const shape = addShape(slide, 'textbox', position)
  shape.text = text
  shape.text.style = {
    fontSize: options.fontSize ?? 24,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? C.ink,
    alignment: options.alignment ?? 'left',
    verticalAlignment: options.verticalAlignment ?? 'top',
    autoFit: options.autoFit ?? 'shrinkText',
    wrap: 'square',
    insets: options.insets ?? { top: 0, right: 0, bottom: 0, left: 0 },
    typeface: options.typeface ?? FONT_BODY,
    lineSpacing: options.lineSpacing ?? 1,
  }
  return shape
}

function addLine(slide, x, y, width, height, color = C.line, lineWidth = 1) {
  return addShape(slide, 'line', { left: x, top: y, width, height }, 'none', color, lineWidth)
}

function addPill(slide, text, x, y, w, options = {}) {
  const shape = addShape(
    slide,
    'roundRect',
    { left: x, top: y, width: w, height: options.height ?? 30 },
    options.fill ?? C.mint,
    options.line ?? 'none',
    options.lineWidth ?? 0,
    { borderRadius: options.radius ?? 15 },
  )
  shape.text = text
  shape.text.style = {
    fontSize: options.fontSize ?? 13,
    bold: options.bold ?? true,
    color: options.color ?? C.greenDark,
    alignment: 'center',
    verticalAlignment: 'middle',
    autoFit: 'shrinkText',
    insets: { top: 1, right: 8, bottom: 1, left: 8 },
    typeface: options.typeface ?? FONT_LATIN,
  }
  return shape
}

function addHeader(slide, number, label, title, body, options = {}) {
  const dark = options.dark ?? false
  addPill(slide, number, 58, 43, 42, {
    height: 28,
    fill: dark ? C.green : C.deep,
    color: dark ? C.darker : C.white,
    fontSize: 12,
  })
  addText(slide, label, { left: 112, top: 48, width: 320, height: 20 }, {
    fontSize: 12,
    bold: true,
    color: dark ? C.green : C.greenDark,
    typeface: FONT_LATIN,
    lineSpacing: 1,
  })
  addText(slide, title, { left: 58, top: 86, width: options.titleWidth ?? 730, height: options.titleHeight ?? 64 }, {
    fontSize: options.titleSize ?? 40,
    bold: true,
    color: dark ? C.white : C.ink,
    typeface: FONT_TITLE,
    lineSpacing: 0.94,
  })
  if (body) {
    addText(slide, body, { left: options.bodyLeft ?? 820, top: options.bodyTop ?? 94, width: options.bodyWidth ?? 400, height: options.bodyHeight ?? 62 }, {
      fontSize: options.bodySize ?? 17,
      color: dark ? '#C5D8D1' : C.muted,
      typeface: FONT_BODY,
      lineSpacing: 1.18,
    })
  }
  addText(slide, 'ScienceX', { left: 1110, top: 44, width: 110, height: 22 }, {
    fontSize: 16,
    bold: true,
    color: dark ? C.white : C.ink,
    typeface: FONT_LATIN,
    alignment: 'right',
  })
}

function addFooter(slide, number, dark = false) {
  addLine(slide, 58, 684, 1164, 0, dark ? '#21584E' : C.line, 1)
  addText(slide, `SCIENCEX · ${String(number).padStart(2, '0')}`, { left: 58, top: 692, width: 180, height: 16 }, {
    fontSize: 10,
    bold: true,
    color: dark ? '#7BB8A5' : '#7B8B85',
    typeface: FONT_LATIN,
  })
}

function setNotes(slide, notes) {
  slide.speakerNotes.textFrame.setText(notes)
  slide.speakerNotes.setVisible(true)
}

async function imageBytes(imagePath) {
  const bytes = await fs.readFile(imagePath)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function addImage(slide, bytes, contentType, alt, position, options = {}) {
  return slide.images.add({
    blob: bytes,
    contentType,
    alt,
    fit: options.fit ?? 'cover',
    position,
    geometry: options.geometry ?? 'roundRect',
    borderRadius: options.borderRadius ?? 18,
  })
}

function connect(slide, from, to, options = {}) {
  return slide.shapes.connect(from, to, {
    kind: options.kind ?? 'straight',
    fromSide: options.fromSide ?? 'right',
    toSide: options.toSide ?? 'left',
    line: { style: 'solid', fill: options.color ?? C.green, width: options.width ?? 2 },
    head: { type: 'triangle', width: 'sm', length: 'sm' },
  })
}

const presentation = Presentation.create({ slideSize: { width: W, height: H } })

// 01 — Cover
{
  const slide = presentation.slides.add()
  slide.background.fill = C.darker
  addShape(slide, 'rect', { left: 0, top: 0, width: 16, height: H }, C.green)
  addText(slide, 'OPEN SOURCE · LOCAL FIRST · TRACEABLE', { left: 72, top: 66, width: 520, height: 24 }, {
    fontSize: 14,
    bold: true,
    color: C.green,
    typeface: FONT_LATIN,
  })
  addText(slide, 'ScienceX', { left: 72, top: 164, width: 630, height: 84 }, {
    fontSize: 72,
    bold: true,
    color: C.white,
    typeface: FONT_LATIN,
    lineSpacing: 0.9,
  })
  addText(slide, '科研工作台', { left: 72, top: 247, width: 620, height: 110 }, {
    fontSize: 72,
    bold: true,
    color: C.green,
    typeface: FONT_TITLE,
    lineSpacing: 0.88,
  })
  addText(slide, '让研究问题、证据与下一步\n进入同一条可追溯链路', { left: 76, top: 393, width: 620, height: 92 }, {
    fontSize: 25,
    color: '#C7DAD3',
    typeface: FONT_BODY,
    lineSpacing: 1.15,
  })
  addText(slide, 'X', { left: 865, top: 116, width: 310, height: 355 }, {
    fontSize: 290,
    bold: true,
    color: C.green,
    typeface: FONT_LATIN,
    alignment: 'center',
    verticalAlignment: 'middle',
    lineSpacing: 0.8,
  })
  addShape(slide, 'ellipse', { left: 910, top: 103, width: 250, height: 250 }, 'none', '#155D4F', 2)
  addShape(slide, 'ellipse', { left: 1015, top: 300, width: 155, height: 155 }, 'none', '#237363', 2)
  ;['本地数据', '开放源码', '跨平台桌面端'].forEach((item, index) => {
    addPill(slide, item, 72 + index * 154, 566, index === 2 ? 145 : 128, {
      fill: '#0B4A3F',
      line: '#1E6D5E',
      lineWidth: 1,
      color: '#D7E8E2',
      fontSize: 14,
      typeface: FONT_BODY,
      height: 36,
    })
  })
  addText(slide, 'SCIENCEX · BRAND STORY', { left: 72, top: 665, width: 260, height: 18 }, {
    fontSize: 11,
    bold: true,
    color: '#6EA996',
    typeface: FONT_LATIN,
  })
  addText(slide, '01 / 12', { left: 1120, top: 665, width: 90, height: 18 }, {
    fontSize: 11,
    color: '#6EA996',
    typeface: FONT_LATIN,
    alignment: 'right',
  })
  setNotes(slide, [
    '开场先给出一句话定位：ScienceX 是开源、本地优先、可追溯的 AI 科研工作台。',
    '强调“工作台”三个字。它不是只回答问题的聊天框，而是承载研究项目、研究线程、工具调用、数据版本和研究产物的桌面环境。',
    '这一页只建立共同语言：我们要解决的不是让 AI 说得更多，而是让研究过程更连续、更可核对。',
  ])
}

// 02 — Repetitive work
{
  const slide = presentation.slides.add()
  slide.background.fill = C.paper
  addHeader(slide, '02', 'DAILY RESEARCH', '四件重复工作交给 ScienceX', '科研最稀缺的不是信息，而是研究者的注意力。可重复、可检查的工作交给系统，关键判断留给研究者。')
  const rows = [
    ['搜索资料', '带出处的文献表与证据摘要', '决定精读什么、相信什么'],
    ['进度跟踪', '进度板、阶段总结与下一步清单', '决定优先级和研究方向'],
    ['理清逻辑', '论证缺口与待验证问题', '回答关键问题、修正论证'],
    ['修改表达', '修改建议、差异记录与风格档案', '保留观点、结论和个人风格'],
  ]
  addText(slide, '重复工作', { left: 62, top: 184, width: 180, height: 26 }, { fontSize: 14, bold: true, color: C.greenDark })
  addText(slide, '形成产物', { left: 330, top: 184, width: 300, height: 26 }, { fontSize: 14, bold: true, color: C.greenDark })
  addText(slide, '研究者保留', { left: 805, top: 184, width: 300, height: 26 }, { fontSize: 14, bold: true, color: C.greenDark })
  addLine(slide, 58, 214, 1164, 0, C.ink, 2)
  rows.forEach((row, index) => {
    const y = 230 + index * 88
    addText(slide, `0${index + 1}`, { left: 62, top: y + 4, width: 45, height: 28 }, { fontSize: 18, bold: true, color: C.green, typeface: FONT_LATIN })
    addText(slide, row[0], { left: 112, top: y, width: 180, height: 38 }, { fontSize: 25, bold: true, color: C.ink, typeface: FONT_TITLE })
    addText(slide, row[1], { left: 330, top: y + 2, width: 390, height: 48 }, { fontSize: 20, color: C.ink })
    addText(slide, row[2], { left: 805, top: y + 2, width: 370, height: 48 }, { fontSize: 20, color: C.ink })
    addLine(slide, 58, y + 69, 1164, 0, C.line, 1)
  })
  addShape(slide, 'roundRect', { left: 58, top: 603, width: 1164, height: 60 }, C.deep, C.deep, 1, { borderRadius: 12 })
  addText(slide, '提速的关键不是让 AI 代替思考，而是让它接手重复工作，并把证据和下一步留在研究过程里。', { left: 88, top: 618, width: 1100, height: 32 }, {
    fontSize: 20,
    bold: true,
    color: C.white,
    alignment: 'center',
    verticalAlignment: 'middle',
  })
  addFooter(slide, 2)
  setNotes(slide, [
    '科研时间经常被四类工作切碎：找资料、跟进度、追逻辑和改表达。它们重要，但重复、规模大，也容易丢上下文。',
    'ScienceX 对每一类工作都要求留下可检查的产物。例如检索不是给几个链接，而是形成带出处的文献表；进度不是聊天记录，而是阶段总结和下一步清单。',
    '右侧是不能外包的部分。研究者仍然决定读什么、信什么、优先做什么，以及结论是否成立。',
  ])
}

// 03 — Division of labor
{
  const slide = presentation.slides.add()
  slide.background.fill = C.white
  addHeader(slide, '03', 'HUMAN IN THE LOOP', '系统执行，研究者判断', '高风险操作需要授权，关键证据需要人工复核。ScienceX 承担执行和记录，研究者承担科学判断。')
  addShape(slide, 'roundRect', { left: 58, top: 187, width: 548, height: 385 }, C.deep, C.deep, 1, { borderRadius: 20 })
  addShape(slide, 'roundRect', { left: 634, top: 187, width: 588, height: 385 }, C.mint2, C.line, 1, { borderRadius: 20 })
  addText(slide, 'SCIENCEX', { left: 92, top: 222, width: 220, height: 24 }, { fontSize: 13, bold: true, color: C.green, typeface: FONT_LATIN })
  addText(slide, '执行与记录', { left: 92, top: 254, width: 380, height: 55 }, { fontSize: 39, bold: true, color: C.white, typeface: FONT_TITLE })
  addText(slide, '• 检索、阅读与整理\n• 编码、计算与比较\n• 执行获得授权的工具\n• 保存过程和候选假设', { left: 92, top: 332, width: 420, height: 178 }, {
    fontSize: 23,
    color: '#D3E4DE',
    lineSpacing: 1.35,
  })
  addText(slide, 'RESEARCHER', { left: 674, top: 222, width: 250, height: 24 }, { fontSize: 13, bold: true, color: C.greenDark, typeface: FONT_LATIN })
  addText(slide, '科学判断', { left: 674, top: 254, width: 380, height: 55 }, { fontSize: 39, bold: true, color: C.ink, typeface: FONT_TITLE })
  addText(slide, '• 提出重要研究问题\n• 审核方案与关键证据\n• 判断结果是否成立\n• 决定下一轮研究方向', { left: 674, top: 332, width: 450, height: 178 }, {
    fontSize: 23,
    color: C.ink,
    lineSpacing: 1.35,
  })
  addShape(slide, 'ellipse', { left: 585, top: 343, width: 92, height: 92 }, C.white, C.green, 2)
  addText(slide, '确认', { left: 599, top: 370, width: 64, height: 28 }, {
    fontSize: 17,
    bold: true,
    color: C.greenDark,
    alignment: 'center',
    verticalAlignment: 'middle',
  })
  addShape(slide, 'roundRect', { left: 173, top: 602, width: 934, height: 49 }, C.ink, C.ink, 1, { borderRadius: 12 })
  addText(slide, 'Human-driven Research Loop  ·  研究者发起、授权、复核并作出最终判断', { left: 200, top: 614, width: 880, height: 24 }, {
    fontSize: 18,
    bold: true,
    color: C.white,
    alignment: 'center',
    typeface: FONT_BODY,
  })
  addFooter(slide, 3)
  setNotes(slide, [
    '这一页是 ScienceX 的责任边界。左边是系统擅长的执行、整理、计算和记录，右边是研究者必须承担的判断。',
    '中间的“确认”很关键。自动化结果只有在研究者检查来源、方法、告警和产物之后，才可以进入下一轮研究状态。',
    '因此我们把当前运行模式明确写成 Human-driven Research Loop。ScienceX 能加速研究，但不替代研究者签署最终结论。',
  ])
}

// 04 — Product proof
{
  const slide = presentation.slides.add()
  slide.background.fill = C.paper
  addHeader(slide, '04', 'PRODUCT IN USE', '产品已经进入研究过程', '研究项目、研究线程、定时任务与科研 Skills，已经进入同一个桌面工作台。')
  const bytes = await imageBytes(productImagePath)
  addImage(slide, bytes, 'image/png', 'ScienceX 品牌首页中的产品实景，展示研究线程、定时任务与科研 Skills', { left: 58, top: 170, width: 1164, height: 480 }, { fit: 'cover' })
  addFooter(slide, 4)
  setNotes(slide, [
    '这里展示的是当前品牌首页中的真实产品界面，已经裁切并脱敏。',
    '左侧研究线程承载研究问题、过程说明、文件和后续行动；右上是定时任务入口；右下是产品里可查看的科研 Skills。',
    '这说明 ScienceX 的价值不在于功能数量，而在于这些能力是否在同一个研究上下文中持续工作。',
    '定时任务也有明确边界：本地任务只在应用运行、设备保持唤醒时执行。',
  ])
}

// 05 — Research Loop
{
  const slide = presentation.slides.add()
  slide.background.fill = C.darker
  addHeader(slide, '05', 'RESEARCH LOOP', '科研不是一次性 Workflow', '结果不是终点，而是下一轮研究的输入。ScienceX 保存状态并执行任务，研究者判断证据与方向。', { dark: true, titleWidth: 700 })
  const nodes = [
    ['研究问题', 'Question'],
    ['候选假设', 'Hypothesis'],
    ['证据与数据', 'Evidence'],
    ['实验 / 计算', 'Experiment'],
    ['结果与边界', 'Result'],
    ['下一轮问题', 'Next question'],
  ]
  const positions = [
    [74, 218], [270, 218], [466, 218], [662, 218], [858, 218], [1054, 218],
  ]
  const nodeShapes = positions.map(([x, y], index) => {
    const node = addShape(slide, 'roundRect', { left: x, top: y, width: 150, height: 118 }, index === 5 ? C.green : '#0A4B40', index === 5 ? C.green : '#1C6557', 1.5, { borderRadius: 18 })
    addText(slide, `0${index + 1}`, { left: x + 16, top: y + 16, width: 36, height: 20 }, { fontSize: 12, bold: true, color: index === 5 ? C.darker : C.green, typeface: FONT_LATIN })
    addText(slide, nodes[index][0], { left: x + 16, top: y + 47, width: 118, height: 30 }, { fontSize: 21, bold: true, color: index === 5 ? C.darker : C.white, typeface: FONT_TITLE, alignment: 'center' })
    addText(slide, nodes[index][1], { left: x + 16, top: y + 84, width: 118, height: 19 }, { fontSize: 11, color: index === 5 ? '#075C43' : '#89BDAE', typeface: FONT_LATIN, alignment: 'center' })
    return node
  })
  nodeShapes.slice(0, -1).forEach((node, index) => connect(slide, node, nodeShapes[index + 1], { color: '#68C99F', width: 2 }))
  const feedback = slide.shapes.connect(nodeShapes[5], nodeShapes[0], {
    kind: 'elbow3',
    fromSide: 'bottom',
    toSide: 'bottom',
    line: { style: 'solid', fill: C.green, width: 2 },
    head: { type: 'triangle', width: 'sm', length: 'sm' },
  })
  feedback.sendToBack()
  addShape(slide, 'roundRect', { left: 116, top: 438, width: 1048, height: 118 }, '#063D34', '#1B6657', 1, { borderRadius: 16 })
  addText(slide, 'RESEARCH MEMORY', { left: 146, top: 461, width: 220, height: 20 }, { fontSize: 12, bold: true, color: C.green, typeface: FONT_LATIN })
  addText(slide, '研究目标 · 候选假设 · 数据版本 · 证据关系 · 关键决策 · 结果 · 未解决问题', { left: 146, top: 495, width: 972, height: 35 }, { fontSize: 22, bold: true, color: C.white, alignment: 'center' })
  addText(slide, '当前闭环由研究者驱动。ScienceX 协助执行、记录与重放，不替代最终科学判断。', { left: 188, top: 600, width: 904, height: 32 }, { fontSize: 18, color: '#BED7CF', alignment: 'center' })
  addFooter(slide, 5, true)
  setNotes(slide, [
    'ScienceX 的核心不是线性工作流，而是 Research Loop。研究问题产生候选假设，假设需要证据与数据，再进入实验或计算。',
    '结果必须连同边界一起被保存，然后转化成下一轮问题。闭环的价值，是每一轮都能知道我们改了什么、为什么改、结果如何变化。',
    '底部的 Research Memory 是状态层。它保存目标、假设、数据版本、证据关系、关键决策、结果和未解决问题。',
  ])
}

// 06 — Capability maturity
{
  const slide = presentation.slides.add()
  slide.background.fill = C.white
  addHeader(slide, '06', 'CAPABILITY MATURITY', '从回答问题，到持续推进研究', '产品能力与长期愿景分开表达。当前可用、下一阶段与长期愿景，不混在同一张能力清单里。')
  const xPositions = [58, 446, 834]
  const stages = [
    ['NOW', '当前可用', 'Research Assistant', '研究线程、本地项目、科研 Skills、数据版本、确定性分析、证据与重放。', '保存上下文 · 执行与记录'],
    ['NEXT', '下一阶段', 'Research Agent', '更完整地组织计划、执行和验证，并在人工确认后更新研究状态。', '计划 · 执行 · 验证'],
    ['VISION', '长期愿景', 'AI Scientist', '让结果持续影响候选假设、实验设计和后续研究方向。', 'Hypothesis · Evidence · Next'],
  ]
  stages.forEach((stage, index) => {
    const current = index === 0
    addShape(slide, 'roundRect', { left: xPositions[index], top: 190, width: 350, height: 392 }, current ? C.mint2 : C.paper, current ? C.green : C.line, current ? 2 : 1, { borderRadius: 18 })
    addText(slide, stage[0], { left: xPositions[index] + 28, top: 220, width: 120, height: 22 }, { fontSize: 13, bold: true, color: current ? C.greenDark : C.muted, typeface: FONT_LATIN })
    addPill(slide, stage[1], xPositions[index] + 232, 212, 90, { height: 30, fill: current ? C.green : C.white, line: current ? 'none' : C.line, lineWidth: current ? 0 : 1, color: current ? C.darker : C.muted, fontSize: 13, typeface: FONT_BODY })
    addText(slide, stage[2], { left: xPositions[index] + 28, top: 280, width: 290, height: 48 }, { fontSize: 31, bold: true, color: C.ink, typeface: FONT_LATIN })
    addText(slide, stage[3], { left: xPositions[index] + 28, top: 353, width: 286, height: 116 }, { fontSize: 19, color: C.ink, lineSpacing: 1.28 })
    addLine(slide, xPositions[index] + 28, 500, 294, 0, current ? C.green : C.line, 1)
    addText(slide, stage[4], { left: xPositions[index] + 28, top: 520, width: 286, height: 28 }, { fontSize: 14, bold: true, color: current ? C.greenDark : C.muted, typeface: FONT_LATIN, alignment: 'center' })
  })
  addText(slide, '当前产品定位', { left: 58, top: 611, width: 150, height: 24 }, { fontSize: 14, bold: true, color: C.greenDark })
  addText(slide, 'ScienceX 当前提供 Research Assistant 能力，后续才逐步走向更完整的 Research Agent。', { left: 220, top: 606, width: 920, height: 32 }, { fontSize: 20, bold: true, color: C.ink })
  addFooter(slide, 6)
  setNotes(slide, [
    '这一页刻意把现在、下一阶段和长期愿景分开，避免把未来能力当成现状。',
    '当前可用的是 Research Assistant：研究线程、本地项目、科研 Skills、数据版本、确定性分析、证据和重放。',
    '下一阶段才是更完整的 Research Agent，它需要在人工确认后组织计划、执行和验证。AI Scientist 是长期愿景，强调结果持续改变候选假设和研究方向。',
  ])
}

// 07 — Runnable evidence
{
  const slide = presentation.slides.add()
  slide.background.fill = C.paper
  addHeader(slide, '07', 'RUNNABLE EVIDENCE', '一条可以实际运行和重放的研究链路', '本地教学案例保留数据版本、运行证据、失败和不确定性，而不是只展示成功结果。', { titleWidth: 740, titleSize: 37 })
  const bytes = await imageBytes(caseImagePath)
  addImage(slide, bytes, 'image/png', 'ScienceX 细胞活力教学案例，展示可重放事实与四种运行结果', { left: 58, top: 192, width: 1164, height: 340 }, { fit: 'contain' })
  addText(slide, '03 MIN   ·   24 WELLS   ·   SHA-256   ·   REPLAY', { left: 208, top: 558, width: 864, height: 26 }, { fontSize: 19, bold: true, color: C.blue, typeface: FONT_LATIN, alignment: 'center' })
  addShape(slide, 'roundRect', { left: 58, top: 610, width: 1164, height: 46 }, '#FFF5D8', '#F2CE6D', 1, { borderRadius: 10 })
  addText(slide, '模拟数据，仅用于产品教学；不代表真实药效、湿实验验证或科学结论。', { left: 84, top: 622, width: 1112, height: 22 }, { fontSize: 17, bold: true, color: '#725515', alignment: 'center' })
  addFooter(slide, 7)
  setNotes(slide, [
    '这条案例用模拟细胞活力数据演示完整研究链路，三分钟内完成版本化实验设计、确定性 4PL 分析、技术证据评估和结果重放。',
    '四个事实可以核对：24 个孔位、SHA-256 输入与产物哈希、固定原始版本重放，以及三类研究产物。',
    '更重要的是，它保留失败和不确定性。缺孔输入会明确失败，弱响应会标记“技术证据尚无定论”，系统不会静默补值或把运行完成写成科学结论。',
    '需要明确：这是产品教学中的模拟数据，不代表真实药效或湿实验验证。',
  ])
}

// 08 — Runtime mechanism
{
  const slide = presentation.slides.add()
  slide.background.fill = C.white
  addHeader(slide, '08', 'HOW IT WORKS', 'ScienceX 承载一次研究推进', '模型负责推理。ScienceX 读取研究状态、组织执行能力、保存运行证据，并把关键判断交还给研究者。')
  const steps = [
    ['01', 'Understand', '读取问题、线程与证据'],
    ['02', 'Plan', '拆解任务与执行路径'],
    ['03', 'Act', '调用已授权能力'],
    ['04', 'Verify', '检查输入、结果与产物'],
    ['05', 'Learn', '确认后保存关键状态'],
  ]
  const circles = steps.map((step, index) => {
    const x = 88 + index * 236
    const circle = addShape(slide, 'ellipse', { left: x, top: 218, width: 126, height: 126 }, index === 2 ? C.green : C.mint2, index === 2 ? C.green : C.line, index === 2 ? 2 : 1.5)
    addText(slide, step[0], { left: x + 38, top: 237, width: 50, height: 22 }, { fontSize: 13, bold: true, color: index === 2 ? C.darker : C.greenDark, typeface: FONT_LATIN, alignment: 'center' })
    addText(slide, step[1], { left: x + 12, top: 272, width: 102, height: 30 }, { fontSize: 20, bold: true, color: C.ink, typeface: FONT_LATIN, alignment: 'center' })
    return circle
  })
  circles.slice(0, -1).forEach((circle, index) => connect(slide, circle, circles[index + 1], { color: C.greenDark, width: 2 }))
  steps.forEach((step, index) => {
    const x = 58 + index * 236
    addText(slide, step[2], { left: x, top: 378, width: 186, height: 58 }, { fontSize: 18, color: C.ink, alignment: 'center', lineSpacing: 1.2 })
  })
  addShape(slide, 'roundRect', { left: 58, top: 478, width: 1164, height: 110 }, C.deep, C.deep, 1, { borderRadius: 16 })
  addText(slide, 'RESEARCH MEMORY · STATE LAYER', { left: 86, top: 500, width: 310, height: 22 }, { fontSize: 12, bold: true, color: C.green, typeface: FONT_LATIN })
  addText(slide, '目标 · 假设 · 数据版本 · 证据 · 关键决策 · 未解决问题', { left: 86, top: 538, width: 850, height: 34 }, { fontSize: 22, bold: true, color: C.white })
  addText(slide, '自动化执行不等于科学结论', { left: 930, top: 512, width: 254, height: 48 }, { fontSize: 18, bold: true, color: '#D5E6E0', alignment: 'center', verticalAlignment: 'middle' })
  addFooter(slide, 8)
  setNotes(slide, [
    '一次研究推进分成五个动作。先理解当前问题和证据，再形成计划，之后调用已授权能力执行。',
    '执行后必须验证输入、结果、告警和产物，最后由研究者确认哪些状态值得保留。',
    '底部的状态层把每次运行连接起来。这样下一次不是从空白聊天开始，而是从已有目标、假设、数据版本和未解决问题继续。',
  ])
}

// 09 — Skills I
{
  const slide = presentation.slides.add()
  slide.background.fill = C.mint2
  addHeader(slide, '09', 'RESEARCH SKILLS', '20 个科研 Skills，把方法带进任务', '这些 Skills 是可以查看、检查和组合的任务方法，不是藏在聊天框里的提示词。', { titleWidth: 720, bodyLeft: 790, bodyWidth: 430, bodySize: 15 })
  addText(slide, '20', { left: 58, top: 196, width: 245, height: 170 }, { fontSize: 126, bold: true, color: C.green, typeface: FONT_LATIN, lineSpacing: 0.8 })
  addText(slide, '个科研 Skills\n已集成到 ScienceX', { left: 66, top: 366, width: 260, height: 80 }, { fontSize: 24, bold: true, color: C.ink, typeface: FONT_TITLE, lineSpacing: 1.2 })
  addText(slide, '发现、推理、实验、表达、审查与评测，共同覆盖从问题到产物的研究过程。', { left: 66, top: 476, width: 280, height: 100 }, { fontSize: 18, color: C.muted, lineSpacing: 1.25 })
  const groups = [
    ['01', '发现与检索', '找到方法、论文与可核对来源', ['find-science-skills', 'giiisp-paper-search-apis', 'scansci-pdf']],
    ['02', '调研与推理', '形成候选方向并暴露论证缺口', ['sci-employee-deep-research', 'scispark', 'good-question']],
    ['03', '研究与实验', '转成设计、数据基线与验证步骤', ['experiment-design', 'research-baseline-builder']],
  ]
  groups.forEach((group, index) => {
    const x = 380 + index * 282
    addText(slide, group[0], { left: x, top: 205, width: 40, height: 22 }, { fontSize: 13, bold: true, color: C.greenDark, typeface: FONT_LATIN })
    addText(slide, group[1], { left: x, top: 238, width: 240, height: 40 }, { fontSize: 29, bold: true, color: C.ink, typeface: FONT_TITLE })
    addText(slide, group[2], { left: x, top: 293, width: 240, height: 48 }, { fontSize: 16, color: C.muted, lineSpacing: 1.15 })
    addLine(slide, x, 355, 236, 0, C.green, 2)
    group[3].forEach((skill, skillIndex) => {
      addText(slide, skill, { left: x, top: 384 + skillIndex * 54, width: 248, height: 34 }, { fontSize: skill.length > 25 ? 16 : 18, bold: true, color: C.ink, typeface: FONT_LATIN, verticalAlignment: 'middle' })
    })
  })
  addFooter(slide, 9)
  setNotes(slide, [
    '当前首页列出 20 个科研 Skills。它们按研究任务组织，而不是按技术栈堆叠。',
    '这一页先看研究前半程：发现与检索、调研与推理、研究与实验。研究者能看到 Skill 的名称、用途和适用边界。',
    '例如 scansci-pdf 负责论文获取流程，good-question 用评审式追问暴露论证缺口，experiment-design 把研究问题转成实验设计。',
  ])
}

// 10 — Skills II
{
  const slide = presentation.slides.add()
  slide.background.fill = C.white
  addHeader(slide, '10', 'RESEARCH SKILLS', '从研究产出到审查，能力边界都可见', '方法进入任务后，仍需要质量审查、引用核对、长期记忆和新工具采用前的评测。', { titleWidth: 730, titleSize: 37 })
  const groups = [
    ['04', '写作与呈现', '组织论文、图像、幻灯片、视频与课程产物', ['academic-writing', 'scientific-humanization', 'giiisp-scientific-image-generation', 'visual-deck-builder', 'manim-agent', 'practical-course-producer']],
    ['05', '审查与记忆', '检查论文与引用，并保存长期研究上下文', ['thesis-audit-reviewer', 'papercheck', 'cognitive-profile', 'world-threads-entry']],
    ['06', '能力评测', '采用新工具前检查 MCP 与 Skill 的质量', ['mcp-criticagent', 'skill-criticagent']],
  ]
  const widths = [470, 340, 262]
  const xs = [58, 554, 920]
  groups.forEach((group, index) => {
    const x = xs[index]
    const width = widths[index]
    addText(slide, group[0], { left: x, top: 190, width: 40, height: 22 }, { fontSize: 13, bold: true, color: C.greenDark, typeface: FONT_LATIN })
    addText(slide, group[1], { left: x, top: 224, width, height: 42 }, { fontSize: 29, bold: true, color: C.ink, typeface: FONT_TITLE })
    addText(slide, group[2], { left: x, top: 278, width, height: 54 }, { fontSize: 16, color: C.muted, lineSpacing: 1.15 })
    addLine(slide, x, 348, width, 0, C.green, 2)
    group[3].forEach((skill, skillIndex) => {
      addText(slide, `${String(skillIndex + 1).padStart(2, '0')}  ${skill}`, { left: x, top: 374 + skillIndex * 46, width, height: 32 }, { fontSize: skill.length > 28 ? 15 : 17, bold: true, color: C.ink, typeface: FONT_LATIN, verticalAlignment: 'middle' })
      if (skillIndex < group[3].length - 1) addLine(slide, x, 413 + skillIndex * 46, width, 0, C.line, 1)
    })
  })
  addShape(slide, 'roundRect', { left: 58, top: 630, width: 1164, height: 38 }, C.mint, 'none', 0, { borderRadius: 9 })
  addText(slide, '已集成不等于无条件可运行。依赖、外部服务、连接状态与用户授权仍然决定实际可用范围。', { left: 84, top: 638, width: 1112, height: 22 }, { fontSize: 16, bold: true, color: C.greenDark, alignment: 'center' })
  addFooter(slide, 10)
  setNotes(slide, [
    '这一页是研究后半程。写作与呈现能力负责把研究过程组织成论文、图像、幻灯片、视频和课程产物。',
    '审查与记忆能力负责论文审查、引用核对和长期上下文；能力评测则在采用新的 MCP 或 Skill 之前检查质量。',
    '需要再次强调，已集成不等于无条件可运行。某些 Skills 需要本机依赖、外部服务或用户授权，ScienceX 不会默认获得论文库、数据库或其他系统的访问权。',
  ])
}

// 11 — Environments and guardrails
{
  const slide = presentation.slides.add()
  slide.background.fill = C.paper
  addHeader(slide, '11', 'BOUNDARIES', '连接真实环境，也明确使用边界', '只调用本机已安装、已配置并获得授权的能力。连接执行环境，不等于扩大访问权限。', { titleWidth: 720, bodyLeft: 790, bodyWidth: 430, bodySize: 15 })
  const center = addShape(slide, 'ellipse', { left: 295, top: 294, width: 170, height: 170 }, C.deep, C.deep, 1)
  addText(slide, 'ScienceX', { left: 322, top: 344, width: 116, height: 38 }, { fontSize: 26, bold: true, color: C.white, typeface: FONT_LATIN, alignment: 'center', verticalAlignment: 'middle' })
  addText(slide, 'AUTHORIZED', { left: 325, top: 393, width: 110, height: 18 }, { fontSize: 11, bold: true, color: C.green, typeface: FONT_LATIN, alignment: 'center' })
  const envs = [
    ['本地文件', 'PDF / CSV / 项目目录', 62, 205],
    ['代码与终端', '仓库 / 命令 / 脚本', 62, 478],
    ['模型提供商', '已配置的推理模型', 490, 205],
    ['MCP 服务', '已启用的扩展工具', 490, 478],
    ['数据源', '授权的数据库与服务', 160, 570],
    ['计算环境', '本机已有计算能力', 392, 570],
  ]
  envs.forEach((env) => {
    const node = addShape(slide, 'roundRect', { left: env[2], top: env[3], width: 205, height: 82 }, C.white, C.line, 1, { borderRadius: 14 })
    addText(slide, env[0], { left: env[2] + 18, top: env[3] + 14, width: 169, height: 28 }, { fontSize: 20, bold: true, color: C.ink, alignment: 'center' })
    addText(slide, env[1], { left: env[2] + 12, top: env[3] + 48, width: 181, height: 20 }, { fontSize: 13, color: C.muted, alignment: 'center' })
    addShape(slide, 'ellipse', { left: env[2] + 12, top: env[3] + 12, width: 8, height: 8 }, C.green)
  })
  addShape(slide, 'roundRect', { left: 735, top: 183, width: 487, height: 436 }, C.deep, C.deep, 1, { borderRadius: 20 })
  addText(slide, 'SCIENCEX 使用边界', { left: 774, top: 224, width: 360, height: 30 }, { fontSize: 15, bold: true, color: C.green, typeface: FONT_LATIN })
  const rails = [
    ['01', 'AI 纠错，不替你写'],
    ['02', 'AI 初筛，不替你读'],
    ['03', '数据有边界'],
    ['04', '不夸大结果与结论'],
  ]
  rails.forEach((rail, index) => {
    const y = 278 + index * 72
    addText(slide, rail[0], { left: 774, top: y + 3, width: 42, height: 23 }, { fontSize: 13, bold: true, color: C.green, typeface: FONT_LATIN })
    addText(slide, rail[1], { left: 832, top: y, width: 330, height: 30 }, { fontSize: 23, bold: true, color: C.white, typeface: FONT_TITLE })
    if (index < rails.length - 1) addLine(slide, 774, y + 49, 390, 0, '#28675B', 1)
  })
  addText(slide, '关键证据仍需人工复核', { left: 796, top: 573, width: 340, height: 24 }, { fontSize: 16, bold: true, color: '#CFE2DB', alignment: 'center' })
  addFooter(slide, 11)
  setNotes(slide, [
    'ScienceX 可以连接本地文件、代码与终端、模型提供商、MCP、数据源和计算环境，但每一项都以本机配置和用户授权为前提。',
    '连接环境不等于自动拥有访问权。ScienceX 不会默认获得数据库、论文库或第三方系统权限。',
    '右侧四条边界是面向科研使用的底线：AI 可以纠错但不替代论证，可以初筛但不替代精读；敏感和未公开数据要先确认边界；运行结果不能被夸大成科学结论。',
  ])
}

// 12 — Closing
{
  const slide = presentation.slides.add()
  slide.background.fill = C.darker
  addShape(slide, 'rect', { left: 0, top: 0, width: W, height: 14 }, C.green)
  addText(slide, '09 · START', { left: 66, top: 58, width: 180, height: 22 }, { fontSize: 13, bold: true, color: C.green, typeface: FONT_LATIN })
  addText(slide, '第一条链路，\n从一个真实问题开始', { left: 66, top: 116, width: 560, height: 146 }, { fontSize: 55, bold: true, color: C.white, typeface: FONT_TITLE, lineSpacing: 0.96 })
  const steps = [
    ['01', '打开本地研究项目'],
    ['02', '说清范围、格式和验收条件'],
    ['03', '检查来源、产物与下一步建议'],
  ]
  steps.forEach((step, index) => {
    const x = 68 + index * 385
    addText(slide, step[0], { left: x, top: 312, width: 42, height: 22 }, { fontSize: 13, bold: true, color: C.green, typeface: FONT_LATIN })
    addText(slide, step[1], { left: x, top: 345, width: 330, height: 56 }, { fontSize: 23, bold: true, color: C.white, typeface: FONT_TITLE })
    if (index < 2) addLine(slide, x + 340, 327, 30, 0, '#36806F', 2)
  })
  addShape(slide, 'roundRect', { left: 66, top: 447, width: 1148, height: 135 }, '#0A4A3F', '#287161', 1, { borderRadius: 16 })
  addText(slide, '可以直接开始的示例', { left: 94, top: 468, width: 220, height: 20 }, { fontSize: 12, bold: true, color: C.green, typeface: FONT_BODY })
  addText(slide, '“检索近三年关于 X 的代表论文，按方法、数据、结论和局限整理成表，每条附出处；先给 10 篇，找不到就明确说明，不要编造。”', { left: 94, top: 504, width: 1092, height: 62 }, { fontSize: 20, bold: true, color: C.white, typeface: FONT_BODY, lineSpacing: 1.23 })
  addText(slide, 'ScienceX', { left: 68, top: 630, width: 170, height: 30 }, { fontSize: 25, bold: true, color: C.green, typeface: FONT_LATIN })
  addText(slide, '科研工作台', { left: 250, top: 632, width: 180, height: 28 }, { fontSize: 21, bold: true, color: C.white, typeface: FONT_TITLE })
  addText(slide, 'github.com/insight68/ScienceX', { left: 850, top: 636, width: 364, height: 22 }, { fontSize: 15, color: '#A5C9BC', typeface: FONT_LATIN, alignment: 'right' })
  setNotes(slide, [
    '收束到一个可执行的开始方式。打开本地研究项目，说清范围、输出格式和验收条件，然后检查来源、产物与下一步建议。',
    '示例指令故意包含四个约束：时间范围、整理维度、每条出处，以及找不到就明确说明。这些约束让任务可检查，也把“不要编造”写成验收标准。',
    '最后回到产品定位：ScienceX 是科研工作台。它让研究问题、证据、运行和下一步进入同一条可追溯链路。',
  ])
}

await fs.mkdir(path.dirname(candidatePath), { recursive: true })
await fs.mkdir(path.dirname(finalPath), { recursive: true })
await fs.rm(candidatePath, { force: true })
await fs.rm(receiptPath, { force: true })

const pptx = await PresentationFile.exportPptx(presentation)
await pptx.save(candidatePath)

const result = await finalizePresentation({
  workspaceDir: workspaceRoot,
  candidatePath,
  finalPath,
  receiptPath,
  integrityValidatorPath: '/Users/chunjun/.codex/plugins/cache/openai-primary-runtime/presentations/26.903.11726/skills/presentations/container_tools/inspect_presentation_package_integrity.py',
  layoutValidatorPath: '/Users/chunjun/.codex/plugins/cache/openai-primary-runtime/presentations/26.903.11726/skills/presentations/container_tools/inspect_presentation_layout_geometry.py',
  pythonExecutable: '/Users/chunjun/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
  explicitTotalSlideCount: 12,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: {
    basis: 'design',
    families: [FONT_TITLE, FONT_BODY, FONT_LATIN],
  },
  layoutArgs: [
    '--expected-aspect', '16:9',
    '--expected-slide-size-emu', '12192000,6858000',
    '--cover-role', 'cover',
    '--cover-word-limit', '48',
    '--max-content-prose-words', '150',
    '--approved-dense-slide', '9',
    '--approved-dense-slide', '10',
  ],
})

console.log(JSON.stringify({
  finalPath: result.finalPath,
  receiptPath: result.receiptPath,
  finalSha256: result.finalSha256,
  byteCount: result.byteCount,
  slideCount: presentation.slides.items.length,
}, null, 2))
