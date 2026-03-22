// @ts-check
(function () {
  const vscode = acquireVsCodeApi();

  const root = /** @type {HTMLElement} */ (document.getElementById('root'));

  // ── Message handling ─────────────────────────────────────────────────────

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'update') {
      render(msg.results);
    } else if (msg.type === 'analyzing') {
      showAnalyzing();
    }
  });

  // ── Analyzing state ──────────────────────────────────────────────────────

  function showAnalyzing() {
    root.innerHTML = `
      <div class="analyzing-state">
        <div class="spinner"></div>
        <p>Analyzing codebase...</p>
      </div>`;
  }

  // ── Main render ──────────────────────────────────────────────────────────

  /**
   * @param {import('../../src/types').AnalysisResult} results
   */
  function render(results) {
    const { features, totals, history, generatedAt, workspacePath } = results;

    const pendingCount = features.reduce(
      (n, f) => n + f.suggestions.filter((s) => s.status === 'suggested').length,
      0
    );

    const workspaceName = workspacePath.split('/').pop() || workspacePath;
    const date = new Date(generatedAt).toLocaleString();

    const sorted = [...features].sort(
      (a, b) =>
        ({ high: 0, medium: 1, low: 2 }[a.sustainabilityTier] -
          { high: 0, medium: 1, low: 2 }[b.sustainabilityTier])
    );

    root.innerHTML = `
      <div class="dashboard">
        ${topbar(workspaceName, date)}
        <div class="content">
          ${summaryRow(totals, pendingCount)}
          ${featuresSection(sorted)}
          ${historySection(history)}
        </div>
      </div>`;

    // Wire up buttons after render
    root.querySelector('#btn-reanalyze')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'reanalyze' });
      showAnalyzing();
    });

    root.querySelectorAll('[data-open-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const featureId = btn.getAttribute('data-feature-id');
        const suggestionId = btn.getAttribute('data-suggestion-id');
        vscode.postMessage({ type: 'openDiff', featureId, suggestionId });
      });
    });
  }

  // ── Component helpers ────────────────────────────────────────────────────

  function topbar(workspaceName, date) {
    return `
      <div class="topbar">
        <div class="topbar-left">
          <span class="topbar-title">🌿 Canopy</span>
          <span class="topbar-meta">${escHtml(workspaceName)} &mdash; ${escHtml(date)}</span>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-primary" id="btn-reanalyze">Re-analyze</button>
        </div>
      </div>`;
  }

  /**
   * @param {import('../../src/types').AnalysisResult['totals']} totals
   * @param {number} pendingCount
   */
  function summaryRow(totals, pendingCount) {
    const sci = totals.sci.averageScore.toFixed(1);
    const elec = totals.electricityKwh.toFixed(2);
    const carbon = totals.carbonKgCo2e.toFixed(3);

    return `
      <div class="summary-row">
        <div class="summary-card accent-blue">
          <div class="summary-card-label">Avg SCI Score</div>
          <div class="summary-card-value">${sci}</div>
          <div class="summary-card-unit">${escHtml(totals.sci.unit)}</div>
        </div>
        <div class="summary-card accent-yellow">
          <div class="summary-card-label">Electricity</div>
          <div class="summary-card-value">${elec}</div>
          <div class="summary-card-unit">kWh / month</div>
        </div>
        <div class="summary-card accent-green">
          <div class="summary-card-label">Carbon</div>
          <div class="summary-card-value">${carbon}</div>
          <div class="summary-card-unit">kg CO₂e / month</div>
        </div>
        <div class="summary-card ${pendingCount > 0 ? 'accent-red' : 'accent-green'}">
          <div class="summary-card-label">Suggestions</div>
          <div class="summary-card-value">${pendingCount}</div>
          <div class="summary-card-unit">${pendingCount === 1 ? 'pending' : 'pending'}</div>
        </div>
      </div>`;
  }

  /**
   * @param {import('../../src/types').Feature[]} features
   */
  function featuresSection(features) {
    if (features.length === 0) {
      return `
        <div class="section-header">Features</div>
        <div class="empty-state">No features detected. Try opening a TypeScript/JavaScript project.</div>`;
    }

    return `
      <div class="section-header">Features (${features.length})</div>
      <div class="feature-list">
        ${features.map(featureCard).join('')}
      </div>`;
  }

  /**
   * @param {import('../../src/types').Feature} f
   */
  function featureCard(f) {
    const tierLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[f.sustainabilityTier];
    const sci = f.sustainability.sci.score.toFixed(1);
    const elec = f.sustainability.electricityKwh.toFixed(2);
    const carbon = f.sustainability.carbonKgCo2e.toFixed(3);
    const loc = f.metrics.loc.toLocaleString();

    const pendingSuggestions = f.suggestions.filter((s) => s.status === 'suggested');
    const otherSuggestions = f.suggestions.filter((s) => s.status !== 'suggested');

    const suggestionsHtml = f.suggestions.length === 0
      ? ''
      : `<div class="suggestions">
          ${pendingSuggestions.map((s) => suggestionRow(f.id, s, true)).join('')}
          ${otherSuggestions.map((s) => suggestionRow(f.id, s, false)).join('')}
        </div>`;

    return `
      <div class="feature-card tier-${f.sustainabilityTier}">
        <div class="feature-top">
          <div class="feature-name">
            <div class="tier-dot"></div>
            ${escHtml(f.name)}
          </div>
          <span style="font-size:11px;color:var(--vscode-descriptionForeground)">${tierLabel}</span>
        </div>
        <div class="feature-metrics">
          <div class="feature-metric">SCI <span>${sci} ${escHtml(f.sustainability.sci.unit)}</span></div>
          <div class="feature-metric">⚡ <span>${elec} kWh</span></div>
          <div class="feature-metric">🌱 <span>${carbon} kg CO₂e</span></div>
          <div class="feature-metric">LOC <span>${loc}</span></div>
        </div>
        ${suggestionsHtml}
      </div>`;
  }

  /**
   * @param {string} featureId
   * @param {import('../../src/types').Suggestion} s
   * @param {boolean} isPending
   */
  function suggestionRow(featureId, s, isPending) {
    const savingsText = `~${s.estimatedSavingsPercent}% savings`;

    if (!isPending) {
      const statusLabel = s.status === 'applied' ? '✅ Applied' : '— Dismissed';
      return `
        <div class="suggestion-row">
          <div class="suggestion-info">
            <span class="suggestion-badge">${escHtml(s.patternType)}</span>
            <span class="suggestion-explanation">${escHtml(s.explanation)}</span>
          </div>
          <span class="suggestion-status">${statusLabel}</span>
        </div>`;
    }

    return `
      <div class="suggestion-row">
        <div class="suggestion-info">
          <span class="suggestion-badge">${escHtml(s.patternType)}</span>
          <span class="suggestion-explanation">${escHtml(s.explanation)}</span>
          <span class="suggestion-savings">${savingsText}</span>
        </div>
        <div class="suggestion-actions">
          <button
            class="btn btn-primary"
            data-open-diff
            data-feature-id="${escHtml(featureId)}"
            data-suggestion-id="${escHtml(s.id)}"
          >View</button>
        </div>
      </div>`;
  }

  /**
   * @param {import('../../src/types').HistoryEntry[]} history
   */
  function historySection(history) {
    if (!history || history.length === 0) {
      return '';
    }

    const rows = [...history]
      .reverse()
      .slice(0, 20)
      .map(
        (h) => `
        <tr>
          <td>${escHtml(h.featureName)}</td>
          <td>${escHtml(h.patternType)}</td>
          <td class="history-savings">-${h.savingsElectricityKwh.toFixed(3)} kWh</td>
          <td class="history-savings">-${h.savingsCarbonKgCo2e.toFixed(4)} kg CO₂e</td>
          <td style="color:var(--vscode-descriptionForeground);font-size:11px">${new Date(h.appliedAt).toLocaleDateString()}</td>
        </tr>`
      )
      .join('');

    return `
      <div class="history-section">
        <div class="section-header">Applied History (${history.length})</div>
        <table class="history-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Pattern</th>
              <th>Elec Saved</th>
              <th>Carbon Saved</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ── Utilities ────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
