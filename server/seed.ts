import type { Workspace } from '../shared/types.ts';
import { nowIso } from './ids.ts';

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
    brief: `Headquarters (Singapore) is pushing AI adoption. Staff already use ChatGPT on personal accounts for emails and reports. Main pains: slow customer-service replies, weekly reports take managers half a day, HR answers the same policy questions all week. They want to see what "AI connected to our documents" looks like before buying anything.`,
    workflowIds: [
      'company-assistant',
      'customer-reply',
      'weekly-report',
      'meeting-actions',
      'policy-assistant',
      'invoice-extract',
      'data-insight',
      'sales-outreach',
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
    ],
    credits: { total: 100, used: 0 },
    status: 'active',
    notes: 'Demo sandbox created automatically. Safe to edit or delete.',
    createdAt: ts,
    updatedAt: ts,
  };
}
