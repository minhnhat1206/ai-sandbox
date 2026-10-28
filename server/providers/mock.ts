import type { Lang } from '../../shared/types.ts';
import type { CompletionRequest, CompletionResult, Provider } from './types.ts';

/**
 * Deterministic demo provider. Runs with zero keys so the whole platform can be
 * exercised (and tested) offline. Output is clearly labelled as demo output.
 * For a few workflows it does real parsing/arithmetic so the demo is credible.
 */
export class MockProvider implements Provider {
  readonly name = 'mock';
  readonly model = 'mock-demo';
  readonly isDemo = true;

  constructor(private readonly delayMs = 6) {}

  async complete(req: CompletionRequest, onDelta: (t: string) => void, signal?: AbortSignal): Promise<CompletionResult> {
    const text = renderMock(req);
    const inputTokens = Math.ceil((req.system.length + req.messages.reduce((n, m) => n + m.content.length, 0)) / 4);
    // Stream in small word chunks so the UI shows real streaming behaviour.
    const chunks = text.match(/\S+\s*|\s+/g) ?? [text];
    for (const c of chunks) {
      if (signal?.aborted) break;
      onDelta(c);
      if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    }
    return { text, inputTokens, outputTokens: Math.ceil(text.length / 4) };
  }

  async completeText(_system: string, user: string): Promise<string> {
    return draftWorkflowJson(user);
  }
}

const T = (lang: Lang, vi: string, en: string) => (lang === 'vi' ? vi : en);

function renderMock(req: CompletionRequest): string {
  const { workflowId, stepId, lang, inputs } = req.meta;
  const last = req.messages[req.messages.length - 1]?.content ?? '';
  const key = `${workflowId}/${stepId}`;
  const body = (() => {
    switch (key) {
      case 'invoice-extract/extract':
        return mockInvoice(inputs.document ?? '', lang);
      case 'data-insight/analysis':
        return mockDataInsight(inputs.table ?? '', inputs.question ?? '', lang);
      case 'weekly-report/report':
        return mockWeeklyReport(inputs.notes ?? '', lang);
      case 'meeting-actions/summary':
        return mockMeetingSummary(inputs.transcript ?? '', lang);
      case 'meeting-actions/email':
        return mockRecapEmail(lang);
      case 'customer-reply/reply':
        return mockCustomerReply(inputs.message ?? '', inputs.context ?? '', lang);
      default:
        if (stepId === 'chat') return mockChat(workflowId, last, lang);
        return mockGeneric(inputs, lang);
    }
  })();
  return `${body}\n\n---\n*${T(lang, 'Kết quả demo (chưa kết nối AI thật). Khi bật Claude, nội dung sẽ được tạo từ dữ liệu bạn nhập.', 'Demo output (real AI not connected). With Claude enabled, this is generated from your actual input.')}*`;
}

// ---- helpers --------------------------------------------------------------------

function parseNumber(s: string): number {
  const cleaned = s.replace(/[^\d.,-]/g, '');
  // Vietnamese style "1.250.000" or "25,350.00"
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) return Number(cleaned.replace(/\./g, ''));
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) return Number(cleaned.replace(/,/g, ''));
  return Number(cleaned.replace(/,/g, '.'));
}

