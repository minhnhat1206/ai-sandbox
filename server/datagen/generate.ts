/**
 * Synthetic company data from an industry profile. Deterministic (seeded by company and
 * industry) so a regenerated sandbox shows the same numbers. The 11 tables keep the exact
 * columns of the demo data (server/seed-data.ts), so every catalog agent works on them,
 * and each table plants the situations the agents are built to catch: late orders, overdue
 * invoices, stock below reorder point, stalled deals, duplicate payments, policy breaches.
 */
import { toCsv } from '../../shared/engine/csv.ts';
import type { ColumnKind, DataBlueprint, ExtraTableSpec, IndustryProfile } from '../../shared/types.ts';

export interface GeneratedTable { name: string; description: string; csv: string; rows: number; columns: string[] }
type Rec = Record<string, string | number>;

/* ------------------------------------------------------------------ helpers */

export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Price-list column for a customer segment ("Modern trade" → modern_trade). */
export const segmentColumn = (segment: string) => fold(segment).replace(/ /g, '_') || 'segment';
export const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const vnDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rand {
  constructor(private readonly r: () => number) {}
  next() { return this.r(); }
  int(a: number, b: number) { return a + Math.floor(this.r() * (b - a + 1)); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.r() * arr.length)]; }
  chance(p: number) { return this.r() < p; }
  shuffle<T>(arr: readonly T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
}

const niceQty = (q: number) => (q >= 1000 ? Math.round(q / 100) * 100 : q >= 200 ? Math.round(q / 10) * 10 : q >= 50 ? Math.round(q / 5) * 5 : Math.max(1, Math.round(q)));
const niceMoney = (n: number) => (n >= 1e9 ? Math.round(n / 1e7) * 1e7 : n >= 1e8 ? Math.round(n / 1e6) * 1e6 : n >= 1e6 ? Math.round(n / 1e5) * 1e5 : n >= 1e4 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100);

const MANAGERS = ['Lan', 'Hùng', 'Minh', 'Hà', 'Phong', 'Thảo', 'Quân', 'Trang', 'Dũng', 'Ngọc'];
const STAFF = ['Trần Hùng', 'Lê Lan', 'Nguyễn Minh', 'Phạm Thu', 'Võ Tâm', 'Đỗ Nga', 'Bùi Khánh', 'Huỳnh Mai', 'Đặng Phúc', 'Ngô Vy'];
const SEG_DISCOUNT = [0.1, 0.14, 0.08, 0.05];
const SEG_TERMS = [45, 30, 15, 7];
const SEG_CREDIT = [4, 6, 2.5, 0.6];

/* ---------------------------------------------------------------- canonical */

