import type { AnalysisResult, DiffResult } from './types'

// workspacePath is read from ?workspacePath= URL param
export function getWorkspacePath(): string {
  return new URLSearchParams(window.location.search).get('workspacePath') ?? ''
}

// Base URL: in prod we're served from the same Express server, so relative paths work.
// In dev (Vite proxy), also relative.
const BASE = ''

async function post<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status })
  }
  return res.json() as Promise<T>
}

export async function fetchResults(
  workspacePath: string,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  const res = await fetch(
    `${BASE}/results?workspacePath=${encodeURIComponent(workspacePath)}`,
    { signal }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status })
  }
  return res.json() as Promise<AnalysisResult>
}

export async function triggerAnalyze(workspacePath: string): Promise<void> {
  await post('/analyze', { workspacePath })
}

export async function applyPreview(
  workspacePath: string,
  featureId: string,
  suggestionId: string
): Promise<DiffResult> {
  return post('/apply-suggestion', { workspacePath, featureId, suggestionId })
}

export async function markApplied(
  workspacePath: string,
  featureId: string,
  suggestionId: string,
  files?: { path: string; newContent: string }[]
): Promise<void> {
  await post('/mark-applied', { workspacePath, featureId, suggestionId, files })
}

export async function dismissSuggestion(
  workspacePath: string,
  featureId: string,
  suggestionId: string
): Promise<void> {
  await post('/dismiss-suggestion', { workspacePath, featureId, suggestionId })
}
