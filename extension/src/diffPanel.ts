import * as vscode from 'vscode';
import * as path from 'path';
import { getResults, applySuggestion, markApplied, dismissSuggestion } from './api';
import { CanopyGraphPanel } from './graphPanel';
import { CanopySidebarProvider } from './sidebar';

let sidebarRef: CanopySidebarProvider | undefined;

export function setSidebarRef(sidebar: CanopySidebarProvider) {
  sidebarRef = sidebar;
}

export class CanopyDiffPanel {
  static async createOrShow(
    extensionUri: vscode.Uri,
    baseUrl: string,
    workspacePath: string,
    featureId: string,
    suggestionId: string
  ) {
    const results = await getResults(baseUrl, workspacePath);
    const feature = results.features.find(f => f.id === featureId);
    if (!feature) {
      vscode.window.showErrorMessage('Canopy: Feature not found');
      return;
    }
    const suggestion = feature.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      vscode.window.showErrorMessage('Canopy: Suggestion not found');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'canopyDiff', `Canopy: ${feature.name}`, vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview')],
      }
    );

    const savingsCarbon = (feature.sustainability.carbonKgCo2e * suggestion.estimatedSavingsPercent / 100).toFixed(2);
    const savingsElec = (feature.sustainability.electricityKwh * suggestion.estimatedSavingsPercent / 100).toFixed(1);
    const savingsSci = (feature.sustainability.sci.score * suggestion.estimatedSavingsPercent / 100).toFixed(1);

    const webview = panel.webview;
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'diff', 'diff.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'diff', 'styles.css'));
    const nonce = getNonce();

    panel.webview.html = getDiffHtml(webview, nonce, scriptUri, styleUri, suggestion, savingsCarbon, savingsElec, savingsSci, feature.sustainability.sci.unit);

    panel.webview.onDidReceiveMessage(async msg => {
      if (msg.type === 'apply') {
        try {
          const { files } = await applySuggestion(baseUrl, workspacePath, featureId, suggestionId);

          const edit = new vscode.WorkspaceEdit();
          for (const file of files) {
            const absolutePath = path.join(workspacePath, file.path);
            const uri = vscode.Uri.file(absolutePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            edit.replace(uri, fullRange, file.newContent);
          }

          const success = await vscode.workspace.applyEdit(edit);

          if (success) {
            await markApplied(baseUrl, workspacePath, featureId, suggestionId);

            // Refresh sidebar and graph from updated results (no re-analysis needed)
            const updatedResults = await getResults(baseUrl, workspacePath);
            sidebarRef?.refresh(updatedResults.features);
            CanopyGraphPanel.currentPanel?.postMessage({
              type: 'suggestionApplied', featureId, suggestionId,
            });

            panel.dispose();
          } else {
            vscode.window.showErrorMessage('Canopy: Failed to apply changes to files.');
          }
        } catch (err) {
          vscode.window.showErrorMessage(`Canopy: ${err}`);
        }
      }

      if (msg.type === 'dismiss') {
        try {
          await dismissSuggestion(baseUrl, workspacePath, featureId, suggestionId);

          // Refresh sidebar and graph from updated results
          const updatedResults = await getResults(baseUrl, workspacePath);
          sidebarRef?.refresh(updatedResults.features);
          CanopyGraphPanel.currentPanel?.postMessage({
            type: 'suggestionDismissed', featureId, suggestionId,
          });

          panel.dispose();
        } catch (err) {
          vscode.window.showErrorMessage(`Canopy: ${err}`);
        }
      }
    });
  }
}

function getDiffHtml(
  webview: vscode.Webview,
  nonce: string,
  scriptUri: vscode.Uri,
  styleUri: vscode.Uri,
  suggestion: { patternType: string; explanation: string; currentCode: string; suggestedFileChanges: { filePath: string; newContent: string }[]; estimatedSavingsPercent: number },
  savingsCarbon: string,
  savingsElec: string,
  savingsSci: string,
  sciUnit: string
): string {
  const currentCode = escapeHtml(suggestion.currentCode);
  const newCode = escapeHtml(suggestion.suggestedFileChanges[0]?.newContent || '');
  const explanation = escapeHtml(suggestion.explanation);

  return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div class="header">
    <span class="badge">${suggestion.patternType}</span>
    <span class="explanation">${explanation}</span>
  </div>
  <div class="diff-container">
    <div class="diff-pane current">
      <div class="pane-header">Current Code</div>
      <pre><code>${currentCode}</code></pre>
    </div>
    <div class="diff-pane suggested">
      <div class="pane-header">Suggested Code</div>
      <pre><code>${newCode}</code></pre>
    </div>
  </div>
  <div class="bottom-bar">
    <span class="savings">Applying saves ~${savingsCarbon} kg CO₂e/month · ${savingsElec} kWh/month · SCI -${savingsSci} ${sciUnit}</span>
    <div class="actions">
      <button class="btn btn-dismiss" id="dismiss">Dismiss</button>
      <button class="btn btn-apply" id="apply">Apply Changes</button>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
