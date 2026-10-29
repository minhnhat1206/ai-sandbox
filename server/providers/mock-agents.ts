/**
 * Scripted agents for demo mode. They call the REAL tool registry against the
 * sandbox's connected data, so every number, ticket and artifact is a genuine
 * computation; only the narration is canned. Keeps offline demos honest.
 */
import { parseCsv, toCsv, toNumber } from '../../shared/engine/csv.ts';
import type { AgentHooks, AgentRequest } from './types.ts';
import { compact, esc, fmt, html, kpi, rowsOf, svgBars, T, tableHtml, type Script, type ScriptCtx } from './mock-kit.ts';
import { EXTRA_SCRIPTS } from './mock-agents-extra.ts';

/* ------------------------------------------------------------------ scripts */
const orderCare: Script = async (c) => {
  const msg = c.inputs.message ?? '';
  const orderId = /\b(\d{5})\b/.exec(msg)?.[1] ?? '48213';
  c.say('Tôi sẽ tra đơn hàng trong hệ thống trước.', 'Let me look the order up first.');
  const order = rowsOf((await c.call('query_records', { source: 'orders', where: [{ field: 'order_id', op: 'eq', value: orderId }] })).data)[0];
  if (!order) {
    await c.call('create_ticket', { subject: `Không tìm thấy đơn ${orderId}`, priority: 'high', summary: msg.slice(0, 300) });
    return T(c.lang, `Không tìm thấy đơn **${orderId}** trong hệ thống. Tôi đã tạo ticket để vận hành kiểm tra thủ công.`, `Order **${orderId}** is not in the system. I opened a ticket for operations to check manually.`);
  }
  const customer = rowsOf((await c.call('query_records', { source: 'customers', where: [{ field: 'customer_id', op: 'eq', value: order.customer_id }] })).data)[0];
  const invoices = rowsOf((await c.call('query_records', { source: 'receivables', where: [{ field: 'customer_id', op: 'eq', value: order.customer_id }, { field: 'balance', op: 'gt', value: 0 }] })).data);
  c.say('Đối chiếu chính sách giao trễ và bồi thường.', 'Checking the late-delivery and compensation policy.');
  const policy = (await c.call('search_knowledge', { query: 'hoàn tiền giao trễ voucher', limit: 3 })).data as { results?: { title: string; passage: string }[] };
  const promised = new Date(order.promised_date);
  const today = new Date('2026-10-28');
  const daysLate = Math.max(0, Math.round((today.getTime() - promised.getTime()) / 86400000));
  const amount = toNumber(order.amount) ?? 0;
  const calc = (await c.call('calculate', { expression: `round(${amount} * 0.02)` })).data as { value?: number };
  const goodwill = Math.min(calc.value ?? 0, 500000);
  const refundEligible = daysLate >= 5;
  c.say('Tạo ticket cho vận hành và soạn email trả lời.', 'Opening the ops ticket and drafting the reply.');
  const ticket = (await c.call('create_ticket', {
    customer: order.customer_name, subject: `Đơn ${orderId} trễ ${daysLate} ngày – ${order.status}`, priority: daysLate >= 5 ? 'urgent' : 'high',
    summary: `Khách ${order.customer_name} báo chưa nhận đơn ${orderId} (${order.product}, ${order.qty} x ${fmt(toNumber(order.unit_price) ?? 0)} = ${fmt(amount)} đ). Hẹn giao ${order.promised_date}, trạng thái hệ thống: ${order.status}, vận chuyển: ${order.carrier}. Cần xác nhận vị trí hàng với ${order.carrier} trong 2 giờ và gọi lại khách. Hotline không nghe máy: kiểm tra lịch trực.`,
    assignee: 'Trưởng ca giao nhận', dueDate: '2026-10-28 17:00',
  })).data as { ticketId?: string };
  const name = customer?.contact ?? order.customer_name;
  const body = `Kính gửi ${name},\n\nChúng tôi thành thật xin lỗi vì đơn hàng #${orderId} (${order.product}, ${order.qty} đơn vị) chưa đến đúng hẹn ${order.promised_date} và vì anh/chị chưa liên lạc được với hotline. Đây không phải trải nghiệm chúng tôi muốn mang lại.\n\nHệ thống ghi nhận đơn đang ở trạng thái "${order.status}" với đơn vị vận chuyển ${order.carrier}. Chúng tôi đã mở ticket ưu tiên ${ticket.ticketId ?? ''} và sẽ gọi lại anh/chị trước 17:00 hôm nay với giờ giao chính xác.\n\n${refundEligible ? 'Theo chính sách, đơn giao trễ quá 5 ngày làm việc được hoàn tiền 100% nếu anh/chị chọn huỷ. ' : ''}Nếu anh/chị tiếp tục nhận hàng, chúng tôi gửi tặng voucher ${fmt(goodwill)} đ cho đơn tiếp theo như lời xin lỗi.\n\nAnh/chị vui lòng trả lời tin nhắn này để chúng tôi xử lý theo lựa chọn của mình.\n\nTrân trọng,\nBộ phận Chăm sóc khách hàng`;
  await c.call('draft_email', { to: customer?.email || `${order.customer_name} (Zalo)`, subject: `Về đơn hàng #${orderId} – xin lỗi và cập nhật giao hàng`, body });
  const overdue = invoices.filter((i) => (toNumber(i.days_overdue) ?? 0) > 0);
  await c.call('create_artifact', {
    kind: 'markdown', title: 'Case file', content: `# Hồ sơ xử lý đơn #${orderId}

## Sự thật tìm được
| Mục | Giá trị |
|---|---|
| Khách hàng | ${order.customer_name} (${customer?.segment ?? '—'}, phụ trách: ${customer?.account_manager ?? '—'}) |
| Sản phẩm | ${order.product} × ${order.qty} = ${fmt(amount)} đ |
| Hẹn giao / trạng thái | ${order.promised_date} / **${order.status}** (${order.carrier}) |
| Số ngày trễ tính đến 28/10 | **${daysLate}** |
| Công nợ mở | ${invoices.length} hoá đơn, trong đó ${overdue.length} quá hạn (${fmt(overdue.reduce((n, i) => n + (toNumber(i.balance) ?? 0), 0))} đ) |

## Chính sách áp dụng
${(policy.results ?? []).map((r) => `- **${r.title}**: ${r.passage}`).join('\n') || '- Không tìm thấy điều khoản liên quan trong tài liệu.'}

## Đề xuất cho khách
- ${refundEligible ? 'Đủ điều kiện hoàn tiền 100% nếu huỷ (trễ ≥ 5 ngày).' : 'Chưa đủ điều kiện hoàn tiền theo chính sách.'}
- Voucher thiện chí: ${fmt(goodwill)} đ (2% giá trị đơn, tối đa 500.000 đ; dưới ngưỡng cần duyệt).

## Hành động đã thực hiện
- Ticket **${ticket.ticketId ?? ''}** cho trưởng ca giao nhận, hạn 17:00 hôm nay.
- Email trả lời đã soạn trong outbox (cần người duyệt gửi).

## Ghi chú cho quản lý
- Hotline không nghe máy trong giờ làm việc: kiểm tra lịch trực.
- Khách Horeca có tiệc cuối tuần: rủi ro mất khách nếu không giao trước thứ Bảy.${overdue.length ? `\n- Khách đang có công nợ quá hạn: cân nhắc khi quyết định bồi thường.` : ''}`,
  });
  return T(c.lang,
    `**Tóm tắt:** Đơn #${orderId} của ${order.customer_name} (${fmt(amount)} đ) đang "${order.status}", trễ **${daysLate} ngày** so với hẹn ${order.promised_date}. Tôi đã mở ticket **${ticket.ticketId ?? ''}** cho giao nhận (hạn 17:00), soạn email xin lỗi kèm ${refundEligible ? 'phương án hoàn tiền 100% nếu huỷ' : 'cập nhật lịch giao'} và voucher ${fmt(goodwill)} đ. **Cần người quyết định:** có giao gấp trước thứ Bảy được không, và có duyệt voucher hay không.`,
    `**Summary:** Order #${orderId} for ${order.customer_name} (${fmt(amount)} VND) is "${order.status}", **${daysLate} days** past the promised ${order.promised_date}. I opened ticket **${ticket.ticketId ?? ''}** for delivery (due 17:00), drafted an apology email with ${refundEligible ? 'a full refund if they cancel' : 'the delivery update'} and a ${fmt(goodwill)} VND voucher. **Human decision needed:** can we deliver before Saturday, and do you approve the voucher.`);
};

