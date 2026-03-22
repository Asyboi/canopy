// @ts-check
(function () {
  const vscode = acquireVsCodeApi();
  const root = /** @type {HTMLElement} */ (document.getElementById('root'));

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'state') { render(msg.state); }
  });

  // ── Render dispatcher ────────────────────────────────────────────────────

  function render(state) {
    switch (state.kind) {
      case 'welcome':   renderWelcome(); break;
      case 'analyzing': renderAnalyzing(state.steps); break;
      case 'ready':     renderReady(state.features); break;
      case 'error':     renderError(state.message); break;
    }
  }

  // ── States ───────────────────────────────────────────────────────────────

  function renderWelcome() {
    root.innerHTML = `
      <div class="state-box">
        <div class="state-icon">🌿</div>
        <div class="state-message">Starting analysis…</div>
      </div>`;
  }

  function renderAnalyzing(steps) {
    const stepItems = steps.map((s, i) => {
      const isLast = i === steps.length - 1;
      const icon = s.done
        ? `<span class="step-check">✓</span>`
        : `<span class="step-spin"><div class="spinner" style="width:10px;height:10px;border-width:1.5px"></div></span>`;
      return `<li>${icon}<span class="step-text ${isLast && !s.done ? 'active' : ''}">${escHtml(s.message)}</span></li>`;
    }).join('');

    root.innerHTML = `
      <div class="analyzing-wrap">
        <div class="analyzing-header">
          <div class="spinner"></div>
          Analyzing…
        </div>
        ${steps.length > 0 ? `<ul class="step-list">${stepItems}</ul>` : ''}
      </div>`;
  }

  function renderReady(features) {
    if (!features || features.length === 0) {
      root.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🔍</div>
          <div class="state-message">No features detected.<br>Try a TypeScript or JavaScript project.</div>
        </div>`;
      return;
    }

    const totalElec = features.reduce((s, f) => s + f.sustainability.electricityKwh, 0);
    const totalCarbon = features.reduce((s, f) => s + f.sustainability.carbonKgCo2e, 0);
    const avgSci = features.reduce((s, f) => s + f.sustainability.sci.score, 0) / features.length;
    const pending = features.reduce((s, f) => s + f.suggestions.filter(sg => sg.status === 'suggested').length, 0);

    const sorted = [...features].sort(
      (a, b) => ({ high: 0, medium: 1, low: 2 }[a.sustainabilityTier] - { high: 0, medium: 1, low: 2 }[b.sustainabilityTier])
    );

    root.innerHTML = `
      <div class="summary-bar">
        <div class="summary-stat">
          <span class="stat-value accent-blue">${avgSci.toFixed(0)}</span>
          <span class="stat-label">SCI</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value accent-yellow">${totalElec.toFixed(1)}</span>
          <span class="stat-label">kWh</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value accent-green">${totalCarbon.toFixed(2)}</span>
          <span class="stat-label">kg CO₂</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value ${pending > 0 ? 'accent-red' : 'accent-green'}">${pending}</span>
          <span class="stat-label">Fixes</span>
        </div>
      </div>
      <div class="feature-list">
        ${sorted.map(featureCard).join('')}
      </div>`;

    root.querySelectorAll('[data-open-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        vscode.postMessage({
          type: 'openDiff',
          featureId: btn.getAttribute('data-feature-id'),
          suggestionId: btn.getAttribute('data-suggestion-id'),
        });
      });
    });
  }

  function renderError(message) {
    root.innerHTML = `
      <div class="state-box">
        <div class="state-icon">⚠️</div>
        <div class="state-message">${escHtml(message || 'Analysis failed')}</div>
        <button class="btn-retry" id="btn-retry">Re-analyze</button>
      </div>`;
    root.querySelector('#btn-retry')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'reanalyze' });
    });
  }

  // ── Feature card ─────────────────────────────────────────────────────────

  function featureCard(f) {
    const sci    = f.sustainability.sci.score.toFixed(0);
    const elec   = f.sustainability.electricityKwh.toFixed(1);
    const carbon = f.sustainability.carbonKgCo2e.toFixed(2);
    const tierLabel = { high: 'HIGH', medium: 'MED', low: 'LOW' }[f.sustainabilityTier];

    const pending   = f.suggestions.filter(s => s.status === 'suggested');
    const applied   = f.suggestions.filter(s => s.status === 'applied');
    const dismissed = f.suggestions.filter(s => s.status === 'dismissed');

    const suggestionsHtml = f.suggestions.length === 0 ? '' : `
      <div class="suggestions">
        ${pending.map(s => `
          <div class="suggestion-row">
            <span class="pattern-badge">${escHtml(s.patternType)}</span>
            <span class="suggestion-label">${escHtml(s.explanation)}</span>
            <button class="btn-view" data-open-diff
              data-feature-id="${escHtml(f.id)}"
              data-suggestion-id="${escHtml(s.id)}">View</button>
          </div>`).join('')}
        ${applied.map(s => `
          <div class="suggestion-row">
            <span class="pattern-badge">${escHtml(s.patternType)}</span>
            <span class="suggestion-label">${escHtml(s.explanation)}</span>
            <span class="applied-label">✓ Applied</span>
          </div>`).join('')}
        ${dismissed.map(s => `
          <div class="suggestion-row">
            <span class="pattern-badge">${escHtml(s.patternType)}</span>
            <span class="suggestion-label">${escHtml(s.explanation)}</span>
            <span class="dismissed-label">Dismissed</span>
          </div>`).join('')}
      </div>`;

    return `
      <div class="feature-card tier-${f.sustainabilityTier}">
        <div class="feature-header">
          <span class="feature-name">${escHtml(f.name)}</span>
          <span class="tier-pill">${tierLabel}</span>
        </div>
        <div class="feature-metrics">
          <span class="metric">SCI <strong>${sci}</strong></span>
          <span class="metric">⚡ <strong>${elec}</strong> kWh</span>
          <span class="metric">🌱 <strong>${carbon}</strong> kg</span>
        </div>
        ${suggestionsHtml}
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
