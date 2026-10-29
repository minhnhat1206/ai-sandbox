/**
 * Scripted demo agents, second wave. Same contract as mock-agents.ts: every figure
 * comes from a real tool call on the sandbox data; only the narration is canned.
 */
import { parseCsv, toCsv, toNumber, type Row } from '../../shared/engine/csv.ts';
import { addDays, compact, daysBetween, esc, fmt, fold, html, kpi, pct, rowsOf, svgBars, T, tableHtml, monthOf, segCol, type Script, type ScriptCtx } from './mock-kit.ts';

const num = (v: unknown) => toNumber(v) ?? 0;
const all = async (c: ScriptCtx, source: string, extra: Record<string, unknown> = {}) => rowsOf((await c.call('query_records', { source, limit: 50, ...extra })).data);
const agg = async (c: ScriptCtx, args: Record<string, unknown>) => rowsOf((await c.call('aggregate_records', { limit: 50, ...args })).data);
const calc = async (c: ScriptCtx, expression: string) => num(((await c.call('calculate', { expression })).data as { value?: number }).value);
/** Segment price for a price-list row, falling back to the list price. */
const segPrice = (p: Row, segment: string | undefined) => num(p[segCol(segment)] ?? p.list_price) || num(p.list_price);

function findCustomer(customers: Row[], text: string): Row | undefined {
  const f = fold(text);
  return customers.find((cu) => f.includes(fold(cu.name))) ?? customers.find((cu) => {
    const generic = ['sieu', 'chuoi', 'hang', 'cua', 'thanh', 'tien', 'loi', 'nha', 'khach', 'cong', 'hoa', 'thong'];
    const toks = fold(cu.name).split(' ').filter((t) => t.length > 3 && !generic.includes(t));
    return toks.length > 0 && toks.every((t) => f.includes(t));
  });
}

function matchProduct(products: Row[], line: string): Row | undefined {
  const f = ` ${fold(line)} `;
  let best: Row | undefined;
  let bestScore = 1;
  for (const p of products) {
    const toks = fold(p.product).split(' ').filter((t) => t && !/^\d+$/.test(t));
    const score = toks.filter((t) => f.includes(` ${t} `)).length;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best;
}

/* ================================================================= quote */
const quoteBuilder: Script = async (c) => {
  const req = c.inputs.request ?? '';
  const validity = num(c.inputs.validity) || 15;
  c.say('Nhận diện khách hàng và đọc bảng giá theo phân khúc.', 'Identifying the customer and reading the segment price list.');
  const customers = await all(c, 'customers');
  const cust = findCustomer(customers, req);
  const prices = await all(c, 'price_list');
  const policy = (await c.call('search_knowledge', { query: 'chiết khấu giá trị đơn hạn mức tín dụng VAT', limit: 4 })).data as { results?: { title: string; passage: string }[] };

  const lines = req.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[-•*]|^\d/.test(l));
  c.say('Kiểm tra tồn kho từng mặt hàng.', 'Checking stock for each line.');
  const quoteLines: Record<string, string | number>[] = [];
  const shortages: string[] = [];
  for (const l of lines) {
    const qty = num(/(\d[\d.,]*)/.exec(l)?.[1]);
    const p = matchProduct(prices, l);
    if (!p || !qty) continue;
    const inv = (await all(c, 'inventory', { where: [{ field: 'sku', op: 'eq', value: p.sku }] }))[0];
    const available = num(inv?.on_hand) - num(inv?.reserved);
    const unit = segPrice(p, cust?.segment);
    const short = Math.max(0, qty - available);
    const eta = short ? addDays(c.today, num(inv?.lead_time_days) + 3) : addDays(c.today, 3);
    if (short) shortages.push(`${p.product}: thiếu ${fmt(short)} ${p.unit} (tồn khả dụng ${fmt(available)}, nhập về ~${num(inv?.lead_time_days)} ngày)`);
    quoteLines.push({ sku: p.sku, product: p.product, unit: p.unit, qty, unit_price: unit, amount: qty * unit, available, delivery: short ? `${eta} (chờ nhập ${fmt(short)})` : eta });
  }
  const subtotal = await calc(c, quoteLines.map((q) => q.amount).join(' + ') || '0');
  const policyText = (policy.results ?? []).map((r) => r.passage).join('\n');
  const bonusSegment = /Khách\s+(.+?)\s+được cộng thêm 1%/.exec(policyText)?.[1]?.trim();
  const isWholesale = !!cust?.segment && cust.segment === bonusSegment;
  const rate = (subtotal >= 300_000_000 ? 4 : subtotal >= 100_000_000 ? 2 : 0) + (isWholesale && subtotal >= 100_000_000 ? 1 : 0);
  const discount = await calc(c, `round(${subtotal} * ${rate} / 100)`);
  const vat = await calc(c, `round((${subtotal} - ${discount}) * 0.08)`);
  const total = await calc(c, `${subtotal} - ${discount} + ${vat}`);
  c.say('Đối chiếu công nợ hiện tại với hạn mức tín dụng.', 'Checking open balance against the credit limit.');
  const open = cust ? await all(c, 'receivables', { where: [{ field: 'customer_id', op: 'eq', value: cust.customer_id }, { field: 'balance', op: 'gt', value: 0 }] }) : [];
  const openBal = open.reduce((n, r) => n + num(r.balance), 0);
  const limit = num(cust?.credit_limit);
  const exposure = await calc(c, `${openBal} + ${total}`);
  const overLimit = limit > 0 && exposure > limit;
  const overdue30 = open.filter((r) => num(r.days_overdue) > 30);
  const needsApproval = rate > 5 || overLimit || overdue30.length > 0;
  const actions: string[] = [];
  if (needsApproval) {
    const tk = (await c.call('create_ticket', { customer: cust?.name ?? '', subject: `Duyệt báo giá ${cust?.name ?? ''} ${fmt(total)} đ`, priority: 'high', summary: `${overLimit ? `Công nợ + đơn = ${fmt(exposure)} đ vượt hạn mức ${fmt(limit)} đ. ` : ''}${overdue30.length ? `Có ${overdue30.length} hoá đơn quá hạn > 30 ngày. ` : ''}${rate > 5 ? `Chiết khấu ${rate}% > 5%. ` : ''}Cần duyệt trước khi gửi.`, assignee: overLimit || overdue30.length ? 'Kế toán trưởng' : 'Giám đốc kinh doanh', dueDate: addDays(c.today, 1) })).data as { ticketId?: string };
    actions.push(`Ticket duyệt ${tk.ticketId}`);
  }
  if (shortages.length) {
    const tk = (await c.call('create_ticket', { customer: cust?.name ?? '', subject: `Thiếu hàng cho báo giá ${cust?.name ?? ''}`, priority: 'high', summary: `Cần đặt bổ sung / giữ hàng:\n${shortages.join('\n')}`, assignee: 'Phòng Mua hàng', dueDate: addDays(c.today, 1) })).data as { ticketId?: string };
    actions.push(`Ticket mua hàng ${tk.ticketId}`);
  }
  const qno = `BG-${c.today.replace(/-/g, '').slice(2)}-${(cust?.customer_id ?? 'X').replace(/\D/g, '')}`;
  const rowsHtml = quoteLines.map((q, i) => ({ '#': i + 1, 'Mặt hàng': q.product, 'ĐVT': q.unit, 'Số lượng': fmt(num(q.qty)), 'Đơn giá': fmt(num(q.unit_price)), 'Thành tiền': fmt(num(q.amount)), 'Giao dự kiến': q.delivery }));
  await c.call('create_artifact', {
    kind: 'html', title: 'Quotation',
    content: html(`BÁO GIÁ ${qno}`, `Ngày ${c.today} · Hiệu lực ${validity} ngày (đến ${addDays(c.today, validity)}) · Giá chưa gồm VAT 8%`, `<div class="grid">${kpi('Khách hàng', cust?.name ?? '—', `${cust?.segment ?? ''} · ${cust?.contact ?? ''}`)}${kpi('Tổng thanh toán', `${fmt(total)} đ`, `gồm VAT ${fmt(vat)} đ`)}${kpi('Chiết khấu', `${rate}%`, `${fmt(discount)} đ`)}${kpi('Người phụ trách', cust?.account_manager ?? '—', c.company)}</div><div class="card"><h2>Chi tiết</h2>${tableHtml(['#', 'Mặt hàng', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Giao dự kiến'], rowsHtml)}<table style="margin-top:12px;max-width:360px;margin-left:auto"><tr><td>Cộng tiền hàng</td><td style="text-align:right">${fmt(subtotal)}</td></tr><tr><td>Chiết khấu ${rate}%</td><td style="text-align:right">-${fmt(discount)}</td></tr><tr><td>VAT 8%</td><td style="text-align:right">${fmt(vat)}</td></tr><tr><td><b>Tổng thanh toán</b></td><td style="text-align:right"><b>${fmt(total)}</b></td></tr></table></div><div class="card"><h2>Điều khoản</h2><p>Giao tại kho khách trong 3 ngày làm việc với hàng có sẵn. ${shortages.length ? `<span class="tag warn">Một số mặt hàng chờ nhập</span>` : ''} Thanh toán theo hạn mức tín dụng hiện hành. Báo giá có hiệu lực ${validity} ngày.</p></div>`),
  });
  await c.call('create_artifact', { kind: 'table', title: 'Quote lines', columns: ['sku', 'product', 'unit', 'qty', 'unit_price', 'amount', 'available', 'delivery'], rows: quoteLines });
  await c.call('draft_email', { to: cust?.email || cust?.name || 'khách hàng', subject: `Báo giá ${qno} – ${cust?.name ?? ''}`, body: `Kính gửi ${cust?.contact ?? 'Quý khách'},\n\nCảm ơn ${cust?.name ?? 'Quý khách'} đã gửi yêu cầu. Chúng tôi gửi báo giá ${qno} cho ${quoteLines.length} mặt hàng, tổng thanh toán ${fmt(total)} đ (đã gồm chiết khấu ${rate}% và VAT 8%).\n\n${quoteLines.map((q) => `- ${q.product}: ${fmt(num(q.qty))} ${q.unit} × ${fmt(num(q.unit_price))} đ, giao ${q.delivery}`).join('\n')}\n\n${shortages.length ? 'Một số mặt hàng cần nhập thêm; chúng tôi sẽ xác nhận lịch giao cụ thể trong 24 giờ.\n\n' : ''}Báo giá có hiệu lực đến ${addDays(c.today, validity)}.\n\nTrân trọng,\n${cust?.account_manager ?? ''} – Phòng Kinh doanh` });
  void policy;
  return T(c.lang,
    `**Báo giá ${qno}** cho ${cust?.name ?? '(chưa nhận diện được khách)'} (${cust?.segment ?? ''}): ${quoteLines.length} mặt hàng, tiền hàng ${fmt(subtotal)} đ, chiết khấu **${rate}%** theo chính sách, tổng thanh toán **${fmt(total)} đ**. Công nợ hiện tại ${fmt(openBal)} đ + đơn này = ${fmt(exposure)} đ ${overLimit ? `**vượt** hạn mức ${fmt(limit)} đ` : `trong hạn mức ${fmt(limit)} đ`}. ${shortages.length ? `Thiếu hàng: ${shortages.join('; ')}.` : 'Đủ tồn kho.'} Đã thực hiện: ${actions.join(', ') || 'không cần duyệt'}, email báo giá chờ bạn duyệt gửi.`,
    `**Quote ${qno}** for ${cust?.name ?? '(customer not identified)'} (${cust?.segment ?? ''}): ${quoteLines.length} lines, subtotal ${fmt(subtotal)} VND, **${rate}%** policy discount, total **${fmt(total)} VND**. Open balance ${fmt(openBal)} + this order = ${fmt(exposure)} ${overLimit ? `**exceeds** the ${fmt(limit)} limit` : `within the ${fmt(limit)} limit`}. ${shortages.length ? `Shortfalls: ${shortages.join('; ')}.` : 'All in stock.'} Done: ${actions.join(', ') || 'no approval needed'}; the quote email awaits your approval.`);
};

