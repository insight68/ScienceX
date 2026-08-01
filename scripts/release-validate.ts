#!/usr/bin/env bun

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export type ReleaseValidationOptions = {
  rootDir: string
  eventName: string
  refName: string
  refType: string
  defaultBranch: string
}

export type ReleaseValidationResult = {
  version: string
  tag: string
  notesPath: string
}

const stableVersionPattern = /^\d+\.\d+\.\d+$/

export function validateReleaseSource({
  rootDir,
  eventName,
  refName,
  refType,
  defaultBranch,
}: ReleaseValidationOptions): ReleaseValidationResult {
  const desktopPackagePath = path.join(rootDir, 'desktop', 'package.json')
  const desktopPackage = JSON.parse(readFileSync(desktopPackagePath, 'utf8')) as {
    version?: unknown
  }
  const version = desktopPackage.version

  if (typeof version !== 'string' || !stableVersionPattern.test(version)) {
    throw new Error(
      `desktop/package.json must contain a stable x.y.z version, received: ${String(version)}`,
    )
  }

  const tag = `v${version}`
  const notesPath = `release-notes/${tag}.md`
  const absoluteNotesPath = path.join(rootDir, notesPath)
  if (!existsSync(absoluteNotesPath)) {
    throw new Error(`Missing release notes: ${notesPath}`)
  }
  if (readFileSync(absoluteNotesPath, 'utf8').trim().length === 0) {
    throw new Error(`Release notes must not be empty: ${notesPath}`)
  }

  if (eventName === 'push') {
    if (refType !== 'tag' || refName !== tag) {
      throw new Error(
        `Release tag ${refName || '(missing)'} must match desktop/package.json (${tag})`,
      )
    }
  } else if (eventName === 'workflow_dispatch') {
    if (refType !== 'branch' || refName !== defaultBranch) {
      throw new Error(
        `Manual releases must run from the default branch ${defaultBranch}, received ${refType || '(missing)'} ${refName || '(missing)'}`,
      )
    }
  } else {
    throw new Error(`Unsupported release event: ${eventName || '(missing)'}`)
  }

  return { version, tag, notesPath }
}

if (import.meta.main) {
  const rootDir = path.resolve(import.meta.dir, '..')
  try {
    const result = validateReleaseSource({
      rootDir,
      eventName: process.env.GITHUB_EVENT_NAME ?? '',
      refName: process.env.GITHUB_REF_NAME ?? '',
      refType: process.env.GITHUB_REF_TYPE ?? '',
      defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? '',
    })

    process.stdout.write([
      `version=${result.version}`,
      `tag=${result.tag}`,
      `notes_path=${result.notesPath}`,
      '',
    ].join('\n'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[release-validate] ${message}`)
    process.exit(1)
  }
}