const receivables: Script = async (c) => {
  const threshold = toNumber(c.inputs.threshold) ?? 15;
  c.say('Tổng hợp công nợ theo khách hàng và theo tuổi nợ.', 'Aggregating balances by customer and ageing bucket.');
  const total = rowsOf((await c.call('aggregate_records', { source: 'receivables', metrics: [{ field: 'balance', fn: 'sum', as: 'balance' }, { fn: 'count' }] })).data)[0] ?? {};
  const byCustomer = rowsOf((await c.call('aggregate_records', { source: 'receivables', groupBy: 'customer_name', metrics: [{ field: 'balance', fn: 'sum', as: 'balance' }, { field: 'days_overdue', fn: 'max', as: 'max_overdue' }], where: [{ field: 'balance', op: 'gt', value: 0 }], sort: { field: 'balance', dir: 'desc' } })).data);
  const buckets = [['0', 0, 0], ['1-15', 1, 15], ['16-30', 16, 30], ['31-60', 31, 60], ['60+', 61, 10000]] as const;
  const bucketRows: { label: string; value: number; count: number }[] = [];
  for (const [label, lo, hi] of buckets) {
    const r = rowsOf((await c.call('aggregate_records', { source: 'receivables', metrics: [{ field: 'balance', fn: 'sum', as: 'balance' }, { fn: 'count' }], where: [{ field: 'balance', op: 'gt', value: 0 }, { field: 'days_overdue', op: 'gte', value: lo }, { field: 'days_overdue', op: 'lte', value: hi }] })).data)[0];
    bucketRows.push({ label, value: toNumber(r?.balance) ?? 0, count: toNumber(r?.count) ?? 0 });
  }
  const overdueRows = rowsOf((await c.call('query_records', { source: 'receivables', where: [{ field: 'balance', op: 'gt', value: 0 }, { field: 'days_overdue', op: 'gte', value: threshold }], sort: { field: 'days_overdue', dir: 'desc' }, limit: 50 })).data);
  const totalBal = toNumber(total.balance) ?? 0;
  const overdueBal = bucketRows.slice(1).reduce((n, b) => n + b.value, 0);
  const share = (await c.call('calculate', { expression: `round(${overdueBal} / ${Math.max(1, totalBal)} * 1000) / 10` })).data as { value?: number };
  c.say('Dựng dashboard và danh sách cần gọi.', 'Building the dashboard and the call list.');
  const callList = overdueRows.map((r) => ({ customer: r.customer_name, invoice: r.invoice_id, balance: toNumber(r.balance) ?? 0, days_overdue: toNumber(r.days_overdue) ?? 0, account_manager: r.account_manager, action: (toNumber(r.days_overdue) ?? 0) > 45 ? 'Gọi + tạm dừng giao hàng' : (toNumber(r.days_overdue) ?? 0) > 30 ? 'Gọi trực tiếp hôm nay' : 'Email nhắc + gọi trong tuần' }));
  await c.call('create_artifact', {
    kind: 'html', title: 'Receivables dashboard',
    content: html('Dashboard công nợ phải thu', 'Tính đến 28/10/2026 · nguồn: receivables', `<div class="grid">${kpi('Tổng số dư', `${compact(totalBal)} đ`, `${total.count} hoá đơn`)}${kpi('Quá hạn', `${compact(overdueBal)} đ`, `${share.value ?? 0}% tổng số dư`)}${kpi('Khách có số dư', String(byCustomer.length), `${callList.length} hoá đơn ≥ ${threshold} ngày`)}${kpi('Nợ > 60 ngày', `${compact(bucketRows[4].value)} đ`, `${bucketRows[4].count} hoá đơn`)}</div><div class="card"><h2>Số dư theo tuổi nợ (ngày)</h2>${svgBars(bucketRows.map((b) => ({ label: b.label, value: b.value })))}</div><div class="card"><h2>Khách hàng quá hạn nhiều nhất</h2>${tableHtml(['Khách hàng', 'Số dư', 'Quá hạn (ngày)', 'Phụ trách', 'Việc cần làm'], callList.slice(0, 10).map((r) => ({ 'Khách hàng': r.customer, 'Số dư': fmt(r.balance), 'Quá hạn (ngày)': r.days_overdue, 'Phụ trách': r.account_manager, 'Việc cần làm': r.action })))}</div>`),
  });
  await c.call('create_artifact', { kind: 'table', title: 'Call list', columns: ['customer', 'invoice', 'balance', 'days_overdue', 'account_manager', 'action'], rows: callList });
  const firm = c.inputs.tone !== 'soft';
  let drafted = 0;
  const seen = new Set<string>();
  for (const r of overdueRows) {
    if (seen.has(r.customer_name) || drafted >= 5) continue;
    seen.add(r.customer_name);
    const invs = overdueRows.filter((x) => x.customer_name === r.customer_name);
    const sum = invs.reduce((n, i) => n + (toNumber(i.balance) ?? 0), 0);
    await c.call('draft_email', {
      to: `${r.customer_name} (kế toán)`, subject: `${firm ? 'Thông báo công nợ quá hạn' : 'Nhắc nhẹ về công nợ'} – ${invs.map((i) => i.invoice_id).join(', ')}`,
      body: `Kính gửi Quý khách ${r.customer_name},\n\n${firm ? 'Theo đối chiếu của chúng tôi, các hoá đơn sau đã quá hạn thanh toán:' : 'Chúng tôi xin nhắc Quý khách về các hoá đơn sắp/đã đến hạn:'}\n${invs.map((i) => `- ${i.invoice_id}: ${fmt(toNumber(i.balance) ?? 0)} đ, hạn ${i.due_date}, quá hạn ${i.days_overdue} ngày`).join('\n')}\nTổng: ${fmt(sum)} đ.\n\n${firm ? 'Kính mong Quý khách thanh toán trước ngày 31/10/2026. Sau thời hạn này, chúng tôi buộc phải tạm dừng giao các đơn mới theo điều khoản hợp đồng.' : 'Nếu Quý khách đã thanh toán, xin bỏ qua email này. Nếu cần thêm thời gian, vui lòng cho chúng tôi biết kế hoạch để cùng sắp xếp.'}\n\nTrân trọng,\n${r.account_manager} – Phòng Kế toán`,
    });
    drafted++;
  }
  const first = callList[0];
  return T(c.lang,
    `**Số liệu:** tổng số dư ${fmt(totalBal)} đ, trong đó quá hạn ${fmt(overdueBal)} đ (**${share.value ?? 0}%**); nợ trên 60 ngày ${fmt(bucketRows[4].value)} đ. **${callList.length} hoá đơn** quá hạn ≥ ${threshold} ngày thuộc ${seen.size} khách; đã soạn ${drafted} email nhắc (${firm ? 'cứng rắn' : 'nhẹ nhàng'}). **Gọi trước:** ${first ? `${first.customer} (${fmt(first.balance)} đ, ${first.days_overdue} ngày, phụ trách ${first.account_manager})` : 'không có'}. Xem dashboard và danh sách gọi ở phần kết quả.`,
    `**Numbers:** total balance ${fmt(totalBal)} VND, of which ${fmt(overdueBal)} overdue (**${share.value ?? 0}%**); over 60 days ${fmt(bucketRows[4].value)}. **${callList.length} invoices** ≥ ${threshold} days overdue across ${seen.size} customers; ${drafted} reminder emails drafted (${firm ? 'firm' : 'soft'}). **Call first:** ${first ? `${first.customer} (${fmt(first.balance)} VND, ${first.days_overdue} days, ${first.account_manager})` : 'none'}. See the dashboard and call list in the deliverables.`);
};

