# AI Sandbox – Product brief (sau phỏng vấn founder, 29/10/2026)

## 1. Quyết định đã chốt
| Chủ đề | Quyết định |
|---|---|
| Khách đầu tiên | Người quen trong mạng lưới, ngành nào cũng được (sau đó mở rộng FDI/outsourcing VN, doanh nghiệp VN, SME Úc) |
| Dữ liệu trong sandbox | **Dữ liệu giả lập theo cấu trúc của khách**, không nhận dữ liệu thật trước khi ký |
| Nguồn cấu trúc | Ghi chú cuộc gọi, file mẫu trống (chỉ tiêu đề cột), ảnh chụp màn hình phần mềm, AI đề xuất theo ngành |
| Người dựng sandbox | Kỹ sư, tối đa 2–4 giờ mỗi khách |
| Người thử | Người ra quyết định tự thử |
| Sau khi thử | Báo cáo gửi sếp, kèm đề xuất gói |
| Gói trả phí đầu tiên | **AI Kickstart (2 giờ)** |
| Vai trò sandbox trong Kickstart | **Phòng thực hành**: bài tập có AI chấm, chat tự do có bối cảnh công ty, chạy agent dựng sẵn |
| Hình thức Kickstart | Trực tiếp tại văn phòng khách, học viên quét QR, nhập tên và phòng ban |
| Người đứng lớp cần | Bảng theo dõi trực tiếp; đo trước – sau |
| Ngân sách AI | Hai ngân sách tách biệt: 10 USD giai đoạn thử miễn phí; ngân sách riêng cho Kickstart, tính vào giá gói |
| Năng lực kỹ sư | 5–10 giờ/tuần cho nền tảng trong 2 tháng tới |
| API | Đã có key và credit Anthropic |
| Tên công ty | Chưa chốt, dùng tên tạm |

## 2. Hành trình khách hàng mục tiêu
1. **Cuộc gọi khám phá** với người quen (30 phút): nỗi đau, phần mềm đang dùng, xin file mẫu trống hoặc ảnh màn hình.
2. **Kỹ sư dựng sandbox ≤ 2–4 giờ**: AI đề xuất bảng/cột theo ngành, sinh dữ liệu giả lập khớp chéo, chọn 5–8 agent, kỹ sư duyệt.
3. **Sếp tự thử** (ngân sách 10 USD, Claude thật).
4. **Báo cáo gửi sếp**: đã thử gì, giờ tiết kiệm ước tính, rủi ro AI phát hiện được, đề xuất Kickstart kèm giá và nội dung buổi học.
5. **Kickstart tại chỗ** (ngân sách riêng): QR vào lớp, đo trước, bài tập theo phòng ban có AI chấm, chat tự do, chạy agent; người đứng lớp xem bảng trực tiếp; đo sau.
6. **Báo cáo sau Kickstart** → bước tiếp theo: Readiness Assessment hoặc Build.

## 3. Khoảng trống so với nền tảng hiện tại
| # | Thiếu | Vì sao quan trọng |
|---|---|---|
| A | Chưa chạy 21 agent với Claude thật; mã mời đoán được; chưa giới hạn tần suất; chưa có hướng dẫn deploy HTTPS và sao lưu | Không thể gửi link cho khách thật |
| B | Chưa có **xưởng dữ liệu giả lập** (từ ghi chú / tiêu đề cột / ảnh / ngành) | Không đạt mục tiêu 2–4 giờ mỗi khách với "ngành nào cũng được" |
| C | Chưa có **báo cáo cho sếp** | Bước chuyển đổi duy nhất founder chọn |
| D | Chưa có **chế độ lớp học**: phiên học, QR, danh tính học viên, bài tập có chấm điểm, chat tự do, bảng theo dõi, khảo sát trước – sau, ngân sách phiên | Là phần giá trị của gói trả phí đầu tiên |

## 4. Kế hoạch đề xuất (khớp năng lực 5–10 giờ/tuần của kỹ sư; phần code do Claude Code làm, kỹ sư duyệt)
| Giai đoạn | Tuần | Nội dung | Kết quả kiểm chứng |
|---|---|---|---|
| 1. Sẵn sàng chạy thật | 1 | Script chạy toàn bộ agent với Claude thật và báo lỗi/chi phí; mã mời ngẫu nhiên; giới hạn tần suất; hướng dẫn deploy + sao lưu | 21/21 agent chạy thật, chi phí mỗi lượt đo được |
| 2. Xưởng dữ liệu giả lập | 1–2 | Admin: nhập ngành + ghi chú / tiêu đề cột / ảnh → agent đề xuất bảng, sinh CSV khớp chéo + tài liệu mẫu → duyệt → sandbox | Dựng sandbox cho ngành mới < 2 giờ |
| 3. Báo cáo cho sếp | 2–3 | Trang báo cáo chia sẻ được + đề xuất Kickstart | Gửi được cho 3 khách đầu |
| 4. Chế độ lớp học | 3–6 | Phiên học, QR, bài tập + AI chấm, chat tự do, bảng theo dõi, đo trước – sau, ngân sách phiên | Chạy thử 1 buổi nội bộ với 5–10 người |

## 5. Giả định cần kiểm chứng
- Người quen sẵn sàng dành 30 phút thử sandbox và chuyển báo cáo lên cấp trên.
- Dữ liệu giả lập "giống công ty mình" đủ thuyết phục, không cần dữ liệu thật.
- Kickstart có sandbox thực hành bán được ở mức giá Zone C/B (250–450 USD) và tạo ≥ 25% chuyển đổi sang gói lớn hơn.
- **Ngưỡng dừng:** sau 10 sandbox mà dưới 2 khách mua Kickstart thì xem lại cách chọn khách và lời mời, không xây thêm tính năng.
