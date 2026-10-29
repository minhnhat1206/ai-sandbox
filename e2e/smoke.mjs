/**
 * End-to-end smoke test. Boots the dev server (mock provider, temp data dir),
 * drives the prospect flow and the admin flow in Chromium, saves screenshots to
 * e2e/screenshots/. Exit code 1 on any failure.
 *
 *   node e2e/smoke.mjs            # headless
 *   BASE_URL=http://localhost:3000 node e2e/smoke.mjs   # reuse a running server
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Playwright is resolved through Node's CJS lookup so a globally installed copy works too.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const PORT = 3123;
const ADMIN_TOKEN = 'smoke-admin';
const base = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const shots = path.resolve('e2e/screenshots');
fs.mkdirSync(shots, { recursive: true });

let server = null;
if (!process.env.BASE_URL) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-e2e-'));
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    env: { ...process.env, DATA_DIR: dataDir, AI_PROVIDER: 'mock', ADMIN_TOKEN, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.env.E2E_VERBOSE && process.stdout.write(d));
  server.stderr.on('data', (d) => process.stderr.write(d));
  await waitFor(`${base}/api/health`);
}

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log(`${cond ? '✓' : '✗'} ${msg}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

try {
  // ---- landing ----
  await page.goto(base);
  check(await page.locator('h1').first().isVisible(), 'landing renders');
  await page.screenshot({ path: path.join(shots, '01-landing.png') });

  // ---- prospect sandbox ----
  await page.goto(`${base}/s/demo`);
  await page.waitForSelector('text=Việt Minh', { timeout: 15000 });
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await dialog.getByRole('textbox').fill('Smoke Tester');
    await dialog.getByRole('button', { name: /Bắt đầu|Get started/ }).click();
  }
  const cards = page.locator('article');
  check((await cards.count()) >= 20, `gallery shows ${await cards.count()} workflow cards`);
  await page.screenshot({ path: path.join(shots, '02-gallery.png'), fullPage: true });

  // quote builder: HTML quotation in a sandboxed iframe + stock-shortfall ticket
  await page.goto(`${base}/s/demo/run/quote-builder-agent`);
  await page.getByRole('button', { name: /Dùng dữ liệu mẫu|Use sample data/ }).click();
  await page.getByRole('button', { name: /^(Chạy|Run)$/ }).click();
  await page.waitForSelector('text=/Kết quả demo|Demo result/', { timeout: 60000 });
  await page.frameLocator('iframe[title="Quotation"]').locator('text=BÁO GIÁ').first().waitFor({ timeout: 10000 });
  check(true, 'quote builder renders a printable quotation');
  check((await page.locator('text=/Thiếu hàng cho báo giá/').count()) >= 1, 'stock-shortfall ticket created');
  await page.screenshot({ path: path.join(shots, '03a-quote.png'), fullPage: true });

  // agent workflow: tool timeline, deliverables, actions
  await page.goto(`${base}/s/demo/run/order-care-agent`);
  await page.getByRole('button', { name: /Dùng dữ liệu mẫu|Use sample data/ }).click();
  await page.getByRole('button', { name: /^(Chạy|Run)$/ }).click();
  await page.waitForSelector('text=/Kết quả demo|Demo result/', { timeout: 60000 });
  await page.waitForSelector('text=/Agent đã làm gì|What the agent did/', { timeout: 10000 });
  const toolRows = await page.locator('ol li button:has-text("ms")').count();
  check(toolRows >= 5, `agent timeline shows ${toolRows} tool calls`);
  check(await page.locator('text=/Sản phẩm bàn giao|Deliverables/').first().isVisible(), 'deliverables panel visible');
  check(await page.locator('text=/Hành động đã thực hiện|Actions taken/').first().isVisible(), 'actions panel visible');
  check((await page.locator('text=/^TK-[A-Z0-9]+$/').count()) >= 1, 'ticket id shown');
  check(await page.locator('text=/Đặt lịch trao đổi|Book a call/').first().isVisible(), 'conversion CTA visible after run');
  await page.screenshot({ path: path.join(shots, '03b-agent-run.png'), fullPage: true });

  // agent with HTML dashboard artifact rendered in an iframe
  await page.goto(`${base}/s/demo/run/receivables-agent`);
  await page.getByRole('button', { name: /Dùng dữ liệu mẫu|Use sample data/ }).click();
  await page.getByRole('button', { name: /^(Chạy|Run)$/ }).click();
  await page.waitForSelector('text=/Kết quả demo|Demo result/', { timeout: 60000 });
  await page.waitForSelector('iframe[title="Receivables dashboard"]', { timeout: 10000 });
  const frame = page.frameLocator('iframe[title="Receivables dashboard"]');
  await frame.locator('svg').first().waitFor({ timeout: 10000 });
  check(true, 'HTML dashboard artifact renders with an inline SVG chart');
  await page.getByRole('tab', { name: /Call list/ }).click();
  check((await page.locator('table').last().locator('tr').count()) > 3, 'table artifact renders rows');
  await page.screenshot({ path: path.join(shots, '03c-agent-dashboard.png'), fullPage: true });

  // file upload into a document review
  await page.goto(`${base}/s/demo/run/document-review`);
  await page.locator('#f-file').setInputFiles({ name: 'hop-dong.txt', mimeType: 'text/plain', buffer: Buffer.from('Điều 1. Giao hàng: phạt 0,5%/ngày tối đa 10%.\nĐiều 2. Độc quyền 12 tháng sau khi chấm dứt.') });
  await page.waitForSelector('text=hop-dong.txt', { timeout: 10000 });
  await page.getByRole('button', { name: /^(Chạy|Run)$/ }).click();
  await page.waitForSelector('text=/Kết quả demo|Demo result/', { timeout: 60000 });
  check(await page.getByRole('tab', { name: /Clause review/ }).isVisible(), 'uploaded file reviewed into a clause table');

  // validation error path
  await page.goto(`${base}/s/demo/run/order-care-agent`);
  await page.getByRole('button', { name: /^(Chạy|Run)$/ }).click();
  check(await page.getByRole('alert').first().isVisible(), 'validation error shown for empty required field');

  // chat agent with tools: HR helpdesk quotes the policy
  await page.goto(`${base}/s/demo/chat/policy-helpdesk`);
  await page.getByRole('button', { name: /nghỉ phép|annual leave/ }).first().click();
  await page.waitForSelector('text=/12 ngày|12 annual/', { timeout: 30000 });
  await page.waitForSelector('textarea:not([disabled])', { timeout: 30000 });
  check(await page.locator('text=/Đã dùng \\d+ công cụ|Used \\d+ tools/').first().isVisible(), 'chat shows the tools the agent used');
  await page.screenshot({ path: path.join(shots, '04-chat.png') });

  // data chat returns a table artifact inside the conversation
  await page.goto(`${base}/s/demo/chat/data-chat`);
  await page.getByRole('button', { name: /nợ quá hạn|overdue debt/ }).first().click();
  await page.waitForSelector('text=/Overdue by customer/', { timeout: 30000 });
  await page.waitForSelector('textarea:not([disabled])', { timeout: 30000 });
  check((await page.locator('table').last().locator('tr').count()) > 3, 'data chat renders a table artifact');
  await page.screenshot({ path: path.join(shots, '04b-data-chat.png'), fullPage: true });

  // results page
  await page.goto(`${base}/s/demo/results`);
  await page.waitForSelector('text=/Kết quả của tôi|My results/');
  await page.waitForTimeout(500);
  const runRows = await page.locator('button:has-text("Xem"), button:has-text("View")').count();
  check(runRows >= 6, `results page lists ${runRows} runs`);
  await page.screenshot({ path: path.join(shots, '05-results.png') });

  // lead form
  await page.goto(`${base}/s/demo/contact?type=book_call&wf=quote-builder-agent`);
  await page.locator('#ct-email').fill('smoke@example.com');
  await page.locator('#ct-msg').fill('Please call me');
  await page.getByRole('button', { name: /^(Gửi|Send)$/ }).click();
  await page.waitForSelector('text=/Đã gửi|Sent!/');
  check(true, 'lead submitted');

  // language toggle
  await page.goto(`${base}/s/demo`);
  await page.getByRole('button', { name: 'EN' }).click();
  await page.waitForSelector('text=Welcome, team');
  check(true, 'language toggle switches to English');
  await page.getByRole('button', { name: 'VI' }).click();

  // ---- admin ----
  await page.goto(`${base}/admin/login`);
  await page.locator('#tok').fill(process.env.BASE_URL ? (process.env.ADMIN_TOKEN ?? 'change-me') : ADMIN_TOKEN);
  await page.getByRole('button', { name: /Đăng nhập|Sign in/ }).click();
  await page.waitForSelector('text=/Lượt chạy gần đây|Recent runs/');
  check(await page.locator('text=Smoke Tester').first().isVisible(), 'dashboard shows the visitor run');
  await page.screenshot({ path: path.join(shots, '06-admin-dashboard.png'), fullPage: true });

  await page.goto(`${base}/admin/workspaces`);
  await page.getByRole('button', { name: /Tạo sandbox mới|New sandbox/ }).click();
  await page.locator('#c').fill('Công ty Smoke');
  await page.locator('#i').fill('Retail');
  await page.getByRole('dialog').getByRole('button', { name: /^(Lưu|Save)$/ }).click();
  await page.getByText('/s/cong-ty-smoke').first().waitFor({ timeout: 10000 });
  check(true, 'created a new sandbox with slug token');

  await page.getByRole('tab', { name: /Xây quy trình riêng|Build custom/ }).click();
  await page.locator('#cb').fill('Soạn thư nhắc thanh toán cho khách quá hạn');
  await page.getByRole('button', { name: /Nhờ agent soạn|Ask the agent/ }).click();
  await page.waitForFunction(() => (document.querySelector('#cj')?.value ?? '').includes('"id"'), null, { timeout: 20000 });
  await page.getByRole('button', { name: /Thêm vào sandbox|Add to sandbox/ }).click();
  await page.waitForSelector('text=custom-soan-thu', { timeout: 10000 });
  check(true, 'agent-drafted custom workflow saved');
  await page.screenshot({ path: path.join(shots, '07-admin-custom.png'), fullPage: true });

  await page.getByRole('tab', { name: /Dữ liệu kết nối|Connected data/ }).click();
  await page.getByRole('button', { name: /Thêm bảng|Add table/ }).click();
  await page.getByLabel(/Tên bảng|Table name/).last().fill('products');
  await page.getByLabel(/Nội dung CSV|CSV content/).last().fill('sku,name,price\nA1,Gạo,120000\nB2,Dầu,41000');
  await page.getByRole('button', { name: /^(Lưu|Save)$/ }).click();
  await page.waitForSelector('text=/Đã lưu|Saved/');
  check(true, 'data source saved');

  await page.getByRole('tab', { name: /Tài liệu|Documents/ }).click();
  await page.getByRole('button', { name: /Thêm tài liệu|Add document/ }).click();
  await page.getByLabel(/Tiêu đề|Title/).last().fill('Quy định');
  await page.getByLabel(/Nội dung|Content/).last().fill('Giờ làm việc 8h-17h.');
  await page.getByRole('button', { name: /^(Lưu|Save)$/ }).click();
  await page.waitForSelector('text=/Đã lưu|Saved/');
  check(true, 'knowledge document saved');

  // the new sandbox is live for prospects, including the custom workflow
  await page.goto(`${base}/s/cong-ty-smoke`);
  await page.waitForSelector('text=Công ty Smoke');
  if (await page.getByRole('dialog').isVisible()) await page.getByRole('dialog').getByRole('button', { name: /Bỏ qua|Skip/ }).click();
  check(await page.locator('text=Quy định').first().isVisible(), 'new sandbox shows connected document');
  check(await page.locator('text=/products · 2/').first().isVisible(), 'new sandbox shows connected data source');
  await page.locator('article', { hasText: 'Soạn thư nhắc' }).getByRole('button').click();
  await page.getByRole('button', { name: /Dùng dữ liệu mẫu|Use sample data/ }).click();
  await page.getByRole('button', { name: /^(Chạy|Run)$/ }).click();
  await page.waitForSelector('text=/Kết quả demo|Demo output/', { timeout: 30000 });
  check(true, 'custom workflow runs in the new sandbox');
  await page.screenshot({ path: path.join(shots, '08-custom-run.png'), fullPage: true });

  const realErrors = errors.filter((e) => !/favicon|Download the React DevTools|fonts\.googleapis|net::ERR/i.test(e));
  check(realErrors.length === 0, `no browser errors (${realErrors.length})`);
  if (realErrors.length) console.error(realErrors);
} catch (e) {
  failures.push(`exception: ${e.message}`);
  console.error(e);
  await page.screenshot({ path: path.join(shots, '99-failure.png'), fullPage: true }).catch(() => undefined);
} finally {
  await browser.close();
  server?.kill('SIGTERM');
}

if (failures.length) {
  console.error(`\nSMOKE FAILED: ${failures.length} problem(s)`);
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('\nSMOKE OK');
process.exit(0); // the dev-server child would otherwise keep the event loop alive

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start at ${url}`);
}
