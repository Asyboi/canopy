import * as vscode from 'vscode';
import { AnalysisResult } from './types';

export class CanopyDashboardPanel {
  private static _instance: CanopyDashboardPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly _onReanalyze: () => void
  ) {
    this._panel = panel;
    this._panel.webview.html = this._getHtml(panel.webview, extensionUri);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage((msg: any) => {
      if (msg.type === 'reanalyze') {
        this._onReanalyze();
      }
      if (msg.type === 'openDiff') {
        vscode.commands.executeCommand('canopy.openDiff', msg.featureId, msg.suggestionId);
      }
    }, null, this._disposables);
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    results: AnalysisResult | null,
    onReanalyze: () => void
  ): CanopyDashboardPanel {
    if (CanopyDashboardPanel._instance) {
      CanopyDashboardPanel._instance._panel.reveal(vscode.ViewColumn.One);
      if (results) {
        CanopyDashboardPanel._instance.postResults(results);
      }
      return CanopyDashboardPanel._instance;
    }

    const panel = vscode.window.createWebviewPanel(
      'canopyDashboard',
      'Canopy Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview')],
        retainContextWhenHidden: true,
      }
    );

    CanopyDashboardPanel._instance = new CanopyDashboardPanel(panel, extensionUri, onReanalyze);
    if (results) {
      CanopyDashboardPanel._instance.postResults(results);
    }
    return CanopyDashboardPanel._instance;
  }

  static postResultsIfOpen(results: AnalysisResult): void {
    CanopyDashboardPanel._instance?.postResults(results);
  }

  static setAnalyzingIfOpen(): void {
    CanopyDashboardPanel._instance?._panel.webview.postMessage({ type: 'analyzing' });
  }

  postResults(results: AnalysisResult): void {
    this._panel.webview.postMessage({ type: 'update', results });
  }

  dispose(): void {
    CanopyDashboardPanel._instance = undefined;
    this._panel.dispose();
    for (const d of this._disposables) { d.dispose(); }
    this._disposables = [];
  }

  private _getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'webview', 'dashboard', 'dashboard.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'webview', 'dashboard', 'styles.css')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Canopy Dashboard</title>
</head>
<body>
  <div id="root">
    <div id="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading analysis results...</p>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
