import * as vscode from 'vscode';
import { Feature } from './types';

export class CanopySidebarProvider implements vscode.TreeDataProvider<FeatureItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private features: Feature[] = [];

  constructor(private baseUrl: string, private workspacePath: string) {}

  refresh(features: Feature[]) {
    this.features = features;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FeatureItem): vscode.TreeItem {
    return element;
  }

  getChildren(): FeatureItem[] {
    return this.features
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return order[a.sustainabilityTier] - order[b.sustainabilityTier];
      })
      .map(f => new FeatureItem(f));
  }
}

class FeatureItem extends vscode.TreeItem {
  constructor(public readonly feature: Feature) {
    super(feature.name, vscode.TreeItemCollapsibleState.None);

    const e = feature.sustainability.electricityKwh.toFixed(1);
    const c = feature.sustainability.carbonKgCo2e.toFixed(2);
    const sci = feature.sustainability.sci.score.toFixed(1);
    const pendingSuggestions = feature.suggestions.filter(s => s.status === 'suggested').length;

    this.description = `⚡${e}kWh  🌱${c}kg${pendingSuggestions > 0 ? `  💡${pendingSuggestions}` : ''}`;

    const tierIcon: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };
    this.tooltip = `${tierIcon[feature.sustainabilityTier]} ${feature.name}\nElectricity: ${e} kWh/month\nCarbon: ${c} kg CO₂e/month\nSCI: ${sci} ${feature.sustainability.sci.unit}`;

    this.command = {
      command: 'canopy.openGraph',
      title: 'Focus in Graph',
      arguments: [feature.id],
    };
  }
}
