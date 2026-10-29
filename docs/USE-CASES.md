# Thư viện use case – nghiên cứu & thiết kế (v0.3)

## 1. Vì sao bỏ 11 use case ban đầu
Các use case đầu tiên (viết email, tóm tắt cuộc họp, dịch, viết bài Facebook…) đều là
**một prompt, một câu trả lời**. Khách tự làm được bằng ChatGPT miễn phí, nên sandbox không
chứng minh được điều business plan bán: *"chúng tôi vừa đào tạo vừa **xây** công cụ kết nối
với hệ thống của bạn"*. Chúng không dùng tới năng lực khác biệt của Claude (tool use, MCP,
Agent Skills, artifact, đọc file, web search) và không tạo ra hành động hay sản phẩm bàn giao.

## 2. Tiêu chí chọn use case mới
Mỗi use case phải đạt **cả 5**:
1. **Dữ liệu thật**: phải đọc ít nhất một hệ thống (đơn hàng, công nợ, kho, pipeline, sao kê, khảo sát) hoặc file khách tải lên. Không thể làm bằng cách dán vào chatbot.
2. **Hành động**: tạo ticket, soạn email trong outbox, giao việc – để khách thấy AI *làm việc*, không chỉ *trả lời*.
3. **Sản phẩm bàn giao**: dashboard HTML, bảng tải được, CSV nhập MISA/Excel, file Office (khi bật Claude).
4. **Đo được**: phút tiết kiệm mỗi lần dựa trên việc thủ công tương đương; con số tự kiểm tra được.
5. **Gắn với role track** trong business plan (vận hành, kinh doanh, tài chính, nhân sự, CSKH) hoặc với **chính sản phẩm của công ty** (đánh giá sẵn sàng AI, quy định AI theo luật VN).

Nguồn nghiên cứu: business plan (`AI_Enablement_Business_Plan.md`) – vấn đề theo thị trường
(74% doanh nghiệp VN dùng AI ở mức cơ bản, 54% coi kỹ năng là rào cản, 78% "AI chui"), khách
hàng mục tiêu (FDI/outsourcing 50–2.000 nhân viên ở VN; SME Úc đã mua seat nhưng chưa có quy
định), danh mục build (custom assistant, MCP connector cho M365/HubSpot/MISA/Zalo OA), luật
mới (Luật AI 134/2025, Luật BVDLCN 91/2025). Bài toán từng phòng ban dựa trên quy trình phổ
biến ở doanh nghiệp phân phối/dịch vụ tại VN.

## 3. Danh mục (21 agent, 0 prompt đơn)

