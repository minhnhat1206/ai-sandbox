/**
 * Sample inputs that point at the generated data (the late order, a real customer, a product
 * low on stock...), so "Use sample data" then "Run" still tells a coherent story on a new
 * sandbox. Stored as workspace overrides; workflows without entity references keep their
 * catalog samples.
 */
import { parseCsv, type Row } from '../../shared/engine/csv.ts';
import type { IndustryProfile } from '../../shared/types.ts';
import { addDays, daysBetween, type GeneratedTable } from './generate.ts';

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const dmy = (iso: string) => `${dm(iso)}/${iso.slice(0, 4)}`;
const num = (v: string | undefined) => Number(v ?? 0) || 0;
const vnd = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

export function generateSamples(profile: IndustryProfile, tables: GeneratedTable[], asOf: string): Record<string, Record<string, string>> {
  const t = (name: string): Row[] => { const tb = tables.find((x) => x.name === name); return tb ? parseCsv(tb.csv).rows : []; };
  const customers = t('customers'), orders = t('orders'), recv = t('receivables'), inv = t('inventory'), prices = t('price_list'), deals = t('deals');
  const out: Record<string, Record<string, string>> = {};
  const custOf = (name: string) => customers.find((c) => c.name === name);
  const unitOf = (product: string) => prices.find((p) => p.product === product)?.unit ?? '';

  // Customer care: the delayed order.
  const late = orders.find((o) => o.status === 'delayed') ?? orders[0];
  if (late) {
    const c = custOf(late.customer_name);
    const days = daysBetween(late.promised_date, asOf);
    out['order-care-agent'] = { message: `Chào bên em, ${late.customer_name} đặt đơn ${late.order_id} (${late.qty} ${unitOf(late.product)} ${late.product.toLowerCase()}) hẹn giao ${dm(late.promised_date)} mà đến hôm nay ${dm(asOf)} vẫn chưa thấy hàng, trễ ${days} ngày rồi. Gọi hotline không ai nghe. Nếu tuần này không giao kịp thì huỷ và hoàn tiền giúp. - ${c?.contact ?? 'Khách hàng'}` };
  }

  // Quote: a top customer asks for four products.
  const big = customers[0];
  if (big && prices.length >= 4) {
    const lines = prices.slice(0, 7).filter((_, i) => [0, 2, 3, 6].includes(i)).map((p, i) => {
      const qty = Math.max(num(p.min_qty) * (4 + i * 3), 1);
      return `- ${qty} ${p.unit} ${p.product.toLowerCase()}`;
    });
    out['quote-builder-agent'] = { request: `Chào anh/chị ${big.account_manager},\n${big.name} cần báo giá cho đợt hàng cuối năm:\n${lines.join('\n')}\nGiao trước ${dm(addDays(asOf, 13))} tại kho của chúng tôi. Nhờ báo giá tốt nhất trong tuần này.\n${big.contact} – Phòng Mua hàng` };
  }

  // Inbox: complaint, extra order, payment, English price request, spam.
  const payer = recv.find((r) => num(r.balance) > 0 && num(r.days_overdue) > 0 && r.customer_name !== late?.customer_name);
  const foreign = customers.find((c) => /^(Mr|Ms|Mrs)\.?\s/.test(c.contact) && c.name !== late?.customer_name && c.name !== payer?.customer_name) ?? customers[customers.length - 1];
  const orderCust = customers.find((c) => ![late?.customer_name, payer?.customer_name, foreign.name].includes(c.name) && !!c.email) ?? customers[1];
  const p0 = prices[6] ?? prices[0];
  const p1 = prices[2] ?? prices[0];
  if (late && payer && p0 && p1) {
    out['inbox-triage-agent'] = {
      messages: [
        `Từ: ${custOf(late.customer_name)?.contact ?? 'Khách'} – ${late.customer_name} (Zalo)\nĐơn ${late.order_id} vẫn chưa thấy đâu, tuần này mà giao không kịp thì huỷ giúp.`,
        `Từ: ${orderCust.contact} – ${orderCust.name} (email)\nBên mình muốn đặt thêm ${Math.max(num(p0.min_qty) * 6, 10)} ${p0.unit} ${p0.product.toLowerCase()} giao thứ Sáu này, xác nhận giúp.`,
        `Từ: Kế toán ${payer.customer_name} (email)\nChúng tôi đã chuyển ${Math.max(1, Math.round(num(payer.balance) * 0.4 / 1e6))} triệu hôm ${dm(addDays(asOf, -5))}, nhờ bên chị đối chiếu và gửi lại công nợ.`,
        `Từ: ${foreign.contact} – ${foreign.name} (email)\nCould you send me the price for ${Math.max(num(p1.min_qty) * 8, 10)} ${p1.unit} of ${p1.product} for next month?`,
        'Từ: Số lạ (Zalo)\nChúc mừng bạn trúng thưởng iPhone, bấm link để nhận quà!!!',
      ].join('\n---\n'),
    };
  }

  // Meeting prep: the customer with an open deal and overdue debt.
  const target = deals.find((d) => /công nợ/.test(d.next_step))?.customer ?? recv.find((r) => num(r.days_overdue) > 30)?.customer_name;
  if (target) out['meeting-prep-agent'] = { customer: target, goal: `Gia hạn hợp đồng năm ${Number(asOf.slice(0, 4)) + 1} và xử lý công nợ` };

  // Supplier comparison: the product with the least cover.
  const low = [...inv].sort((a, b) => (num(a.on_hand) - num(a.reserved)) / Math.max(1, num(a.avg_daily_sales)) - (num(b.on_hand) - num(b.reserved)) / Math.max(1, num(b.avg_daily_sales)))[0];
  if (low) {
    const unit = unitOf(low.product) || 'đơn vị';
    const need = Math.max(10, Math.round(num(low.avg_daily_sales) * 20 / 10) * 10);
    const cost = num(low.unit_cost);
    const price = (k: number) => vnd(Math.round(cost * k / 100) * 100);
    out['supplier-compare-agent'] = {
      need: `${low.product}, ${need} ${unit}, cần về kho trước ${dm(addDays(asOf, 8))}`,
      quotes: [
        `NCC 1 – ${low.supplier}: đơn giá ${price(1)}đ/${unit}, tối thiểu ${Math.round(need * 0.8)} ${unit}, giao 5 ngày, phí vận chuyển ${vnd(Math.max(500_000, cost * need * 0.02))}đ, thanh toán 30 ngày.`,
        `NCC 2 – Thương mại Toàn Cầu: đơn giá ${price(0.95)}đ/${unit}, tối thiểu ${Math.round(need * 1.7)} ${unit}, giao 9 ngày, miễn phí vận chuyển, thanh toán trước 50%.`,
        `NCC 3 – Hợp tác xã Phú Thịnh: đơn giá ${price(1.03)}đ/${unit}, tối thiểu ${Math.round(need * 0.35)} ${unit}, giao 3 ngày, phí vận chuyển ${vnd(Math.max(300_000, cost * need * 0.01))}đ, thanh toán 45 ngày.`,
      ].join('\n'),
    };
  }

  // Periods relative to the data's "today".
  const month = `${asOf.slice(5, 7)}/${asOf.slice(0, 4)}`;
  out['weekly-ops-agent'] = { period: `${dmy(addDays(asOf, -8))} – ${dmy(asOf)}` };
  out['voc-insights-agent'] = { period: `Tháng ${month}` };
  out['expense-audit-agent'] = { month };
  out['monthly-review-deck'] = { month: `Tháng ${month}` };
  out['onboarding-agent'] = { start: addDays(asOf, 12), department: profile.departments[2] ?? 'CSKH', role: `Chuyên viên ${profile.departments[2] ?? 'Chăm sóc khách hàng'}` };
  out['ai-readiness-agent'] = { goal: `Dùng AI an toàn, đúng luật và giảm 20% thời gian việc giấy tờ trong ${Number(asOf.slice(0, 4)) + 1}` };
  return out;
}
