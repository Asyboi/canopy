import * as vscode from 'vscode';
import { ensureServerRunning, stopServer } from './server';
import { triggerAnalysis, getResults, openAnalyzeStream } from './api';
import { CanopySidebarProvider } from './sidebar';
import { CanopyGraphPanel } from './graphPanel';
import { setSidebarRef } from './diffPanel';

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
  const sidebarProvider = new CanopySidebarProvider(baseUrl, workspacePath);
  setSidebarRef(sidebarProvider);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('canopy.features', sidebarProvider)
  );

  // 4. Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('canopy.openGraph', (featureId?: string) => {
      CanopyGraphPanel.createOrShow(context.extensionUri, baseUrl, workspacePath, featureId);
    }),
    vscode.commands.registerCommand('canopy.reanalyze', () =>
      runAnalysis(baseUrl, workspacePath, sidebarProvider)
    ),
    vscode.commands.registerCommand('canopy.openDashboard', () => {
      const url = `${baseUrl}/dashboard?workspacePath=${encodeURIComponent(workspacePath)}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  // 5. Run initial analysis
  await runAnalysis(baseUrl, workspacePath, sidebarProvider);

  // 6. Watch for file saves — debounce re-analysis prompt
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
  sidebar: CanopySidebarProvider
) {
  const eventSource = openAnalyzeStream(baseUrl, workspacePath);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Canopy', cancellable: false },
    async (progress) => {
      return new Promise<void>((resolve, reject) => {
        eventSource.addEventListener('progress', (e: any) => {
          const data = JSON.parse(e.data);
          progress.report({ message: data.message, increment: data.percent });
        });

        eventSource.addEventListener('complete', async () => {
          eventSource.close();
          try {
            const results = await getResults(baseUrl, workspacePath);
            sidebar.refresh(results.features);
            CanopyGraphPanel.update(results.features);
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        eventSource.addEventListener('error', () => {
          eventSource.close();
          reject(new Error('Analysis failed'));
        });

        // Trigger analysis after SSE is listening
        triggerAnalysis(baseUrl, workspacePath).catch(reject);
      });
    }
  );
}

export function deactivate() {
  stopServer();
}