/* ================================================================= inbox */
const inboxTriage: Script = async (c) => {
  const msgs = (c.inputs.messages ?? '').split(/\n\s*-{3,}\s*\n/).map((m) => m.trim()).filter(Boolean);
  c.say(`Đọc ${msgs.length} tin nhắn và tra cứu khách hàng.`, `Reading ${msgs.length} messages and looking up customers.`);
  const customers = await all(c, 'customers');
  const prices = await all(c, 'price_list');
  const board: Record<string, string | number>[] = [];
  let i = 0;
  for (const m of msgs) {
    i++;
    const sender = /^Từ:\s*(.+)$/im.exec(m)?.[1]?.trim() ?? m.split('\n')[0].slice(0, 60);
    const body = m.replace(/^Từ:.*$/im, '').trim();
    const f = fold(body);
    const cust = findCustomer(customers, sender);
    const orderId = /\b(4\d{4})\b/.exec(body)?.[1];
    let type = 'other', priority = 'normal', facts = '', action = '';
    if (/trung thuong|bam link|http|click/.test(f)) { type = 'spam'; priority = 'ignore'; facts = 'Tin lừa đảo / quảng cáo'; action = 'Bỏ qua, không mở link'; }
    else if (/chuyen|doi chieu|cong no|thanh toan/.test(f)) {
      type = 'payment';
      const inv = cust ? await all(c, 'receivables', { where: [{ field: 'customer_id', op: 'eq', value: cust.customer_id }, { field: 'balance', op: 'gt', value: 0 }] }) : [];
      const amount = num(/(\d+)\s*(tr|trieu)/.exec(f)?.[1]) * 1_000_000;
      facts = `${inv.length} hoá đơn mở: ${inv.map((r) => `${r.invoice_id} ${fmt(num(r.balance))} đ (${r.days_overdue} ngày)`).join(', ')}`;
      priority = inv.some((r) => num(r.days_overdue) > 30) ? 'high' : 'normal';
      const tk = (await c.call('create_ticket', { customer: cust?.name ?? sender, subject: `Đối soát khoản ${fmt(amount)} đ của ${cust?.name ?? sender}`, priority, summary: `Khách báo đã chuyển ${fmt(amount)} đ. Không khớp đúng hoá đơn nào: ${facts}. Cần kế toán phân bổ và gửi đối chiếu công nợ.`, assignee: 'Kế toán công nợ', dueDate: addDays(c.today, 1) })).data as { ticketId?: string };
      const em = (await c.call('draft_email', { to: cust?.email || sender, subject: `Xác nhận khoản thanh toán ${fmt(amount)} đ`, body: `Kính gửi ${cust?.name ?? 'Quý khách'},\n\nChúng tôi đã nhận thông tin chuyển khoản ${fmt(amount)} đ. Hiện công nợ mở gồm:\n${inv.map((r) => `- ${r.invoice_id}: ${fmt(num(r.balance))} đ, quá hạn ${r.days_overdue} ngày`).join('\n')}\n\nNhờ Quý khách xác nhận khoản thanh toán áp vào hoá đơn nào; kế toán sẽ gửi biên bản đối chiếu trong ngày.\n\nTrân trọng,\nPhòng Kế toán` })).data as { draftId?: string };
      action = `${tk.ticketId} + ${em.draftId}`;
    } else if (/chua thay|tre|ro ri|hong|huy|doi giup|loi/.test(f)) {
      type = 'complaint';
      const order = orderId ? (await all(c, 'orders', { where: [{ field: 'order_id', op: 'eq', value: orderId }] }))[0] : cust ? (await all(c, 'orders', { where: [{ field: 'customer_id', op: 'eq', value: cust.customer_id }], sort: { field: 'order_date', dir: 'desc' }, limit: 1 }))[0] : undefined;
      const late = order && !order.delivered_date ? daysBetween(order.promised_date, c.today) : 0;
      priority = late > 3 || /huy/.test(f) ? 'urgent' : 'high';
      facts = order ? `Đơn ${order.order_id} ${order.product} – ${order.status}${late > 0 ? `, trễ ${late} ngày` : ''}` : 'Không tìm thấy đơn';
      const tk = (await c.call('create_ticket', { customer: cust?.name ?? sender, subject: /ro ri|doi/.test(f) ? `Đổi hàng lỗi – ${cust?.name ?? sender}` : `Đơn ${order?.order_id ?? ''} trễ – ${cust?.name ?? sender}`, priority, summary: `${body.slice(0, 300)}\n\nDữ liệu: ${facts}.`, assignee: /ro ri|doi/.test(f) ? 'Kho vận' : 'Trưởng ca giao nhận', dueDate: c.today })).data as { ticketId?: string };
      const em = (await c.call('draft_email', { to: cust?.email || sender, subject: /ro ri|doi/.test(f) ? 'Đổi hàng lỗi' : `Đơn ${order?.order_id ?? ''} – cập nhật giao hàng`, body: /ro ri|doi/.test(f) ? `Dạ chào ${cust?.contact ?? 'anh/chị'}, em xin lỗi vì hàng bị lỗi. Bên em sẽ đổi mới trong lần giao tới (ticket ${tk.ticketId}), anh/chị giữ giúp em chai lỗi để đối chiếu ạ.` : `Dạ chào ${cust?.contact ?? 'anh/chị'}, em rất xin lỗi vì đơn ${order?.order_id ?? ''} ${late > 0 ? `trễ ${late} ngày` : 'chưa đến'}. Bộ phận giao nhận đang xử lý gấp (ticket ${tk.ticketId}) và sẽ gọi lại anh/chị trước 17:00 hôm nay. Nếu không kịp, bên em hoàn tiền 100% theo chính sách.` })).data as { draftId?: string };
      action = `${tk.ticketId} + ${em.draftId}`;
    } else if (/dat them|dat hang|xac nhan/.test(f)) {
      type = 'order';
      const qty = num(/(\d[\d.]*)\s*[a-z]/.exec(f)?.[1]);
      const p = matchProduct(prices, body);
      const inv = p ? (await all(c, 'inventory', { where: [{ field: 'sku', op: 'eq', value: p.sku }] }))[0] : undefined;
      const available = num(inv?.on_hand) - num(inv?.reserved);
      const unit = p ? segPrice(p, cust?.segment) : 0;
      facts = `${p?.product ?? '?'} × ${fmt(qty)}: tồn khả dụng ${fmt(available)}, giá ${fmt(unit)} đ → ${fmt(unit * qty)} đ`;
      priority = 'high';
      const tk = (await c.call('create_ticket', { customer: cust?.name ?? sender, subject: `Giữ hàng ${fmt(qty)} ${p?.unit ?? ''} ${p?.product ?? ''} cho ${cust?.name ?? sender}`, priority, summary: facts, assignee: 'Kho vận', dueDate: c.today })).data as { ticketId?: string };
      const em = (await c.call('draft_email', { to: cust?.email || sender, subject: `Xác nhận đơn bổ sung ${p?.product ?? ''}`, body: `Chào anh ${cust?.contact ?? ''},\n\nBên em xác nhận ${fmt(qty)} ${p?.unit ?? ''} ${p?.product ?? ''}, đơn giá ${fmt(unit)} đ, thành tiền ${fmt(unit * qty)} đ (chưa VAT). ${available >= qty ? 'Hàng có sẵn, giao thứ Sáu như yêu cầu.' : 'Hiện chưa đủ hàng, bên em sẽ báo lịch giao trong hôm nay.'}\n\nTrân trọng.` })).data as { draftId?: string };
      action = `${tk.ticketId} + ${em.draftId}`;
    } else if (/bao gia|price|gia /.test(f)) {
      type = 'price_request';
      const qty = num(/(\d[\d.]*)\s*[a-z]/.exec(f)?.[1]);
      const p = matchProduct(prices, body.replace(/rice/i, 'gạo'));
      const unit = p ? segPrice(p, cust?.segment) : 0;
      facts = `${p?.product ?? '?'} giá ${cust?.segment ?? ''}: ${fmt(unit)} đ × ${fmt(qty)} = ${fmt(unit * qty)} đ`;
      const em = (await c.call('draft_email', { to: cust?.email || sender, subject: `Quotation – ${p?.product ?? ''}`, body: `Dear ${cust?.contact ?? 'Sir/Madam'},\n\nThank you for your enquiry. Our price for ${fmt(qty)} × ${p?.product ?? ''} is ${fmt(unit)} VND per ${p?.unit ?? 'unit'}, ${fmt(unit * qty)} VND in total excluding 8% VAT, valid for 15 days. December delivery can be scheduled on your confirmation.\n\nBest regards,\n${cust?.account_manager ?? 'Sales team'}` })).data as { draftId?: string };
      action = `${em.draftId}`;
    }
    board.push({ '#': i, sender, customer: cust?.name ?? '—', type, priority, facts, action });
  }
  await c.call('create_artifact', { kind: 'table', title: 'Triage board', columns: ['#', 'sender', 'customer', 'type', 'priority', 'facts', 'action'], rows: board });
  const urgent = board.filter((b) => b.priority === 'urgent' || b.priority === 'high');
  return T(c.lang,
    `Đã xử lý **${board.length} tin**: ${board.filter((b) => b.type === 'complaint').length} khiếu nại, ${board.filter((b) => b.type === 'order').length} đặt hàng, ${board.filter((b) => b.type === 'payment').length} thanh toán, ${board.filter((b) => b.type === 'price_request').length} hỏi giá, ${board.filter((b) => b.type === 'spam').length} tin rác (đã bỏ qua, không mở link). **Cần xử lý trong 1 giờ:** ${urgent.map((b) => `#${b.b ?? b['#']} ${b.customer} (${b.priority})`).join(', ')}. Mọi câu trả lời đã soạn sẵn, chờ bạn duyệt.`,
    `Processed **${board.length} messages**: ${board.filter((b) => b.type === 'complaint').length} complaints, ${board.filter((b) => b.type === 'order').length} orders, ${board.filter((b) => b.type === 'payment').length} payments, ${board.filter((b) => b.type === 'price_request').length} price requests, ${board.filter((b) => b.type === 'spam').length} spam (ignored, links not opened). **Next hour:** ${urgent.map((b) => `#${b['#']} ${b.customer} (${b.priority})`).join(', ')}. All replies are drafted and await your approval.`);
};

/* ============================================================ bank recon */
const bankRecon: Script = async (c) => {
  const tol = num(c.inputs.tolerance) || 1000;
  c.say('Đọc sao kê và công nợ mở.', 'Reading the statement and open receivables.');
  const txns = c.attachmentText ? parseCsv(c.attachmentText).rows : await all(c, 'bank_transactions');
  const recv = await all(c, 'receivables');
  const customers = await all(c, 'customers');
  const used = new Map<string, string>();
  const out: Record<string, string | number>[] = [];
  const journal: Record<string, string | number>[] = [];
  c.say('Khớp từng giao dịch theo số hoá đơn, tên khách và số tiền.', 'Matching by invoice number, customer name and amount.');
  for (const t of txns) {
    const amount = num(t.amount);
    const memo = t.description ?? '';
    const fm = fold(memo);
    let status = '', invoice = '', customer = '', note = '';
    if ((t.direction ?? '').toLowerCase() === 'debit') {
      if (/phi/.test(fm)) { status = 'bank_fee'; note = 'Phí ngân hàng'; journal.push({ txn: t.txn_id, debit: '6425', credit: '112', amount, memo }); }
      else if (/ncc|po /.test(` ${fm} `)) { status = 'supplier_payment'; note = 'Thanh toán nhà cung cấp'; journal.push({ txn: t.txn_id, debit: '331', credit: '112', amount, memo }); }
      else { status = 'other_out'; note = 'Chi khác – cần chứng từ'; journal.push({ txn: t.txn_id, debit: '1388', credit: '112', amount, memo }); }
      out.push({ txn: t.txn_id, date: t.date, memo, amount: -amount, status, invoice, customer, note });
      continue;
    }
    const ref = /INV[\s-]?(\d{4})/i.exec(memo);
    if (/lai tien gui|interest/.test(fm)) { status = 'interest'; note = 'Lãi tiền gửi'; }
    else if (ref) {
      invoice = `INV-${ref[1]}`;
      const r = recv.find((x) => x.invoice_id === invoice);
      customer = r?.customer_name ?? '';
      if (!r) { status = 'unidentified'; note = 'Số hoá đơn không tồn tại'; }
      else if (used.has(invoice)) { status = 'duplicate'; note = `Trả trùng: đã khớp với ${used.get(invoice)}`; }
      else if (Math.abs(amount - num(r.balance)) <= tol) { status = 'matched'; used.set(invoice, t.txn_id); }
      else if (amount < num(r.balance)) { status = 'partial'; note = `Còn lại ${fmt(num(r.balance) - amount)} đ`; used.set(invoice, t.txn_id); }
      else { status = 'overpaid'; note = `Thừa ${fmt(amount - num(r.balance))} đ`; used.set(invoice, t.txn_id); }
    } else {
      const cust = findCustomer(customers, memo);
      if (cust) {
        customer = cust.name;
        const cands = recv.filter((x) => x.customer_id === cust.customer_id && num(x.balance) > 0 && !used.has(x.invoice_id));
        const exact = cands.filter((x) => Math.abs(num(x.balance) - amount) <= tol);
        if (exact.length === 1) { status = 'matched'; invoice = exact[0].invoice_id; used.set(invoice, t.txn_id); note = 'Khớp theo tên + số tiền'; }
        else if (cands.length) { status = 'ambiguous'; note = `Không khớp đúng: ${cands.map((x) => `${x.invoice_id} ${fmt(num(x.balance))}`).join(', ')}`; }
        else { status = 'unidentified'; note = 'Khách không còn hoá đơn mở'; }
      } else { status = 'unidentified'; note = 'Không xác định người chuyển'; }
    }
    out.push({ txn: t.txn_id, date: t.date, memo, amount, status, invoice, customer, note });
    const creditAcc = status === 'interest' ? '515' : status === 'unidentified' ? '3388' : '131';
    journal.push({ txn: t.txn_id, debit: '112', credit: creditAcc, amount, memo: `${customer || memo}${invoice ? ` – ${invoice}` : ''}` });
  }
  const sumBy = (s: string) => out.filter((o) => o.status === s).reduce((n, o) => n + num(o.amount), 0);
  const matchedAmt = await calc(c, `${sumBy('matched')} + ${sumBy('partial')}`);
  const exceptions = out.filter((o) => ['duplicate', 'ambiguous', 'unidentified', 'overpaid'].includes(String(o.status)));
  c.say('Mở ticket cho ngoại lệ và soạn email xác nhận.', 'Opening tickets for exceptions and drafting confirmations.');
  for (const e of exceptions) {
    await c.call('create_ticket', { customer: String(e.customer || '—'), subject: `Đối soát: ${e.status} ${e.txn} ${fmt(num(e.amount))} đ`, priority: e.status === 'duplicate' ? 'high' : 'normal', summary: `${e.memo}\n${e.note}`, assignee: 'Kế toán công nợ', dueDate: addDays(c.today, 2) });
  }
  for (const e of out.filter((o) => ['partial', 'duplicate'].includes(String(o.status)))) {
    const cust = customers.find((cu) => cu.name === e.customer);
    await c.call('draft_email', { to: cust?.email || String(e.customer), subject: e.status === 'duplicate' ? `Khoản thanh toán trùng ${e.invoice}` : `Xác nhận thanh toán một phần ${e.invoice}`, body: e.status === 'duplicate' ? `Kính gửi ${e.customer},\n\nNgày ${e.date} chúng tôi nhận thêm ${fmt(num(e.amount))} đ cho hoá đơn ${e.invoice} đã được thanh toán trước đó. Quý khách muốn chúng tôi hoàn lại hay cấn trừ vào đơn hàng tiếp theo?\n\nTrân trọng,\nPhòng Kế toán` : `Kính gửi ${e.customer},\n\nChúng tôi xác nhận đã nhận ${fmt(num(e.amount))} đ ngày ${e.date} cho hoá đơn ${e.invoice}. ${e.note}.\n\nTrân trọng,\nPhòng Kế toán` });
  }
  await c.call('create_artifact', { kind: 'table', title: 'Reconciliation', columns: ['txn', 'date', 'memo', 'amount', 'status', 'invoice', 'customer', 'note'], rows: out });
  await c.call('create_artifact', { kind: 'csv', title: 'journal_entries.csv', content: toCsv(['txn', 'debit', 'credit', 'amount', 'memo'], journal) });
  const count = (s: string) => out.filter((o) => o.status === s).length;
  return T(c.lang,
    `Đối soát **${out.length} giao dịch**: ${count('matched')} khớp hoàn toàn, ${count('partial')} trả một phần, tổng ghi giảm công nợ **${fmt(matchedAmt)} đ**. **Ngoại lệ cần kế toán quyết:** ${exceptions.map((e) => `${e.txn} ${e.status === 'duplicate' ? `trả trùng ${e.invoice} (${e.customer})` : e.status === 'ambiguous' ? `${e.customer} chuyển ${fmt(num(e.amount))} đ không khớp hoá đơn nào` : `không xác định ${fmt(num(e.amount))} đ`}`).join('; ')}. Bút toán đề xuất xuất CSV để nhập MISA; ${exceptions.length} ticket và email xác nhận đã soạn.`,
    `Reconciled **${out.length} transactions**: ${count('matched')} fully matched, ${count('partial')} partial, **${fmt(matchedAmt)} VND** applied to receivables. **Exceptions for the accountant:** ${exceptions.map((e) => `${e.txn} ${e.status} ${e.invoice || ''} ${e.customer || ''}`.trim()).join('; ')}. Proposed journal entries are exported as CSV; ${exceptions.length} tickets and confirmation emails drafted.`);
};

/* ============================================================== pipeline */
const pipelineReview: Script = async (c) => {
  const idle = num(c.inputs.idle_days) || 14;
  const target = num(c.inputs.target) || 1_500_000_000;
  c.say('Tổng hợp pipeline theo giai đoạn và người phụ trách.', 'Aggregating the pipeline by stage and owner.');
  const byStage = await agg(c, { source: 'deals', groupBy: 'stage', metrics: [{ fn: 'count' }, { field: 'value', fn: 'sum', as: 'value' }] });
  const deals = await all(c, 'deals');
  const open = deals.filter((d) => !['won', 'lost'].includes(d.stage));
  const won = deals.filter((d) => d.stage === 'won').reduce((n, d) => n + num(d.value), 0);
  const weighted = await calc(c, open.map((d) => `${num(d.value)} * ${num(d.probability)} / 100`).join(' + ') || '0');
  const gap = Math.max(1, target - won);
  const coverage = await calc(c, `round(${weighted} / ${gap} * 100) / 100`);
  const risk = new Map<Row, { idle: number; slipped: boolean }>(open.map((d) => [d, { idle: daysBetween(d.last_activity, c.today), slipped: d.expected_close < c.today }]));
  const atRisk = open.filter((d) => risk.get(d)!.idle >= idle || risk.get(d)!.slipped).sort((a, b) => num(b.value) - num(a.value));
  c.say('Đối chiếu công nợ của các khách có cơ hội đang nguội.', 'Cross-checking debt for at-risk customers.');
  const tasks: Record<string, string | number>[] = [];
  const customers = await all(c, 'customers');
  for (const d of atRisk) {
    const debt = await all(c, 'receivables', { where: [{ field: 'customer_name', op: 'eq', value: d.customer }, { field: 'balance', op: 'gt', value: 0 }] });
    const overdue = debt.filter((r) => num(r.days_overdue) > 0).reduce((n, r) => n + num(r.balance), 0);
    const { idle: idleDays, slipped } = risk.get(d)!;
    const reason = [idleDays >= idle ? `${idleDays} ngày không hoạt động` : '', slipped ? `quá ngày chốt ${d.expected_close}` : '', overdue ? `nợ quá hạn ${fmt(overdue)} đ` : ''].filter(Boolean).join('; ');
    const tk = (await c.call('create_ticket', { customer: d.customer, subject: `Follow-up ${d.deal_id} ${d.customer} (${compact(num(d.value))})`, priority: num(d.value) >= 300_000_000 ? 'high' : 'normal', summary: `${reason}. Bước tiếp theo đã ghi: "${d.next_step}". ${overdue ? 'Xử lý công nợ trước khi chốt.' : 'Gọi lại và cập nhật ngày chốt.'}`, assignee: d.owner, dueDate: addDays(c.today, 2) })).data as { ticketId?: string };
    tasks.push({ deal: d.deal_id, customer: d.customer, owner: d.owner, stage: d.stage, value: num(d.value), idle_days: idleDays, reason, task: tk.ticketId ?? '' });
  }
  for (const d of atRisk.slice(0, 3)) {
    const cu = customers.find((x) => x.name === d.customer);
    await c.call('draft_email', { to: cu?.email || `${d.customer} (chưa có email)`, subject: `${d.customer} – cập nhật đề xuất hợp tác`, body: `Chào ${cu?.contact ?? 'anh/chị'},\n\nEm là ${d.owner}. Liên quan đến "${d.next_step.toLowerCase()}", bên em muốn hẹn 20 phút trong tuần này để cập nhật phương án và giải đáp các điểm anh/chị còn băn khoăn. Anh/chị thuận tiện thứ Năm hoặc thứ Sáu không ạ?\n\nTrân trọng,\n${d.owner}` });
  }
  const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const bars = stageOrder.map((s) => ({ label: s, value: num(byStage.find((r) => r.stage === s)?.value) }));
  const byOwner = new Map<string, number>();
  for (const d of open) byOwner.set(d.owner, (byOwner.get(d.owner) ?? 0) + num(d.value) * num(d.probability) / 100);
  await c.call('create_artifact', {
    kind: 'html', title: 'Pipeline dashboard',
    content: html('Pipeline bán hàng', `Tính đến ${c.today} · chỉ tiêu quý ${compact(target)} đ`, `<div class="grid">${kpi('Đã chốt', `${compact(won)} đ`, `${pct(won, target)}% chỉ tiêu`)}${kpi('Pipeline có trọng số', `${compact(weighted)} đ`, `${open.length} cơ hội mở`)}${kpi('Độ phủ', `${coverage}x`, 'trọng số / phần còn thiếu')}${kpi('Có rủi ro', String(atRisk.length), `≥ ${idle} ngày hoặc quá hạn chốt`)}</div><div class="card"><h2>Giá trị theo giai đoạn</h2>${svgBars(bars)}</div><div class="card"><h2>Pipeline có trọng số theo người phụ trách</h2>${tableHtml(['Sales', 'Có trọng số'], [...byOwner.entries()].map(([k, v]) => ({ Sales: k, 'Có trọng số': fmt(v) })))}</div><div class="card"><h2>Cơ hội cần xử lý</h2>${tableHtml(['deal', 'customer', 'owner', 'stage', 'value', 'reason'], tasks.map((t) => ({ ...t, value: fmt(num(t.value)) })))}</div>`),
  });
  await c.call('create_artifact', { kind: 'table', title: 'Follow-up tasks', columns: ['deal', 'customer', 'owner', 'stage', 'value', 'idle_days', 'reason', 'task'], rows: tasks });
  const top = atRisk.slice(0, 3).map((d) => `${d.deal_id} ${d.customer} (${compact(num(d.value))}, ${d.owner})`).join('; ');
  return T(c.lang,
    `Đã chốt ${fmt(won)} đ (${pct(won, target)}% chỉ tiêu). Pipeline có trọng số **${fmt(weighted)} đ**, độ phủ **${coverage}x** phần còn thiếu ${fmt(gap)} đ. **${atRisk.length} cơ hội có rủi ro** đã được giao việc cho từng sales. Bàn trước trong họp: ${top}.`,
    `Won ${fmt(won)} VND (${pct(won, target)}% of target). Weighted pipeline **${fmt(weighted)} VND**, **${coverage}x** coverage of the remaining ${fmt(gap)}. **${atRisk.length} at-risk deals** now have tasks per rep. Discuss first: ${top}.`);
};

/* =================================================================== VoC */
const THEMES: [string, RegExp][] = [
  ['Giao hàng', /tre|giao cham|khong goi truoc|thieu xe|khong ai bao/],
  ['Đóng gói', /mop|rach|ro ri|dong goi|carton|thieu \d/],
  ['Giá', /gia (tot|cao|canh tranh)|chiet khau/],
  ['Hoá đơn', /hoa don/],
  ['Dịch vụ', /nhan vien|hotline|ho tro|than thien/],
  ['Khen', /hai long|dung hen|som hon|chac chan|nhiet tinh|giao chuan/],
];
const vocInsights: Script = async (c) => {
  c.say('Đọc đánh giá và ticket trong kỳ.', 'Reading reviews and tickets.');
  const reviews = await all(c, 'reviews');
  const bySource = await agg(c, { source: 'reviews', groupBy: 'source', metrics: [{ field: 'rating', fn: 'avg', as: 'avg_rating' }, { fn: 'count' }] });
  const byProduct = await agg(c, { source: 'reviews', groupBy: 'product', metrics: [{ field: 'rating', fn: 'avg', as: 'avg_rating' }, { fn: 'count' }], sort: { field: 'avg_rating', dir: 'asc' } });
  const tickets = await agg(c, { source: 'tickets', groupBy: 'category', metrics: [{ fn: 'count' }], sort: { field: 'count', dir: 'desc' } });
  const tagged: Row[] = reviews.map((r) => ({ ...r, themes: THEMES.filter(([, re]) => re.test(fold(r.text))).map(([n]) => n).join(', ') || 'Khác', sentiment: num(r.rating) >= 4 ? 'tích cực' : num(r.rating) === 3 ? 'trung tính' : 'tiêu cực' }));
  const themeStats = THEMES.map(([n]) => { const rs = tagged.filter((t) => t.themes.includes(n)); return { theme: n, count: rs.length, avg: rs.length ? Math.round(rs.reduce((a, r) => a + num(r.rating), 0) / rs.length * 10) / 10 : 0 }; }).filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
  c.say('Nối phàn nàn giao hàng với đơn thật để tìm nguyên nhân.', 'Linking delivery complaints to orders to find the root cause.');
  const lateIds = tagged.filter((t) => t.themes.includes('Giao hàng') && t.order_id).map((t) => t.order_id);
  const lateOrders = lateIds.length ? await all(c, 'orders', { where: [{ field: 'order_id', op: 'in', value: lateIds }] }) : [];
  const roots = lateOrders.map((o) => ({ order: o.order_id, customer: o.customer_name, carrier: o.carrier, region: o.region, delay_days: o.delivered_date ? daysBetween(o.promised_date, o.delivered_date) : daysBetween(o.promised_date, c.today) }));
  const byCarrier = new Map<string, number>();
  for (const r of roots) byCarrier.set(r.carrier, (byCarrier.get(r.carrier) ?? 0) + 1);
  const worst = [...byCarrier.entries()].sort((a, b) => b[1] - a[1])[0];
  const avgRating = await calc(c, `round((${reviews.map((r) => num(r.rating)).join(' + ')}) / ${reviews.length} * 10) / 10`);
  await c.call('create_ticket', { subject: `Giao trễ lặp lại: ${worst?.[0] ?? ''} (${worst?.[1] ?? 0} đánh giá xấu)`, priority: 'high', summary: `${roots.length} đánh giá phàn nàn giao trễ, liên kết đơn: ${roots.map((r) => `${r.order} ${r.carrier} trễ ${r.delay_days} ngày`).join('; ')}. Đề xuất: SLA phạt trễ với đơn vị vận chuyển, gọi báo trước khi trễ.`, assignee: 'Trưởng phòng Vận hành', dueDate: addDays(c.today, 3) });
  const pack = tagged.filter((t) => t.themes.includes('Đóng gói'));
  await c.call('create_ticket', { subject: `Đóng gói: ${pack.length} phản hồi móp/rách/rò rỉ`, priority: 'normal', summary: pack.map((p) => `${p.review_id} ${p.product}: ${p.text}`).join('\n'), assignee: 'Quản lý kho', dueDate: addDays(c.today, 5) });
  for (const r of tagged.filter((t) => num(t.rating) <= 2)) {
    await c.call('draft_email', { to: `${r.source} – ${r.customer} (phản hồi công khai)`, subject: `Trả lời đánh giá ${r.review_id} (${r.rating}★)`, body: `Cảm ơn ${r.customer === 'Khách lẻ' ? 'anh/chị' : r.customer} đã phản hồi. Chúng tôi xin lỗi về ${r.themes.toLowerCase()}${r.order_id ? ` ở đơn ${r.order_id}` : ''}. Đội ngũ đã ghi nhận và sẽ liên hệ trực tiếp để khắc phục trong hôm nay. Rất mong tiếp tục được phục vụ.` });
  }
  await c.call('create_artifact', {
    kind: 'html', title: 'Voice of customer',
    content: html('Tiếng nói khách hàng', `${c.inputs.period || `Tháng ${monthOf(c.today)}`} · ${reviews.length} đánh giá · ${tickets.reduce((n, t) => n + num(t.count), 0)} ticket`, `<div class="grid">${kpi('Điểm trung bình', `${avgRating}★`, `${reviews.length} đánh giá`)}${kpi('Tiêu cực', String(tagged.filter((t) => t.sentiment === 'tiêu cực').length), '1–2 sao')}${kpi('Chủ đề lớn nhất', themeStats[0]?.theme ?? '—', `${themeStats[0]?.count ?? 0} lần`)}${kpi('Đơn vị trễ nhiều nhất', worst?.[0] ?? '—', `${worst?.[1] ?? 0} đơn bị phàn nàn`)}</div><div class="card"><h2>Số lần nhắc theo chủ đề</h2>${svgBars(themeStats.map((t) => ({ label: t.theme, value: t.count })))}</div><div class="card"><h2>Điểm theo kênh</h2>${tableHtml(['source', 'avg_rating', 'count'], bySource)}</div><div class="card"><h2>Nguyên nhân gốc: giao trễ</h2>${tableHtml(['order', 'customer', 'carrier', 'region', 'delay_days'], roots)}</div><div class="card"><h2>Sản phẩm điểm thấp</h2>${tableHtml(['product', 'avg_rating', 'count'], byProduct.slice(0, 5))}</div>`),
  });
  await c.call('create_artifact', { kind: 'table', title: 'Tagged reviews', columns: ['review_id', 'date', 'source', 'customer', 'rating', 'product', 'themes', 'sentiment', 'text'], rows: tagged });
  return T(c.lang,
    `Điểm trung bình **${avgRating}★** trên ${reviews.length} đánh giá. **3 điều cần làm:** (1) giao trễ là chủ đề số 1 (${themeStats.find((t) => t.theme === 'Giao hàng')?.count ?? 0} lần), ${worst ? `${worst[1]}/${roots.length} đơn bị phàn nàn thuộc **${worst[0]}**` : ''} – đã mở ticket cho Vận hành; (2) đóng gói ${pack.length} phản hồi móp/rách/rò rỉ – ticket cho kho; (3) khách khen nhân viên kinh doanh và giao đúng hẹn ở nhóm Modern trade, nên nhân rộng cách làm này. Đã soạn ${tagged.filter((t) => num(t.rating) <= 2).length} phản hồi công khai cho đánh giá 1–2 sao.`,
    `Average **${avgRating}★** over ${reviews.length} reviews. **Act on:** (1) late delivery is the top theme, ${worst ? `${worst[1]}/${roots.length} complained orders went with **${worst[0]}**` : ''} – ticket opened for Operations; (2) packaging: ${pack.length} dented/torn/leaking reports – ticket for the warehouse; (3) Modern-trade customers praise sales staff and on-time delivery – replicate it. ${tagged.filter((t) => num(t.rating) <= 2).length} public replies drafted for 1–2 star reviews.`);
};

/* ================================================================ expense */
const expenseAudit: Script = async (c) => {
  c.say('Đọc quy định chi phí.', 'Reading the expense policy.');
  await c.call('search_knowledge', { query: 'taxi khách sạn tiếp khách công tác phí hoá đơn 30 ngày', limit: 6 });
  const claims = await all(c, 'expenses');
  c.say(`Kiểm tra ${claims.length} khoản theo từng điều.`, `Checking ${claims.length} claims rule by rule.`);
  const seen = new Map<string, string>();
  const review = claims.map((e) => {
    const amount = num(e.amount);
    const nights = num(e.nights) || 1;
    const pax = num(e.pax) || 1;
    const issues: string[] = [];
    let hold = 0;
    const key = `${e.employee}|${e.expense_date}|${amount}|${e.category}`;
    if (seen.has(key)) { issues.push(`Trùng với ${seen.get(key)}`); hold = amount; } else seen.set(key, e.claim_id);
    const late = daysBetween(e.expense_date, e.submitted_date);
    if (!hold && late > 30) { issues.push(`Nộp trễ ${late} ngày (> 30)`); hold = amount; }
    if (!hold && e.category !== 'per_diem' && amount >= 200_000 && e.has_invoice !== 'yes') { issues.push('Thiếu hoá đơn điện tử (≥ 200.000đ)'); hold = amount; }
    if (e.category === 'other' && /phan mem|thiet bi/.test(fold(e.description))) { issues.push('Sai kênh: mua phần mềm/thiết bị phải qua phòng Mua hàng'); hold = amount; }
    if (!hold) {
      const limit = e.category === 'taxi' ? 300_000 : e.category === 'hotel' ? 800_000 * nights : e.category === 'meal' ? 500_000 * pax : e.category === 'per_diem' ? 400_000 * nights : Infinity;
      if (amount > limit) { issues.push(`Vượt định mức ${fmt(limit)} đ (${e.category === 'hotel' ? `${fmt(amount / nights)} đ/đêm` : e.category === 'meal' ? `${fmt(amount / pax)} đ/người` : fmt(amount)})`); hold = amount - limit; }
    }
    const notes = e.category === 'meal' ? 'Cần xác nhận đã được duyệt trước' : '';
    return { claim: e.claim_id, employee: e.employee, department: e.department, category: e.category, amount, issues: issues.join('; ') || 'OK', approvable: amount - hold, on_hold: hold, note: notes };
  });
  const byDept = await agg(c, { source: 'expenses', groupBy: 'department', metrics: [{ field: 'amount', fn: 'sum', as: 'claimed' }, { fn: 'count' }], sort: { field: 'claimed', dir: 'desc' } });
  const claimed = await calc(c, review.map((r) => r.amount).join(' + '));
  const onHold = await calc(c, review.map((r) => r.on_hold).join(' + '));
  const people = new Map<string, typeof review>();
  for (const r of review.filter((x) => x.issues !== 'OK')) people.set(r.employee, [...(people.get(r.employee) ?? []), r]);
  for (const [emp, rs] of people) {
    await c.call('draft_email', { to: emp, subject: `Bổ sung đề nghị thanh toán tháng ${c.inputs.month || monthOf(c.today)}`, body: `Chào ${emp},\n\nKế toán đã rà soát đề nghị thanh toán của bạn. Các khoản cần bổ sung/điều chỉnh:\n${rs.map((r) => `- ${r.claim} (${fmt(r.amount)} đ): ${r.issues}. Đang tạm giữ ${fmt(r.on_hold)} đ.`).join('\n')}\n\nCác khoản còn lại sẽ được thanh toán trong kỳ này. Bạn vui lòng bổ sung trước ngày ${addDays(c.today, 5)}.\n\nCảm ơn,\nPhòng Kế toán` });
  }
  await c.call('create_artifact', { kind: 'table', title: 'Claim review', columns: ['claim', 'employee', 'department', 'category', 'amount', 'issues', 'approvable', 'on_hold', 'note'], rows: review });
  await c.call('create_artifact', {
    kind: 'html', title: 'Expense summary',
    content: html('Rà soát chi phí', `Tháng ${c.inputs.month || monthOf(c.today)} · ${review.length} đề nghị · kết quả hỗ trợ kế toán duyệt, không phải quyết định cuối`, `<div class="grid">${kpi('Tổng đề nghị', `${fmt(claimed)} đ`, `${review.length} khoản`)}${kpi('Được duyệt', `${fmt(claimed - onHold)} đ`, `${pct(claimed - onHold, claimed)}%`)}${kpi('Tạm giữ', `${fmt(onHold)} đ`, `${review.filter((r) => r.on_hold > 0).length} khoản`)}${kpi('Người cần bổ sung', String(people.size), '')}</div><div class="card"><h2>Theo phòng ban</h2>${tableHtml(['department', 'claimed', 'count'], byDept.map((d) => ({ ...d, claimed: fmt(num(d.claimed)) })))}</div><div class="card"><h2>Ngoại lệ</h2>${tableHtml(['claim', 'employee', 'issues', 'on_hold'], review.filter((r) => r.issues !== 'OK').map((r) => ({ ...r, on_hold: fmt(r.on_hold) })))}</div>`),
  });
  return T(c.lang,
    `Tổng đề nghị **${fmt(claimed)} đ**, đủ điều kiện duyệt **${fmt(claimed - onHold)} đ**, tạm giữ **${fmt(onHold)} đ** ở ${review.filter((r) => r.on_hold > 0).length} khoản: ${review.filter((r) => r.issues !== 'OK').map((r) => `${r.claim} (${r.issues.split(';')[0]})`).join(', ')}. Đã soạn email cho ${people.size} người cần bổ sung. Kế toán chỉ cần quyết các ngoại lệ, đặc biệt khoản vượt định mức tiếp khách và khách sạn cần trưởng phòng xác nhận.`,
    `Claimed **${fmt(claimed)} VND**, approvable **${fmt(claimed - onHold)}**, on hold **${fmt(onHold)}** across ${review.filter((r) => r.on_hold > 0).length} claims: ${review.filter((r) => r.issues !== 'OK').map((r) => `${r.claim} (${r.issues.split(';')[0]})`).join(', ')}. Emails drafted to ${people.size} employees. Accounting only decides the exceptions; over-limit entertainment and hotel need a manager.`);
};

/* =============================================================== supplier */
const supplierCompare: Script = async (c) => {
  const need = c.inputs.need ?? '';
  const text = (c.attachmentText || c.inputs.quotes || '').trim();
  const qtyNeed = num((/,\s*(\d[\d.]*)\s+\S/.exec(need) ?? /(\d[\d.]*)\s*(bao|thung|thùng|chai)/i.exec(need))?.[1]);
  const deadlineM = /(\d{1,2})\/(\d{1,2})/.exec(need);
  const year = Number(c.today.slice(0, 4)) + (deadlineM && Number(deadlineM[2]) < Number(c.today.slice(5, 7)) ? 1 : 0);
  const deadline = deadlineM ? `${year}-${deadlineM[2].padStart(2, '0')}-${deadlineM[1].padStart(2, '0')}` : addDays(c.today, 10);
  c.say('Trích điều khoản từng báo giá.', 'Extracting the terms of each quote.');
  const quotes = text.split(/\r?\n/).filter((l) => /đơn giá|price/i.test(l)).map((l) => {
    const name = (/^(?:NCC\s*\d+\s*[–-]\s*)?([^:]+):/.exec(l)?.[1] ?? l.slice(0, 30)).trim();
    const price = num(/đơn giá\s*([\d.,]+)/i.exec(l)?.[1]);
    const moq = num(/tối thiểu\s*([\d.,]+)/i.exec(l)?.[1]);
    const lead = num(/giao\s*(\d+)\s*ngày/i.exec(l)?.[1]);
    const freight = /miễn phí vận chuyển/i.test(l) ? 0 : num(/phí vận chuyển\s*([\d.,]+)/i.exec(l)?.[1]);
    const prepay = /thanh toán trước/i.test(l);
    const payDays = prepay ? 0 : num(/thanh toán\s*(\d+)\s*ngày/i.exec(l)?.[1]);
    return { name, price, moq, lead, freight, prepay, payDays };
  });
  const prices = await all(c, 'price_list');
  const p = matchProduct(prices, need);
  const inv = p ? (await all(c, 'inventory', { where: [{ field: 'sku', op: 'eq', value: p.sku }] }))[0] : undefined;
  const available = num(inv?.on_hand) - num(inv?.reserved);
  const daily = num(inv?.avg_daily_sales) || 1;
  const cover = Math.round((available / daily) * 10) / 10;
  const stockout = addDays(c.today, Math.floor(cover));
  c.say('Quy về tổng chi phí và kiểm tra kịp hàng.', 'Computing landed cost and timing against stock.');
  const rows: Record<string, string | number>[] = [];
  for (const q of quotes) {
    const qty = Math.max(qtyNeed, q.moq);
    const total = await calc(c, `${qty} * ${q.price} + ${q.freight}`);
    const arrival = addDays(c.today, q.lead);
    rows.push({ supplier: q.name, unit_price: q.price, moq: q.moq, order_qty: qty, freight: q.freight, total_cost: total, cost_per_needed_unit: Math.round(total / Math.max(1, qtyNeed)), lead_days: q.lead, arrival, on_time: arrival <= deadline ? 'yes' : 'no', payment: q.prepay ? 'trả trước' : `${q.payDays} ngày` });
  }
  const minCost = Math.min(...rows.map((r) => num(r.total_cost)));
  for (const r of rows) {
    const q = quotes.find((x) => x.name === r.supplier)!;
    r.score = Math.round((minCost / num(r.total_cost)) * 50 + (r.on_time === 'yes' ? 30 : 0) + (q.prepay ? 0 : Math.min(1, q.payDays / 45) * 20));
  }
  rows.sort((a, b) => num(b.score) - num(a.score));
  const best = rows[0], second = rows[1];
  await c.call('create_artifact', { kind: 'table', title: 'Supplier comparison', columns: ['supplier', 'unit_price', 'moq', 'order_qty', 'freight', 'total_cost', 'cost_per_needed_unit', 'lead_days', 'arrival', 'on_time', 'payment', 'score'], rows });
  await c.call('create_artifact', { kind: 'markdown', title: 'Recommendation', content: `# Đề xuất mua ${p?.product ?? need}\n\n**Nhu cầu:** ${fmt(qtyNeed)} ${p?.unit ?? ''}, về kho trước ${deadline}.\n\n**Tồn kho hiện tại:** ${fmt(available)} khả dụng, bán ${daily}/ngày → còn **${cover} ngày**, dự kiến hết hàng ${stockout}.\n\n## Chọn: ${best?.supplier}\n- Tổng chi phí ${fmt(num(best?.total_cost))} đ, về ${best?.arrival}, thanh toán ${best?.payment}, điểm ${best?.score}/100.\n- So với phương án sau (${second?.supplier}): chênh ${fmt(num(best?.total_cost) - num(second?.total_cost))} đ, đổi lại ${num(best?.lead_days) < num(second?.lead_days) ? `về sớm hơn ${num(second?.lead_days) - num(best?.lead_days)} ngày` : 'điều khoản tốt hơn'}.\n\n## Rủi ro\n- Hàng hết từ ${stockout} trong khi lô sớm nhất về ${rows.map((r) => String(r.arrival)).sort()[0]}: cần giữ hàng cho khách lớn hoặc mua gấp lô nhỏ.\n${rows.filter((r) => r.on_time === 'no').map((r) => `- ${r.supplier} không kịp hạn ${deadline}.`).join('\n')}\n\n*Cách chấm: chi phí 50%, đúng hạn 30%, điều khoản thanh toán 20%.*` });
  await c.call('draft_email', { to: String(best?.supplier), subject: `Đơn đặt hàng ${p?.product ?? ''} – ${fmt(num(best?.order_qty))} ${p?.unit ?? ''}`, body: `Kính gửi ${best?.supplier},\n\n${c.company} xác nhận đặt ${fmt(num(best?.order_qty))} ${p?.unit ?? ''} ${p?.product ?? ''}, đơn giá ${fmt(num(best?.unit_price))} đ, phí vận chuyển ${fmt(num(best?.freight))} đ, tổng ${fmt(num(best?.total_cost))} đ, thanh toán ${best?.payment}. Đề nghị giao tại kho Bình Dương trước ${best?.arrival}.\n\nVui lòng xác nhận lại lịch giao.\n\nTrân trọng,\nPhòng Mua hàng` });
  return T(c.lang,
    `Đề xuất **${best?.supplier}**: ${fmt(num(best?.total_cost))} đ, về ${best?.arrival}, thanh toán ${best?.payment} (điểm ${best?.score}/100). Phương án dự phòng: ${second?.supplier} (${fmt(num(second?.total_cost))} đ). ${rows.filter((r) => r.on_time === 'no').map((r) => `${r.supplier} rẻ trên đơn giá nhưng không kịp hạn và buộc mua ${fmt(num(r.order_qty))} ${p?.unit ?? ''}`).join('; ')}. **Rủi ro:** tồn kho chỉ còn ${cover} ngày (hết ${stockout}), sớm hơn mọi lô hàng. Email đặt hàng đã soạn.`,
    `Recommend **${best?.supplier}**: ${fmt(num(best?.total_cost))} VND, arrives ${best?.arrival}, payment ${best?.payment} (score ${best?.score}/100). Fallback: ${second?.supplier} (${fmt(num(second?.total_cost))}). ${rows.filter((r) => r.on_time === 'no').map((r) => `${r.supplier} is cheaper per unit but late and forces ${fmt(num(r.order_qty))} units`).join('; ')}. **Risk:** only ${cover} days of stock left (out on ${stockout}), before any delivery. PO email drafted.`);
};

/* ============================================================ monthly deck */
const monthlyDeck: Script = async (c) => {
  const en = c.inputs.audience === 'hq';
  const L = (vi: string, e: string) => (en ? e : vi);
  c.say('Tổng hợp số liệu từ mọi hệ thống.', 'Compiling numbers from every system.');
  const orders = await all(c, 'orders');
  const byRegion = await agg(c, { source: 'orders', groupBy: 'region', metrics: [{ field: 'amount', fn: 'sum', as: 'revenue' }, { fn: 'count' }], sort: { field: 'revenue', dir: 'desc' } });
  const revenue = await calc(c, orders.map((o) => num(o.amount)).join(' + '));
  const delivered = orders.filter((o) => o.delivered_date);
  const late = delivered.filter((o) => o.delivered_date > o.promised_date);
  const onTime = pct(delivered.length - late.length, delivered.length);
  const recv = await all(c, 'receivables');
  const bal = recv.reduce((n, r) => n + num(r.balance), 0);
  const overdue = recv.filter((r) => num(r.days_overdue) > 0).reduce((n, r) => n + num(r.balance), 0);
  const over60 = recv.filter((r) => num(r.days_overdue) > 60).reduce((n, r) => n + num(r.balance), 0);
  const top = recv.filter((r) => num(r.days_overdue) > 0).sort((a, b) => num(b.balance) - num(a.balance)).slice(0, 4);
  const inv = await all(c, 'inventory');
  const risk = inv.map((r) => ({ product: r.product, cover: Math.round(((num(r.on_hand) - num(r.reserved)) / (num(r.avg_daily_sales) || 1)) * 10) / 10, lead: num(r.lead_time_days) })).filter((r) => r.cover < r.lead + 3).sort((a, b) => a.cover - b.cover);
  const ratings = await agg(c, { source: 'reviews', metrics: [{ field: 'rating', fn: 'avg', as: 'avg' }, { fn: 'count' }] });
  const deals = await all(c, 'deals');
  const weighted = deals.filter((d) => !['won', 'lost'].includes(d.stage)).reduce((n, d) => n + num(d.value) * num(d.probability) / 100, 0);
  const slides: string[] = [
    `<section class="s title"><p class="eyebrow">${c.company}</p><h1>${L('Họp giao ban', 'Monthly business review')}</h1><p class="big">${esc(c.inputs.month || `Tháng ${monthOf(c.today)}`)}</p></section>`,
    `<section class="s"><p class="eyebrow">${L('Tóm tắt', 'Headline')}</p><h2>${L(`Doanh thu ${compact(revenue)} đ, giao đúng hẹn ${onTime}%, nợ quá hạn ${compact(overdue)} đ`, `Revenue ${compact(revenue)} VND, ${onTime}% on time, ${compact(overdue)} overdue`)}</h2><div class="grid">${kpi(L('Doanh thu', 'Revenue'), `${compact(revenue)} đ`, `${orders.length} ${L('đơn', 'orders')}`)}${kpi(L('Giao đúng hẹn', 'On-time'), `${onTime}%`, `${late.length} ${L('đơn trễ', 'late')}`)}${kpi(L('Quá hạn', 'Overdue'), `${pct(overdue, bal)}%`, `${compact(overdue)} đ`)}${kpi(L('Điểm khách hàng', 'Customer rating'), `${num(ratings[0]?.avg)}★`, `${ratings[0]?.count ?? 0} ${L('đánh giá', 'reviews')}`)}</div></section>`,
    `<section class="s"><p class="eyebrow">${L('Doanh thu', 'Revenue')}</p><h2>${L(`${byRegion[0]?.region} dẫn đầu với ${pct(num(byRegion[0]?.revenue), revenue)}% doanh thu`, `${byRegion[0]?.region} leads with ${pct(num(byRegion[0]?.revenue), revenue)}% of revenue`)}</h2>${svgBars(byRegion.map((r) => ({ label: String(r.region), value: num(r.revenue) })), 640, 220)}</section>`,
    `<section class="s"><p class="eyebrow">${L('Giao hàng', 'Delivery')}</p><h2>${L(`${late.length} đơn giao trễ; cần SLA với đơn vị vận chuyển`, `${late.length} late orders; carrier SLA needed`)}</h2>${tableHtml([L('Đơn', 'Order'), L('Khách hàng', 'Customer'), L('Vận chuyển', 'Carrier'), L('Trễ (ngày)', 'Days late')], late.map((o) => ({ [L('Đơn', 'Order')]: o.order_id, [L('Khách hàng', 'Customer')]: o.customer_name, [L('Vận chuyển', 'Carrier')]: o.carrier, [L('Trễ (ngày)', 'Days late')]: daysBetween(o.promised_date, o.delivered_date) })))}</section>`,
    `<section class="s"><p class="eyebrow">${L('Công nợ', 'Receivables')}</p><h2>${L(`Nợ trên 60 ngày ${compact(over60)} đ: cần quyết định ngừng giao`, `${compact(over60)} VND over 60 days: stop-supply decision needed`)}</h2>${tableHtml([L('Khách hàng', 'Customer'), L('Hoá đơn', 'Invoice'), L('Số dư', 'Balance'), L('Quá hạn', 'Days')], top.map((r) => ({ [L('Khách hàng', 'Customer')]: r.customer_name, [L('Hoá đơn', 'Invoice')]: r.invoice_id, [L('Số dư', 'Balance')]: fmt(num(r.balance)), [L('Quá hạn', 'Days')]: r.days_overdue })))}</section>`,
    `<section class="s"><p class="eyebrow">${L('Tồn kho', 'Stock')}</p><h2>${L(`${risk.length} mặt hàng có nguy cơ hết trước khi kịp nhập`, `${risk.length} products may run out before restock`)}</h2>${tableHtml([L('Mặt hàng', 'Product'), L('Ngày còn hàng', 'Days of cover'), 'Lead time'], risk.map((r) => ({ [L('Mặt hàng', 'Product')]: r.product, [L('Ngày còn hàng', 'Days of cover')]: r.cover, 'Lead time': r.lead })))}</section>`,
    `<section class="s"><p class="eyebrow">Pipeline</p><h2>${L(`Pipeline có trọng số ${compact(weighted)} đ`, `Weighted pipeline ${compact(weighted)} VND`)}</h2><p>${L('Chi tiết từng cơ hội trong báo cáo pipeline.', 'Deal-level detail in the pipeline review.')}</p></section>`,
    `<section class="s"><p class="eyebrow">${L('Cần quyết định', 'Decisions')}</p><h2>${L('3 quyết định hôm nay', '3 decisions today')}</h2><ol><li>${L(`Ký SLA phạt trễ với đơn vị vận chuyển (trễ ${late.length} đơn) – Vận hành, trong 2 tuần.`, `Carrier SLA with late penalties (${late.length} late orders) – Ops, 2 weeks.`)}</li><li>${L(`Tạm ngừng giao cho khách nợ > 60 ngày (${compact(over60)} đ) – Kế toán trưởng.`, `Pause supply to accounts > 60 days (${compact(over60)} VND) – Chief accountant.`)}</li><li>${L(`Đặt gấp ${risk.slice(0, 2).map((r) => r.product).join(', ')} – Mua hàng, tuần này.`, `Rush order ${risk.slice(0, 2).map((r) => r.product).join(', ')} – Purchasing, this week.`)}</li></ol></section>`,
  ];
  const deckCss = `body{background:#0e1c19;padding:24px}.s{background:#fff;border-radius:18px;aspect-ratio:16/9;max-width:920px;margin:0 auto 24px;padding:40px 48px;box-sizing:border-box;overflow:hidden;position:relative}.s h2{font-size:24px;line-height:1.25;color:#0b2f27;margin:6px 0 18px}.s.title{background:linear-gradient(135deg,#137a62,#0b2f27);color:#fff;display:flex;flex-direction:column;justify-content:center}.s.title h1{font-size:44px;margin:8px 0;color:#fff}.s.title .big{font-size:22px;opacity:.8}.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#2e9a7c;margin:0}.s.title .eyebrow{color:#f4c15d}ol{font-size:18px;line-height:1.7}`;
  const deck = html(L('Họp giao ban', 'Monthly review'), '', slides.join('')).replace('</style>', `${deckCss}</style>`).replace(/<h1>[^<]*<\/h1><p class="sub"><\/p>/, '');
  await c.call('create_artifact', { kind: 'html', title: 'Monthly review deck', content: deck });
  return T(c.lang,
    `Bộ **${slides.length} slide** đã sẵn sàng. Thông điệp chính: doanh thu ${fmt(revenue)} đ, giao đúng hẹn ${onTime}%, nợ quá hạn ${fmt(overdue)} đ (${pct(overdue, bal)}%), ${risk.length} mặt hàng nguy cơ hết. 3 quyết định cần thông qua nằm ở slide cuối. Ở chế độ demo, slide là HTML; với Claude thật, kỹ năng PowerPoint xuất file .pptx để chỉnh tiếp.`,
    `A **${slides.length}-slide** deck is ready. Headline: revenue ${fmt(revenue)} VND, ${onTime}% on time, ${fmt(overdue)} overdue (${pct(overdue, bal)}%), ${risk.length} products at stock-out risk. Three decisions are on the last slide. In demo mode the deck is HTML; with real Claude the PowerPoint skill produces an editable .pptx.`);
};

/* ============================================================= onboarding */
function addWorkdays(iso: string, n: number): string {
  const d = new Date(iso);
  const step = n < 0 ? -1 : 1;
  let left = Math.abs(n);
  while (left > 0) { d.setDate(d.getDate() + step); const wd = d.getDay(); if (wd !== 0 && wd !== 6) left--; }
  return d.toISOString().slice(0, 10);
}
const onboarding: Script = async (c) => {
  const { name = '', role = '', department = '', start = addDays(c.today, 10), manager = '' } = c.inputs;
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : addDays(c.today, 10);
  c.say('Đọc quy trình tiếp nhận và quy định bảo mật.', 'Reading the onboarding procedure and security rules.');
  const proc = (await c.call('search_knowledge', { query: 'nhân viên mới IT tài khoản laptop hợp đồng thử việc hồ sơ', limit: 6 })).data as { results?: { passage: string }[] };
  await c.call('search_knowledge', { query: 'bảo mật thông tin tài khoản', limit: 2 });
  const tMinus3 = addWorkdays(startDate, -3);
  const probation = /chuyen vien|ky su|truong|quan ly/.test(fold(role)) ? 60 : 30;
  c.say('Mở ticket cho IT, Hành chính, Nhân sự.', 'Opening tickets for IT, Admin and HR.');
  const it = (await c.call('create_ticket', { subject: `IT: chuẩn bị cho ${name} (${role})`, priority: 'normal', summary: `Tạo email công ty, tài khoản HRM và CRM${/cskh|cham soc/.test(fold(department + role)) ? ', Zalo OA và helpdesk' : ''}; cấp laptop; cài phần mềm theo phòng ${department}. Ngày bắt đầu ${startDate}.`, assignee: 'IT', dueDate: tMinus3 })).data as { ticketId?: string };
  const ad = (await c.call('create_ticket', { subject: `Hành chính: thẻ & chỗ ngồi cho ${name}`, priority: 'normal', summary: `Thẻ ra vào, chỗ ngồi khu ${department}, đồng phục (nếu có).`, assignee: 'Hành chính', dueDate: tMinus3 })).data as { ticketId?: string };
  const hr = (await c.call('create_ticket', { subject: `Nhân sự: hợp đồng thử việc ${name}`, priority: 'normal', summary: `Gửi hợp đồng thử việc ${probation} ngày; thu CCCD, sổ BHXH, bằng cấp, tài khoản ngân hàng; lịch hướng dẫn 9:00 ngày ${startDate}; nhắc đăng ký BHXH trong 30 ngày sau hợp đồng chính thức.`, assignee: 'Nhân sự', dueDate: tMinus3 })).data as { ticketId?: string };
  await c.call('draft_email', { to: `${name} (email cá nhân)`, subject: `Chào mừng ${name} gia nhập ${c.company}`, body: `Chào ${name},\n\nChúc mừng bạn gia nhập đội ${department} ở vị trí ${role}. Ngày làm việc đầu tiên: ${startDate}, 8:45 tại văn phòng.\n\nNgày đầu:\n- 9:00 Phòng Nhân sự hướng dẫn nội quy, bảo mật thông tin, an toàn\n- 11:00 Gặp quản lý ${manager} và người hướng dẫn\n- Chiều: nhận laptop, tài khoản email/HRM/CRM\n\nVui lòng mang: CCCD, sổ BHXH (nếu có), bản sao bằng cấp, thông tin tài khoản ngân hàng.\n\nHẹn gặp bạn!\nPhòng Nhân sự` });
  await c.call('draft_email', { to: manager || 'Quản lý trực tiếp', subject: `Chuẩn bị đón ${name} ngày ${startDate}`, body: `Chào anh/chị,\n\n${name} (${role}) bắt đầu ngày ${startDate}. Nhờ anh/chị trước ${tMinus3}:\n1. Chọn người hướng dẫn (buddy) trong nhóm.\n2. Gửi 3 việc cụ thể cho tuần đầu.\n3. Đặt lịch đánh giá 30 ngày (${addDays(startDate, 30)}) và đánh giá cuối thử việc (${addDays(startDate, probation)}).\n\nTicket đã mở: IT ${it.ticketId}, Hành chính ${ad.ticketId}, Nhân sự ${hr.ticketId}.\n\nCảm ơn,\nPhòng Nhân sự` });
  const checklist = [
    { task: 'Tài khoản email, HRM, CRM + laptop', owner: 'IT', due: tMinus3, ref: it.ticketId },
    { task: 'Thẻ ra vào, chỗ ngồi', owner: 'Hành chính', due: tMinus3, ref: ad.ticketId },
    { task: `Hợp đồng thử việc ${probation} ngày + hồ sơ`, owner: 'Nhân sự', due: tMinus3, ref: hr.ticketId },
    { task: 'Chọn buddy, giao 3 việc tuần đầu', owner: manager || 'Quản lý', due: tMinus3, ref: '' },
    { task: 'Hướng dẫn nội quy, bảo mật, an toàn (9:00)', owner: 'Nhân sự', due: startDate, ref: '' },
    { task: 'Đào tạo sản phẩm, CRM/HRM, quy trình phòng', owner: manager || 'Quản lý', due: addWorkdays(startDate, 4), ref: '' },
    { task: 'Đánh giá 30 ngày', owner: manager || 'Quản lý', due: addDays(startDate, 30), ref: '' },
    { task: 'Đánh giá cuối thử việc', owner: `${manager || 'Quản lý'} + Nhân sự`, due: addDays(startDate, probation), ref: '' },
  ].map((r) => ({ ...r, status: 'open' }));
  await c.call('create_artifact', { kind: 'table', title: 'Onboarding checklist', columns: ['task', 'owner', 'due', 'status', 'ref'], rows: checklist });
  const cs = /cskh|cham soc|customer/.test(fold(department + ' ' + role));
  await c.call('create_artifact', { kind: 'markdown', title: '30-60-90 plan', content: `# Kế hoạch 30-60-90 ngày – ${name}\n\n**Vị trí:** ${role} · **Phòng:** ${department} · **Quản lý:** ${manager}\n\n## 30 ngày: học và quan sát\n${cs ? '- Nắm chính sách hoàn trả, voucher, thời gian phản hồi 4 giờ\n- Xử lý 30 ticket có buddy kèm, đọc lại 50 ticket cũ\n- Thành thạo helpdesk, Zalo OA, tra đơn trên CRM' : '- Nắm sản phẩm, khách hàng chính, quy trình phòng\n- Làm 3 việc thật có người hướng dẫn kèm\n- Thành thạo CRM/HRM'}\n\n## 60 ngày: làm độc lập\n${cs ? '- Tự xử lý ticket thường; thời gian phản hồi ≤ 4 giờ\n- Phụ trách nhóm khách Horeca\n- Đề xuất 1 câu trả lời mẫu mới cho câu hỏi lặp lại' : '- Tự phụ trách mảng việc chính\n- Đề xuất 1 cải tiến quy trình'}\n\n## 90 ngày: đóng góp\n${cs ? '- Điểm hài lòng ≥ 4,5★ trên ticket phụ trách\n- Hướng dẫn lại 1 người mới\n- Dùng trợ lý AI của công ty để soạn trả lời, tiết kiệm ≥ 30% thời gian' : '- Đạt chỉ tiêu phòng\n- Dùng công cụ AI được phê duyệt cho việc lặp lại'}\n\n*Mốc đánh giá: ${addDays(startDate, 30)} và ${addDays(startDate, probation)} (thử việc ${probation} ngày theo quy trình công ty).*` });
  void proc;
  return T(c.lang,
    `Đã chuẩn bị đón **${name}** (${role}) ngày ${startDate}. **Trước ${tMinus3}:** IT (${it.ticketId}) tài khoản + laptop, Hành chính (${ad.ticketId}) thẻ + chỗ ngồi, Nhân sự (${hr.ticketId}) hợp đồng thử việc ${probation} ngày; quản lý ${manager} chọn buddy. Email chào mừng và email cho quản lý đã soạn, kèm checklist có hạn và kế hoạch 30-60-90.`,
    `Onboarding for **${name}** (${role}) on ${startDate} is set. **Before ${tMinus3}:** IT (${it.ticketId}) accounts + laptop, Admin (${ad.ticketId}) badge + desk, HR (${hr.ticketId}) ${probation}-day probation contract; ${manager} picks a buddy. Welcome and manager emails drafted, plus a dated checklist and a 30-60-90 plan.`);
};

/* ============================================================ AI readiness */
const aiReadiness: Script = async (c) => {
  const share = (num(c.inputs.automation) || 30) / 100;
  c.say('Tổng hợp khảo sát sử dụng AI nội bộ.', 'Aggregating the internal AI-usage survey.');
  const total = num((await agg(c, { source: 'ai_survey', metrics: [{ fn: 'count' }] }))[0]?.count);
  const users = num((await agg(c, { source: 'ai_survey', metrics: [{ fn: 'count' }], where: [{ field: 'uses_ai', op: 'eq', value: 'yes' }] }))[0]?.count);
  const daily = num((await agg(c, { source: 'ai_survey', metrics: [{ fn: 'count' }], where: [{ field: 'frequency', op: 'eq', value: 'daily' }] }))[0]?.count);
  const personal = num((await agg(c, { source: 'ai_survey', metrics: [{ fn: 'count' }], where: [{ field: 'account_type', op: 'eq', value: 'personal' }] }))[0]?.count);
  const risky = num((await agg(c, { source: 'ai_survey', metrics: [{ fn: 'count' }], where: [{ field: 'account_type', op: 'eq', value: 'personal' }, { field: 'data_shared', op: 'in', value: ['customer_data', 'financial', 'employee_data'] }] }))[0]?.count);
  const trained = num((await agg(c, { source: 'ai_survey', metrics: [{ fn: 'count' }], where: [{ field: 'trained', op: 'eq', value: 'yes' }] }))[0]?.count);
  const hours = num((await agg(c, { source: 'ai_survey', metrics: [{ field: 'repetitive_hours_week', fn: 'sum', as: 'h' }] }))[0]?.h);
  const deptAll = await agg(c, { source: 'ai_survey', groupBy: 'department', metrics: [{ fn: 'count', as: 'staff' }, { field: 'repetitive_hours_week', fn: 'sum', as: 'hours' }] });
  const deptUsers = await agg(c, { source: 'ai_survey', groupBy: 'department', metrics: [{ fn: 'count', as: 'users' }], where: [{ field: 'uses_ai', op: 'eq', value: 'yes' }] });
  const deptRisk = await agg(c, { source: 'ai_survey', groupBy: 'department', metrics: [{ fn: 'count', as: 'risky' }], where: [{ field: 'account_type', op: 'eq', value: 'personal' }, { field: 'data_shared', op: 'in', value: ['customer_data', 'financial', 'employee_data'] }] });
  c.say('Kiểm tra quy định bảo mật và danh sách công cụ được phép.', 'Checking security rules and the approved-tool list.');
  const sec = (await c.call('search_knowledge', { query: 'công cụ AI phê duyệt tài khoản cá nhân', limit: 4 })).data as { results?: { passage: string }[] };
  const noApproved = (sec.results ?? []).some((r) => /chưa có danh sách/i.test(r.passage));
  const saved = await calc(c, `round(${hours} * ${share} * 4.3)`);
  const adoption = pct(users, total), trainedPct = pct(trained, total), riskyPct = pct(risky, total), personalPct = pct(personal, users);
  const score = (v: number, cuts: number[]) => 1 + cuts.filter((x) => v >= x).length;
  const pillars = [
    { pillar: 'Usage / Mức sử dụng', score: score(adoption, [20, 40, 60, 75]), why: `${adoption}% nhân viên dùng AI, ${daily} người dùng hằng ngày` },
    { pillar: 'Skills / Kỹ năng', score: score(trainedPct, [20, 40, 60, 80]), why: `chỉ ${trainedPct}% được đào tạo` },
    { pillar: 'Governance / Quản trị', score: noApproved ? 1 : 3, why: noApproved ? 'chưa có danh sách công cụ được phép, chưa có quy định AI' : 'có danh sách công cụ' },
    { pillar: 'Data safety / An toàn dữ liệu', score: 5 - score(riskyPct, [10, 20, 30, 40]) + 1, why: `${risky} người (${riskyPct}%) đưa dữ liệu khách hàng/tài chính/nhân sự vào tài khoản AI cá nhân` },
    { pillar: 'Opportunity / Cơ hội', score: score(saved, [40, 80, 120, 160]), why: `~${fmt(saved)} giờ/tháng có thể tiết kiệm` },
  ];
  const overall = Math.round(pillars.reduce((n, p) => n + p.score, 0) / pillars.length * 10) / 10;
  const deptRows = deptAll.map((d) => ({ department: d.department, staff: d.staff, users: num(deptUsers.find((u) => u.department === d.department)?.users), adoption: pct(num(deptUsers.find((u) => u.department === d.department)?.users), num(d.staff)), risky: num(deptRisk.find((u) => u.department === d.department)?.risky), hours_week: d.hours }));
  await c.call('create_artifact', {
    kind: 'html', title: 'AI readiness scorecard',
    content: html('Bảng điểm sẵn sàng AI', `${c.company} · ${total} người trả lời khảo sát · ${c.today}`, `<div class="grid">${kpi('Điểm tổng', `${overall}/5`, '5 trụ cột')}${kpi('Dùng AI', `${adoption}%`, `${personalPct}% bằng tài khoản cá nhân`)}${kpi('Rủi ro dữ liệu', `${riskyPct}%`, `${risky} người`)}${kpi('Giờ có thể tiết kiệm', `${fmt(saved)} h/tháng`, `${hours} h lặp lại/tuần × ${Math.round(share * 100)}%`)}</div><div class="card"><h2>5 trụ cột</h2>${tableHtml(['pillar', 'score', 'why'], pillars.map((p) => ({ ...p, score: `${'●'.repeat(p.score)}${'○'.repeat(5 - p.score)} ${p.score}` })))}</div><div class="card"><h2>Tỷ lệ dùng AI theo phòng ban (%)</h2>${svgBars(deptRows.map((d) => ({ label: String(d.department), value: d.adoption })))}</div><div class="card"><h2>Rủi ro & cơ hội theo phòng ban</h2>${tableHtml(['department', 'staff', 'users', 'adoption', 'risky', 'hours_week'], deptRows)}</div><p class="sub">Luật Trí tuệ nhân tạo (hiệu lực 01/03/2026) và Luật Bảo vệ dữ liệu cá nhân (hiệu lực 01/01/2026) là bối cảnh pháp lý; đây không phải tư vấn pháp lý.</p>`),
  });
  await c.call('create_artifact', { kind: 'markdown', title: '90-day roadmap', content: `# Lộ trình 90 ngày\n\n**Mục tiêu:** ${c.inputs.goal || '—'}\n\n## Tuần 1–2: an toàn trước\n- Ban hành quy định sử dụng AI và danh sách công cụ được phép (dùng agent "Soạn quy định sử dụng AI").\n- Chuyển ${personal} người đang dùng tài khoản cá nhân sang tài khoản công ty; ưu tiên ${deptRows.filter((d) => d.risky > 0).sort((a, b) => b.risky - a.risky).slice(0, 2).map((d) => d.department).join(' và ')} (rủi ro dữ liệu cao nhất).\n\n## Tuần 3–6: đào tạo trên việc thật\n- Workshop theo phòng ban, mỗi phòng 3 việc lặp lại nhất (${deptRows.sort((a, b) => num(b.hours_week) - num(a.hours_week)).slice(0, 3).map((d) => `${d.department} ${d.hours_week} h/tuần`).join(', ')}).\n- Mục tiêu: ≥ 80% được đào tạo (hiện ${trainedPct}%).\n\n## Tuần 4–12: xây công cụ kết nối hệ thống\n- Agent CSKH (tra đơn, ticket), đối soát ngân hàng, báo giá, báo cáo tuần.\n- Kết nối dữ liệu qua MCP/CSV với CRM, phần mềm kế toán.\n\n## Ngày 90: đo lường\n- So sánh tỷ lệ dùng AI, giờ tiết kiệm, số người dùng tài khoản cá nhân với khảo sát này.` });
  const weakest = [...pillars].sort((a, b) => a.score - b.score)[0];
  return T(c.lang,
    `Điểm sẵn sàng AI **${overall}/5**. Nhân viên đã dùng AI nhiều (${adoption}%), nhưng **rủi ro lớn nhất** là ${risky} người (${riskyPct}%) đưa dữ liệu khách hàng, tài chính hoặc nhân sự vào tài khoản AI cá nhân, trong khi công ty chưa có danh sách công cụ được phép. **Cơ hội lớn nhất:** ~**${fmt(saved)} giờ/tháng** từ ${hours} giờ việc lặp lại mỗi tuần. Trụ cột yếu nhất: ${weakest.pillar}. Bảng điểm và lộ trình 90 ngày ở bên dưới.`,
    `AI readiness **${overall}/5**. Staff already use AI (${adoption}%), but the **biggest risk** is ${risky} people (${riskyPct}%) putting customer, financial or HR data into personal AI accounts with no approved-tool list. **Biggest opportunity:** ~**${fmt(saved)} hours/month** from ${hours} weekly repetitive hours. Weakest pillar: ${weakest.pillar}. Scorecard and 90-day roadmap below.`);
};

/* ============================================================== AI policy */
const aiPolicy: Script = async (c) => {
  c.say('Xem nhân viên đang dùng công cụ AI nào và đưa dữ liệu gì vào.', 'Checking which AI tools staff use and what data goes in.');
  const byTool = await agg(c, { source: 'ai_survey', groupBy: 'main_tool', metrics: [{ fn: 'count', as: 'users' }], where: [{ field: 'uses_ai', op: 'eq', value: 'yes' }], sort: { field: 'users', dir: 'desc' } });
  const toolAcc = await all(c, 'ai_survey', { where: [{ field: 'uses_ai', op: 'eq', value: 'yes' }], fields: ['main_tool', 'account_type', 'data_shared', 'department'] });
  const byData = await agg(c, { source: 'ai_survey', groupBy: 'data_shared', metrics: [{ fn: 'count', as: 'people' }], where: [{ field: 'uses_ai', op: 'eq', value: 'yes' }] });
  await c.call('search_knowledge', { query: 'bảo mật thông tin mật tài khoản cá nhân AI', limit: 5 });
  const planned = (c.inputs.tools || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const fdi = c.inputs.company_type === 'fdi' || c.inputs.company_type === 'outsourcing';
  const decisions = byTool.map((t) => {
    const rows = toolAcc.filter((r) => r.main_tool === t.main_tool);
    const accounts = Array.from(new Set(rows.map((r) => r.account_type))).join('/');
    const depts = Array.from(new Set(rows.map((r) => r.department))).join(', ');
    const plannedMatch = planned.some((p) => fold(p).includes(fold(String(t.main_tool)).split(' ')[0]));
    const decision = plannedMatch ? 'approve (tài khoản công ty)' : accounts.includes('company') ? 'approve (đã có tài khoản công ty)' : /canva/i.test(String(t.main_tool)) ? 'approve có điều kiện (không dữ liệu khách hàng)' : 'replace bằng công cụ được phép';
    return { tool: t.main_tool, used_by: `${t.users} người (${depts})`, account_today: accounts, decision, reason: decision.startsWith('replace') ? 'Tài khoản cá nhân, không kiểm soát được dữ liệu; nhân viên chuyển sang công cụ được phép' : 'Quản trị được tài khoản, có điều khoản bảo vệ dữ liệu doanh nghiệp' };
  });
  for (const p of planned) if (!decisions.some((d) => fold(String(d.tool)).includes(fold(p).split(' ')[0]))) decisions.push({ tool: p, used_by: 'dự kiến', account_today: '—', decision: 'approve (tài khoản công ty)', reason: 'Công ty dự kiến cấp phép' });
  const policy = `# QUY ĐỊNH SỬ DỤNG TRÍ TUỆ NHÂN TẠO (AI) – DỰ THẢO
*${c.company} · Bản nháp do AI soạn ngày ${c.today} · **Cần luật sư rà soát trước khi ban hành***

## 1. Mục đích
Giúp nhân viên dùng AI để làm việc nhanh hơn, đồng thời bảo vệ dữ liệu khách hàng, dữ liệu cá nhân và bí mật kinh doanh, phù hợp Luật Trí tuệ nhân tạo (Luật số 134/2025, hiệu lực 01/03/2026) và Luật Bảo vệ dữ liệu cá nhân (Luật số 91/2025, hiệu lực 01/01/2026).

## 2. Phạm vi
Áp dụng cho toàn bộ nhân viên, cộng tác viên và mọi công cụ AI tạo sinh (chatbot, trợ lý, công cụ tạo hình ảnh, tính năng AI trong phần mềm).

## 3. Công cụ được phép
- Chỉ dùng công cụ trong danh sách phê duyệt (Phụ lục 1), **đăng nhập bằng tài khoản công ty**.
- Hiện có ${byTool.reduce((n, t) => n + num(t.users), 0)} người dùng AI, ${toolAcc.filter((r) => r.account_type === 'personal').length} người dùng tài khoản cá nhân: chuyển đổi trong 30 ngày kể từ ngày ban hành.

## 4. Dữ liệu tuyệt đối không đưa vào AI ngoài danh sách
- Dữ liệu cá nhân của khách hàng, nhân viên (họ tên kèm số điện thoại, CCCD, lương, đánh giá).
- Giá bán, chiết khấu, công nợ, báo cáo tài chính chưa công bố.
- Hợp đồng, tài liệu đối tác có điều khoản bảo mật.
*Khảo sát cho thấy hiện có: ${byData.filter((d) => d.data_shared !== 'none').map((d) => `${d.people} người đưa ${d.data_shared}`).join(', ')}.*

## 5. Sử dụng được khuyến khích
Soạn thảo, tóm tắt, dịch, phân tích dữ liệu đã ẩn danh, lập trình, tạo báo cáo từ hệ thống được kết nối chính thức.

## 6. Con người chịu trách nhiệm cuối
- Mọi kết quả AI gửi ra ngoài (khách hàng, cơ quan, đối tác) phải được người phụ trách đọc và chịu trách nhiệm.
- Không dùng AI để tự động ra quyết định về con người (tuyển dụng, kỷ luật, tín dụng) khi không có người xem xét.

## 7. Minh bạch nội dung do AI tạo
Hình ảnh, video, âm thanh do AI tạo dùng cho khách hàng hoặc công chúng phải được gắn nhãn theo quy định về nội dung AI.

## 8. Dữ liệu cá nhân${fdi ? ' và chuyển dữ liệu ra nước ngoài' : ''}
Xử lý dữ liệu cá nhân phải có cơ sở hợp pháp và tối thiểu hoá.${fdi ? ' Việc đưa dữ liệu cá nhân lên hệ thống AI đặt ngoài Việt Nam (kể cả hệ thống của tập đoàn) phải tuân thủ thủ tục chuyển dữ liệu xuyên biên giới theo luật; phòng Pháp chế/IT xác nhận trước.' : ''}

## 9. Vai trò
- **Ban giám đốc:** phê duyệt quy định và danh sách công cụ.
- **IT:** cấp, thu hồi tài khoản; giám sát; xử lý sự cố trong 24 giờ.
- **Quản lý:** đảm bảo nhóm được đào tạo và tuân thủ.
- **Nhân viên:** tuân thủ, báo cáo sự cố.

## 10. Đào tạo
Mọi nhân viên hoàn thành buổi đào tạo AI an toàn trong 60 ngày (hiện ${num((await agg(c, { source: 'ai_survey', metrics: [{ fn: 'count' }], where: [{ field: 'trained', op: 'eq', value: 'yes' }] }))[0]?.count)} người đã được đào tạo).

## 11. Sự cố và vi phạm
Lộ lọt dữ liệu qua AI báo IT trong 24 giờ. Vi phạm xử lý theo Nội quy lao động.

## 12. Rà soát
Quy định được rà soát 6 tháng/lần hoặc khi có văn bản hướng dẫn mới.

### Phụ lục 1 – Công cụ được phép
${decisions.filter((d) => d.decision.startsWith('approve')).map((d) => `- ${d.tool}: ${d.decision}`).join('\n')}`;
  await c.call('create_artifact', { kind: 'markdown', title: 'AI use policy (draft)', content: policy });
  await c.call('create_artifact', { kind: 'table', title: 'Tool decision', columns: ['tool', 'used_by', 'account_today', 'decision', 'reason'], rows: decisions });
  await c.call('create_artifact', { kind: 'markdown', title: 'One-page staff guide', content: `# Dùng AI an toàn – 1 trang\n\n## Nên\n- Dùng ${decisions.filter((d) => d.decision.startsWith('approve')).map((d) => d.tool).join(', ')} bằng **tài khoản công ty**.\n- Ẩn tên, số điện thoại, số tiền trước khi hỏi AI nếu không cần thiết.\n- Đọc lại mọi kết quả trước khi gửi khách.\n- Gắn nhãn hình ảnh/video do AI tạo khi dùng cho bên ngoài.\n\n## Không\n- Không dán dữ liệu khách hàng, giá, công nợ, lương vào tài khoản AI cá nhân.\n- Không để AI tự quyết định về nhân sự hay tín dụng.\n- Không tải hợp đồng của đối tác lên công cụ ngoài danh sách.\n\n## Khi nghi ngờ\nHỏi IT hoặc trợ lý HR & nội quy. Lỡ đưa dữ liệu nhạy cảm: báo IT trong 24 giờ.` });
  const replace = decisions.filter((d) => d.decision.startsWith('replace'));
  return T(c.lang,
    `Đã soạn **dự thảo quy định sử dụng AI** (12 điều, dẫn chiếu Luật AI 134/2025 và Luật Bảo vệ dữ liệu cá nhân 91/2025 ở mức nguyên tắc), bảng quyết định công cụ và hướng dẫn 1 trang. **3 thay đổi nhân viên thấy đầu tiên:** (1) ${replace.map((r) => `${r.tool} cá nhân`).join(', ')} chuyển sang ${planned.join(', ') || 'công cụ được phép'} bằng tài khoản công ty; (2) cấm dán dữ liệu khách hàng, giá, công nợ vào AI cá nhân; (3) mọi nội dung AI gửi khách phải có người duyệt. **Cần luật sư rà soát trước khi ban hành.**`,
    `Drafted the **AI use policy** (12 sections, referencing the AI Law 134/2025 and the Personal Data Protection Law 91/2025 at principle level), a tool-decision table and a one-page guide. **First 3 changes staff will feel:** (1) personal ${replace.map((r) => r.tool).join(', ')} move to ${planned.join(', ') || 'approved tools'} on company accounts; (2) no customer, price or debt data in personal AI; (3) every AI output sent to customers is reviewed by a person. **Needs legal review before adoption.**`);
};

/* ================================================================== chats */
const dataChat: Script = async (c) => {
  const q = fold(c.inputs.message ?? '');
  if (/no|cong no|qua han|overdue|owe|debt|receivable/.test(q)) {
    const rows = await agg(c, { source: 'receivables', groupBy: 'customer_name', metrics: [{ field: 'balance', fn: 'sum', as: 'overdue_balance' }, { field: 'days_overdue', fn: 'max', as: 'max_days' }], where: [{ field: 'days_overdue', op: 'gt', value: 0 }, { field: 'balance', op: 'gt', value: 0 }], sort: { field: 'overdue_balance', dir: 'desc' } });
    const total = await calc(c, rows.map((r) => num(r.overdue_balance)).join(' + ') || '0');
    await c.call('create_artifact', { kind: 'table', title: 'Overdue by customer', columns: ['customer_name', 'overdue_balance', 'max_days'], rows });
    return T(c.lang, `Tổng nợ quá hạn **${fmt(total)} đ** ở ${rows.length} khách. Nhiều nhất: ${rows.slice(0, 3).map((r) => `**${r.customer_name}** ${fmt(num(r.overdue_balance))} đ (lâu nhất ${r.max_days} ngày)`).join('; ')}. Bảng đầy đủ ở bên dưới.\n\n*Gợi ý hỏi tiếp:* "Ai phụ trách các khách này và nên gọi ai trước?"`, `Total overdue **${fmt(total)} VND** across ${rows.length} customers. Largest: ${rows.slice(0, 3).map((r) => `**${r.customer_name}** ${fmt(num(r.overdue_balance))} (oldest ${r.max_days} days)`).join('; ')}. Full table below.\n\n*Follow-up idea:* "Who manages these accounts and who should be called first?"`);
  }
  if (/doanh thu|revenue|khu vuc|region|ban duoc|sales by/.test(q)) {
    const rows = await agg(c, { source: 'orders', groupBy: 'region', metrics: [{ field: 'amount', fn: 'sum', as: 'revenue' }, { fn: 'count', as: 'orders' }], sort: { field: 'revenue', dir: 'desc' } });
    const total = await calc(c, rows.map((r) => num(r.revenue)).join(' + '));
    await c.call('create_artifact', { kind: 'table', title: 'Revenue by region', columns: ['region', 'revenue', 'orders'], rows });
    return T(c.lang, `Doanh thu tháng 10: **${fmt(total)} đ**. ${rows.map((r) => `${r.region} ${fmt(num(r.revenue))} đ (${pct(num(r.revenue), total)}%, ${r.orders} đơn)`).join('; ')}.\n\n*Gợi ý hỏi tiếp:* "Sản phẩm nào bán chạy nhất ở ${rows[0]?.region}?"`, `October revenue: **${fmt(total)} VND**. ${rows.map((r) => `${r.region} ${fmt(num(r.revenue))} (${pct(num(r.revenue), total)}%, ${r.orders} orders)`).join('; ')}.\n\n*Follow-up idea:* "Which product sells best in ${rows[0]?.region}?"`);
  }
  if (/het hang|ton kho|stock|run out|thieu hang/.test(q)) {
    const inv = await all(c, 'inventory');
    const rows = inv.map((r) => ({ product: r.product, available: num(r.on_hand) - num(r.reserved), days_of_cover: Math.round(((num(r.on_hand) - num(r.reserved)) / (num(r.avg_daily_sales) || 1)) * 10) / 10, lead_time_days: num(r.lead_time_days) })).sort((a, b) => a.days_of_cover - b.days_of_cover);
    const risk = rows.filter((r) => r.days_of_cover < r.lead_time_days);
    await c.call('create_artifact', { kind: 'table', title: 'Days of cover', columns: ['product', 'available', 'days_of_cover', 'lead_time_days'], rows });
    return T(c.lang, `**${risk.length} mặt hàng** sẽ hết trước khi kịp nhập: ${risk.map((r) => `**${r.product}** còn ${r.days_of_cover} ngày (nhập mất ${r.lead_time_days} ngày)`).join('; ')}.\n\n*Gợi ý:* chạy "Agent đề xuất đặt hàng tồn kho" để có đơn đặt hàng trong ngân sách.`, `**${risk.length} products** will run out before restock: ${risk.map((r) => `**${r.product}** ${r.days_of_cover} days left (lead ${r.lead_time_days})`).join('; ')}.\n\n*Tip:* run the inventory reorder agent for a budgeted purchase proposal.`);
  }
  if (/pipeline|deal|co hoi|sales|nhan vien kinh doanh/.test(q)) {
    const deals = await all(c, 'deals');
    const open = deals.filter((d) => !['won', 'lost'].includes(d.stage));
    const byOwner = new Map<string, { open: number; value: number; weighted: number }>();
    for (const d of open) { const e = byOwner.get(d.owner) ?? { open: 0, value: 0, weighted: 0 }; e.open++; e.value += num(d.value); e.weighted += num(d.value) * num(d.probability) / 100; byOwner.set(d.owner, e); }
    const rows = [...byOwner.entries()].map(([owner, e]) => ({ owner, open_deals: e.open, pipeline: e.value, weighted: Math.round(e.weighted) })).sort((a, b) => b.weighted - a.weighted);
    await calc(c, rows.map((r) => r.weighted).join(' + '));
    await c.call('create_artifact', { kind: 'table', title: 'Pipeline by rep', columns: ['owner', 'open_deals', 'pipeline', 'weighted'], rows });
    return T(c.lang, `${rows.map((r) => `**${r.owner}**: ${r.open_deals} cơ hội, ${compact(r.pipeline)} đ (trọng số ${compact(r.weighted)} đ)`).join('; ')}.\n\n*Gợi ý hỏi tiếp:* "Cơ hội nào không có hoạt động quá 14 ngày?"`, `${rows.map((r) => `**${r.owner}**: ${r.open_deals} deals, ${compact(r.pipeline)} (weighted ${compact(r.weighted)})`).join('; ')}.\n\n*Follow-up idea:* "Which deals have been idle for 14+ days?"`);
  }
  if (/danh gia|review|phan hoi|sao|rating/.test(q)) {
    const rows = await agg(c, { source: 'reviews', groupBy: 'source', metrics: [{ field: 'rating', fn: 'avg', as: 'avg_rating' }, { fn: 'count', as: 'reviews' }], sort: { field: 'avg_rating', dir: 'asc' } });
    await c.call('create_artifact', { kind: 'table', title: 'Ratings by channel', columns: ['source', 'avg_rating', 'reviews'], rows });
    return T(c.lang, `Điểm theo kênh: ${rows.map((r) => `${r.source} ${r.avg_rating}★ (${r.reviews})`).join(', ')}.`, `Ratings by channel: ${rows.map((r) => `${r.source} ${r.avg_rating}★ (${r.reviews})`).join(', ')}.`);
  }
  const r = await c.call('query_records', { source: 'customers', limit: 3 });
  void r;
  return T(c.lang, 'Tôi có thể trả lời về **công nợ**, **doanh thu**, **tồn kho**, **pipeline** và **đánh giá khách hàng**. Bạn thử hỏi cụ thể hơn, ví dụ "khách nào nợ quá hạn nhiều nhất?".', 'I can answer about **receivables**, **revenue**, **stock**, **pipeline** and **customer reviews**. Try something specific, e.g. "who owes us the most?".');
};

const TOPICS: [RegExp, string][] = [
  [/phep|nghi /, 'nghỉ phép phép năm'],
  [/tu xa|remote|wfh/, 'làm việc từ xa'],
  [/taxi|khach san|tiep khach|cong tac|hoa don|chi phi|expense/, 'taxi khách sạn tiếp khách công tác phí hoá đơn'],
  [/chatgpt|\bai\b|bao mat|tai khoan ca nhan|gemini|copilot/, 'thông tin mật tài khoản cá nhân công cụ AI'],
  [/nhan vien moi|thu viec|onboard/, 'nhân viên mới thử việc'],
  [/hoan tien|voucher|khieu nai/, 'hoàn tiền voucher khiếu nại'],
];
const policyHelpdesk: Script = async (c) => {
  const question = c.inputs.message ?? '';
  const f = ` ${fold(question)} `;
  const topic = TOPICS.find(([re]) => re.test(f));
  // The most specific alternative wins (listed first in each regex), e.g. "phep" before "nghi".
  const kw = topic ? (topic[0].source.split('|').map((a) => a.replace(/\\b/g, '')).find((a) => new RegExp(a).test(f)) ?? '').trim() : '';
  type Hits = { results?: { title: string; passage: string }[] };
  // Search the specific word first; widen to the topic only when the word itself is not documented.
  let res = (await c.call('search_knowledge', { query: topic && kw.length >= 3 ? kw : question, limit: 3 })).data as Hits;
  if (topic && !(res.results ?? []).length) res = (await c.call('search_knowledge', { query: topic[1], limit: 3 })).data as Hits;
  const hits = topic ? (res.results ?? []).slice(0, 2) : [];
  if (!hits.length) {
    const tk = (await c.call('create_ticket', { subject: `Câu hỏi chưa có trong tài liệu: ${question.slice(0, 80)}`, priority: 'normal', summary: question, assignee: 'HR', dueDate: addDays(c.today, 2) })).data as { ticketId?: string };
    return T(c.lang, `Tài liệu nội bộ hiện **chưa có** quy định về nội dung này, nên tôi không trả lời để tránh sai. Tôi đã chuyển câu hỏi cho phòng Nhân sự (ticket **${tk.ticketId}**); bạn sẽ nhận phản hồi trong 2 ngày làm việc.`, `The internal documents **do not cover** this yet, so I will not guess. I forwarded your question to HR (ticket **${tk.ticketId}**); expect an answer within 2 working days.`);
  }
  const ai = /chatgpt|\bai\b|tai khoan ca nhan|gemini/.test(f);
  const lead = ai ? T(c.lang, '**Không.** Báo giá chứa giá bán và chiết khấu, là thông tin mật.', '**No.** Quotes contain prices and discounts, which are confidential.') : '';
  return T(c.lang,
    `${lead}${lead ? ' ' : ''}Theo tài liệu công ty:\n\n${hits.map((h) => `> ${h.passage.replace(/^-\s*/, '')}\n>\n> — *${h.title}*`).join('\n\n')}${ai ? '\n\nBạn nên dùng công cụ AI được công ty cấp bằng tài khoản công ty, hoặc hỏi IT nếu chưa có.' : ''}`,
    `${lead}${lead ? ' ' : ''}According to company documents:\n\n${hits.map((h) => `> ${h.passage.replace(/^-\s*/, '')}\n>\n> — *${h.title}*`).join('\n\n')}${ai ? '\n\nUse a company-approved AI tool with your company account, or ask IT if you do not have one yet.' : ''}`);
};

export const EXTRA_SCRIPTS: Record<string, Script> = {
  'quote-builder-agent': quoteBuilder,
  'inbox-triage-agent': inboxTriage,
  'bank-recon-agent': bankRecon,
  'pipeline-review-agent': pipelineReview,
  'voc-insights-agent': vocInsights,
  'expense-audit-agent': expenseAudit,
  'supplier-compare-agent': supplierCompare,
  'monthly-review-deck': monthlyDeck,
  'onboarding-agent': onboarding,
  'ai-readiness-agent': aiReadiness,
  'ai-policy-agent': aiPolicy,
  'data-chat': dataChat,
  'policy-helpdesk': policyHelpdesk,
};
