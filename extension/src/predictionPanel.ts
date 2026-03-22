import * as vscode from 'vscode';
import { FeaturePrediction } from './types';

export class CanopyPredictionPanel {
  public static currentPanel: CanopyPredictionPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;

  static createOrShow(extensionUri: vscode.Uri, prediction: FeaturePrediction) {
    if (CanopyPredictionPanel.currentPanel) {
      CanopyPredictionPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      CanopyPredictionPanel.currentPanel._update(prediction);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'canopyPrediction',
      `✨ Canopy Predict`,
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );
    CanopyPredictionPanel.currentPanel = new CanopyPredictionPanel(panel, prediction);
  }

  private constructor(panel: vscode.WebviewPanel, prediction: FeaturePrediction) {
    this._panel = panel;
    this._update(prediction);
    panel.webview.onDidReceiveMessage(async msg => {
      if (msg.type === 'applyGreenerCode') {
        const skeleton = msg.codeSkeleton as string;
        const featureName = msg.featureName as string;

        const document = await vscode.workspace.openTextDocument({
          language: 'typescript',
          content: skeleton
        });

        await vscode.window.showTextDocument(document, {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: false
        });

        vscode.window.showInformationMessage(
          `✅ Canopy: Greener implementation for "${featureName}" is ready — save it to your project.`
        );
      }
    });
    this._panel.onDidDispose(() => {
      CanopyPredictionPanel.currentPanel = undefined;
    });
  }

  private _update(p: FeaturePrediction) {
    this._panel.title = `✨ ${p.featureName}`;
    this._panel.webview.html = this._getHtml(p);
  }

  private _getHtml(p: FeaturePrediction): string {
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const patternColors: Record<string, string> = {
      POLLING: '#ef4444',
      N_PLUS_ONE: '#f97316',
      SYNC_BLOCKING: '#eab308',
    };
    const patternLabels: Record<string, string> = {
      POLLING: '🔄 Polling',
      N_PLUS_ONE: '🗄️ N+1 Queries',
      SYNC_BLOCKING: '⚡ Sync Blocking',
    };

    const patternBadges = p.identifiedPatterns
      .map(
        (pat) =>
          `<span style="background:${patternColors[pat]}22;color:${patternColors[pat]};border-radius:3px;padding:2px 8px;font-size:11px;margin-right:4px">${patternLabels[pat] ?? pat}</span>`
      )
      .join('');

    const savingsColor = p.savingsPercent >= 30 ? '#22c55e' : '#eab308';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family); font-size: 13px; color: var(--vscode-foreground); padding: 20px; margin: 0; background: var(--vscode-editor-background); }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 16px; }
  .patterns { margin-bottom: 12px; }
  .explanation { font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 6px; margin-bottom: 16px; line-height: 1.5; }
  .savings-banner { padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-weight: 600; font-size: 13px; background: ${savingsColor}18; border: 1px solid ${savingsColor}; color: ${savingsColor}; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .card { background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 6px; padding: 14px; }
  .card.original { border-top: 3px solid #ef4444; }
  .card.greener { border-top: 3px solid #22c55e; }
  .card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--vscode-descriptionForeground); margin-bottom: 6px; }
  .card-name { font-size: 13px; font-weight: 600; margin-bottom: 10px; }
  .sci-score { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 2px; }
  .sci-unit { font-size: 10px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
  .stat { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; border-bottom: 1px solid var(--vscode-panel-border); }
  .stat:last-child { border-bottom: none; }
  .code-header { font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #22c55e; }
  pre { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 12px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.5; }
  .predicted-label { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 12px; font-style: italic; }
</style>
</head>
<body>
  <h1>✨ ${esc(p.featureName)}</h1>
  <p class="subtitle">${esc(p.description)}</p>

  ${
    p.identifiedPatterns.length > 0
      ? `<div class="patterns">${patternBadges}</div>
  <p class="explanation">${esc(p.patternExplanation)}</p>`
      : ''
  }

  <div class="savings-banner">
    🌿 Greener alternative reduces sustainability cost by ~${p.savingsPercent}%
  </div>

  <div class="grid">
    <div class="card original">
      <div class="card-label">As Described</div>
      <div class="card-name">${esc(p.featureName)}</div>
      <div class="sci-score">${p.sustainability.sci.score.toFixed(0)}</div>
      <div class="sci-unit">${esc(p.sustainability.sci.unit)}</div>
      <div class="stat"><span>⚡ Electricity</span><span>${p.sustainability.electricityKwh.toFixed(1)} kWh/mo</span></div>
      <div class="stat"><span>🌱 Carbon</span><span>${p.sustainability.carbonKgCo2e.toFixed(2)} kg CO₂e/mo</span></div>
    </div>
    <div class="card greener">
      <div class="card-label">🌿 Greener Alternative</div>
      <div class="card-name">${esc(p.greenerAlternative.featureName)}</div>
      <div class="sci-score">${p.greenerAlternative.sustainability.sci.score.toFixed(0)}</div>
      <div class="sci-unit">${esc(p.greenerAlternative.sustainability.sci.unit)}</div>
      <div class="stat"><span>⚡ Electricity</span><span>${p.greenerAlternative.sustainability.electricityKwh.toFixed(1)} kWh/mo</span></div>
      <div class="stat"><span>🌱 Carbon</span><span>${p.greenerAlternative.sustainability.carbonKgCo2e.toFixed(2)} kg CO₂e/mo</span></div>
    </div>
  </div>

  <div class="code-header">💡 ${esc(p.greenerAlternative.featureName)} — suggested implementation</div>
  <pre>${esc(p.greenerAlternative.codeSkeleton)}</pre>

  <div style="margin-top: 16px; text-align: center;">
    <button id="btn-apply-greener" style="
      padding: 10px 24px;
      background: #22c55e;
      color: #000;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    ">
      ⚡ Apply Greener Code to Project
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btn-apply-greener').addEventListener('click', () => {
      vscode.postMessage({
        type: 'applyGreenerCode',
        codeSkeleton: ${JSON.stringify(p.greenerAlternative.codeSkeleton)},
        featureName: ${JSON.stringify(p.greenerAlternative.featureName)}
      });
    });
  </script>

  <p class="predicted-label">⚠️ These are predicted estimates based on the feature description, not measured values.</p>
</body>
</html>`;
  }
}
