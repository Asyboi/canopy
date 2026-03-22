import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchResults, getWorkspacePath, triggerAnalyze } from '../lib/api'
import type { AnalysisResult } from '../lib/types'
import { POLL_INTERVAL_MS } from '../lib/constants'

export interface UseAnalysisReturn {
  analysis: AnalysisResult | null
  loading: boolean
  error: string | null
  isAnalyzing: boolean
  consecutiveFailures: number
  workspacePath: string
  reanalyze: () => Promise<void>
}

export function useAnalysis(): UseAnalysisReturn {
  const workspacePath = getWorkspacePath()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  const lastGeneratedAt = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const poll = useCallback(async () => {
    if (!workspacePath || !mountedRef.current) return

    try {
      const result = await fetchResults(workspacePath)
      if (!mountedRef.current) return

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
      if (e.status !== 409) {
        setError(e.message ?? 'Failed to start analysis')
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsAnalyzing(false)
      poll()
    }, 3000)
  }, [workspacePath, poll])

  return {
    analysis,
    loading,
    error,
    isAnalyzing,
    consecutiveFailures,
    workspacePath,
    reanalyze,
  }
}
