import * as vscode from 'vscode';
import { Feature } from './types';

type SidebarState = 'welcome' | 'analyzing' | 'ready' | 'error';

export class CanopySidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private features: Feature[] = [];
  private state: SidebarState = 'welcome';
  private errorMessage: string = '';
  private scanSteps: { message: string; percent: number; done: boolean }[] = [];

  setAnalyzing() {
    this.state = 'analyzing';
    this.features = [];
    this.scanSteps = [];
    this._onDidChangeTreeData.fire();
  }

  refresh(features: Feature[]) {
    this.state = 'ready';
    this.features = features;
    this._onDidChangeTreeData.fire();
  }

  setError(message: string) {
    this.state = 'error';
    this.errorMessage = message;
    this._onDidChangeTreeData.fire();
  }

  updateScanProgress(step: number, message: string, percent: number) {
    this.state = 'analyzing';
    if (this.scanSteps.length > 0) {
      this.scanSteps[this.scanSteps.length - 1].done = true;
    }
    this.scanSteps.push({ message, percent, done: false });
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    if (this.state === 'welcome') {
      const item = new vscode.TreeItem('Welcome to Canopy');
      item.description = 'Starting analysis...';
      item.iconPath = new vscode.ThemeIcon('leaf');
      return [item];
    }

    if (this.state === 'analyzing') {
      const items: vscode.TreeItem[] = [];

      const header = new vscode.TreeItem('🌿 Scanning codebase...');
      header.iconPath = new vscode.ThemeIcon('loading~spin');
      header.description = this.scanSteps.length > 0
        ? `${this.scanSteps[this.scanSteps.length - 1].percent}%`
        : '';
      items.push(header);

      for (const step of this.scanSteps) {
        const stepItem = new vscode.TreeItem(step.message);
        stepItem.iconPath = step.done
          ? new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'))
          : new vscode.ThemeIcon('loading~spin');
        items.push(stepItem);
      }

      return items;
    }

    if (this.state === 'error') {
      const item = new vscode.TreeItem('Analysis failed');
      item.description = this.errorMessage || 'Click Re-analyze to retry';
      item.iconPath = new vscode.ThemeIcon('error');
      item.command = { command: 'canopy.reanalyze', title: 'Re-analyze' };
      return [item];
    }

    // state === 'ready'
    if (this.features.length === 0) {
      const item = new vscode.TreeItem('No features detected');
      item.description = 'Try opening a TypeScript/JavaScript project';
      item.iconPath = new vscode.ThemeIcon('info');
      return [item];
    }

    return this.features
      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.sustainabilityTier] - { high: 0, medium: 1, low: 2 }[b.sustainabilityTier]))
      .map(f => new FeatureItem(f));
  }
}

class FeatureItem extends vscode.TreeItem {
  constructor(public readonly feature: Feature) {
    super(feature.name, vscode.TreeItemCollapsibleState.None);

    const e = feature.sustainability.electricityKwh.toFixed(1);
    const c = feature.sustainability.carbonKgCo2e.toFixed(2);
    const sci = feature.sustainability.sci.score.toFixed(0);
    const pending = feature.suggestions.filter(s => s.status === 'suggested').length;

    const iconColor = {
      high: new vscode.ThemeColor('charts.red'),
      medium: new vscode.ThemeColor('charts.yellow'),
      low: new vscode.ThemeColor('charts.green')
    }[feature.sustainabilityTier];
    this.iconPath = new vscode.ThemeIcon('circle-filled', iconColor);

    this.description = `⚡${e}  🌱${c}  SCI:${sci}${pending > 0 ? `  💡${pending}` : ''}`;

    const tierLabel = {
      high: '🔴 High Impact',
      medium: '🟡 Medium Impact',
      low: '🟢 Low Impact'
    }[feature.sustainabilityTier];

    const tooltip = new vscode.MarkdownString(
      `### ${feature.name}\n\n` +
      `**Sustainability:** ${tierLabel}\n\n` +
      `| Metric | Value |\n|---|---|\n` +
      `| ⚡ Electricity | ${e} kWh/month |\n` +
      `| 🌱 Carbon | ${c} kg CO₂e/month |\n` +
      `| SCI Score | ${sci} ${feature.sustainability.sci.unit} |\n\n` +
      (pending > 0
        ? `💡 **${pending} green suggestion${pending > 1 ? 's' : ''} available** — click to view`
        : `✅ No suggestions — this feature looks clean`)
    );
    tooltip.isTrusted = true;
    this.tooltip = tooltip;

    this.contextValue = pending > 0 ? 'featureWithSuggestions' : 'featureClean';

    if (pending > 0) {
      const firstPending = feature.suggestions.find(s => s.status === 'suggested')!;
      this.command = {
        command: 'canopy.openDiff',
        title: 'View Suggestion',
        arguments: [feature.id, firstPending.id]
      };
    } else {
      this.command = {
        command: 'canopy.showFeatureInfo',
        title: 'Show Feature Info',
        arguments: [feature.id]
      };
    }
  }
}
