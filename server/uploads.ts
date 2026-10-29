import fs from 'node:fs';
import path from 'node:path';
import type { UploadMeta } from '../shared/types.ts';
import { nowIso, shortId } from './ids.ts';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export class UploadStore {
  constructor(private readonly dir: string | null) {}

  private file(id: string, ext = '') { return this.dir ? path.join(this.dir, `${id}${ext}`) : null; }
  private mem = new Map<string, { meta: UploadMeta; bytes: Buffer }>();

  async save(name: string, bytes: Buffer): Promise<UploadMeta> {
    const ext = path.extname(name).toLowerCase();
    const mime = ALLOWED[ext];
    if (!mime) throw new Error(`Unsupported file type ${ext || '(none)'}. Allowed: ${Object.keys(ALLOWED).join(', ')}`);
    if (bytes.length > MAX_BYTES) throw new Error('File is larger than 8 MB');
    const id = `upl_${shortId(10)}`;
    const meta: UploadMeta = { id, name: path.basename(name).slice(0, 120), mime, size: bytes.length, createdAt: nowIso() };
    meta.text = await extractText(mime, bytes);
    if (this.dir) {
      fs.mkdirSync(this.dir, { recursive: true });
      fs.writeFileSync(this.file(id, ext)!, bytes);
      fs.writeFileSync(this.file(id, '.json')!, JSON.stringify({ ...meta, ext }));
    } else {
      this.mem.set(id, { meta, bytes });
    }
    return meta;
  }

  get(id: string): { meta: UploadMeta; bytes: Buffer } | undefined {
    if (!/^upl_[a-z0-9]+$/.test(id)) return undefined;
    if (!this.dir) return this.mem.get(id);
    const metaPath = this.file(id, '.json')!;
    if (!fs.existsSync(metaPath)) return undefined;
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as UploadMeta & { ext: string };
    const bytes = fs.readFileSync(this.file(id, meta.ext)!);
    return { meta, bytes };
  }
}

async function extractText(mime: string, bytes: Buffer): Promise<string | undefined> {
  if (mime.startsWith('text/')) return bytes.toString('utf8').slice(0, 200_000);
  if (mime === 'application/pdf') {
    try {
      const { extractText: pdfText } = await import('unpdf');
      const { text } = await pdfText(new Uint8Array(bytes), { mergePages: true });
      const merged = Array.isArray(text) ? text.join('\n') : text;
      return merged.trim().slice(0, 200_000) || undefined;
    } catch (err) {
      console.warn('[uploads] pdf text extraction failed:', err instanceof Error ? err.message : err);
      return undefined;
    }
  }
  return undefined;
}
