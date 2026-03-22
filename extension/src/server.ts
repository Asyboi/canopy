import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn } from 'child_process';

let serverProcess: ChildProcess | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export async function ensureServerRunning(context: vscode.ExtensionContext): Promise<string> {
  const serverDir = path.join(context.extensionPath, '..', 'server');
  const portFilePath = path.join(serverDir, '.canopy', 'server.port');

  // If port file exists, check if server is actually reachable
  if (fs.existsSync(portFilePath)) {
    const port = fs.readFileSync(portFilePath, 'utf-8').trim();
    const baseUrl = `http://localhost:${port}`;
    try {
      const res = await fetch(`${baseUrl}/results?workspacePath=/healthcheck`, { signal: AbortSignal.timeout(2000) });
      // Server is running (404 is fine — means server is up but no results yet)
      if (res.status === 404 || res.ok) {
        return baseUrl;
      }
    } catch {
      // Server not reachable — delete stale port file and respawn
      fs.unlinkSync(portFilePath);
    }
  }

  // Ensure server is built
  const serverEntry = path.join(serverDir, 'dist', 'index.js');
  if (!fs.existsSync(serverEntry)) {
    throw new Error('Server not built. Run `npm run build` in the server/ directory first.');
  }

  // Create output channel for server logs
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Canopy Server');
  }

  // Spawn server
  serverProcess = spawn('node', ['dist/index.js'], {
    cwd: serverDir,
    detached: false,
    stdio: 'pipe',
    env: { ...process.env }
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    outputChannel?.appendLine(data.toString().trim());
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    outputChannel?.appendLine(`[stderr] ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      vscode.window.showErrorMessage(`Canopy server exited with code ${code}. Check Output > Canopy Server for details.`);
    }
    serverProcess = undefined;
  });

  // Poll for port file
  const baseUrl = await pollForPortFile(portFilePath, 15000, 500);
  return baseUrl;
}

export async function getBaseUrl(context: vscode.ExtensionContext): Promise<string> {
  const serverDir = path.join(context.extensionPath, '..', 'server');
  const portFilePath = path.join(serverDir, '.canopy', 'server.port');

  if (!fs.existsSync(portFilePath)) {
    throw new Error('Server port file not found. Is the server running?');
  }

  const port = fs.readFileSync(portFilePath, 'utf-8').trim();
  return `http://localhost:${port}`;
}

export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = undefined;
  }
}

async function pollForPortFile(portFilePath: string, timeoutMs: number, intervalMs: number): Promise<string> {
  const start = Date.now();

  return new Promise<string>((resolve, reject) => {
    const check = () => {
      if (fs.existsSync(portFilePath)) {
        const port = fs.readFileSync(portFilePath, 'utf-8').trim();
        resolve(`http://localhost:${port}`);
        return;
      }

      if (Date.now() - start > timeoutMs) {
        reject(new Error('Server failed to start within 15 seconds'));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}