export function generateCanonical(company: string, profile: IndustryProfile, asOf: string, seed = `${company}|${profile.label}`): GeneratedTable[] {
  const R = new Rand(seeded(seed));
  const segIdx = (s: string) => Math.max(0, profile.segments.indexOf(s)) % 4;
  const managers = R.shuffle(MANAGERS).slice(0, 3);
  const [qMin, qMax] = profile.qtyRange;
  const avgPrice = profile.products.reduce((n, p) => n + p.price, 0) / Math.max(1, profile.products.length);
  const typicalOrder = avgPrice * (qMin + qMax) / 2;

  // ---- products, price list, inventory
  const products = profile.products.map((p, i) => ({ ...p, sku: `P${String(i + 1).padStart(3, '0')}`, list: niceMoney(p.price) }));
  const segPrice = (p: (typeof products)[number], seg: string) => niceMoney(p.list * (1 - SEG_DISCOUNT[segIdx(seg)]));
  const segCols = profile.segments.map(segmentColumn);
  const priceRows: Rec[] = products.map((p) => {
    const row: Rec = { sku: p.sku, product: p.name, unit: p.unit, list_price: p.list };
    profile.segments.forEach((s, i) => { row[segCols[i]] = segPrice(p, s); });
    row.min_qty = niceQty(Math.max(1, qMin / 4));
    return row;
  });

  // ---- customers
  const customers = profile.customers.map((c, i) => {
    const si = segIdx(c.segment);
    const words = fold(c.name).split(' ').filter((w) => w.length > 2);
    const handle = words.slice(-2).join('') || `kh${i + 1}`;
    return {
      customer_id: `C${String(i + 1).padStart(3, '0')}`, name: c.name, segment: c.segment, city: c.city, contact: c.contact,
      phone: `09${String(R.int(10_000_000, 99_999_999))}`,
      email: si === 3 && i % 2 === 1 ? '' : `${fold(c.contact).split(' ').pop() || 'lienhe'}@${handle}.example`,
      credit_limit: Math.max(10_000_000, Math.round((typicalOrder * SEG_CREDIT[si]) / 10_000_000) * 10_000_000),
      account_manager: managers[si % managers.length],
    };
  });
  const region = (city: string) => (city === 'Hồ Chí Minh' ? 'HCM' : city);

  // ---- orders: 22 over the last four weeks, with planted delays
  const nOrders = 22;
  const order: Rec[] = [];
  const custCycle = [...R.shuffle(customers), ...R.shuffle(customers)];
  const complaintCust = customers.find((c) => segIdx(c.segment) === 2) ?? customers[4];
  for (let k = 0; k < nOrders; k++) {
    const date = addDays(asOf, -(27 - Math.floor((k * 27) / (nOrders - 1))));
    const isComplaint = k === 13;
    const cust = isComplaint ? complaintCust : custCycle[k];
    const p = R.pick(products);
    const qty = niceQty(qMin + R.next() * (qMax - qMin) * (segIdx(cust.segment) === 3 ? 0.15 : segIdx(cust.segment) === 1 ? 1 : 0.6));
    const unit = segPrice(p, cust.segment);
    const promised = addDays(date, R.pick([2, 2, 3]));
    let status = 'delivered', delivered = '', carrier = R.pick(profile.carriers);
    const age = daysBetween(date, asOf);
    if (isComplaint) { status = 'delayed'; carrier = profile.carriers[1] ?? carrier; }
    else if (k === 18 && age >= 3) { status = 'delayed'; carrier = profile.carriers[1] ?? carrier; }
    else if (age <= 2) status = 'processing';
    else if (age <= 4) { status = R.chance(0.5) ? 'in_transit' : 'delivered'; if (status === 'delivered') delivered = promised <= asOf ? promised : asOf; }
    else {
      const late = R.chance(0.32) ? R.int(1, 2) : 0;
      if (late) carrier = R.chance(0.7) ? (profile.carriers[1] ?? carrier) : carrier;
      delivered = addDays(promised, late);
    }
    order.push({ order_id: 48201 + k, order_date: date, customer_id: cust.customer_id, customer_name: cust.name, product: p.name, qty, unit_price: unit, amount: qty * unit, status, promised_date: promised, delivered_date: delivered, carrier, region: region(cust.city) });
  }
  const complaintOrder = order[13];

  // ---- receivables: invoices for delivered orders + older invoices from last month
  const recv: Rec[] = [];
  let invNo = 2601;
  const delivered = order.filter((o) => o.status === 'delivered').slice(0, 10);
  const terms = (cid: string) => SEG_TERMS[segIdx(customers.find((c) => c.customer_id === cid)!.segment)];
  const older = [
    { cust: complaintCust, daysAgo: 52 },
    { cust: complaintCust, daysAgo: 78 },
    { cust: customers.find((c) => segIdx(c.segment) === 1) ?? customers[3], daysAgo: 85 },
    { cust: customers.find((c) => segIdx(c.segment) === 3) ?? customers[1], daysAgo: 44 },
    { cust: customers.find((c) => segIdx(c.segment) === 0) ?? customers[0], daysAgo: 58 },
  ];
  const draft: { cid: string; name: string; seg: string; issue: string; amount: number; mgr: string }[] = [];
  for (const o of older) draft.push({ cid: o.cust.customer_id, name: o.cust.name, seg: o.cust.segment, issue: addDays(asOf, -o.daysAgo), amount: niceMoney(typicalOrder * (0.4 + R.next() * 0.8) * (segIdx(o.cust.segment) === 3 ? 0.2 : 1)), mgr: o.cust.account_manager });
  for (const o of delivered) { const c = customers.find((x) => x.customer_id === o.customer_id)!; draft.push({ cid: c.customer_id, name: c.name, seg: c.segment, issue: String(o.delivered_date || o.order_date), amount: Number(o.amount), mgr: c.account_manager }); }
  draft.sort((a, b) => a.issue.localeCompare(b.issue));
  draft.forEach((d, i) => {
    const due = addDays(d.issue, terms(d.cid));
    const overdue = Math.max(0, daysBetween(due, asOf));
    let paid = 0;
    if (i === 2) paid = d.amount; // fully paid
    else if (i === 4 || i === 9) paid = niceMoney(d.amount * 0.4); // partial
    const balance = d.amount - paid;
    recv.push({ invoice_id: `INV-${invNo}`, customer_id: d.cid, customer_name: d.name, segment: d.seg, issue_date: d.issue, due_date: due, amount: d.amount, paid, balance, days_overdue: balance > 0 ? overdue : 0, account_manager: d.mgr });
    invNo += R.int(2, 4);
  });

  // ---- inventory: some below reorder point, one with stock reserved for a big order
  const inventory: Rec[] = products.map((p, i) => {
    const daily = Math.max(1, Math.round(((qMin + qMax) / 2) * (0.08 + R.next() * 0.12)));
    const lead = R.pick([3, 4, 5, 6, 7, 8, 10]);
    const reorder = niceQty(daily * (lead + 4));
    let onHand = niceQty(reorder * (1.2 + R.next() * 1.4));
    let reserved = 0;
    if (i === 1) { onHand = niceQty(reorder * 0.9); reserved = niceQty(onHand * 0.8); }
    if (i === 2) { onHand = niceQty(reorder * 0.45); reserved = niceQty(onHand * 0.6); }
    if (i === 4) { onHand = niceQty(reorder * 0.6); reserved = niceQty(onHand * 0.9); }
    if (i === 5) onHand = niceQty(reorder * 0.7);
    if (i === 6) onHand = niceQty(reorder * 3.2);
    return { sku: p.sku, product: p.name, category: p.category, on_hand: onHand, reserved, reorder_point: reorder, lead_time_days: lead, avg_daily_sales: daily, unit_cost: niceMoney(p.list * 0.74), supplier: p.supplier, last_restock: addDays(asOf, -R.int(2, 28)) };
  });

  // ---- tickets
  const lateOrders = order.filter((o) => (o.delivered_date && String(o.delivered_date) > String(o.promised_date)) || (o.status === 'delayed'));
  const tickets: Rec[] = [];
  const unitOf = (name: string) => products.find((p) => p.name === name)?.unit ?? 'đơn vị';
  const tk = (created: string, customer: string, channel: string, category: string, priority: string, status: string, summary: string, hours: number | '') => tickets.push({ created_at: created, customer_name: customer, channel, category, priority, status, summary, resolution_hours: status === 'resolved' ? hours : '' });
  for (const o of lateOrders.slice(0, 5)) {
    const delay = o.delivered_date ? daysBetween(String(o.promised_date), String(o.delivered_date)) : daysBetween(String(o.promised_date), asOf);
    const open = !o.delivered_date;
    tk(open ? addDays(String(o.promised_date), 1) : String(o.delivered_date), String(o.customer_name), R.pick(['Zalo', 'Email', 'Điện thoại']), 'Giao hàng trễ', delay >= 2 || open ? 'high' : 'normal', open ? 'open' : 'resolved', open ? `Đơn ${o.order_id} chưa nhận sau ${delay} ngày` : `Đơn ${o.order_id} trễ ${delay} ngày`, R.int(8, 36));
  }
  const inv1 = recv.find((r) => Number(r.balance) > 0)!;
  tk(addDays(asOf, -9), String(inv1.customer_name), 'Email', 'Hoá đơn', 'normal', 'resolved', `Sai mã số thuế trên hoá đơn ${inv1.invoice_id}`, 6);
  const q = order[5];
  tk(addDays(asOf, -11), String(q.customer_name), 'Email', 'Chất lượng', 'high', 'resolved', `${R.int(3, 15)} ${unitOf(String(q.product))} ${String(q.product).toLowerCase()} bị lỗi`, 12);
  tk(addDays(asOf, -15), String(order[9].customer_name), 'Zalo', 'Đổi trả', 'low', 'resolved', `Đổi ${R.int(2, 5)} ${unitOf(String(order[9].product))} ${String(order[9].product).toLowerCase()} gần hạn hoặc sai quy cách`, 8);
  tk(addDays(asOf, -18), String(order[3].customer_name), 'Email', 'Đóng gói', 'normal', 'resolved', 'Bao bì ngoài mỏng, hàng bị móp khi giao', 16);
  const debtor = recv.find((r) => Number(r.days_overdue) > 30) ?? inv1;
  tk(addDays(asOf, -22), String(debtor.customer_name), 'Điện thoại', 'Công nợ', 'normal', 'open', `Xin gia hạn thanh toán ${debtor.invoice_id}`, '');
  tk(addDays(asOf, -25), String(order[1].customer_name), 'Email', 'Hoá đơn', 'low', 'resolved', 'Yêu cầu xuất hoá đơn gộp theo tháng', 4);
  while (tickets.length < 12) tk(addDays(asOf, -R.int(3, 26)), String(R.pick(order).customer_name), 'Zalo', 'Giao hàng trễ', 'normal', 'resolved', 'Hỏi lịch giao hàng tuần sau', R.int(2, 10));
  tickets.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  tickets.forEach((t, i) => { t.ticket_id = `T-${1041 - i}`; });

  // ---- deals (pipeline)
  const stages = ['negotiation', 'proposal', 'qualified', 'proposal', 'lead', 'negotiation', 'qualified', 'won', 'proposal', 'lead', 'negotiation', 'lost', 'qualified', 'proposal'];
  const prob: Record<string, number> = { lead: 10, qualified: 30, proposal: 50, negotiation: 70, won: 100, lost: 0 };
  const next: Record<string, string[]> = {
    lead: ['Gọi giới thiệu', 'Gửi hồ sơ năng lực'], qualified: ['Hẹn demo sản phẩm', 'Khảo sát nhu cầu tại chỗ', 'Gửi mẫu thử'],
    proposal: ['Chờ phản hồi đề xuất', 'Trình bày chương trình cuối năm', 'Đàm phán giá theo sản lượng'], negotiation: ['Gửi báo giá lần 2', 'Chờ duyệt chiết khấu 6%', 'Chờ thanh toán công nợ cũ trước khi ký'],
    won: ['Đã ký hợp đồng'], lost: ['Mất vào đối thủ giá thấp hơn'],
  };
  const dealCustomers = [...profile.prospects.map((p) => ({ name: p.name, segment: p.segment })), ...R.shuffle(customers).map((c) => ({ name: c.name, segment: c.segment }))];
  const debtorName = String((recv.filter((r) => Number(r.days_overdue) > 30)[0] ?? inv1).customer_name);
  const deals: Rec[] = stages.map((stage, i) => {
    const who = i === 10 ? { name: debtorName, segment: customers.find((c) => c.name === debtorName)!.segment } : dealCustomers[i % dealCustomers.length];
    const created = addDays(asOf, -R.int(12, 90));
    const idle = [1, 3, 6, 9].includes(i) ? R.int(16, 34) : R.int(1, 8);
    const last = stage === 'won' || stage === 'lost' ? addDays(asOf, -R.int(10, 30)) : addDays(asOf, -idle);
    const close = stage === 'won' || stage === 'lost' ? last : [3, 5].includes(i) ? addDays(asOf, -R.int(3, 12)) : addDays(asOf, R.int(6, 75));
    return {
      deal_id: `D-${201 + i}`, customer: who.name, segment: who.segment, stage, value: Math.max(10_000_000, Math.round((typicalOrder * (2 + R.next() * 6)) / 10_000_000) * 10_000_000),
      probability: prob[stage], owner: managers[segIdx(who.segment) % managers.length], created_date: created < last ? created : addDays(last, -10), last_activity: last,
      next_step: i === 10 ? 'Chờ thanh toán công nợ cũ trước khi ký' : R.pick(next[stage]), expected_close: close,
    };
  });

  // ---- bank statement: matched, name-only, ambiguous, duplicate, partial, unidentified, fees, interest
  const B = (s: string) => fold(s).toUpperCase();
  const openInv = recv.filter((r) => Number(r.balance) > 0);
  const byCust = new Map<string, Rec[]>();
  for (const r of openInv) byCust.set(String(r.customer_id), [...(byCust.get(String(r.customer_id)) ?? []), r]);
  const single = openInv.filter((r) => byCust.get(String(r.customer_id))!.length === 1);
  const multi = [...byCust.values()].find((list) => list.length >= 2) ?? [openInv[0]];
  const usedInv = new Set<string>();
  const take = (list: Rec[]) => { const r = list.find((x) => !usedInv.has(String(x.invoice_id))) ?? list[0]; usedInv.add(String(r.invoice_id)); return r; };
  const multiIds = new Set(multi.map((r) => String(r.invoice_id)));
  const free = openInv.filter((r) => !multiIds.has(String(r.invoice_id)));
  const m1 = take(free.length ? free : openInv);
  const m2 = take(single.filter((r) => !multiIds.has(String(r.invoice_id))).length ? single.filter((r) => !multiIds.has(String(r.invoice_id))) : free);
  const m3 = take(free);
  const dup = take(free);
  const pre = take(free);
  const bank: Rec[] = [];
  const b = (date: string, description: string, amount: number, direction: 'credit' | 'debit') => bank.push({ date, description, amount, direction });
  const month = Number(asOf.slice(5, 7));
  b(addDays(asOf, -7), `CK THANH TOAN ${m1.invoice_id} ${B(String(m1.customer_name))}`, Number(m1.balance), 'credit');
  b(addDays(asOf, -6), `${B(String(m2.customer_name))} TT HOA DON THANG ${month === 1 ? 12 : month - 1}`, Number(m2.balance), 'credit');
  b(addDays(asOf, -5), `${B(String(multi[0].customer_name))} CK`, niceMoney(multi.reduce((n, r) => n + Number(r.balance), 0) * 0.3), 'credit');
  b(addDays(asOf, -4), `${B(String(m3.customer_name)).split(' ').slice(-2).join(' ')} PAYMENT ${String(m3.invoice_id).replace('-', '')}`, Number(m3.balance), 'credit');
  b(addDays(asOf, -4), 'CK TU TK 0123456789 NGUYEN VAN A', 5_000_000, 'credit');
  b(addDays(asOf, -3), `${B(String(dup.customer_name))} TT ${dup.invoice_id}`, Number(dup.balance), 'credit');
  b(addDays(asOf, -2), `${B(String(dup.customer_name))} TT ${dup.invoice_id}`, Number(dup.balance), 'credit');
  b(addDays(asOf, -2), `PHI QUAN LY TAI KHOAN THANG ${month}`, 22_000, 'debit');
  b(addDays(asOf, -1), `TT NCC ${B(products[1].supplier)} PO-1189`, niceMoney(Number(inventory[1].unit_cost) * Number(inventory[1].reorder_point)), 'debit');
  b(addDays(asOf, -1), `${B(String(pre.customer_name))} CK TRUOC ${pre.invoice_id}`, niceMoney(Number(pre.balance) * 0.4), 'credit');
  b(asOf, 'LAI TIEN GUI KY HAN', 185_000, 'credit');
  bank.forEach((t, i) => { t.txn_id = `BT${String(i + 1).padStart(2, '0')}`; });

  // ---- expenses: same policy limits as the generated expense rules
  const d = profile.departments;
  const sales = d[0] ?? 'Kinh doanh', acct = d[1] ?? 'Kế toán', ops = d[3] ?? 'Kho vận', hr = d[4] ?? 'Nhân sự';
  const people = R.shuffle(STAFF);
  const [s1, s2, s3, a1, o1, h1] = people;
  const c0 = customers[3].name, c1 = customers[7].name, c2 = customers[8].name;
  const far = customers.find((c) => c.city !== 'Hồ Chí Minh')?.city ?? 'Đồng Nai';
  const late = addDays(asOf, -48);
  const exp: Rec[] = [
    [s1, sales, -23, -21, 'taxi', 185_000, '', '', 'yes', `Taxi đi gặp ${c0}`],
    [s1, sales, -23, -21, 'taxi', 420_000, '', '', 'no', `Taxi ${far} về văn phòng`],
    [s2, sales, -20, -19, 'meal', 2_400_000, '', 4, 'yes', `Tiếp khách ${c1}`],
    [s3, sales, -16, -14, 'hotel', 1_500_000, 2, '', 'yes', `Khách sạn ${far} 2 đêm`],
    [s3, sales, -16, -14, 'per_diem', 800_000, 2, '', 'no', `Công tác phí ${far} 2 ngày`],
    [a1, acct, 0, -8, 'taxi', 150_000, '', '', 'yes', 'Taxi đi ngân hàng'],
    [o1, ops, -13, -12, 'other', 350_000, '', '', 'no', 'Mua vật tư đóng gói gấp'],
    [s2, sales, -10, -9, 'hotel', 2_100_000, 2, '', 'yes', 'Khách sạn hội nghị khách hàng'],
    [s1, sales, -8, -7, 'taxi', 210_000, '', '', 'yes', `Taxi đi ${c2}`],
    [s1, sales, -8, -7, 'taxi', 210_000, '', '', 'yes', `Taxi đi ${c2}`],
    [h1, hr, -6, -5, 'meal', 900_000, '', 3, 'yes', 'Ăn trưa cùng ứng viên vòng cuối'],
    [s3, sales, -4, -3, 'per_diem', 150_000, 1, '', 'no', 'Công tác phí nội thành'],
    [o1, ops, -3, -2, 'taxi', 95_000, '', '', 'yes', 'Taxi chở mẫu hàng'],
    [a1, acct, -2, -1, 'other', 1_800_000, '', '', 'no', 'Gia hạn phần mềm kế toán'],
  ].map((e, i) => ({
    claim_id: `E-${String(i + 1).padStart(2, '0')}`, employee: e[0] as string, department: e[1] as string,
    expense_date: i === 5 ? late : addDays(asOf, e[2] as number), submitted_date: addDays(asOf, e[3] as number),
    category: e[4] as string, amount: e[5] as number, nights: e[6] as number | string, pax: e[7] as number | string, has_invoice: e[8] as string, description: e[9] as string,
  }));

  // ---- reviews: themes the voice-of-customer agent looks for
  const lateList = lateOrders.length ? lateOrders : [order[0]];
  const delivOk = order.filter((o) => o.status === 'delivered' && o.delivered_date === o.promised_date);
  const ok = (i: number) => delivOk[i % Math.max(1, delivOk.length)] ?? order[i];
  const L = (i: number) => lateList[i % lateList.length];
  const anyP = () => R.pick(products).name;
  const lateDays = (o: Rec) => (o.delivered_date ? daysBetween(String(o.promised_date), String(o.delivered_date)) : daysBetween(String(o.promised_date), asOf));
  const reviewsRaw: [number, string, Rec | null, number, string][] = [
    [-25, 'Google', L(0), 2, `Giao trễ ${Math.max(1, lateDays(L(0)))} ngày, phải mua hàng ngoài cho kịp.`],
    [-23, 'Zalo', ok(0), 4, 'Giao đúng hẹn, nhân viên thân thiện. Thùng carton hơi mỏng.'],
    [-21, 'Facebook', ok(1), 3, `${R.int(2, 5)} kiện bị móp, đổi hàng nhanh nhưng mất công kiểm.`],
    [-19, 'Google', L(1), 2, `Trễ ${Math.max(1, lateDays(L(1)))} ngày vì thiếu xe, gọi hotline không ai nghe.`],
    [-18, 'Zalo', ok(2), 5, 'Giao chuẩn, hoá đơn điện tử gửi ngay. Rất hài lòng.'],
    [-17, 'Google', ok(3), 4, 'Giá tốt hơn nhà cung cấp cũ, mong có chiết khấu theo tháng.'],
    [-14, 'Facebook', null, 1, 'Hàng bị rò rỉ, đóng gói sơ sài.'],
    [-12, 'Google', ok(4), 5, 'Nhân viên kinh doanh hỗ trợ nhiệt tình.'],
    [-10, 'Zalo', L(2), 2, 'Giao trễ, xe giao hàng không gọi trước.'],
    [-8, 'Facebook', null, 3, 'Chất lượng ổn nhưng giá cao hơn thị trường.'],
    [-6, 'Google', ok(5), 5, 'Giao sớm hơn hẹn, đóng gói chắc chắn.'],
    [-5, 'Facebook', null, 2, `Bao bì rách, thiếu ${R.int(1, 3)} sản phẩm.`],
    [-4, 'Zalo', ok(6), 4, 'Ổn nhưng hoá đơn gửi chậm 3 ngày.'],
    [-3, 'Google', L(3), 3, `Trễ ${Math.max(1, lateDays(L(3)))} ngày, giá cạnh tranh.`],
    [-2, 'Facebook', L(4), 3, 'Trễ 1 ngày làm gián đoạn kế hoạch cuối tuần.'],
    [0, 'Zalo', complaintOrder, 1, `Đơn ${complaintOrder.order_id} trễ gần 1 tuần không ai báo, sẽ cân nhắc đổi nhà cung cấp.`],
  ];
  const reviews: Rec[] = reviewsRaw.map(([dd, source, o, rating, text], i) => ({
    review_id: `R${String(i + 1).padStart(2, '0')}`, date: addDays(asOf, dd), source, customer: o ? String(o.customer_name) : 'Khách lẻ', rating,
    product: o ? String(o.product) : anyP(), order_id: o ? Number(o.order_id) : '', text,
  }));

  // ---- internal AI-usage survey
  const TASKS: Record<string, string[]> = {
    'kinh doanh': ['Soạn email báo giá', 'Viết tin nhắn Zalo cho khách', 'Tổng hợp doanh số'], 'ke toan': ['Đối soát công nợ', 'Nhập hoá đơn', 'Đối chiếu sao kê'],
    cskh: ['Trả lời khiếu nại', 'Trả lời Zalo', 'Tổng hợp ticket'], 'kho van': ['Báo cáo tồn kho', 'Lập phiếu xuất kho', 'Xếp lịch xe'],
    'nhan su': ['Soạn JD và hợp đồng', 'Trả lời câu hỏi nội quy', 'Sàng lọc hồ sơ'], 'mua hang': ['So sánh báo giá', 'Theo dõi đơn đặt hàng', 'Đàm phán nhà cung cấp'],
    'ban giam doc': ['Đọc báo cáo', 'Chuẩn bị họp', 'Soạn thư gửi đối tác'], marketing: ['Viết bài Facebook', 'Thiết kế banner', 'Lên kế hoạch nội dung'],
  };
  const DATA: Record<string, string> = { 'kinh doanh': 'customer_data', 'ke toan': 'financial', cskh: 'customer_data', 'nhan su': 'employee_data', 'mua hang': 'financial', 'ban giam doc': 'financial' };
  const survey: Rec[] = [];
  let sid = 1;
  for (const dept of d.slice(0, 8)) {
    const key = fold(dept);
    const n = key === 'ban giam doc' ? 2 : 3;
    for (let j = 0; j < n && sid <= 24; j++) {
      const uses = j === 0 || R.chance(0.68);
      const personal = uses && R.chance(0.74);
      survey.push({
        employee_id: `S${String(sid++).padStart(2, '0')}`, department: dept, role: key === 'ban giam doc' ? (j === 0 ? 'Giám đốc' : 'Phó giám đốc') : j === 0 ? 'Trưởng phòng' : 'Nhân viên',
        uses_ai: uses ? 'yes' : 'no', main_tool: uses ? R.pick(['ChatGPT', 'ChatGPT', 'ChatGPT', 'Gemini', 'Copilot', 'Claude']) : 'none', account_type: uses ? (personal ? 'personal' : 'company') : 'none',
        frequency: uses ? R.pick(['daily', 'daily', 'weekly', 'rarely']) : 'never', data_shared: uses && personal ? (DATA[key] ?? R.pick(['internal_docs', 'none'])) : 'none',
        repetitive_hours_week: R.int(3, 12), trained: !personal && uses ? 'yes' : R.chance(0.1) ? 'yes' : 'no', top_task: R.pick(TASKS[key] ?? ['Soạn email', 'Tổng hợp báo cáo', 'Nhập liệu']),
      });
    }
  }
  while (survey.length < 24) survey.push({ ...survey[survey.length % Math.max(1, survey.length)], employee_id: `S${String(sid++).padStart(2, '0')}` });

  const cols = (rows: Rec[], order: string[]) => ({ rows, order });
  const tables: [string, string, ReturnType<typeof cols>][] = [
    ['customers', `Danh sách khách hàng: phân khúc, thành phố, liên hệ, hạn mức tín dụng, người phụ trách`, cols(customers, ['customer_id', 'name', 'segment', 'city', 'contact', 'phone', 'email', 'credit_limit', 'account_manager'])],
    ['orders', `Đơn hàng 4 tuần gần nhất: sản phẩm, số lượng, tiền, trạng thái, ngày hẹn/ngày giao, vận chuyển`, cols(order, ['order_id', 'order_date', 'customer_id', 'customer_name', 'product', 'qty', 'unit_price', 'amount', 'status', 'promised_date', 'delivered_date', 'carrier', 'region'])],
    ['receivables', `Công nợ phải thu: hoá đơn, hạn thanh toán, số dư, số ngày quá hạn (tính đến ${vnDate(asOf)}/${asOf.slice(0, 4)})`, cols(recv, ['invoice_id', 'customer_id', 'customer_name', 'segment', 'issue_date', 'due_date', 'amount', 'paid', 'balance', 'days_overdue', 'account_manager'])],
    ['inventory', 'Tồn kho theo mã hàng: tồn thực tế, đã giữ, điểm đặt hàng lại, lead time, bán trung bình/ngày, nhà cung cấp', cols(inventory, ['sku', 'product', 'category', 'on_hand', 'reserved', 'reorder_point', 'lead_time_days', 'avg_daily_sales', 'unit_cost', 'supplier', 'last_restock'])],
    ['tickets', 'Ticket chăm sóc khách hàng: kênh, loại, mức ưu tiên, trạng thái, giờ xử lý', cols(tickets, ['ticket_id', 'created_at', 'customer_name', 'channel', 'category', 'priority', 'status', 'summary', 'resolution_hours'])],
    ['price_list', `Bảng giá theo phân khúc (${profile.segments.join(', ')}), chưa VAT, đơn vị tính, số lượng tối thiểu`, cols(priceRows, ['sku', 'product', 'unit', 'list_price', ...segCols, 'min_qty'])],
    ['deals', 'Pipeline bán hàng: giai đoạn, giá trị, xác suất, người phụ trách, hoạt động gần nhất, bước tiếp theo', cols(deals, ['deal_id', 'customer', 'segment', 'stage', 'value', 'probability', 'owner', 'created_date', 'last_activity', 'next_step', 'expected_close'])],
    ['bank_transactions', 'Sao kê ngân hàng 7 ngày gần nhất (tiền vào/ra, nội dung chuyển khoản)', cols(bank, ['txn_id', 'date', 'description', 'amount', 'direction'])],
    ['expenses', 'Đề nghị thanh toán chi phí trong tháng (taxi, khách sạn, tiếp khách, công tác phí)', cols(exp, ['claim_id', 'employee', 'department', 'expense_date', 'submitted_date', 'category', 'amount', 'nights', 'pax', 'has_invoice', 'description'])],
    ['reviews', 'Đánh giá khách hàng gần đây từ Google, Zalo, Facebook', cols(reviews, ['review_id', 'date', 'source', 'customer', 'rating', 'product', 'order_id', 'text'])],
    ['ai_survey', `Khảo sát sử dụng AI nội bộ (${survey.length} nhân viên): công cụ, loại tài khoản, dữ liệu đã đưa vào AI, giờ việc lặp lại/tuần, đã được đào tạo chưa`, cols(survey, ['employee_id', 'department', 'role', 'uses_ai', 'main_tool', 'account_type', 'frequency', 'data_shared', 'repetitive_hours_week', 'trained', 'top_task'])],
  ];
  return tables.map(([name, description, t]) => ({ name, description, csv: toCsv(t.order, t.rows), rows: t.rows.length, columns: t.order }));
}

