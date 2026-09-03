import { startServer, stopServerRuntimeForShutdown } from '../../index.js'
import provenance from '../../../skills/bundled/tashan/UPSTREAM.json'

const requestedNames = ['scansci-pdf', 'good-question', ...provenance.skills]
const snapshots = []
Reflect.deleteProperty(globalThis, 'MACRO')

// Exercise the desktop server entrypoint without importing the CLI or manually
// registering skills. The parent supplies a fresh, isolated user environment.
for (let startup = 0; startup < 2; startup += 1) {
  const server = startServer(0, '127.0.0.1')
  try {
    const baseUrl = `http://127.0.0.1:${server.port}`
    const headers = { Authorization: `Bearer ${process.env.SCIX_LOCAL_ACCESS_TOKEN}` }
    const response = await fetch(`${baseUrl}/api/skills?cwd=${encodeURIComponent(process.env.HOME!)}`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    })
    const body = await response.json() as { skills: Array<{ name: string; source: string }> }
    const installed = body.skills.filter(skill => skill.source === 'bundled')
    const details = []
    for (const name of requestedNames) {
      const detailResponse = await fetch(`${baseUrl}/api/skills/detail?source=bundled&name=${name}`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      })
      const detail = await detailResponse.json() as {
        detail?: { files: Array<{ path: string; frontmatter?: { name: string } }> }
      }
      details.push({
        name,
        status: detailResponse.status,
        entrypointName: detail.detail?.files.find(file => file.path === 'SKILL.md')?.frontmatter?.name,
      })
    }
    snapshots.push({ status: response.status, installed, details })
  } finally {
    server.stop(true)
    await stopServerRuntimeForShutdown()
  }
}

console.log(`SKILLS_STARTUP_RESULT=${JSON.stringify(snapshots)}`)
