import EventSource = require('eventsource');
import { AnalysisResult, Feature, FileChange } from './types';

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function triggerAnalysis(baseUrl: string, workspacePath: string): Promise<void> {
  await apiRequest(`${baseUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePath }),
  });
}

export async function getResults(baseUrl: string, workspacePath: string): Promise<AnalysisResult> {
  return apiRequest<AnalysisResult>(
    `${baseUrl}/results?workspacePath=${encodeURIComponent(workspacePath)}`
  );
}

export async function applySuggestion(
  baseUrl: string,
  workspacePath: string,
  featureId: string,
  suggestionId: string
): Promise<{ files: FileChange[] }> {
  return apiRequest(`${baseUrl}/apply-suggestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePath, featureId, suggestionId }),
  });
}

export async function markApplied(
  baseUrl: string,
  workspacePath: string,
  featureId: string,
  suggestionId: string
): Promise<{ status: string; updatedFeature: Feature }> {
  return apiRequest(`${baseUrl}/mark-applied`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePath, featureId, suggestionId }),
  });
}

export async function dismissSuggestion(
  baseUrl: string,
  workspacePath: string,
  featureId: string,
  suggestionId: string
): Promise<void> {
  await apiRequest(`${baseUrl}/dismiss-suggestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePath, featureId, suggestionId }),
  });
}

export function openAnalyzeStream(baseUrl: string, workspacePath: string): EventSource {
  const url = `${baseUrl}/analyze-stream?workspacePath=${encodeURIComponent(workspacePath)}`;
  return new EventSource(url);
}