/* ------------------------------------------------------------- extra tables */

const STATUS_VALUES: [RegExp, string[]][] = [
  [/trang thai|tinh trang|status/, ['Mới', 'Đang xử lý', 'Hoàn thành', 'Tạm dừng']],
  [/uu tien|muc do|priority/, ['Cao', 'Trung bình', 'Thấp']],
  [/kenh|channel|nguon/, ['Zalo', 'Email', 'Điện thoại', 'Website']],
  [/thanh toan|payment/, ['Chuyển khoản', 'Tiền mặt', 'Công nợ 30 ngày']],
  [/gioi tinh|gender/, ['Nam', 'Nữ']],
  [/ca lam|shift/, ['Ca sáng', 'Ca chiều', 'Ca tối']],
];
const TEXTS = ['Đã xác nhận với khách', 'Chờ phản hồi', 'Cần kiểm tra lại số liệu', 'Ưu tiên xử lý trong tuần', 'Khách hẹn gọi lại', 'Đã gửi chứng từ', ''];

/** Guess a column's kind from its header (Vietnamese or English, with or without accents). */
export function inferColumn(header: string): { name: string; label: string; kind: ColumnKind; values?: string[] } {
  const label = header.trim().replace(/^"|"$/g, '');
  const f = fold(label);
  const name = f.replace(/ /g, '_').slice(0, 40) || 'cot';
  const has = (re: RegExp) => re.test(f);
  if (has(/email|thu dien tu/)) return { name, label, kind: 'email' };
  if (has(/sdt|so dien thoai|dien thoai|phone|mobile|tel\b/)) return { name, label, kind: 'phone' };
  if (has(/ngay|date|han |^han$|thoi han|deadline|thang nam|thoi gian/)) return { name, label, kind: 'date' };
  if (has(/(^| )(ma|id|so hd|so phieu|so don|code|no|stt)( |$)/)) return { name, label, kind: 'id' };
  if (has(/khach|customer|client|doi tac|ten cong ty|don vi mua/)) return { name, label, kind: 'customer' };
  if (has(/san pham|hang hoa|mat hang|product|item|sku|vat tu|dich vu/)) return { name, label, kind: 'product' };
  if (has(/ty le|phan tram|percent|%|chiet khau/)) return { name, label, kind: 'percent' };
  if (has(/so luong|(^| )sl( |$)|qty|quantity|ton kho|so gio|so ngay|tuoi|count|diem/)) return { name, label, kind: 'integer' };
  if (has(/so tien|thanh tien|don gia|(^| )gia( |$)|amount|price|cost|chi phi|doanh thu|(^| )luong( |$)|salary|total|tong tien|cong no|du no|(^| )von( |$)/)) return { name, label, kind: 'money' };
  for (const [re, values] of STATUS_VALUES) if (has(re)) return { name, label, kind: 'enum', values };
  if (has(/loai|nhom|category|type|phong ban|bo phan|khu vuc|chi nhanh|region/)) return { name, label, kind: 'enum' };
  if (has(/co |khong|da |yes|no$/)) return { name, label, kind: 'boolean' };
  if (has(/nhan vien|nguoi|phu trach|owner|staff|ho ten|ten nv|sale|quan ly/)) return { name, label, kind: 'person' };
  return { name, label, kind: 'text' };
}

