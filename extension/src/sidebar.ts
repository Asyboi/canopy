import * as vscode from 'vscode';
import { Feature } from './types';

type SidebarState =
  | { kind: 'welcome' }
  | { kind: 'analyzing'; steps: { message: string; done: boolean }[]; currentStep: number; percent: number }
  | { kind: 'ready'; features: Feature[] }
  | { kind: 'error'; message: string };

export class CanopySidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'canopy.features';

  private _view?: vscode.WebviewView;
  private _state: SidebarState = { kind: 'welcome' };

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'webview')],
    };

    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg: any) => {
      if (msg.type === 'reanalyze') {
        vscode.commands.executeCommand('canopy.reanalyze');
      }
      if (msg.type === 'openDiff') {
        vscode.commands.executeCommand('canopy.openDiff', msg.featureId, msg.suggestionId);
      }
      if (msg.type === 'openDashboard') {
        vscode.commands.executeCommand('canopy.openDashboard');
      }
    });

    // Restore state when webview becomes visible again
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) { this._send(); }
    });

    this._send();
  }

  setAnalyzing() {
    this._state = { kind: 'analyzing', steps: [], currentStep: 0, percent: 0 };
    this._send();
  }

  updateScanProgress(step: number, message: string, percent: number) {
    if (this._state.kind !== 'analyzing') {
      this._state = { kind: 'analyzing', steps: [], currentStep: step, percent };
    }
    const steps = this._state.steps;
    if (steps.length > 0) { steps[steps.length - 1].done = true; }
    steps.push({ message, done: false });
    this._state.currentStep = step;
    this._state.percent = percent;
    this._send();
  }

  refresh(features: Feature[]) {
    this._state = { kind: 'ready', features };
    this._send();
  }

  setError(message: string) {
    this._state = { kind: 'error', message };
    this._send();
  }

  private _send() {
    this._view?.webview.postMessage({ type: 'state', state: this._state });
  }

  private _getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'sidebar', 'sidebar.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'sidebar', 'styles.css')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="root"></div>
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