const weeklyOps: Script = async (c) => {
  c.say('Lấy đơn hàng và ticket trong kỳ.', 'Pulling orders and tickets for the period.');
  const orders = rowsOf((await c.call('query_records', { source: 'orders', limit: 50 })).data);
  const byRegion = rowsOf((await c.call('aggregate_records', { source: 'orders', groupBy: 'region', metrics: [{ field: 'amount', fn: 'sum', as: 'revenue' }, { fn: 'count' }], sort: { field: 'revenue', dir: 'desc' } })).data);
  const byCat = rowsOf((await c.call('aggregate_records', { source: 'tickets', groupBy: 'category', metrics: [{ fn: 'count' }, { field: 'resolution_hours', fn: 'avg', as: 'avg_hours' }], sort: { field: 'count', dir: 'desc' } })).data);
  const period = orders.filter((o) => o.order_date >= '2026-10-20');
  const delivered = orders.filter((o) => o.delivered_date);
  const late = delivered.filter((o) => o.delivered_date > o.promised_date);
  const onTime = (await c.call('calculate', { expression: `round((${delivered.length - late.length}) / ${Math.max(1, delivered.length)} * 1000) / 10` })).data as { value?: number };
  const revPeriod = period.reduce((n, o) => n + (toNumber(o.amount) ?? 0), 0);
  const revMonth = orders.reduce((n, o) => n + (toNumber(o.amount) ?? 0), 0);
  const stuck = orders.filter((o) => ['delayed', 'in_transit'].includes(o.status) && o.promised_date < '2026-10-28');
  const lateRows = [...late, ...stuck].map((o) => ({ 'Đơn': o.order_id, 'Khách hàng': o.customer_name, 'Hẹn giao': o.promised_date, 'Giao thực tế': o.delivered_date || `(${o.status})`, 'Vận chuyển': o.carrier, 'Giá trị': fmt(toNumber(o.amount) ?? 0) }));
  const byCarrier = new Map<string, { n: number; late: number }>();
  for (const o of delivered) { const e = byCarrier.get(o.carrier) ?? { n: 0, late: 0 }; e.n++; if (o.delivered_date > o.promised_date) e.late++; byCarrier.set(o.carrier, e); }
  c.say('Dựng dashboard, viết báo cáo và email.', 'Building the dashboard, the report and the email.');
  await c.call('create_artifact', {
    kind: 'html', title: 'Weekly ops dashboard',
    content: html('Dashboard vận hành tuần', `${c.inputs.period || 'Tuần 20–28/10/2026'} · nguồn: orders, tickets`, `<div class="grid">${kpi('Doanh thu kỳ', `${compact(revPeriod)} đ`, `${period.length} đơn`)}${kpi('Doanh thu tháng 10', `${compact(revMonth)} đ`, `${orders.length} đơn`)}${kpi('Giao đúng hẹn', `${onTime.value ?? 0}%`, `${late.length} đơn trễ / ${delivered.length} đã giao`)}${kpi('Đơn đang kẹt', String(stuck.length), 'quá hẹn, chưa giao')}</div><div class="card"><h2>Doanh thu theo khu vực (tháng 10)</h2>${svgBars(byRegion.map((r) => ({ label: String(r.region), value: toNumber(r.revenue) ?? 0 })))}</div><div class="card"><h2>Tỷ lệ trễ theo đơn vị vận chuyển</h2>${tableHtml(['Đơn vị', 'Đơn đã giao', 'Trễ', 'Tỷ lệ trễ'], [...byCarrier.entries()].map(([k, v]) => ({ 'Đơn vị': k, 'Đơn đã giao': v.n, 'Trễ': v.late, 'Tỷ lệ trễ': `${Math.round((v.late / v.n) * 100)}%` })))}</div><div class="card"><h2>Đơn trễ và đang kẹt</h2>${tableHtml(['Đơn', 'Khách hàng', 'Hẹn giao', 'Giao thực tế', 'Vận chuyển', 'Giá trị'], lateRows)}</div><div class="card"><h2>Ticket theo loại</h2>${tableHtml(['Loại', 'Số ticket', 'Giờ xử lý TB'], byCat.map((r) => ({ 'Loại': r.category, 'Số ticket': r.count, 'Giờ xử lý TB': r.avg_hours })))}</div>`),
  });
  const worstCarrier = [...byCarrier.entries()].sort((a, b) => b[1].late / b[1].n - a[1].late / a[1].n)[0];
  const report = `# Báo cáo vận hành tuần ${c.inputs.period || '20–28/10/2026'}

## Tóm tắt
Doanh thu kỳ **${fmt(revPeriod)} đ** (${period.length} đơn), luỹ kế tháng ${fmt(revMonth)} đ. Tỷ lệ giao đúng hẹn **${onTime.value ?? 0}%**, ${stuck.length} đơn đang kẹt quá hẹn. Khiếu nại nhiều nhất: **${byCat[0]?.category ?? '—'}** (${byCat[0]?.count ?? 0} ticket).

## Kết quả
${byRegion.map((r) => `- ${r.region}: ${fmt(toNumber(r.revenue) ?? 0)} đ (${r.count} đơn)`).join('\n')}

## Vấn đề (có bằng chứng)
1. Giao trễ tập trung ở **${worstCarrier?.[0] ?? '—'}**: ${worstCarrier ? `${worstCarrier[1].late}/${worstCarrier[1].n} đơn trễ` : ''}.
2. Đơn kẹt quá hẹn: ${stuck.map((o) => `#${o.order_id} (${o.customer_name}, ${o.status})`).join(', ') || 'không có'}.
3. Ticket "${byCat[0]?.category ?? ''}" chiếm ${byCat[0]?.count ?? 0}/${byCat.reduce((n, r) => n + (toNumber(r.count) ?? 0), 0)} ticket, xử lý trung bình ${byCat[0]?.avg_hours ?? 0} giờ.

## Cần quyết định
- Thêm 1 xe thuê ngoài cho khu vực tỉnh từ thứ Năm (ước ${fmt(8000000)} đ/tuần) để giảm trễ.
- Thoả thuận SLA với ${worstCarrier?.[0] ?? 'đơn vị vận chuyển'}: phạt trễ hoặc đổi đối tác.

## Tuần tới
- Giải phóng ${stuck.length} đơn kẹt trước thứ Ba; gọi lại các khách liên quan.
- Kiểm kê tồn kho; họp với đơn vị vận chuyển mới.`;
  await c.call('create_artifact', { kind: 'markdown', title: 'Weekly report', content: report });
  await c.call('draft_email', { to: 'Giám đốc điều hành', subject: `Báo cáo vận hành tuần ${c.inputs.period || '20–28/10'}: giao đúng hẹn ${onTime.value ?? 0}%`, body: `Kính gửi anh/chị,\n\nTuần này doanh thu ${fmt(revPeriod)} đ (${period.length} đơn), giao đúng hẹn ${onTime.value ?? 0}%, ${stuck.length} đơn đang kẹt quá hẹn. Vấn đề lớn nhất là giao trễ của ${worstCarrier?.[0] ?? 'đơn vị vận chuyển'} và khiếu nại "${byCat[0]?.category ?? ''}".\n\nEm đề xuất 2 quyết định: thuê thêm 1 xe cho tuyến tỉnh từ thứ Năm và chốt SLA phạt trễ với đơn vị vận chuyển. Chi tiết và số liệu trong dashboard đính kèm.\n\nTrân trọng,\nPhòng Vận hành` });
  return T(c.lang,
    `Tuần ${c.inputs.period || '20–28/10'}: doanh thu **${fmt(revPeriod)} đ** (${period.length} đơn), giao đúng hẹn **${onTime.value ?? 0}%**, ${stuck.length} đơn đang kẹt quá hẹn. Điểm nóng: ${worstCarrier?.[0] ?? '—'} trễ ${worstCarrier ? `${worstCarrier[1].late}/${worstCarrier[1].n}` : ''} đơn và ${byCat[0]?.count ?? 0} ticket "${byCat[0]?.category ?? ''}". Dashboard, báo cáo đầy đủ và email gửi sếp đã sẵn sàng bên dưới.`,
    `Week ${c.inputs.period || '20–28/10'}: revenue **${fmt(revPeriod)} VND** (${period.length} orders), on-time **${onTime.value ?? 0}%**, ${stuck.length} orders stuck past promise. Hotspots: ${worstCarrier?.[0] ?? '—'} late on ${worstCarrier ? `${worstCarrier[1].late}/${worstCarrier[1].n}` : ''} orders and ${byCat[0]?.count ?? 0} "${byCat[0]?.category ?? ''}" tickets. Dashboard, full report and the email to leadership are ready below.`);
};

const inventory: Script = async (c) => {
  const safety = toNumber(c.inputs.safety) ?? 7;
  const budget = toNumber(c.inputs.budget) ?? 300000000;
  c.say('Đọc tồn kho và tốc độ bán.', 'Reading stock levels and sales velocity.');
  const rows = rowsOf((await c.call('query_records', { source: 'inventory', limit: 50 })).data);
  const proposal = rows.map((r) => {
    const available = (toNumber(r.on_hand) ?? 0) - (toNumber(r.reserved) ?? 0);
    const daily = Math.max(0.1, toNumber(r.avg_daily_sales) ?? 0);
    const lead = toNumber(r.lead_time_days) ?? 0;
    const cover = Math.round((available / daily) * 10) / 10;
    const need = Math.max(0, Math.ceil(((lead + safety + 14) * daily - available) / 10) * 10);
    const value = need * (toNumber(r.unit_cost) ?? 0);
    const urgency = cover < lead ? 'critical' : cover < lead + safety ? 'urgent' : need > 0 ? 'normal' : 'ok';
    return { sku: r.sku, product: r.product, supplier: r.supplier, available, days_of_cover: cover, lead_time_days: lead, reorder_qty: need, value, urgency };
  }).sort((a, b) => a.days_of_cover - b.days_of_cover);
  c.say('Tính lượng đặt hàng trong ngân sách.', 'Sizing the order within budget.');
  let spend = 0;
  const deferred: string[] = [];
  for (const p of proposal) {
    if (p.reorder_qty === 0) continue;
    if (spend + p.value <= budget || p.urgency === 'critical') spend += p.value;
    else { deferred.push(p.product); p.urgency = `${p.urgency} (deferred)`; }
  }
  const totalCheck = (await c.call('calculate', { expression: `${spend} - ${budget}` })).data as { value?: number };
  await c.call('create_artifact', { kind: 'table', title: 'Reorder proposal', columns: ['sku', 'product', 'supplier', 'available', 'days_of_cover', 'lead_time_days', 'reorder_qty', 'value', 'urgency'], rows: proposal });
  await c.call('create_artifact', { kind: 'csv', title: 'reorder_proposal.csv', content: toCsv(['sku', 'product', 'supplier', 'reorder_qty', 'value', 'urgency'], proposal.filter((p) => p.reorder_qty > 0)) });
  const risk = proposal.filter((p) => p.urgency.startsWith('critical') || p.urgency.startsWith('urgent'));
  return T(c.lang,
    `**Nguy cơ hết hàng:** ${risk.map((p) => `${p.product} (còn ${p.days_of_cover} ngày, lead time ${p.lead_time_days})`).join('; ') || 'không có'}. Đề xuất đặt **${proposal.filter((p) => p.reorder_qty > 0 && !p.urgency.includes('deferred')).length} mặt hàng**, tổng **${fmt(spend)} đ** so với ngân sách ${fmt(budget)} đ (${(totalCheck.value ?? 0) > 0 ? `vượt ${fmt(totalCheck.value ?? 0)} đ do mặt hàng critical` : `còn dư ${fmt(-(totalCheck.value ?? 0))} đ`}). Hoãn: ${deferred.join(', ') || 'không'}. Bảng và CSV cho bộ phận mua hàng ở bên dưới.`,
    `**Stock-out risk:** ${risk.map((p) => `${p.product} (${p.days_of_cover} days of cover, lead ${p.lead_time_days})`).join('; ') || 'none'}. Proposed **${proposal.filter((p) => p.reorder_qty > 0 && !p.urgency.includes('deferred')).length} items**, total **${fmt(spend)} VND** vs budget ${fmt(budget)} (${(totalCheck.value ?? 0) > 0 ? `over by ${fmt(totalCheck.value ?? 0)} because of critical items` : `${fmt(-(totalCheck.value ?? 0))} left`}). Deferred: ${deferred.join(', ') || 'none'}. Table and CSV for purchasing below.`);
};

const meetingPrep: Script = async (c) => {
  const name = c.inputs.customer ?? '';
  c.say('Tra CRM nội bộ về khách hàng.', 'Querying the internal CRM for the customer.');
  const cust = rowsOf((await c.call('query_records', { source: 'customers', search: name, limit: 1 })).data)[0];
  const cname = cust?.name ?? name;
  const orders = rowsOf((await c.call('query_records', { source: 'orders', where: [{ field: 'customer_name', op: 'eq', value: cname }], sort: { field: 'order_date', dir: 'desc' } })).data);
  const agg = rowsOf((await c.call('aggregate_records', { source: 'orders', metrics: [{ field: 'amount', fn: 'sum', as: 'revenue' }, { fn: 'count' }], where: [{ field: 'customer_name', op: 'eq', value: cname }] })).data)[0] ?? {};
  const recv = rowsOf((await c.call('query_records', { source: 'receivables', where: [{ field: 'customer_name', op: 'eq', value: cname }, { field: 'balance', op: 'gt', value: 0 }], sort: { field: 'days_overdue', dir: 'desc' } })).data);
  const tickets = rowsOf((await c.call('query_records', { source: 'tickets', where: [{ field: 'customer_name', op: 'eq', value: cname }] })).data);
  c.say('Tìm tin tức công khai và điều khoản nội bộ.', 'Searching public news and internal terms.');
  await c.call('web_search', { query: `${cname} tin tức 2026` });
  const terms = (await c.call('search_knowledge', { query: 'công nợ hạn mức chiết khấu', limit: 2 })).data as { results?: { title: string; passage: string }[] };
  const late = orders.filter((o) => o.delivered_date && o.delivered_date > o.promised_date);
  const overdue = recv.reduce((n, r) => n + (toNumber(r.balance) ?? 0), 0);
  const questions = [`Lý do chậm thanh toán ${recv[0]?.invoice_id ?? 'các hoá đơn gần đây'} và kế hoạch thanh toán?`, 'Dự báo sản lượng quý 4 và Tết theo từng nhóm hàng?', `Trải nghiệm giao hàng gần đây (${late.length} đơn trễ) có ảnh hưởng gì?`, 'Điều kiện nào để tăng hạn mức tín dụng và chiết khấu năm 2027?', 'Khách có đang làm việc với nhà phân phối khác cho nhóm hàng nào?'];
  await c.call('create_artifact', {
    kind: 'html', title: 'Meeting brief',
    content: html(`Brief: ${cname}`, `${c.inputs.goal || ''} · ${cust?.contact ?? ''} ${cust?.phone ?? ''} · phụ trách: ${cust?.account_manager ?? '—'}`, `<div class="grid">${kpi('Doanh thu tháng 10', `${compact(toNumber(agg.revenue) ?? 0)} đ`, `${agg.count ?? 0} đơn`)}${kpi('Công nợ mở', `${compact(recv.reduce((n, r) => n + (toNumber(r.balance) ?? 0), 0))} đ`, `${recv.length} hoá đơn`)}${kpi('Quá hạn lâu nhất', `${recv[0]?.days_overdue ?? 0} ngày`, recv[0]?.invoice_id ?? '')}${kpi('Đơn trễ', `${late.length}/${orders.length}`, 'tháng 10')}</div><div class="card"><h2>Đơn hàng gần đây</h2>${tableHtml(['Đơn', 'Ngày', 'Sản phẩm', 'Giá trị', 'Trạng thái'], orders.slice(0, 6).map((o) => ({ 'Đơn': o.order_id, 'Ngày': o.order_date, 'Sản phẩm': o.product, 'Giá trị': fmt(toNumber(o.amount) ?? 0), 'Trạng thái': o.status })))}</div><div class="card"><h2>Rủi ro & cơ hội</h2><p><span class="tag danger">Rủi ro</span> Công nợ quá hạn ${fmt(overdue)} đ; ${tickets.length} ticket trong tháng (${tickets.map((t) => t.category).join(', ') || 'không có'}).</p><p><span class="tag">Cơ hội</span> Khách ${cust?.segment ?? ''} mua ${orders.map((o) => o.product).filter((v, i, a) => a.indexOf(v) === i).length} nhóm hàng; đề xuất thêm nhóm hàng chưa mua và chương trình Tết.</p><p><span class="tag warn">Web</span> Tin tức công khai: chưa kiểm tra (demo).</p></div><div class="card"><h2>5 câu hỏi nên hỏi</h2><ol>${questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol></div>`),
  });
  await c.call('create_artifact', { kind: 'markdown', title: 'Talking points', content: `# Talking points – ${cname}\n\n**Mục tiêu:** ${c.inputs.goal || '—'}\n\n## Mở đầu\n1. Cảm ơn ${orders.length} đơn trong tháng 10 (${fmt(toNumber(agg.revenue) ?? 0)} đ).\n2. Nhìn nhận ${late.length} đơn trễ và cách khắc phục.\n3. Thống nhất lộ trình thanh toán ${fmt(overdue)} đ quá hạn trước khi bàn gia hạn.\n\n## Điều khoản nội bộ liên quan\n${(terms.results ?? []).map((r) => `- **${r.title}**: ${r.passage}`).join('\n') || '- (không tìm thấy)'}\n\n## Câu hỏi\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` });
  return T(c.lang,
    `**3 điều mở đầu:** (1) cảm ơn ${orders.length} đơn tháng 10 trị giá ${fmt(toNumber(agg.revenue) ?? 0)} đ; (2) nhận trách nhiệm ${late.length} đơn giao trễ và nêu cách khắc phục; (3) thống nhất lộ trình thanh toán **${fmt(overdue)} đ** quá hạn (${recv[0]?.invoice_id ?? ''} ${recv[0]?.days_overdue ?? 0} ngày) trước khi bàn gia hạn 2027. Brief một trang và talking points ở bên dưới; tin tức web chưa kiểm tra vì đang ở chế độ demo.`,
    `**Open with:** (1) thank them for ${orders.length} October orders worth ${fmt(toNumber(agg.revenue) ?? 0)} VND; (2) own the ${late.length} late deliveries and the fix; (3) agree a payment plan for **${fmt(overdue)} VND** overdue (${recv[0]?.invoice_id ?? ''}, ${recv[0]?.days_overdue ?? 0} days) before discussing 2027 renewal. One-page brief and talking points below; web news not checked in demo mode.`);
};

const documentReview: Script = async (c) => {
  const text = (c.attachmentText || c.inputs.text || '').trim();
  const side = c.inputs.side === 'A' ? 'A' : 'B';
  c.say('Đọc tài liệu và tách các điều khoản.', 'Reading the document and splitting clauses.');
  const clauses = text.split(/\n(?=Điều\s*\d+|Article\s*\d+|\d+\.\s)/i).map((s) => s.trim()).filter((s) => s.length > 20);
  const rows = clauses.map((cl) => {
    const title = /^(Điều\s*\d+[^:.]*|Article\s*\d+[^:.]*)/i.exec(cl)?.[1] ?? cl.slice(0, 30);
    const lower = cl.toLowerCase();
    const pen = /phạt|penalt|lãi/.test(lower);
    const excl = /độc quyền|exclusiv/.test(lower);
    const term = /chấm dứt|terminat/.test(lower);
    const asym = /15 ngày|90 ngày/.test(lower);
    const risk = (excl && side === 'B') || (term && asym && side === 'B') || (pen && side === 'B' && /0,5%|10%/.test(lower)) ? 'high' : pen || term || /thanh toán|payment/.test(lower) ? 'medium' : 'low';
    const meaning = excl ? (side === 'B' ? 'Hạn chế bán cho khách khác tại TP.HCM, kéo dài 12 tháng sau hợp đồng.' : 'Bảo vệ bạn khỏi đối thủ có cùng nguồn hàng.') : term ? (side === 'B' ? 'Bất cân xứng: bên A chỉ cần báo 15 ngày, bạn phải báo 90 ngày.' : 'Bạn được linh hoạt chấm dứt nhanh.') : pen ? (side === 'B' ? 'Phạt trễ 0,5%/ngày đến 10% giá trị lô – rủi ro đáng kể khi phụ thuộc vận chuyển.' : 'Đòn bẩy để yêu cầu giao đúng hạn.') : /thanh toán|payment/.test(lower) ? (side === 'B' ? 'Chu kỳ 45 ngày dài hơn tiêu chuẩn 30 ngày; lãi chậm trả thấp (0,03%/ngày).' : 'Điều khoản có lợi về dòng tiền.') : /đổi trả|return/.test(lower) ? 'Chi phí vận chuyển trả hàng do bên A chịu.' : 'Nghĩa vụ thông thường.';
    const change = risk === 'high' ? (excl ? 'Thu hẹp phạm vi (danh mục cụ thể), bỏ 12 tháng hậu hợp đồng hoặc đổi lấy cam kết sản lượng tối thiểu.' : term ? 'Cân bằng 30/30 ngày; bồi thường tồn kho đã sản xuất khi chấm dứt sớm.' : 'Giảm còn 0,2%/ngày, trần 5%, loại trừ bất khả kháng và lỗi vận chuyển.') : risk === 'medium' ? 'Rút còn 30 ngày; lãi chậm trả 0,05%/ngày.' : 'Giữ nguyên.';
    return { clause: title, quote: cl.slice(0, 220), meaning, risk, suggested_change: change };
  });
  const pen = (await c.call('calculate', { expression: '100000000 * 0.10' })).data as { value?: number };
  await c.call('create_artifact', { kind: 'table', title: 'Clause review', columns: ['clause', 'quote', 'meaning', 'risk', 'suggested_change'], rows });
  await c.call('create_artifact', { kind: 'markdown', title: 'Questions for the lawyer', content: `# Câu hỏi cho luật sư\n\n1. Điều khoản độc quyền 12 tháng sau chấm dứt có hiệu lực theo Luật Cạnh tranh không?\n2. Mức phạt 0,5%/ngày (trần 10% = ${fmt(pen.value ?? 0)} đ trên lô 100 triệu) có vượt giới hạn 8% theo Luật Thương mại Điều 301?\n3. "Bất khả kháng" có bao gồm sự cố vận chuyển bên thứ ba không?\n4. Thời hạn thông báo chấm dứt bất cân xứng (15/90 ngày) có thể bị coi là bất lợi rõ ràng?\n5. Hoá đơn điện tử: ngày "nhận hoá đơn" tính từ khi nào?\n\n*Phân tích này do AI tạo để chuẩn bị, không thay thế tư vấn pháp lý.*` });
  const high = rows.filter((r) => r.risk === 'high');
  return T(c.lang,
    `Đã đọc **${rows.length} điều khoản**. Rủi ro tổng thể cho bên ${side}: **${high.length >= 2 ? 'cao' : high.length ? 'trung bình' : 'thấp'}**. Thương lượng trước: ${high.slice(0, 3).map((r) => r.clause).join('; ') || rows.slice(0, 3).map((r) => r.clause).join('; ')}. Mức phạt tối đa trên lô 100 triệu: ${fmt(pen.value ?? 0)} đ (trần 10%, vượt mức 8% của Luật Thương mại – cần luật sư xác nhận). Bảng rà soát và câu hỏi cho luật sư ở bên dưới.`,
    `Read **${rows.length} clauses**. Overall risk for party ${side}: **${high.length >= 2 ? 'high' : high.length ? 'medium' : 'low'}**. Negotiate first: ${high.slice(0, 3).map((r) => r.clause).join('; ') || rows.slice(0, 3).map((r) => r.clause).join('; ')}. Max penalty on a 100M VND shipment: ${fmt(pen.value ?? 0)} VND (10% cap, above the 8% limit in the Commercial Law – lawyer to confirm). Clause table and lawyer questions below.`);
};

const dataCleanup: Script = async (c) => {
  const raw = (c.attachmentText || c.inputs.data || '').trim();
  const table = parseCsv(raw);
  c.say('Chuẩn hoá từng dòng.', 'Normalising each row.');
  const col = (re: RegExp) => table.columns.find((h) => re.test(h)) ?? '';
  const cName = col(/tên|name/i), cPhone = col(/điện thoại|phone|sđt/i), cEmail = col(/email/i), cCo = col(/công ty|company/i), cCity = col(/thành phố|city|tỉnh/i);
  const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const CITY: Record<string, string> = { 'hcm': 'TP. Hồ Chí Minh', 'tp hcm': 'TP. Hồ Chí Minh', 'ho chi minh': 'TP. Hồ Chí Minh', 'sai gon': 'TP. Hồ Chí Minh', 'binh duong': 'Bình Dương', 'dong nai': 'Đồng Nai', 'long an': 'Long An', 'tay ninh': 'Tây Ninh', 'ha noi': 'Hà Nội', 'hn': 'Hà Nội', 'da nang': 'Đà Nẵng' };
  const log: string[] = [];
  const cleaned = table.rows.map((r, i) => {
    const n = i + 2;
    let phone = (r[cPhone] ?? '').replace(/[^\d+]/g, '');
    if (phone.startsWith('+84')) phone = '0' + phone.slice(3);
    else if (phone.startsWith('84') && phone.length === 11) phone = '0' + phone.slice(2);
    else if (phone.length === 9) phone = '0' + phone;
    if (phone && phone !== r[cPhone]) log.push(`Dòng ${n}: điện thoại "${r[cPhone]}" → ${phone}`);
    const email = (r[cEmail] ?? '').trim().toLowerCase();
    const emailOk = !email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (email && email !== r[cEmail]) log.push(`Dòng ${n}: email "${r[cEmail]}" → ${email}`);
    const cityKey = strip(r[cCity] ?? '');
    const city = CITY[cityKey] ?? Object.entries(CITY).find(([k]) => cityKey.includes(k))?.[1] ?? (r[cCity] ?? '');
    if (city !== r[cCity]) log.push(`Dòng ${n}: thành phố "${r[cCity]}" → ${city}`);
    const flags: string[] = [];
    if (!emailOk) flags.push('email không hợp lệ');
    if (phone && !/^0\d{9}$/.test(phone)) flags.push('số điện thoại bất thường');
    return { row: n, name: (r[cName] ?? '').trim(), phone, email, company: (r[cCo] ?? '').trim(), city, flags, key: strip(r[cName] ?? '') + '|' + strip(r[cCo] ?? '') };
  });
  c.say('Gộp bản ghi trùng.', 'Merging duplicates.');
  const groups: typeof cleaned[] = [];
  for (const row of cleaned) {
    const g = groups.find((grp) => grp.some((x) => (row.phone && x.phone === row.phone) || (row.email && x.email === row.email) || x.key === row.key));
    if (g) g.push(row); else groups.push([row]);
  }
  const hasDiacritics = (s: string) => /[̀-ͯ]|[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỵỷỹ]/i.test(s.normalize('NFD'));
  const pickBest = (vals: string[]) => vals.filter(Boolean).sort((a, b) => Number(hasDiacritics(b)) - Number(hasDiacritics(a)) || b.length - a.length)[0] ?? '';
  const out = groups.map((g) => {
    const merged = { name: pickBest(g.map((x) => x.name)), phone: pickBest(g.map((x) => x.phone)), email: pickBest(g.map((x) => x.email)), company: pickBest(g.map((x) => x.company)), city: pickBest(g.map((x) => x.city)), merged_from: g.map((x) => x.row).join('+'), flags: Array.from(new Set(g.flatMap((x) => x.flags))).join('; ') };
    if (g.length > 1) log.push(`Gộp dòng ${g.map((x) => x.row).join(' + ')} → "${merged.name}" (${merged.company})`);
    return merged;
  });
  const cols = ['name', 'phone', 'email', 'company', 'city', 'merged_from', 'flags'];
  await c.call('create_artifact', { kind: 'table', title: 'Clean customer list', columns: cols, rows: out });
  await c.call('create_artifact', { kind: 'csv', title: 'clean_customers.csv', content: toCsv(cols, out) });
  await c.call('create_artifact', { kind: 'markdown', title: 'Change log', content: `# Nhật ký thay đổi\n\n${log.map((l) => `- ${l}`).join('\n') || '- Không có thay đổi.'}` });
  const merged = cleaned.length - out.length;
  const flagged = out.filter((o) => o.flags).length;
  return T(c.lang,
    `**${cleaned.length} dòng vào → ${out.length} dòng ra.** Gộp ${merged} bản ghi trùng, chuẩn hoá ${log.length - merged} giá trị, gắn cờ ${flagged} dòng cần kiểm tra${flagged ? ` (${out.filter((o) => o.flags).map((o) => `${o.name}: ${o.flags}`).join('; ')})` : ''}. Tải CSV sạch và xem nhật ký thay đổi ở bên dưới trước khi nhập CRM.`,
    `**${cleaned.length} rows in → ${out.length} rows out.** Merged ${merged} duplicates, normalised ${log.length - merged} values, flagged ${flagged} rows to check${flagged ? ` (${out.filter((o) => o.flags).map((o) => `${o.name}: ${o.flags}`).join('; ')})` : ''}. Download the clean CSV and read the change log below before importing into your CRM.`);
};

const excelBuilder: Script = async (c) => {
  const source = c.inputs.source && c.inputs.source !== 'none' ? c.inputs.source : '';
  c.say('Thiết kế cấu trúc sheet, lấy dữ liệu mẫu.', 'Designing the sheet structure and pulling sample rows.');
  const rows = source ? rowsOf((await c.call('query_records', { source, limit: 50 })).data) : [];
  const cols = rows.length ? Object.keys(rows[0]) : ['id', 'name', 'value'];
  const bucket = (d: number) => (d <= 0 ? '0' : d <= 15 ? '1-15' : d <= 30 ? '16-30' : d <= 60 ? '31-60' : '60+');
  const enriched = rows.map((r) => (source === 'receivables' ? { ...r, ageing_bucket: bucket(toNumber(r.days_overdue) ?? 0) } : r));
  const outCols = source === 'receivables' ? [...cols, 'ageing_bucket'] : cols;
  await c.call('create_artifact', { kind: 'table', title: 'Sheet 1 – Data', columns: outCols, rows: enriched });
  if (source === 'receivables') {
    const summary = rowsOf((await c.call('aggregate_records', { source, groupBy: 'account_manager', metrics: [{ field: 'balance', fn: 'sum', as: 'total_balance' }, { fn: 'count', as: 'invoices' }], sort: { field: 'total_balance', dir: 'desc' } })).data);
    await c.call('create_artifact', { kind: 'table', title: 'Sheet 2 – Summary by account manager', columns: ['account_manager', 'total_balance', 'invoices'], rows: summary });
  }
  await c.call('create_artifact', { kind: 'csv', title: `${source || 'workbook'}_data.csv`, content: toCsv(outCols, enriched) });
  await c.call('create_artifact', { kind: 'markdown', title: 'How to use', content: `# Hướng dẫn bảng tính\n\n**Yêu cầu:** ${c.inputs.spec}\n\n## Sheet 1 – Data\n- Cột \`ageing_bucket\` = công thức \`=IF(J2<=0,"0",IF(J2<=15,"1-15",IF(J2<=30,"16-30",IF(J2<=60,"31-60","60+"))))\` (J = days_overdue).\n- Định dạng có điều kiện: tô đỏ dòng có \`days_overdue > 30\`.\n- Tổng cuối bảng: \`=SUBTOTAL(9, I:I)\` để tổng theo bộ lọc.\n\n## Sheet 2 – Summary\n- \`=SUMIFS(Data!I:I, Data!K:K, A2)\` theo người phụ trách; \`=COUNTIFS(...)\` số hoá đơn.\n- Biểu đồ cột từ bảng tổng hợp.\n\n## Khi dùng thật\n- Ở chế độ demo, file .xlsx chưa được tạo; khi bật Claude với kỹ năng xlsx, bạn sẽ tải trực tiếp file có công thức và định dạng.\n- Thay dữ liệu mẫu bằng xuất từ phần mềm kế toán (MISA/Excel).` });
  return T(c.lang,
    `Đã dựng cấu trúc **${source === 'receivables' ? '2 sheet' : '1 sheet'}** với ${enriched.length} dòng dữ liệu mẫu từ "${source || 'không có'}", kèm hướng dẫn công thức (nhóm tuổi nợ, SUMIFS theo người phụ trách, tô đỏ quá hạn > 30 ngày). Ở chế độ demo, kết quả là bảng + CSV; với Claude thật và kỹ năng xlsx, bạn sẽ tải file .xlsx có sẵn công thức. Cần thay dữ liệu mẫu bằng số liệu thật từ phần mềm kế toán.`,
    `Built the **${source === 'receivables' ? '2-sheet' : '1-sheet'}** structure with ${enriched.length} sample rows from "${source || 'none'}" plus a formula guide (ageing buckets, SUMIFS by account manager, red rows over 30 days). In demo mode the output is table + CSV; with real Claude and the xlsx skill you download a formatted .xlsx. Replace the sample with live accounting data.`);
};

const generic: Script = async (c) => {
  const firstInput = Object.values(c.inputs).find((v) => v && v.trim()) ?? '';
  c.say('Tìm trong tài liệu và dữ liệu kết nối.', 'Searching documents and connected data.');
  const kn = (await c.call('search_knowledge', { query: firstInput.slice(0, 80), limit: 3 })).data as { results?: { title: string; passage: string }[] };
  await c.call('create_artifact', { kind: 'markdown', title: 'Summary', content: `# Kết quả\n\n**Đầu vào:** ${firstInput.slice(0, 300)}\n\n## Tài liệu liên quan\n${(kn.results ?? []).map((r) => `- **${r.title}**: ${r.passage}`).join('\n') || '- Không có'}\n\n## Đề xuất\n1. Làm rõ mục tiêu và người nhận.\n2. Thực hiện theo các bước đã mô tả.\n3. Kiểm tra lại số liệu trước khi gửi.` });
  return T(c.lang, 'Đã tra cứu tài liệu và tạo bản tóm tắt (xem bên dưới). Đây là kết quả demo cho quy trình tuỳ chỉnh; với Claude thật, agent sẽ thực hiện đầy đủ theo mô tả.', 'Looked up the documents and published a summary (below). This is the demo result for a custom workflow; with real Claude the agent carries out the full task.');
};

const SCRIPTS: Record<string, Script> = {
  ...EXTRA_SCRIPTS,
  'order-care-agent': orderCare,
  'receivables-agent': receivables,
  'weekly-ops-agent': weeklyOps,
  'inventory-agent': inventory,
  'meeting-prep-agent': meetingPrep,
  'document-review': documentReview,
  'data-cleanup': dataCleanup,
  'excel-builder': excelBuilder,
};

/** Run the scripted agent for a workflow through the real tool hooks. */
export async function runMockAgent(req: AgentRequest, hooks: AgentHooks, delayMs: number, signal?: AbortSignal): Promise<string> {
  const script = SCRIPTS[req.meta.workflowId] ?? generic;
  let seq = 0;
  const stream = async (text: string) => {
    const chunks = text.match(/\S+\s*|\s+/g) ?? [text];
    for (const ch of chunks) {
      if (signal?.aborted) return;
      hooks.onText(ch);
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  };
  const ctx: ScriptCtx = {
    inputs: req.meta.inputs,
    lang: req.meta.lang,
    attachmentText: (req.attachments ?? []).map((a) => a.text ?? '').join('\n\n'),
    say: (vi, en) => { void stream(`${T(req.meta.lang, vi, en)}\n\n`); },
    call: async (tool, input) => {
      const id = `mock_${++seq}`;
      hooks.onToolCall(id, tool, input);
      const started = Date.now();
      const r = await hooks.executeTool(tool, input);
      if (delayMs) await new Promise((res) => setTimeout(res, delayMs * 25));
      hooks.onToolResult(id, r.output, !!r.isError, Date.now() - started);
      let data: unknown = r.output;
      try { data = JSON.parse(r.output); } catch { /* keep raw */ }
      return { ok: !r.isError, data, raw: r.output };
    },
  };
  const final = await script(ctx);
  await stream(`\n${final}\n\n---\n*${T(req.meta.lang, 'Kết quả demo: agent đã chạy tool thật trên dữ liệu mẫu, phần diễn giải là kịch bản. Với Claude thật, agent tự lập kế hoạch cho mọi tình huống.', 'Demo result: the agent ran real tools on sample data; the narration is scripted. With real Claude the agent plans each case itself.')}*`);
  return final;
}
