import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Store } from '../server/store.ts';

describe('Store', () => {
  it('seeds a demo workspace and persists to disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-store-'));
    const a = new Store(dir);
    expect(a.getWorkspaceByToken('demo')).toBeDefined();
    const ws = a.getWorkspaceByToken('demo')!;
    ws.company = 'Changed';
    a.upsertWorkspace(ws);
    a.flush();
    const b = new Store(dir);
    expect(b.getWorkspaceByToken('demo')!.company).toBe('Changed');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('recovers from a corrupt file by backing it up', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-store-'));
    fs.writeFileSync(path.join(dir, 'db.json'), '{not json');
    const s = new Store(dir);
    expect(s.listWorkspaces()).toHaveLength(1);
    expect(fs.readdirSync(dir).some((f) => f.endsWith('.bak'))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('deleting a workspace removes its runs and leads', () => {
    const s = new Store(null);
    s.addLead({ id: 'l1', workspaceId: 'ws_demo', type: 'feedback', name: '', email: '', message: 'hi', sessionId: '', createdAt: '' });
    expect(s.deleteWorkspace('ws_demo')).toBe(true);
    expect(s.listLeads()).toHaveLength(0);
  });
});