/**
 * Parse pasted headers. Each non-empty line is one table: either "table name: col1, col2" or a
 * bare header row (comma, tab or semicolon separated). Returns table specs (20 rows each).
 */
export function parseHeaderBlocks(text: string, taken: string[] = []): ExtraTableSpec[] {
  const out: ExtraTableSpec[] = [];
  const used = new Set(taken);
  let n = 1;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^([^:,;\t]{2,60}):\s*(.+)$/.exec(line);
    const title = m ? m[1].trim() : '';
    const body = m ? m[2] : line;
    const sep = body.includes('\t') ? '\t' : body.includes(';') ? ';' : ',';
    const headers = body.split(sep).map((h) => h.trim()).filter(Boolean).slice(0, 25);
    if (headers.length < 2) continue;
    const seen = new Set<string>();
    const columns = headers.map(inferColumn).map((c) => { let nm = c.name; let k = 2; while (seen.has(nm)) nm = `${c.name}_${k++}`; seen.add(nm); return { ...c, name: nm }; });
    let name = fold(title).replace(/ /g, '_').slice(0, 40) || `bang_${n}`;
    let k = 2;
    const base = name;
    while (used.has(name)) name = `${base}_${k++}`;
    used.add(name);
    out.push({ name, description: title ? `${title} (theo cấu trúc file của khách)` : `Bảng ${n} theo cấu trúc file của khách`, rows: 20, columns });
    n++;
  }
  return out;
}

