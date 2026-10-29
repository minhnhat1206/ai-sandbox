import type { Workspace } from '../shared/types.ts';
import { nowIso } from './ids.ts';
import { demoDataSources } from './seed-data.ts';

/** A ready-to-show demo sandbox so the platform works on first start. */
export function demoWorkspace(): Workspace {
  const ts = nowIso();
  return {
    id: 'ws_demo',
    token: 'demo',
    company: 'Việt Minh Distribution',
    industry: 'FMCG distribution, 180 staff, HCMC',
    contactName: 'Nguyễn Văn Minh',
    contactEmail: 'minh@vietminh.example',
    language: 'vi',
    brief: `Headquarters (Singapore) is pushing AI adoption. Staff already use ChatGPT on personal accounts for emails and reports. Main pains: slow customer-service replies, quotes take a day, accountants reconcile bank statements by hand every morning, reports take managers half a day, HR answers the same policy questions all week, and nobody knows which AI tools are allowed. They want to see what "AI connected to our documents" looks like before buying anything.`,
    workflowIds: [
      'order-care-agent',
      'quote-builder-agent',
      'inbox-triage-agent',
      'receivables-agent',
      'bank-recon-agent',
      'data-chat',
      'weekly-ops-agent',
      'monthly-review-deck',
      'pipeline-review-agent',
      'meeting-prep-agent',
      'voc-insights-agent',
      'inventory-agent',
      'supplier-compare-agent',
      'expense-audit-agent',
      'onboarding-agent',
      'policy-helpdesk',
      'ai-readiness-agent',
      'ai-policy-agent',
      'document-review',
      'data-cleanup',
      'excel-builder',
    ],
    overrides: {},
    customWorkflows: [],
    knowledge: [
      {
        id: 'kd_leave',
        title: 'Chính sách nghỉ phép 2026',
        content: `- Nhân viên chính thức: 12 ngày phép năm, cộng 1 ngày cho mỗi 5 năm thâm niên.
- Phép năm chưa dùng được chuyển tối đa 5 ngày sang quý 1 năm sau.
- Xin nghỉ qua hệ thống HRM trước ít nhất 3 ngày làm việc; nghỉ từ 5 ngày trở lên cần trưởng phòng và HR duyệt.
- Nghỉ ốm: tối đa 3 ngày liên tiếp không cần giấy bác sĩ.
- Làm việc từ xa: tối đa 2 ngày/tuần với vị trí văn phòng, đăng ký trước với quản lý trực tiếp qua HRM.`,
        updatedAt: ts,
      },
      {
        id: 'kd_cs',
        title: 'Chính sách hoàn trả & chăm sóc khách hàng',
        content: `- Hoàn tiền 100% nếu đơn giao trễ hơn 5 ngày làm việc so với cam kết và khách yêu cầu hủy.
- Voucher xin lỗi tối đa 50.000đ, nhân viên CSKH tự quyết; trên 50.000đ cần trưởng nhóm duyệt.
- Thời gian phản hồi khiếu nại: trong 4 giờ làm việc.
- Không hứa ngày giao cụ thể khi chưa có xác nhận từ đơn vị vận chuyển.
- Công tác phí: nội thành 150.000đ/ngày, ngoại tỉnh 400.000đ/ngày, có hoá đơn khách sạn.`,
        updatedAt: ts,
      },
      {
        id: 'kd_pricing',
        title: 'Chính sách giá & chiết khấu 2026',
        content: `- Giá bán theo bảng giá phân khúc (Modern trade, Wholesale, Horeca, Traditional trade), chưa gồm VAT 8%.
- Chiết khấu theo giá trị đơn trước VAT: từ 100 triệu đồng giảm 2%; từ 300 triệu đồng giảm 4%. Khách Wholesale được cộng thêm 1%.
- Chiết khấu vượt 5% phải được Giám đốc kinh doanh duyệt.
- Báo giá có hiệu lực 15 ngày. Giao trong 3 ngày làm việc nếu đủ tồn kho.
- Không nhận đơn mới nếu công nợ hiện tại cộng giá trị đơn vượt hạn mức tín dụng, trừ khi Kế toán trưởng duyệt.
- Khách có hoá đơn quá hạn trên 30 ngày: chỉ giao hàng khi thanh toán trước.`,
        updatedAt: ts,
      },
      {
        id: 'kd_expense',
        title: 'Quy định thanh toán chi phí',
        content: `- Taxi: tối đa 300.000đ/chuyến.
- Khách sạn công tác: tối đa 800.000đ/đêm.
- Tiếp khách: tối đa 500.000đ/người và phải được trưởng phòng duyệt trước.
- Công tác phí: nội thành 150.000đ/ngày, ngoại tỉnh 400.000đ/ngày, không cần hoá đơn.
- Mọi khoản chi từ 200.000đ (trừ công tác phí) phải có hoá đơn điện tử.
- Đề nghị thanh toán nộp trong vòng 30 ngày kể từ ngày phát sinh.
- Mua phần mềm, thiết bị phải đi qua phòng Mua hàng, không thanh toán qua đề nghị cá nhân.`,
        updatedAt: ts,
      },
      {
        id: 'kd_onboarding',
        title: 'Quy trình tiếp nhận nhân viên mới',
        content: `- Trước ngày đầu 3 ngày làm việc: IT tạo email, tài khoản HRM và CRM, chuẩn bị laptop; Hành chính chuẩn bị thẻ ra vào và chỗ ngồi; Nhân sự gửi hợp đồng thử việc.
- Thử việc tối đa 60 ngày với vị trí cần chuyên môn, 30 ngày với vị trí khác.
- Hồ sơ cần nộp: CCCD, sổ BHXH (nếu có), bằng cấp, thông tin tài khoản ngân hàng.
- Ngày đầu: 9:00 Nhân sự hướng dẫn nội quy, bảo mật thông tin và an toàn; quản lý giới thiệu người hướng dẫn (buddy).
- Tuần đầu: đào tạo sản phẩm, hệ thống CRM/HRM và quy trình phòng ban.
- Đánh giá sau 30 ngày và trước khi hết thử việc. Đăng ký BHXH trong 30 ngày kể từ ngày ký hợp đồng chính thức.`,
        updatedAt: ts,
      },
      {
        id: 'kd_security',
        title: 'Quy định bảo mật thông tin',
        content: `- Dữ liệu khách hàng, giá bán, công nợ và dữ liệu nhân sự là thông tin mật.
- Không đưa thông tin mật vào tài khoản cá nhân của bất kỳ công cụ AI hay dịch vụ đám mây nào.
- Chỉ dùng công cụ được công ty phê duyệt và đăng nhập bằng tài khoản công ty.
- Sự cố lộ lọt dữ liệu phải báo cho IT trong vòng 24 giờ.
- Hiện công ty chưa có danh sách công cụ AI được phê duyệt.`,
        updatedAt: ts,
      },
    ],
    dataSources: demoDataSources(ts),
    mcpServers: [],
    credits: { total: 100, used: 0 },
    budgetUsd: 10,
    spentUsd: 0,
    status: 'active',
    notes: 'Demo sandbox created automatically. Safe to edit or delete.',
    createdAt: ts,
    updatedAt: ts,
  };
}
