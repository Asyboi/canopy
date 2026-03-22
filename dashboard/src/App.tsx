import { useState } from 'react'
import { useAnalysis } from './hooks/useAnalysis'
import Header from './components/Header'
import SciHero from './components/SciHero'
import FeatureList from './components/FeatureList'
import GraphPanel from './components/GraphPanel'
import RightPanel from './components/RightPanel'
import EquivalentsPopup from './components/EquivalentsPopup'
import LandingPage from './components/LandingPage'
import type { Feature } from './lib/types'

export default function App() {
  const { analysis, loading, error, consecutiveFailures, workspacePath, isAnalyzing, reanalyze } = useAnalysis()
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)

  // Show landing page when no workspace is specified
  if (!workspacePath) return <LandingPage />

  const selectedFeature: Feature | null =
    analysis?.features.find((f) => f.id === selectedFeatureId) ?? null

  const handleSelectFeatureFromGraph = (id: string) => {
    setSelectedFeatureId(id)
  }

  const handleSelectFeatureFromList = (id: string) => {
    setSelectedFeatureId(id)
    setPopupOpen(true)
  }

  const handleClosePopup = () => {
    setPopupOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-canopy-bg text-canopy-text">
      <Header
        ctx={{ analysis, isAnalyzing, reanalyze, workspacePath }}
      />

      {/* Connection lost banner */}
      {consecutiveFailures >= 3 && (
        <div className="bg-red-900/40 border-b border-red-700/50 px-4 py-2 text-sm text-red-300 text-center flex-shrink-0">
          Connection lost — retrying…
        </div>
      )}

      {/* Loading */}
      {workspacePath && loading && (
        <div className="flex flex-1 items-center justify-center text-canopy-muted text-sm">
          <div className="text-center">
            <div className="animate-pulse text-canopy-accent text-4xl mb-3">🌿</div>
            <p>Loading analysis…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {workspacePath && !loading && error && !analysis && (
        <div className="flex flex-1 items-center justify-center text-canopy-muted text-sm">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-400">{error}</p>
            <p className="mt-2 text-xs">Make sure the Canopy server is running.</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {workspacePath && !loading && !error && !analysis && (
        <div className="flex flex-1 items-center justify-center text-canopy-muted text-sm">
          <div className="text-center">
            <div className="text-4xl mb-3">🌱</div>
            <p>No analysis yet.</p>
            <p className="mt-1 text-xs">Click "Re-analyze" to scan your workspace.</p>
          </div>
        </div>
      )}

      {/* Main layout */}
      {workspacePath && analysis && (
        <>
          {/* SCI Hero bar */}
          <SciHero sciTotals={analysis.sciTotals} totals={analysis.totals} />

          {/* Three-column body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Feature list */}
            <div className="w-72 flex-shrink-0 flex flex-col overflow-y-auto border-r border-canopy-border p-3">
              <FeatureList
                features={analysis.features}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={handleSelectFeatureFromList}
              />
            </div>

            {/* Center: Graph */}
            <div className="flex-1 overflow-hidden">
              <GraphPanel
                analysis={analysis}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={handleSelectFeatureFromGraph}
              />
            </div>

            {/* Right: Tabbed panel */}
            <div className="w-80 flex-shrink-0 flex flex-col border-l border-canopy-border overflow-hidden">
              <RightPanel
                analysis={analysis}
                selectedFeature={selectedFeature}
              />
            </div>
          </div>
        </>
      )}

      {/* Equivalents popup (portal-like, rendered at root) */}
      {popupOpen && selectedFeature && (
        <EquivalentsPopup feature={selectedFeature} onClose={handleClosePopup} />
      )}
    </div>
  )
}
