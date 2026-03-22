import { useState, useEffect } from 'react'
import type { AnalysisResult, Feature } from '../lib/types'
import FeatureDetailPanel from './FeatureDetailPanel'
import HistoryFeed from './HistoryFeed'
import MethodologyPanel from './MethodologyPanel'

interface Props {
  analysis: AnalysisResult
  selectedFeature: Feature | null
}

type Tab = 'detail' | 'history' | 'methodology'

export default function RightPanel({ analysis, selectedFeature }: Props) {
  const [tab, setTab] = useState<Tab>('detail')

  // Auto-switch to detail when a feature is first selected
  useEffect(() => {
    if (selectedFeature) setTab('detail')
  }, [selectedFeature?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const historyCount = analysis.history.length

  const tabs: { id: Tab; label: string; badge?: number; disabled?: boolean }[] = [
    {
      id: 'detail',
      label: 'Detail',
      disabled: !selectedFeature,
    },
    {
      id: 'history',
      label: 'History',
      badge: historyCount > 0 ? historyCount : undefined,
    },
    {
      id: 'methodology',
      label: 'Method',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-canopy-border flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-colors
              ${tab === t.id
                ? 'text-canopy-accent border-b-2 border-canopy-accent'
                : t.disabled
                  ? 'text-canopy-muted/30 cursor-not-allowed'
                  : 'text-canopy-muted hover:text-canopy-secondary'
              }`}
          >
            {t.label}
            {t.badge != null && (
              <span className="ml-1.5 bg-canopy-accent/20 text-canopy-accent rounded-full px-1.5 py-0.5 text-[9px]">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'detail' && (
          <FeatureDetailPanel feature={selectedFeature} history={analysis.history} />
        )}
        {tab === 'history' && (
          <HistoryFeed history={analysis.history} />
        )}
        {tab === 'methodology' && (
          <MethodologyPanel />
        )}
      </div>
    </div>
  )
}
