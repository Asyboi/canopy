import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyPreview,
  dismissSuggestion,
  fetchResults,
  getWorkspacePath,
  markApplied,
  triggerAnalyze,
} from '../lib/api'
import type { AnalysisResult, DiffResult } from '../lib/types'
import { POLL_INTERVAL_MS } from '../lib/constants'

export interface PendingDiff {
  featureId: string
  suggestionId: string
  diff: DiffResult
}

export interface UseAnalysisReturn {
  analysis: AnalysisResult | null
  loading: boolean
  error: string | null
  isAnalyzing: boolean
  consecutiveFailures: number
  pendingDiff: PendingDiff | null
  workspacePath: string
  reanalyze: () => Promise<void>
  openDiff: (featureId: string, suggestionId: string) => Promise<void>
  confirmApply: () => Promise<void>
  cancelDiff: () => void
  dismiss: (featureId: string, suggestionId: string) => Promise<void>
}

export function useAnalysis(): UseAnalysisReturn {
  const workspacePath = getWorkspacePath()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)
  const [pendingDiff, setPendingDiff] = useState<PendingDiff | null>(null)

  const lastGeneratedAt = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const poll = useCallback(async () => {
    if (!workspacePath || !mountedRef.current) return
    const controller = new AbortController()

    try {
      const result = await fetchResults(workspacePath, controller.signal)
      if (!mountedRef.current) return

      // Only update state if data actually changed
      if (result.generatedAt !== lastGeneratedAt.current) {
        lastGeneratedAt.current = result.generatedAt
        setAnalysis(result)
      }
      setError(null)
      setConsecutiveFailures(0)
      setLoading(false)
    } catch (err: unknown) {
      if (!mountedRef.current) return
      const e = err as { name?: string; status?: number; message?: string }
      if (e.name === 'AbortError') return

      setConsecutiveFailures((n) => n + 1)
      if (e.status === 404) {
        // No analysis yet — not an error, just empty
        setLoading(false)
        setAnalysis(null)
      } else {
        setError(e.message ?? 'Connection error')
        setLoading(false)
      }
    }

    if (mountedRef.current) {
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }
  }, [workspacePath])

  useEffect(() => {
    mountedRef.current = true
    poll()
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [poll])

  const reanalyze = useCallback(async () => {
    if (!workspacePath) return
    setIsAnalyzing(true)
    try {
      await triggerAnalyze(workspacePath)
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      if (e.status === 409) {
        // Already running — that's fine
      } else {
        setError(e.message ?? 'Failed to start analysis')
      }
    }
    // Reset poll timer so we pick up results sooner
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsAnalyzing(false)
      poll()
    }, 3000)
  }, [workspacePath, poll])

  const openDiff = useCallback(
    async (featureId: string, suggestionId: string) => {
      if (!workspacePath) return
      try {
        const diff = await applyPreview(workspacePath, featureId, suggestionId)
        setPendingDiff({ featureId, suggestionId, diff })
      } catch (err: unknown) {
        const e = err as { message?: string }
        setError(e.message ?? 'Failed to load diff')
      }
    },
    [workspacePath]
  )

  const confirmApply = useCallback(async () => {
    if (!pendingDiff || !workspacePath) return
    const { featureId, suggestionId } = pendingDiff
    setPendingDiff(null)
    try {
      await markApplied(workspacePath, featureId, suggestionId)
      // Force immediate re-poll to get updated state
      if (timerRef.current) clearTimeout(timerRef.current)
      await poll()
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message ?? 'Failed to apply suggestion')
    }
  }, [pendingDiff, workspacePath, poll])

  const cancelDiff = useCallback(() => setPendingDiff(null), [])

  const dismiss = useCallback(
    async (featureId: string, suggestionId: string) => {
      if (!workspacePath) return
      // Optimistic update
      setAnalysis((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          features: prev.features.map((f) =>
            f.id === featureId
              ? {
                  ...f,
                  suggestions: f.suggestions.map((s) =>
                    s.id === suggestionId ? { ...s, status: 'dismissed' as const } : s
                  ),
                }
              : f
          ),
        }
      })
      try {
        await dismissSuggestion(workspacePath, featureId, suggestionId)
      } catch (err: unknown) {
        const e = err as { message?: string }
        setError(e.message ?? 'Failed to dismiss suggestion')
        // Revert on failure
        if (timerRef.current) clearTimeout(timerRef.current)
        await poll()
      }
    },
    [workspacePath, poll]
  )

  return {
    analysis,
    loading,
    error,
    isAnalyzing,
    consecutiveFailures,
    pendingDiff,
    workspacePath,
    reanalyze,
    openDiff,
    confirmApply,
    cancelDiff,
    dismiss,
  }
}