export function generateExtraTable(spec: ExtraTableSpec, profile: IndustryProfile, asOf: string, seed: string): GeneratedTable {
  const R = new Rand(seeded(`${seed}|${spec.name}`));
  const rows: Rec[] = [];
  const count = Math.min(200, Math.max(1, spec.rows || 20));
  const colBy = (kind: ColumnKind, re: RegExp) => spec.columns.find((c) => c.kind === kind && re.test(fold(c.label)))?.name;
  const qtyCol = colBy('integer', /so luong|sl|qty|quantity/);
  const unitCol = colBy('money', /don gia|gia|price|unit/);
  const totalCol = colBy('money', /thanh tien|tong|amount|total|gia tri/);
  const prefix = (label: string) => (fold(label).split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'ID');
  for (let i = 0; i < count; i++) {
    const row: Rec = {};
    const cust = R.pick(profile.customers);
    const prod = R.pick(profile.products);
    for (const col of spec.columns) {
      const min = col.min ?? 0;
      switch (col.kind) {
        case 'id': row[col.name] = `${prefix(col.label)}-${String(1001 + i)}`; break;
        case 'customer': row[col.name] = cust.name; break;
        case 'product': row[col.name] = prod.name; break;
        case 'person': row[col.name] = R.pick(STAFF); break;
        case 'email': row[col.name] = `${fold(cust.contact).split(' ').pop() || 'lienhe'}${i}@${fold(cust.name).split(' ').slice(-1)[0] || 'congty'}.example`; break;
        case 'phone': row[col.name] = `09${R.int(10_000_000, 99_999_999)}`; break;
        case 'date': row[col.name] = addDays(asOf, -R.int(0, 45)); break;
        case 'money': row[col.name] = niceMoney(col.max ? min + R.next() * (col.max - min) : prod.price * R.int(1, Math.max(2, profile.qtyRange[1] / 4))); break;
        case 'integer': row[col.name] = col.max ? R.int(min, col.max) : niceQty(profile.qtyRange[0] + R.next() * (profile.qtyRange[1] - profile.qtyRange[0]) * 0.5); break;
        case 'percent': row[col.name] = col.max ? R.int(min, col.max) : R.int(0, 15); break;
        case 'boolean': row[col.name] = R.chance(0.7) ? 'yes' : 'no'; break;
        case 'enum': row[col.name] = R.pick(col.values?.length ? col.values : /phong ban|bo phan/.test(fold(col.label)) ? profile.departments : /khu vuc|chi nhanh|region/.test(fold(col.label)) ? [...new Set(profile.customers.map((c) => c.city))] : profile.segments); break;
        default: row[col.name] = col.values?.length ? R.pick(col.values) : R.pick(TEXTS);
      }
    }
    // Keep totals consistent: line total = quantity × unit price when the table has all three.
    if (qtyCol && unitCol && totalCol) {
      row[unitCol] = niceMoney(prod.price);
      row[totalCol] = Number(row[qtyCol]) * Number(row[unitCol]);
    }
    rows.push(row);
  }
  const columns = spec.columns.map((c) => c.name);
  return { name: spec.name, description: spec.description, csv: toCsv(columns, rows), rows: rows.length, columns };
}

export function generateAll(bp: DataBlueprint): GeneratedTable[] {
  const seed = `${bp.company}|${bp.profile.label}`;
  return [...generateCanonical(bp.company, bp.profile, bp.asOf, seed), ...bp.extraTables.map((t) => generateExtraTable(t, bp.profile, bp.asOf, seed))];
}
