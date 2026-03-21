import * as vscode from 'vscode';
import { Feature } from './types';

export class CanopyGraphPanel {
  public static currentPanel: CanopyGraphPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _baseUrl: string;
  private readonly _workspacePath: string;

  static createOrShow(extensionUri: vscode.Uri, baseUrl: string, workspacePath: string, focusFeatureId?: string) {
    if (CanopyGraphPanel.currentPanel) {
      CanopyGraphPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      if (focusFeatureId) {
        CanopyGraphPanel.currentPanel._panel.webview.postMessage({ type: 'focusNode', featureId: focusFeatureId });
      }
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      'canopyGraph', 'Canopy Graph', vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'out'),
          vscode.Uri.joinPath(extensionUri, 'webview'),
          vscode.Uri.joinPath(extensionUri, 'node_modules', 'd3', 'dist'),
        ],
      }
    );
    CanopyGraphPanel.currentPanel = new CanopyGraphPanel(panel, extensionUri, baseUrl, workspacePath);
  }

  static update(features: Feature[]) {
    CanopyGraphPanel.currentPanel?.postMessage({ type: 'loadData', features });
  }

  postMessage(message: unknown) {
    this._panel.webview.postMessage(message);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    baseUrl: string,
    workspacePath: string
  ) {
    this._panel = panel;
    this._baseUrl = baseUrl;
    this._workspacePath = workspacePath;
    this._panel.webview.html = this._getHtml(extensionUri);

    this._panel.webview.onDidReceiveMessage(async msg => {
      if (msg.type === 'ghostNodeClicked') {
        // Import dynamically to avoid circular dependency
        const { CanopyDiffPanel } = await import('./diffPanel');
        CanopyDiffPanel.createOrShow(extensionUri, this._baseUrl, this._workspacePath, msg.featureId, msg.suggestionId);
      }
      if (msg.type === 'nodeSelected') {
        vscode.commands.executeCommand('canopy.features.focus');
      }
    });

    this._panel.onDidDispose(() => {
      CanopyGraphPanel.currentPanel = undefined;
    });
  }

  private _getHtml(extensionUri: vscode.Uri): string {
    const webview = this._panel.webview;
    const d3Uri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', 'd3', 'dist', 'd3.min.js'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'graph', 'graph.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'graph', 'styles.css'));
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <svg id="graph"></svg>
  <script nonce="${nonce}" src="${d3Uri}"></script>
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
