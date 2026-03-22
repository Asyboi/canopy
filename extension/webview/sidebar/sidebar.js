// @ts-check
(function () {
  const vscode = acquireVsCodeApi();
  const root = /** @type {HTMLElement} */ (document.getElementById('root'));

  // ── Smooth progress bar ───────────────────────────────────────────────
  let _displayPct = 0;
  let _targetPct  = 0;
  let _rafId      = 0;

  function setTargetPct(pct) {
    _targetPct = pct;
    if (!_rafId) { _rafId = requestAnimationFrame(_tickProgress); }
  }

  function _tickProgress() {
    const diff = _targetPct - _displayPct;
    if (Math.abs(diff) < 0.1) {
      _displayPct = _targetPct;
      _rafId = 0;
    } else {
      _displayPct += diff * 0.04;   // ease toward target ~2-3s per jump
      _rafId = requestAnimationFrame(_tickProgress);
    }
    const fill = /** @type {HTMLElement|null} */ (document.getElementById('scan-fill'));
    const pctEl = document.getElementById('scan-pct-label');
    if (fill)  { fill.style.width = _displayPct.toFixed(2) + '%'; }
    if (pctEl) { pctEl.textContent = Math.round(_displayPct) + '%'; }
  }

  function resetProgress() {
    cancelAnimationFrame(_rafId);
    _rafId = 0;
    _displayPct = 0;
    _targetPct  = 0;
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'state') { render(msg.state); }
  });

  // ── Render dispatcher ─────────────────────────────────────────────────

  function render(state) {
    switch (state.kind) {
      case 'welcome':   renderWelcome(); break;
      case 'analyzing': renderAnalyzing(state.steps, state.currentStep, state.percent); break;
      case 'ready':     renderReady(state.features); break;
      case 'error':     renderError(state.message); break;
    }
  }

  // ── States ────────────────────────────────────────────────────────────

  function renderWelcome() {
    resetProgress();
    root.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">CANOPY — Codebase Features</div>
      </div>
      <div class="state-box">
        <div class="state-icon">🌿</div>
        <div class="state-message">Starting analysis…</div>
      </div>`;
  }

  const PIPELINE = [
    'Dependency graph',
    'Git co-change clustering',
    'Merging clusters',
    'Labeling features',
    'Scoring complexity',
    'Sustainability metrics',
    'Detecting patterns',
    'Generating suggestions',
  ];

  function renderAnalyzing(steps, currentStep, percent) {
    const pct = Math.max(0, Math.min(100, percent || 0));
    const activeIdx = (currentStep || 1) - 1;

    const pipelineRows = PIPELINE.map((label, i) => {
      const num = String(i + 1).padStart(2, '0');
      if (i < activeIdx) {
        return `
          <div class="pipe-row done">
            <span class="pipe-num">${num}</span>
            <span class="pipe-check">✓</span>
            <span class="pipe-label">${escHtml(label)}</span>
          </div>`;
      } else if (i === activeIdx) {
        return `
          <div class="pipe-row current">
            <span class="pipe-num">${num}</span>
            <span class="pipe-spin"><div class="spinner"></div></span>
            <span class="pipe-label">${escHtml(label)}<span class="cursor">▋</span></span>
          </div>`;
      } else {
        return `
          <div class="pipe-row pending">
            <span class="pipe-num">${num}</span>
            <span class="pipe-dot">·</span>
            <span class="pipe-label">${escHtml(label)}</span>
          </div>`;
      }
    }).join('');

    root.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">CANOPY — Codebase Features</div>
      </div>
      <div class="scan-wrap">
        <div class="scan-bar-track">
          <div class="scan-bar-fill" id="scan-fill" style="width:${_displayPct.toFixed(2)}%"></div>
        </div>
        <div class="scan-meta">
          <span class="scan-status">SCANNING</span>
          <span class="scan-pct" id="scan-pct-label">${Math.round(_displayPct)}%</span>
        </div>
        <div class="scan-pipeline">${pipelineRows}</div>
      </div>`;

    setTargetPct(pct);
  }

  function renderReady(features) {
    resetProgress();
    if (!features || features.length === 0) {
      root.innerHTML = `
        <div class="panel-header">
          <div class="panel-title">CANOPY — Codebase Features</div>
        </div>
        <div class="state-box">
          <div class="state-icon">🔍</div>
          <div class="state-message">No features detected.<br>Open a TypeScript or JavaScript project.</div>
        </div>`;
      return;
    }

    const allSuggestions = features.flatMap(f =>
      f.suggestions
        .filter(s => s.status === 'suggested')
        .map(s => ({ ...s, featureName: f.name, featureId: f.id }))
    );

    root.innerHTML = `
      <div class="tab-bar">
        <button class="tab-btn active" data-tab="features">
          Features <span class="tab-count">${features.length}</span>
        </button>
        <button class="tab-btn" data-tab="suggestions">
          Suggestions <span class="tab-count ${allSuggestions.length > 0 ? 'tab-count-highlight' : ''}">${allSuggestions.length}</span>
        </button>
      </div>
      <div id="tab-features" class="tab-panel"></div>
      <div id="tab-suggestions" class="tab-panel" style="display:none"></div>
    `;

    renderFeaturesTab(features, root.querySelector('#tab-features'));
    renderSuggestionsTab(allSuggestions, root.querySelector('#tab-suggestions'));

    root.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        root.querySelectorAll('.tab-panel').forEach(p => { /** @type {HTMLElement} */ (p).style.display = 'none'; });
        btn.classList.add('active');
        const tabId = /** @type {HTMLElement} */ (btn).dataset.tab;
        const panel = /** @type {HTMLElement|null} */ (root.querySelector(`#tab-${tabId}`));
        if (panel) { panel.style.display = 'block'; }
      });
    });
  }

  function renderFeaturesTab(features, container) {
    const sorted = [...features].sort(
      (a, b) => ({ high: 0, medium: 1, low: 2 }[a.sustainabilityTier] - { high: 0, medium: 1, low: 2 }[b.sustainabilityTier])
    );

    const totalPending = features.reduce(
      (n, f) => n + f.suggestions.filter(s => s.status === 'suggested').length, 0
    );

    const metaLine =
      `${features.length} FEATURE${features.length !== 1 ? 'S' : ''}` +
      (totalPending > 0 ? ` · ${totalPending} PENDING FIX${totalPending !== 1 ? 'ES' : ''}` : ' · ALL CLEAR');

    container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">CANOPY — Codebase Features</div>
        <div class="panel-meta">${escHtml(metaLine)}</div>
      </div>
      <button class="btn-dashboard" id="btn-dashboard">
        <span class="btn-dashboard-icon">🌐</span> Open Dashboard
      </button>
      <div class="feature-list">
        ${sorted.map(featureRow).join('')}
      </div>`;

    container.querySelector('#btn-dashboard')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'openDashboard' });
    });

    container.querySelectorAll('.feature-row[data-feature-id]').forEach(row => {
      row.addEventListener('click', () => {
        container.querySelectorAll('.feature-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');

        const featureId = row.getAttribute('data-feature-id');
        const suggestionId = row.getAttribute('data-suggestion-id');
        if (featureId && suggestionId) {
          vscode.postMessage({ type: 'openDiff', featureId, suggestionId });
        }
      });
    });
  }

  function renderSuggestionsTab(suggestions, container) {
    if (suggestions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <div class="empty-title">No suggestions</div>
          <div class="empty-desc">Run an analysis to detect inefficiency patterns</div>
        </div>
      `;
      return;
    }

    const groups = {
      POLLING:       suggestions.filter(s => s.patternType === 'POLLING'),
      N_PLUS_ONE:    suggestions.filter(s => s.patternType === 'N_PLUS_ONE'),
      SYNC_BLOCKING: suggestions.filter(s => s.patternType === 'SYNC_BLOCKING')
    };

    const patternMeta = {
      POLLING:       { label: 'Polling',       icon: '🔄' },
      N_PLUS_ONE:    { label: 'N+1 Queries',   icon: '🗄️' },
      SYNC_BLOCKING: { label: 'Sync Blocking', icon: '⚡' }
    };

    let html = '';

    for (const [patternType, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      const meta = patternMeta[patternType];

      html += `
        <div class="suggestion-group">
          <div class="suggestion-group-header">
            <span class="suggestion-group-icon">${meta.icon}</span>
            <span class="suggestion-group-label">${meta.label}</span>
            <span class="suggestion-group-count">${items.length}</span>
          </div>
          ${items.map(s => `
            <div class="suggestion-card" data-feature-id="${escHtml(s.featureId)}" data-suggestion-id="${escHtml(s.id)}">
              <div class="suggestion-feature-name">${escHtml(s.featureName)}</div>
              <div class="suggestion-explanation">${escHtml(s.explanation)}</div>
              <div class="suggestion-footer">
                <span class="suggestion-savings">−${escHtml(String(s.estimatedSavingsPercent))}% energy</span>
                <button class="btn-fix" data-feature-id="${escHtml(s.featureId)}" data-suggestion-id="${escHtml(s.id)}">
                  View Fix →
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    container.innerHTML = html;

    container.querySelectorAll('.btn-fix').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        vscode.postMessage({
          type: 'openDiff',
          featureId: btn.dataset.featureId,
          suggestionId: btn.dataset.suggestionId
        });
      });
    });
  }

  function renderError(message) {
    root.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">CANOPY — Codebase Features</div>
      </div>
      <button class="btn-dashboard" id="btn-dashboard">
        <span class="btn-dashboard-icon">🌐</span> Open Dashboard
      </button>
      <div class="state-box">
        <div class="state-icon">⚠</div>
        <div class="state-message">${escHtml(message || 'Analysis failed')}</div>
        <button class="btn-retry" id="btn-retry">Re-analyze</button>
      </div>`;
    root.querySelector('#btn-dashboard').addEventListener('click', () => {
      vscode.postMessage({ type: 'openDashboard' });
    });
    root.querySelector('#btn-retry')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'reanalyze' });
    });
  }

  // ── Feature row ───────────────────────────────────────────────────────

  function featureRow(f) {
    const dotClass = { high: 'dot-red', medium: 'dot-orange', low: 'dot-green' }[f.sustainabilityTier];
    const co2Class = { high: 'co2-high', medium: 'co2-mid', low: 'co2-low' }[f.sustainabilityTier];

    const grams = Math.round(f.sustainability.carbonKgCo2e * 1000);

    const pending = f.suggestions.filter(s => s.status === 'suggested');
    const firstPending = pending[0];

    const badge = pending.length > 0
      ? `<span class="issue-badge">${pending.length}</span>`
      : '';

    return `
      <div class="feature-row"
        data-feature-id="${escHtml(f.id)}"
        ${firstPending ? `data-suggestion-id="${escHtml(firstPending.id)}"` : ''}>
        <span class="dot ${dotClass}"></span>
        <span class="feature-name">${escHtml(f.name)}</span>
        <span class="feature-right">
          ${badge}
          <span class="co2 ${co2Class}">${grams}&nbsp;gCO<sup>2</sup></span>
        </span>
      </div>`;
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
