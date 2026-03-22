import * as vscode from 'vscode';
import { ensureServerRunning, stopServer } from './server';
import { triggerAnalysis, getResults, openAnalyzeStream } from './api';
import { CanopySidebarProvider } from './sidebar';
import { CanopyDiffPanel, setSidebarRef, setUpdateStatusBarRef } from './diffPanel';
import { CanopyDashboardPanel } from './dashboardPanel';
import { Feature, AnalysisResult } from './types';

let currentFeatures: Feature[] = [];
let currentResults: AnalysisResult | null = null;

export async function activate(context: vscode.ExtensionContext) {
  // 1. Guard: check workspace is open
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('Canopy requires an open workspace folder.');
    return;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath;

  // 2. Start server
  let baseUrl: string;
  try {
    baseUrl = await ensureServerRunning(context);
  } catch (err) {
    vscode.window.showErrorMessage(`Canopy: ${err}`);
    return;
  }

  // 3. Register sidebar
  const sidebarProvider = new CanopySidebarProvider(context.extensionUri);
  setSidebarRef(sidebarProvider);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('canopy.features', sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // 4. Status bar item
  const sciStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  sciStatusBar.command = 'canopy.openDashboard';
  sciStatusBar.tooltip = 'Canopy: Average SCI score across all features — click to open dashboard';
  context.subscriptions.push(sciStatusBar);

  function updateStatusBar(features: Feature[], totals: AnalysisResult['totals']) {
    const avgSci = totals.sci.averageScore.toFixed(0);
    const highCount = features.filter(f => f.sustainabilityTier === 'high').length;
    sciStatusBar.text = highCount > 0
      ? `🌿 SCI: ${avgSci} gCO2  ⚠️ ${highCount} high impact`
      : `🌿 SCI: ${avgSci} gCO2  ✅ all clear`;
    sciStatusBar.backgroundColor = highCount > 0
      ? new vscode.ThemeColor('statusBarItem.warningBackground')
      : undefined;
    sciStatusBar.show();
  }

  setUpdateStatusBarRef(updateStatusBar);

  // 5. Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('canopy.openDiff', (featureId: string, suggestionId: string) => {
      CanopyDiffPanel.createOrShow(context.extensionUri, baseUrl, workspacePath, featureId, suggestionId);
    }),
    vscode.commands.registerCommand('canopy.showFeatureInfo', (featureId: string) => {
      const feature = currentFeatures.find(f => f.id === featureId);
      if (!feature) { return; }
      vscode.window.showInformationMessage(
        `${feature.name} — ⚡ ${feature.sustainability.electricityKwh.toFixed(1)} kWh/month  ` +
        `🌱 ${feature.sustainability.carbonKgCo2e.toFixed(2)} kg CO₂e/month  ` +
        `SCI: ${feature.sustainability.sci.score.toFixed(1)} ${feature.sustainability.sci.unit}  ` +
        `— No suggestions available.`
      );
    }),
    vscode.commands.registerCommand('canopy.reanalyze', () =>
      runAnalysis(baseUrl, workspacePath, sidebarProvider, updateStatusBar)
    ),
    vscode.commands.registerCommand('canopy.openDashboard', () => {
      CanopyDashboardPanel.createOrShow(
        context.extensionUri,
        currentResults,
        () => runAnalysis(baseUrl, workspacePath, sidebarProvider, updateStatusBar)
      );
    })
  );

  // 6. Run initial analysis — don't await; errors are shown in sidebar, not thrown
  runAnalysis(baseUrl, workspacePath, sidebarProvider, updateStatusBar).catch(() => {});

  // 7. Watch for file saves — debounce re-analysis prompt
  let debounceTimer: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        item.text = '$(sync) Canopy: Analysis outdated — click to refresh';
        item.command = 'canopy.reanalyze';
        item.show();
        setTimeout(() => item.dispose(), 30000);
      }, 30000);
    })
  );
}

async function runAnalysis(
  baseUrl: string,
  workspacePath: string,
  sidebar: CanopySidebarProvider,
  updateStatusBar: (features: Feature[], totals: AnalysisResult['totals']) => void
) {
  sidebar.setAnalyzing();
  CanopyDashboardPanel.setAnalyzingIfOpen();

  const eventSource = openAnalyzeStream(baseUrl, workspacePath);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: '🌿 Canopy', cancellable: false },
    async (progress) => {
      return new Promise<void>((resolve, reject) => {
        eventSource.addEventListener('progress', (e: any) => {
          const data: { step: number; message: string; percent: number } = JSON.parse(e.data);
          progress.report({ message: data.message, increment: data.percent / 7 });
          sidebar.updateScanProgress(data.step, data.message, data.percent);
        });

        eventSource.addEventListener('complete', async () => {
          eventSource.close();
          try {
            const results = await getResults(baseUrl, workspacePath);
            currentFeatures = results.features;
            currentResults = results;
            sidebar.refresh(results.features);
            updateStatusBar(results.features, results.totals);
            CanopyDashboardPanel.postResultsIfOpen(results);
            resolve();
          } catch (err) {
            sidebar.setError('Failed to load results');
            reject(err);
          }
        });

        eventSource.addEventListener('error', (e: any) => {
          eventSource.close();
          const msg = e.data ? JSON.parse(e.data).message : 'Unknown error';
          sidebar.setError(msg);
          reject(new Error(msg));
        });

        // Trigger analysis after SSE is listening.
        // 409 means analysis is already running — SSE stream will still complete.
        triggerAnalysis(baseUrl, workspacePath).catch(err => {
          if (!String(err.message).includes('409')) { reject(err); }
        });
      });
    }
  );
}

export function deactivate() {
  stopServer();
}