| Use case | Phòng ban | Nỗi đau | Năng lực Claude | Dữ liệu | Sản phẩm / hành động | Phút/lần |
|---|---|---|---|---|---|---|
| Xử lý khiếu nại đơn hàng | CSKH | Tra đơn, đọc chính sách, bồi thường sai | tool use, knowledge | orders, customers, receivables, tài liệu | case file, ticket, email | 25 |
| **Lập báo giá từ yêu cầu** | Kinh doanh | Báo giá mất nửa ngày, sai giá phân khúc, quên kiểm hạn mức nợ | tool use, knowledge, artifact, *docx skill* | price_list, inventory, receivables, chính sách giá | báo giá in được, ticket duyệt/thiếu hàng, email | 40 |
| **Phân loại hộp thư Zalo/email** | CSKH | Cả sáng đọc tin, bỏ sót tin gấp, bấm nhầm link lừa đảo | tool use, multi-item reasoning | customers, orders, receivables, price_list | bảng triage, 5 email, 4 ticket | 60 |
| Thu hồi công nợ | Tài chính | Không biết gọi ai trước | tool use, artifact | receivables | dashboard, call list, email nhắc | 90 |
| **Đối soát sao kê ngân hàng** | Tài chính | Kế toán khớp tay mỗi sáng; nội dung CK không dấu, thiếu số HĐ; trả trùng không ai thấy | tool use, fuzzy matching, file input | bank_transactions/CSV, receivables | bảng đối soát, CSV bút toán, ticket ngoại lệ, email | 80 |
| **Hỏi đáp dữ liệu công ty** (chat) | Quản trị | Quản lý không dùng Excel/SQL | chat + tool use, artifact | mọi bảng | câu trả lời có số + bảng | 15 |
| Báo cáo vận hành tuần | Vận hành | Nửa ngày gom số | tool use, artifact | orders, tickets | dashboard, báo cáo, email GĐ | 120 |
| **Bộ slide giao ban tháng** | Quản trị | 1 ngày làm slide | tool use, *pptx skill*, artifact | orders, receivables, inventory, reviews, deals | deck 8 slide (HTML/pptx) | 180 |
| **Rà soát pipeline bán hàng** | Kinh doanh | Cơ hội "nguội", dự báo cảm tính | tool use, artifact | deals, customers, receivables | dashboard, task cho từng sales, email follow-up | 75 |
| Chuẩn bị gặp khách | Kinh doanh | Gom thông tin rời rạc | tool use, web search | customers, orders, receivables, tickets | brief HTML, talking points | 45 |
| **Phân tích phản hồi khách hàng** | Marketing/CSKH | Đánh giá rải rác 4 kênh, không biết nguyên nhân gốc | tool use, join dữ liệu, artifact | reviews, tickets, orders | dashboard VoC, ticket nguyên nhân gốc, phản hồi công khai | 90 |
| Đề xuất đặt hàng tồn kho | Vận hành | Hết hàng bất ngờ | tool use | inventory | bảng + CSV | 60 |
| **So sánh báo giá NCC** | Vận hành/Mua hàng | Báo giá khác định dạng, chọn rẻ nhưng trễ | file input (PDF), tool use | inventory, price_list | bảng so sánh, đề xuất, email PO | 50 |
| **Kiểm tra đề nghị thanh toán** | Tài chính/Nhân sự | Soát từng dòng, trùng, thiếu hoá đơn | tool use, knowledge | expenses, quy định chi phí | bảng rà soát, tóm tắt, email bổ sung | 70 |
| **Đón nhân viên mới** | Nhân sự | Quên việc, IT chưa cấp tài khoản ngày đầu | knowledge, tool use | quy trình onboarding, bảo mật | checklist có hạn, 3 ticket, 2 email, kế hoạch 30-60-90 | 55 |
| **Trợ lý HR & nội quy** (chat) | Nhân sự | HR trả lời câu lặp lại cả tuần | chat + knowledge + escalation | tài liệu nội bộ | trích dẫn điều khoản; không có thì mở ticket HR | 10 |
| **Đánh giá sẵn sàng AI** | Quản trị | Không biết bắt đầu từ đâu, rủi ro "AI chui" | tool use, artifact | ai_survey, quy định bảo mật | bảng điểm 5 trụ cột, lộ trình 90 ngày | 240 |
| **Soạn quy định sử dụng AI** | Quản trị/Nhân sự | Luật AI & BVDLCN đã hiệu lực, chưa có quy định | tool use, knowledge, *docx skill* | ai_survey, quy định bảo mật | dự thảo quy định 12 điều, bảng quyết định công cụ, hướng dẫn 1 trang | 300 |
| Rà soát hợp đồng (PDF) | Chung | Đọc hợp đồng dài | file input (PDF/ảnh) | file khách | bảng điều khoản, câu hỏi luật sư | 50 |
| Làm sạch danh sách khách | Vận hành | Dữ liệu CRM lộn xộn | file input (CSV) | file khách | bảng sạch, CSV, nhật ký | 75 |
| Tạo file Excel có công thức | Tài chính | Tự dựng bảng tính | *xlsx skill* | bảng bất kỳ | file .xlsx (thật) / bảng + CSV | 60 |

*In đậm: use case mới ở v0.3.*

## 4. Thiết kế quan trọng
- **Hai use case là chính sản phẩm bán hàng**: *Đánh giá sẵn sàng AI* và *Soạn quy định AI*
  chính là Readiness Assessment và AI policy trong bảng giá. Khách thử xong là đã thấy đầu ra
  của gói trả phí, nối thẳng vào Kickstart/Assessment.
- **Chat có tool**: hai chat agent không còn "nói chuyện suông": chat dữ liệu luôn truy vấn
  trước khi trả lời; trợ lý HR không bịa, câu hỏi chưa có trong tài liệu được mở ticket cho HR.
- **An toàn với con người**: rà soát chi phí và đón nhân viên mới chỉ hỗ trợ người duyệt;
  không có use case tự quyết định về tuyển dụng, kỷ luật, tín dụng (đúng phần *Won't* của
  business plan và quy định nội bộ).
- **Dữ liệu demo khớp chéo**: 11 bảng mẫu (khách, đơn, công nợ, kho, ticket, bảng giá, pipeline,
  sao kê, chi phí, đánh giá, khảo sát AI) dùng cùng mã khách/đơn/hoá đơn, nên các agent cho ra
  con số kiểm chứng được (ví dụ BT07 trả trùng INV-2632; E-10 trùng E-09; đơn 48213 trễ 6 ngày).
- **Kiểm thử**: `tests/usecases.test.ts` chạy mọi workflow bằng dữ liệu mẫu và kiểm tra con số
  then chốt của từng use case.

## 5. Mở rộng tiếp (chưa làm)
- Kết nối MCP thật: MISA (kế toán), HubSpot (CRM), Zalo OA, Google Workspace/M365.
- Use case cho Úc: "Automated decision disclosure" theo Privacy Act (10/12/2026).
- Use case BPO (Philippines): QA cuộc gọi, tóm tắt ticket ca đêm.