function fmt(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

function mockInvoice(doc: string, lang: Lang): string {
  const lines = doc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const vendor = lines[0] ?? 'n/a';
  const num = /S[ốo]\s*:?\s*([\w-]+)/i.exec(doc)?.[1] ?? /(?:No|#)\s*:?\s*([\w-]+)/i.exec(doc)?.[1] ?? 'n/a';
  const date = /(\d{1,2}\/\d{1,2}\/\d{4})/.exec(doc)?.[1] ?? 'n/a';
  const customer = /Kh[áa]ch h[àa]ng:\s*([^\n]+?)(?:\s{2,}|\s+MST|$)/im.exec(doc)?.[1]?.trim() ?? /Customer:\s*([^\n]+)/i.exec(doc)?.[1]?.trim() ?? 'n/a';
  const taxId = /MST:?\s*(\d+)/i.exec(doc)?.[1] ?? 'n/a';
  const items: { desc: string; qty: number; price: number; amount: number }[] = [];
  for (const l of lines) {
    const m = /^\d+[.)]\s*(.+?)\s*-\s*([\d.,]+)\s*(?:c[áa]i|cu[ộo]n|kg|b[ộo]|pcs|units?)?\s*x\s*([\d.,]+)\s*=\s*([\d.,]+)/i.exec(l);
    if (m) items.push({ desc: m[1], qty: parseNumber(m[2]), price: parseNumber(m[3]), amount: parseNumber(m[4]) });
  }
  const statedSub = parseNumber(/(?:C[ộo]ng ti[ềe]n h[àa]ng|Subtotal)\s*:?\s*([\d.,]+)/i.exec(doc)?.[1] ?? '0');
  const taxRate = Number(/(?:GTGT|VAT)\s*(\d+)%/i.exec(doc)?.[1] ?? '0');
  const statedTax = parseNumber(/(?:GTGT|VAT)\s*\d+%\s*:?\s*([\d.,]+)/i.exec(doc)?.[1] ?? '0');
  const statedTotal = parseNumber(/(?:T[ổo]ng thanh to[áa]n|Total)\s*:?\s*([\d.,]+)/i.exec(doc)?.[1] ?? '0');
  const sub = items.reduce((n, i) => n + i.amount, 0);
  const tax = Math.round(sub * taxRate / 100);
  const ok = (a: number, b: number) => (Math.abs(a - b) < 1 ? '✅' : '⚠️');
  const rows = items.map((i, n) => `| ${n + 1} | ${i.desc} | ${fmt(i.qty)} | ${fmt(i.price)} | ${fmt(i.amount)} |`).join('\n');
  const csv = items.map((i, n) => `${n + 1},"${i.desc}",${i.qty},${i.price},${i.amount}`).join('\n');
  return T(lang,
    `## Thông tin chung
| Trường | Giá trị |
|---|---|
| Nhà cung cấp | ${vendor} |
| Mã số thuế khách | ${taxId} |
| Số hoá đơn | ${num} |
| Ngày | ${date} |
| Khách hàng | ${customer} |
| Điều khoản thanh toán | ${/30 ng[àa]y/i.test(doc) ? 'Chuyển khoản trong 30 ngày' : 'n/a'} |
| Tiền tệ | VND |

## Dòng hàng
| # | Mô tả | SL | Đơn giá | Thành tiền |
|---|---|---|---|---|
${rows || '| - | (không tìm thấy dòng hàng) | | | |'}

## Tổng
- Cộng tiền hàng: **${fmt(statedSub)}**
- Thuế GTGT ${taxRate}%: **${fmt(statedTax)}**
- Tổng thanh toán: **${fmt(statedTotal)}**

## Kiểm tra
- Tính lại tiền hàng từ dòng hàng: ${fmt(sub)} ${ok(sub, statedSub)}
- Tính lại thuế ${taxRate}%: ${fmt(tax)} ${ok(tax, statedTax)}
- Tính lại tổng: ${fmt(sub + tax)} ${ok(sub + tax, statedTotal)}

## CSV
\`\`\`csv
#,Mô tả,SL,Đơn giá,Thành tiền
${csv}
\`\`\``,
    `## Header
| Field | Value |
|---|---|
| Vendor | ${vendor} |
| Customer tax ID | ${taxId} |
| Invoice number | ${num} |
| Date | ${date} |
| Customer | ${customer} |
| Payment terms | ${/30/.test(doc) ? 'Bank transfer within 30 days' : 'n/a'} |
| Currency | VND |

## Line items
| # | Description | Qty | Unit price | Amount |
|---|---|---|---|---|
${rows || '| - | (no line items found) | | | |'}

## Totals
- Subtotal: **${fmt(statedSub)}**
- VAT ${taxRate}%: **${fmt(statedTax)}**
- Grand total: **${fmt(statedTotal)}**

## Checks
- Recomputed subtotal from lines: ${fmt(sub)} ${ok(sub, statedSub)}
- Recomputed VAT ${taxRate}%: ${fmt(tax)} ${ok(tax, statedTax)}
- Recomputed total: ${fmt(sub + tax)} ${ok(sub + tax, statedTotal)}

## CSV
\`\`\`csv
#,Description,Qty,Unit price,Amount
${csv}
\`\`\``);
}

function mockDataInsight(table: string, question: string, lang: Lang): string {
  const rows = table.split(/\r?\n/).map((l) => l.split(/\t|,(?=\S)|\s{2,}|\|/).map((c) => c.trim()).filter(Boolean)).filter((r) => r.length > 1);
  if (rows.length < 2) return T(lang, '## Không đọc được bảng\nHãy dán bảng có dòng tiêu đề và ít nhất 1 dòng dữ liệu.', '## Could not read the table\nPaste a table with a header row and at least one data row.');
  const header = rows[0];
  const data = rows.slice(1);
  const col = (name: RegExp) => header.findIndex((h) => name.test(h));
  const revI = col(/doanh thu|revenue/i);
  const costI = col(/chi ph[íi]|cost/i);
  const findings: string[] = [];
  const recs: string[] = [];
  let worst = '';
  if (revI >= 0 && costI >= 0) {
    let prevProfit: number | null = null;
    let minMargin = Infinity;
    for (const r of data) {
      const rev = parseNumber(r[revI]);
      const cost = parseNumber(r[costI]);
      const profit = rev - cost;
      const margin = rev ? (profit / rev) * 100 : 0;
      const change = prevProfit === null ? '' : ` (${profit >= prevProfit ? '+' : ''}${fmt(profit - prevProfit)} ${T(lang, 'so với kỳ trước', 'vs previous')})`;
      findings.push(`- **${r[0]}**: ${T(lang, 'lợi nhuận', 'profit')} ${fmt(profit)}, ${T(lang, 'biên', 'margin')} ${margin.toFixed(1)}%${change}`);
      if (margin < minMargin) { minMargin = margin; worst = r[0]; }
      prevProfit = profit;
    }
    const first = parseNumber(data[0][revI]);
    const lastRev = parseNumber(data[data.length - 1][revI]);
    const growth = first ? ((lastRev - first) / first) * 100 : 0;
    findings.unshift(`- ${T(lang, 'Doanh thu từ', 'Revenue from')} ${data[0][0]} ${T(lang, 'đến', 'to')} ${data[data.length - 1][0]}: ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`);
    recs.push(T(lang, `Rà soát chi phí kỳ **${worst}** (biên thấp nhất ${minMargin.toFixed(1)}%): tách chi phí cố định và biến đổi để tìm khoản tăng bất thường.`, `Review costs in **${worst}** (lowest margin ${minMargin.toFixed(1)}%): split fixed vs variable costs to find the unusual increase.`));
  }
  const retI = col(/tr[ảa] h[àa]ng|return/i);
  if (retI >= 0) {
    const rates = data.map((r) => ({ p: r[0], v: parseFloat(r[retI]) }));
    const mx = rates.reduce((a, b) => (b.v > a.v ? b : a));
    findings.push(`- ${T(lang, 'Tỷ lệ trả hàng cao nhất ở', 'Return rate peaks in')} **${mx.p}** (${mx.v}%)`);
    recs.push(T(lang, `Kiểm tra nguyên nhân trả hàng kỳ **${mx.p}**: lỗi đóng gói, giao trễ hay chất lượng. Giảm 1 điểm % trả hàng ≈ giữ lại ${fmt(parseNumber(data.find((r) => r[0] === mx.p)?.[revI] ?? '0') * 0.01)} doanh thu.`, `Investigate returns in **${mx.p}**: packaging, late delivery or quality. Each 1 pt of returns ≈ ${fmt(parseNumber(data.find((r) => r[0] === mx.p)?.[revI] ?? '0') * 0.01)} revenue retained.`));
  }
  recs.push(T(lang, 'Đặt mục tiêu biên lợi nhuận tối thiểu theo tháng và cảnh báo tự động khi chi phí tăng nhanh hơn doanh thu.', 'Set a minimum monthly margin target and an automatic alert when costs grow faster than revenue.'));
  return T(lang,
    `## Trả lời ngắn\n${question ? `Câu hỏi: *${question}*\n\n` : ''}Kỳ đáng chú ý nhất là **${worst || data[0][0]}**: biên lợi nhuận giảm vì chi phí tăng trong khi doanh thu không tăng tương ứng.\n\n## Phát hiện chính\n${findings.join('\n')}\n\n## Bất thường cần kiểm tra\n- Chi phí tăng liên tục qua các kỳ dù số đơn không tăng tương ứng.\n\n## 3 việc nên làm\n${recs.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
    `## Short answer\n${question ? `Question: *${question}*\n\n` : ''}The period that stands out is **${worst || data[0][0]}**: margin fell because costs rose while revenue did not keep pace.\n\n## Key findings\n${findings.join('\n')}\n\n## Anomalies to check\n- Costs rise every period even when order counts do not.\n\n## Three recommended actions\n${recs.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
}

function bullets(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim()).filter(Boolean);
}

function mockWeeklyReport(notes: string, lang: Lang): string {
  const b = bullets(notes);
  const nums = b.filter((l) => /\d/.test(l));
  return T(lang,
    `## Tóm tắt\nTuần này đội vận hành giữ được nhịp hoạt động ổn định với ${b.length} đầu việc được ghi nhận. Có ${nums.length} chỉ số cần theo dõi và một vài rủi ro cần quyết định từ ban lãnh đạo.\n\n## Kết quả chính\n${nums.map((l) => `- ${l}`).join('\n') || '- (không có số liệu trong ghi chú)'}\n\n## Vấn đề & cách xử lý\n${b.filter((l) => /tr[ễe]|ph[àa]n n[àa]n|ngh[ỉi]|l[ỗo]i|issue|late|complain/i.test(l)).map((l) => `- ${l}`).join('\n') || '- Không có vấn đề lớn.'}\n\n## Rủi ro cần quyết định\n- Nhân sự thiếu hụt có thể ảnh hưởng tiến độ nếu không tuyển kịp trong 2 tuần.\n\n## Kế hoạch tuần tới\n${b.filter((l) => /tu[ầa]n sau|next|k[ếe] ho[ạa]ch|plan/i.test(l)).map((l) => `- ${l}`).join('\n') || '- Tiếp tục các đầu việc đang mở.'}`,
    `## Headline\nOperations held steady this week with ${b.length} items logged. ${nums.length} metrics are worth tracking and a few risks need a leadership decision.\n\n## Key results\n${nums.map((l) => `- ${l}`).join('\n') || '- (no figures in the notes)'}\n\n## Problems & actions taken\n${b.filter((l) => /tr[ễe]|ph[àa]n n[àa]n|ngh[ỉi]|l[ỗo]i|issue|late|complain/i.test(l)).map((l) => `- ${l}`).join('\n') || '- No major issues.'}\n\n## Risks needing a decision\n- Staffing gap may hit delivery targets if hiring takes more than two weeks.\n\n## Plan for next week\n${b.filter((l) => /tu[ầa]n sau|next|k[ếe] ho[ạa]ch|plan/i.test(l)).map((l) => `- ${l}`).join('\n') || '- Continue open items.'}`);
}

function mockMeetingSummary(transcript: string, lang: Lang): string {
  const b = bullets(transcript);
  const people = Array.from(new Set((transcript.match(/\b([A-ZÀ-Ỹ][a-zà-ỹ]+)(?=\s*[:(])/g) ?? []))).slice(0, 6);
  const actions = b.filter((l) => /s[ẽe]|c[ầa]n|will|need|g[ửu]i|xong|before|tr[ưu][ớo]c/i.test(l)).slice(0, 6);
  const rows = actions.map((a) => {
    const owner = people.find((p) => a.startsWith(p)) ?? people[0] ?? 'TBD';
    const due = /(\d{1,2}\/\d{1,2})|th[ứu] \d|tu[ầa]n (sau|n[àa]y)|friday|monday|next week/i.exec(a)?.[0] ?? 'TBD';
    return `| ${owner} | ${a.replace(/^[^:]+:\s*/, '')} | ${due} | Open |`;
  }).join('\n');
  return T(lang,
    `## Tóm tắt\n${b.slice(0, 4).map((l) => `- ${l}`).join('\n')}\n\n## Quyết định\n${b.filter((l) => /quy[ếe]t [đd][ịi]nh|decid|ch[ốo]t/i.test(l)).map((l) => `- ${l.replace(/^quy[ếe]t [đd][ịi]nh:\s*/i, '')}`).join('\n') || '- (không ghi nhận quyết định rõ ràng)'}\n\n## Việc cần làm\n| Người phụ trách | Việc | Hạn | Trạng thái |\n|---|---|---|---|\n${rows}`,
    `## Summary\n${b.slice(0, 4).map((l) => `- ${l}`).join('\n')}\n\n## Decisions\n${b.filter((l) => /quy[ếe]t [đd][ịi]nh|decid|ch[ốo]t/i.test(l)).map((l) => `- ${l.replace(/^quy[ếe]t [đd][ịi]nh:\s*/i, '')}`).join('\n') || '- (no explicit decisions recorded)'}\n\n## Action items\n| Owner | Task | Due | Status |\n|---|---|---|---|\n${rows}`);
}

function mockRecapEmail(lang: Lang): string {
  return T(lang,
    `**Tiêu đề:** Tóm tắt cuộc họp & việc cần làm\n\nChào cả nhóm,\n\nCảm ơn mọi người đã tham gia cuộc họp hôm nay. Dưới đây là các quyết định chính và việc cần làm đã thống nhất (xem bảng phía trên).\n\nNhờ từng người phụ trách xác nhận lại hạn hoàn thành trước cuối ngày mai. Nếu có vướng mắc, báo sớm để nhóm hỗ trợ.\n\nTrân trọng,\nLan`,
    `**Subject:** Meeting recap & action items\n\nHi team,\n\nThanks for joining today. Below are the decisions and the action items we agreed (see the table above).\n\nCould each owner confirm their due date by end of day tomorrow? Flag blockers early so the team can help.\n\nBest regards,\nLan`);
}

function mockCustomerReply(message: string, context: string, lang: Lang): string {
  const order = /#\s?(\d+)/.exec(message)?.[1];
  const name = /-\s*(?:Anh|Chị|Mr\.?|Ms\.?)?\s*([A-ZÀ-Ỹ][\wà-ỹ]+)\s*$/m.exec(message)?.[1] ?? '';
  const voucher = /voucher\s*(\d+)\s*k/i.exec(context)?.[1];
  return T(lang,
    `## Email trả lời\n**Tiêu đề:** Về đơn hàng ${order ? `#${order}` : 'của anh/chị'} – chúng tôi xin lỗi và cập nhật tình trạng giao hàng\n\nKính gửi ${name ? `anh ${name}` : 'quý khách'},\n\nChúng tôi thành thật xin lỗi vì đơn hàng ${order ? `#${order}` : ''} chưa đến tay anh đúng hẹn và vì anh đã không liên lạc được với hotline. Đây không phải trải nghiệm mà chúng tôi muốn mang lại.\n\n${context ? `Theo kiểm tra, ${context.split('.')[0].toLowerCase()}.` : 'Chúng tôi đang kiểm tra với đơn vị vận chuyển.'} Chúng tôi sẽ chủ động nhắn tin cập nhật cho anh ngay khi hàng rời kho.\n\nNếu anh vẫn muốn hủy đơn, chúng tôi sẽ hoàn tiền 100% trong 3 ngày làm việc theo chính sách giao trễ. ${voucher ? `Dù anh chọn phương án nào, chúng tôi xin gửi voucher ${voucher}.000đ cho lần mua sau như lời xin lỗi.` : ''}\n\nAnh vui lòng trả lời email này hoặc nhắn Zalo để chúng tôi xử lý ngay.\n\nTrân trọng,\nBộ phận Chăm sóc khách hàng\n\n## Bản ngắn cho chat\nDạ em xin lỗi anh${name ? ` ${name}` : ''} vì đơn ${order ? `#${order} ` : ''}bị trễ ạ. Hàng đang kẹt ở kho vận chuyển, dự kiến giao đầu tuần sau. Anh muốn chờ (em tặng voucher${voucher ? ` ${voucher}k` : ''}) hay hủy và hoàn tiền 100% ạ?\n\n## Ghi chú nội bộ\n- Hotline không nghe máy trong giờ làm việc: cần kiểm tra lịch trực. Khách doạ đánh giá 1 sao: ưu tiên xử lý trong 4 giờ.`,
    `## Email reply\n**Subject:** Your order ${order ? `#${order}` : ''} – our apologies and a delivery update\n\nDear ${name || 'customer'},\n\nWe are sorry that order ${order ? `#${order}` : ''} has not reached you on time and that you could not get through to our hotline. That is not the experience we want to give you.\n\n${context ? `On checking, ${context.split('.')[0].toLowerCase()}.` : 'We are checking with the carrier now.'} We will message you proactively as soon as it leaves the depot.\n\nIf you would still prefer to cancel, we will refund 100% within 3 working days under our late-delivery policy. ${voucher ? `Either way, please accept a ${voucher}k voucher for your next order as an apology.` : ''}\n\nJust reply to this email or message us on Zalo and we will act immediately.\n\nKind regards,\nCustomer Care Team\n\n## Short chat version\nSo sorry${name ? ` ${name}` : ''}, order ${order ? `#${order} ` : ''}is stuck at the carrier depot and should arrive early next week. Would you like to wait (we'll add a${voucher ? ` ${voucher}k` : ''} voucher) or cancel for a full refund?\n\n## Internal note\n- Hotline unanswered during business hours: check the roster. Customer threatens a 1-star review: handle within 4 hours.`);
}

function mockChat(workflowId: string, user: string, lang: Lang): string {
  const q = user.trim();
  if (workflowId === 'policy-assistant') {
    if (/ph[ée]p|leave|ngh[ỉi]/i.test(q)) return T(lang, 'Theo **Chính sách nghỉ phép 2026**: nhân viên chính thức có **12 ngày phép năm**, cộng 1 ngày cho mỗi 5 năm thâm niên. Phép chưa dùng được chuyển tối đa 5 ngày sang quý 1 năm sau. Bạn xin nghỉ qua HRM trước ít nhất 3 ngày làm việc.', 'Per the **2026 Leave Policy**: full-time staff get **12 annual leave days**, plus 1 day per 5 years of service. Up to 5 unused days carry over into Q1. Request leave in HRM at least 3 working days ahead.');
    if (/t[ừu] xa|remote|wfh/i.test(q)) return T(lang, 'Theo tài liệu: vị trí văn phòng được làm từ xa **tối đa 2 ngày/tuần**, đăng ký trước với quản lý trực tiếp qua HRM.', 'Per the documents: office roles may work remotely **up to 2 days per week**, registered in advance with your line manager via HRM.');
    if (/c[ôo]ng t[áa]c|travel|expense/i.test(q)) return T(lang, 'Công tác phí theo tài liệu: **nội thành 150.000đ/ngày, ngoại tỉnh 400.000đ/ngày**, cần hoá đơn khách sạn.', 'Travel allowance per the documents: **150,000đ/day in-city, 400,000đ/day out of town**, hotel invoice required.');
    return T(lang, 'Tôi không tìm thấy nội dung này trong tài liệu công ty hiện có. Bạn hãy hỏi phòng Nhân sự hoặc quản lý trực tiếp nhé.', 'I could not find that in the current company documents. Please ask HR or your line manager.');
  }
  return T(lang,
    `Tôi hiểu bạn đang cần: *"${q.slice(0, 140)}"*.\n\nĐây là cách tôi sẽ xử lý:\n1. Làm rõ mục tiêu và người nhận.\n2. Soạn bản nháp ngắn gọn, đúng giọng văn công ty.\n3. Gợi ý 1-2 điểm bạn nên kiểm tra lại trước khi gửi.\n\n**Bản nháp:**\n> Kính gửi anh/chị, liên quan đến ${q.slice(0, 60).toLowerCase()}..., chúng tôi xin gửi thông tin cập nhật và mong nhận được phản hồi trước thứ Sáu.\n\nBạn muốn tôi chỉnh giọng văn trang trọng hơn hay ngắn hơn?`,
    `I understand you need: *"${q.slice(0, 140)}"*.\n\nHere is how I would handle it:\n1. Clarify the goal and the audience.\n2. Draft a short version in your company's tone.\n3. Point out 1-2 things to double-check before sending.\n\n**Draft:**\n> Dear colleague, regarding ${q.slice(0, 60).toLowerCase()}..., here is a quick update and we would appreciate your reply by Friday.\n\nWould you like it more formal, or shorter?`);
}

function mockGeneric(inputs: Record<string, string>, lang: Lang): string {
  const lines = Object.entries(inputs).map(([k, v]) => `- **${k}**: ${v.slice(0, 160)}${v.length > 160 ? '…' : ''}`);
  return T(lang,
    `## Kết quả\nDựa trên thông tin bạn cung cấp, đây là bản nháp đầu tiên.\n\n### Dữ liệu đã nhận\n${lines.join('\n')}\n\n### Nội dung\n1. Mở đầu nêu rõ mục tiêu và đối tượng.\n2. Phần thân trình bày các ý chính thành gạch đầu dòng, mỗi ý một câu.\n3. Kết thúc bằng một hành động cụ thể cho người đọc.\n\n### Gợi ý kiểm tra lại\n- Số liệu và tên riêng.\n- Giọng văn có phù hợp với người nhận không.`,
    `## Result\nBased on what you provided, here is a first draft.\n\n### Inputs received\n${lines.join('\n')}\n\n### Content\n1. Open with the goal and the audience.\n2. Body in short bullets, one idea each.\n3. Close with one concrete action for the reader.\n\n### Please double-check\n- Figures and proper names.\n- Whether the tone fits the recipient.`);
}

/** Mock "agent" that drafts a workflow definition from a brief (admin tooling). */
function draftWorkflowJson(user: string): string {
  const brief = user.replace(/^\s*Prospect brief:\s*/i, '').trim();
  const short = brief.trim().split(/\r?\n/)[0]?.slice(0, 60) || 'Custom workflow';
  const id = short.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'custom-workflow';
  const wf = {
    id: `custom-${id}`,
    version: 1,
    kind: 'form',
    category: 'general',
    icon: 'Wand2',
    name: { vi: short, en: short },
    tagline: { vi: 'Quy trình được thiết kế riêng từ mô tả của bạn', en: 'A workflow drafted from your brief' },
    description: { vi: brief.slice(0, 300), en: brief.slice(0, 300) },
    tags: ['custom'],
    minutesSavedPerRun: 20,
    useKnowledge: true,
    inputs: [
      { key: 'content', label: { vi: 'Nội dung đầu vào', en: 'Input content' }, type: 'textarea', required: true, rows: 8, sample: 'Dán nội dung cần xử lý vào đây.' },
      { key: 'goal', label: { vi: 'Mục tiêu', en: 'Goal' }, type: 'text', sample: 'Tóm tắt và đề xuất bước tiếp theo' },
    ],
    steps: [
      {
        id: 'main',
        title: { vi: 'Xử lý', en: 'Process' },
        system: `You help {{company}} with this task: ${brief.replace(/\s+/g, ' ').slice(0, 400)}. Use company documents when relevant:\n{{knowledge}}\nWrite in {{language}} using clean Markdown.`,
        prompt: 'Goal: {{input.goal}}\n\nContent:\n"""\n{{input.content}}\n"""\n\nProduce a complete, ready-to-use result with headings and a short list of things to double-check.',
      },
    ],
  };
  return JSON.stringify(wf, null, 2);
}
