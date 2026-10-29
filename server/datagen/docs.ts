/**
 * Company documents for a generated sandbox. The rules mirror the demo company's so the
 * agents (and the demo scripts) apply the same limits; names, segments and products follow
 * the prospect's industry. The founder edits them in the Knowledge tab when the prospect
 * shares their real policy.
 */
import type { IndustryProfile } from '../../shared/types.ts';

export function generateDocs(company: string, profile: IndustryProfile): { title: string; content: string }[] {
  const seg = profile.segments;
  const cats = [...new Set(profile.products.map((p) => p.category))].slice(0, 4).join(', ');
  return [
    {
      title: 'Chính sách nghỉ phép',
      content: `- Nhân viên chính thức của ${company}: 12 ngày phép năm, cộng 1 ngày cho mỗi 5 năm thâm niên.
- Phép năm chưa dùng được chuyển tối đa 5 ngày sang quý 1 năm sau.
- Xin nghỉ qua hệ thống nhân sự trước ít nhất 3 ngày làm việc; nghỉ từ 5 ngày trở lên cần trưởng phòng và Nhân sự duyệt.
- Nghỉ ốm: tối đa 3 ngày liên tiếp không cần giấy bác sĩ.
- Làm việc từ xa: tối đa 2 ngày/tuần với vị trí văn phòng, đăng ký trước với quản lý trực tiếp.`,
    },
    {
      title: 'Chính sách hoàn trả & chăm sóc khách hàng',
      content: `- Áp dụng cho các nhóm hàng: ${cats}.
- Hoàn tiền 100% nếu đơn giao trễ hơn 5 ngày làm việc so với cam kết và khách yêu cầu hủy.
- Voucher xin lỗi tối đa 50.000đ, nhân viên CSKH tự quyết; trên 50.000đ cần trưởng nhóm duyệt.
- Hàng lỗi do vận chuyển hoặc sản xuất: đổi mới trong 7 ngày kể từ ngày nhận, công ty chịu phí vận chuyển.
- Thời gian phản hồi khiếu nại: trong 4 giờ làm việc.
- Không hứa ngày giao cụ thể khi chưa có xác nhận từ bộ phận giao vận.`,
    },
    {
      title: 'Chính sách giá & chiết khấu',
      content: `- Giá bán theo bảng giá phân khúc (${seg.join(', ')}), chưa gồm VAT 8%.
- Chiết khấu theo giá trị đơn trước VAT: từ 100 triệu đồng giảm 2%; từ 300 triệu đồng giảm 4%. Khách ${seg[1] ?? seg[0]} được cộng thêm 1%.
- Chiết khấu vượt 5% phải được Giám đốc kinh doanh duyệt.
- Báo giá có hiệu lực 15 ngày. Giao trong 3 ngày làm việc nếu đủ tồn kho.
- Không nhận đơn mới nếu công nợ hiện tại cộng giá trị đơn vượt hạn mức tín dụng, trừ khi Kế toán trưởng duyệt.
- Khách có hoá đơn quá hạn trên 30 ngày: chỉ giao hàng khi thanh toán trước.`,
    },
    {
      title: 'Quy định thanh toán chi phí',
      content: `- Taxi: tối đa 300.000đ/chuyến.
- Khách sạn công tác: tối đa 800.000đ/đêm.
- Tiếp khách: tối đa 500.000đ/người và phải được trưởng phòng duyệt trước.
- Công tác phí: nội thành 150.000đ/ngày, ngoại tỉnh 400.000đ/ngày, không cần hoá đơn.
- Mọi khoản chi từ 200.000đ (trừ công tác phí) phải có hoá đơn điện tử.
- Đề nghị thanh toán nộp trong vòng 30 ngày kể từ ngày phát sinh.
- Mua phần mềm, thiết bị phải đi qua phòng Mua hàng, không thanh toán qua đề nghị cá nhân.`,
    },
    {
      title: 'Quy trình tiếp nhận nhân viên mới',
      content: `- Trước ngày đầu 3 ngày làm việc: IT tạo email, tài khoản phần mềm nội bộ, chuẩn bị laptop; Hành chính chuẩn bị thẻ ra vào và chỗ ngồi; Nhân sự gửi hợp đồng thử việc.
- Thử việc tối đa 60 ngày với vị trí cần chuyên môn, 30 ngày với vị trí khác.
- Hồ sơ cần nộp: CCCD, sổ BHXH (nếu có), bằng cấp, thông tin tài khoản ngân hàng.
- Ngày đầu: 9:00 Nhân sự hướng dẫn nội quy, bảo mật thông tin và an toàn; quản lý giới thiệu người hướng dẫn (buddy).
- Tuần đầu: đào tạo sản phẩm (${cats}), phần mềm nội bộ và quy trình phòng ban.
- Đánh giá sau 30 ngày và trước khi hết thử việc. Đăng ký BHXH trong 30 ngày kể từ ngày ký hợp đồng chính thức.`,
    },
    {
      title: 'Quy định bảo mật thông tin',
      content: `- Dữ liệu khách hàng, giá bán, công nợ và dữ liệu nhân sự của ${company} là thông tin mật.
- Không đưa thông tin mật vào tài khoản cá nhân của bất kỳ công cụ AI hay dịch vụ đám mây nào.
- Chỉ dùng công cụ được công ty phê duyệt và đăng nhập bằng tài khoản công ty.
- Sự cố lộ lọt dữ liệu phải báo cho IT trong vòng 24 giờ.
- Hiện công ty chưa có danh sách công cụ AI được phê duyệt.`,
    },
  ];
}
