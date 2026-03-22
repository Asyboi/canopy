// @ts-nocheck
// Diff webview — runs inside VS Code webview context
const vscode = acquireVsCodeApi();

document.getElementById('apply').addEventListener('click', () => {
  vscode.postMessage({ type: 'apply' });
});

document.getElementById('dismiss').addEventListener('click', () => {
  vscode.postMessage({ type: 'dismiss' });
});
