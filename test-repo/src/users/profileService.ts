import * as fs from 'fs';
import * as path from 'path';

export function saveProfileImage(userId: string, imageBuffer: Buffer): string {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
  const filename = `${userId}-${Date.now()}.jpg`;
  const filepath = path.join(uploadsDir, filename);
  // Synchronous operations — blocks event loop during upload processing
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  fs.writeFileSync(filepath, imageBuffer);
  const stats = fs.statSync(filepath);
  console.log(`Profile image saved: ${stats.size} bytes`);
  return filepath;
}

export function readProfileImage(userId: string): Buffer | null {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
  // Synchronous directory read — blocks event loop
  const files = fs.readdirSync(uploadsDir);
  const userFile = files.find(f => f.startsWith(userId));
  if (!userFile) return null;
  return fs.readFileSync(path.join(uploadsDir, userFile));
}
