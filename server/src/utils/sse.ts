import { Response } from 'express';
import { SSEEvent } from '../types';

const clients = new Map<string, Set<Response>>();
const eventBuffers = new Map<string, SSEEvent[]>();

export function addClient(workspacePath: string, res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');

  if (!clients.has(workspacePath)) {
    clients.set(workspacePath, new Set());
  }
  clients.get(workspacePath)!.add(res);

  // Replay buffered events for this workspace
  const buffer = eventBuffers.get(workspacePath);
  if (buffer) {
    for (const event of buffer) {
      writeEvent(res, event);
    }
  }

  res.on('close', () => {
    clients.get(workspacePath)?.delete(res);
    if (clients.get(workspacePath)?.size === 0) {
      clients.delete(workspacePath);
    }
  });
}

export function broadcast(
  workspacePath: string,
  event: SSEEvent['event'],
  data: Record<string, unknown>
): void {
  const sseEvent: SSEEvent = { event, data };

  if (!eventBuffers.has(workspacePath)) {
    eventBuffers.set(workspacePath, []);
  }
  eventBuffers.get(workspacePath)!.push(sseEvent);

  const wsClients = clients.get(workspacePath);
  if (wsClients) {
    for (const client of wsClients) {
      writeEvent(client, sseEvent);
    }
  }
}

export function clearBuffer(workspacePath: string): void {
  eventBuffers.delete(workspacePath);
}

function writeEvent(res: Response, sseEvent: SSEEvent): void {
  res.write(`event: ${sseEvent.event}\ndata: ${JSON.stringify(sseEvent.data)}\n\n`);
}
