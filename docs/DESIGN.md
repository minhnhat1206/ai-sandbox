# AI Sandbox – Thiết kế sản phẩm

Tài liệu này nối business plan (`AI_Enablement_Business_Plan.md`) với nền tảng đã xây.
Phiên bản 0.1 · Tháng 10/2026.

## 1. Phân tích: nền tảng này giải quyết gì trong business plan

| Điểm trong business plan | Vấn đề thực tế | Nền tảng xử lý thế nào |
|---|---|---|
| "Staff use personal accounts… nobody owns mapping AI to tasks" | Khách chưa có tài khoản AI, sợ sai, không biết bắt đầu từ đâu | Link mời, **không cần tài khoản**, chạy bằng credit của ta. Mỗi quy trình có nút *Dùng dữ liệu mẫu* → *Chạy*: 2 cú nhấp là có kết quả |
| Sales motion: Scorecard → call → Kickstart → Sprint | Thiếu một "bằng chứng sống" giữa cuộc gọi và Kickstart | Sandbox là bước **"thử trước khi mua"**: sau cuộc gọi khám phá, ta dựng 4–6 quy trình đúng nỗi đau của họ trong 48 giờ |
| "We both teach and build" | Đối thủ chỉ dạy prompt hoặc chỉ build | Trợ lý đọc **tài liệu nội bộ** của khách (policy, FAQ) cho thấy "AI kết nối với dữ liệu của bạn" ngay trong demo |
| "Measure usage and hours saved" | Khách muốn số, không muốn slide | Mỗi lượt chạy ghi nhận phút tiết kiệm, đánh giá sao, phản hồi → trang *Kết quả của tôi* cho khách và dashboard cho ta |
| Risk: all selling rests on one founder | Founder không thể ngồi demo từng người | Khách tự thử theo thời gian của họ; kỹ sư dựng workflow bằng Claude Code (skills) thay vì founder ngồi gõ prompt |
| Zero capital, credits từ startup programs | Phải kiểm soát chi phí AI | Credit per sandbox, trừ server-side, dashboard hiển thị USD ước tính theo model |
| Luật AI & bảo vệ dữ liệu VN | Khách lo dữ liệu | Không tài khoản, không lưu gì ngoài lượt chạy; admin token; không có tính năng quyết định tự động về con người |

**Kết luận thiết kế:** nền tảng không phải "ChatGPT wrapper". Nó là *phòng thử nghiệm bán hàng* (sales sandbox): mục tiêu duy nhất là đưa một người chưa dùng AI đến khoảnh khắc "ồ, đây là việc tôi làm mỗi thứ Hai" rồi bấm *Đặt lịch trao đổi*.

## 2. Hai người dùng, hai luồng

### 2.1 Khách tiềm năng (prospect) – `/s/<token>`
1. **Onboarding 3 bước** (modal lần đầu): chọn quy trình → dùng dữ liệu mẫu → thay bằng dữ liệu thật. Hỏi tên (không bắt buộc) để ta biết ai đã thử.
2. **Gallery quy trình** dựng riêng cho công ty họ, lọc theo phòng ban, hiển thị "tiết kiệm ~N phút/lần", "đọc tài liệu công ty".
3. **Chạy quy trình (form)**: nhập liệu có mẫu sẵn → streaming từng bước → kết quả Markdown có bảng → sao chép → đánh giá sao + góp ý → CTA *Muốn quy trình này cho cả đội?*
4. **Trợ lý chat (agent)**: câu hỏi gợi ý, trả lời từ tài liệu nội bộ, từ chối bịa khi không có trong tài liệu.
5. **Kết quả của tôi**: số lượt, giờ tiết kiệm, đánh giá trung bình, xem lại từng kết quả – "bằng chứng để đưa cho sếp".
6. **Hợp tác**: đặt lịch gọi / yêu cầu quy trình mới / góp ý → thành lead trong admin.

Ràng buộc: song ngữ VI/EN (mặc định theo workspace), mobile-first, nhãn "Chế độ demo" khi chưa nối AI thật, hết credit thì khoá nút chạy với thông điệp rõ ràng.

### 2.2 Founder / kỹ sư – `/admin`
1. **Dashboard**: sandbox, lượt chạy, lead, giờ tiết kiệm, đánh giá TB, chi phí USD, nhà cung cấp AI đang dùng.
2. **Sandbox khách hàng**: tạo từ brief (công ty, ngành, ngôn ngữ, credit, chọn quy trình); mỗi sandbox có tab:
   - *Thông tin*: brief, trạng thái (nháp/đang mở/đã ký/lưu trữ), mã mời, hạn dùng, credit.
   - *Quy trình*: bật/tắt, **sửa prompt và dữ liệu mẫu riêng cho khách** (override, không ảnh hưởng thư viện).
   - *Tài liệu*: dán policy/FAQ để trợ lý đọc.
   - *Xây quy trình riêng*: mô tả nhu cầu → **agent soạn WorkflowDef** → kiểm tra hợp lệ → thêm vào sandbox.
   - *Hoạt động*: lead và từng lượt chạy (input/output/đánh giá/chi phí).
   - Link mời + nút mở sandbox.
3. **Thư viện quy trình**: xem prompt của 11 template.

## 3. Mô hình dữ liệu (shared/types.ts)
- `WorkflowDef` – quy trình là **dữ liệu** (inputs, steps/prompt template, chat system, phút tiết kiệm, icon, song ngữ).
- `Workspace` – sandbox của một khách: token, brief, `workflowIds`, `overrides`, `customWorkflows`, `knowledge`, `credits`, status.
- `Run` – một lượt chạy: inputs, từng bước, output, token, USD ước tính, phút tiết kiệm, rating/feedback, `sessionId` (trình duyệt) và `visitorName`.
- `Lead` – yêu cầu hợp tác từ khách.

## 4. Kiến trúc kỹ thuật
```
browser (React 19, Tailwind 4, react-router 7)
   │  fetch JSON + SSE (text/event-stream)
   ▼
Hono API  ──► runner.ts ──► Provider (mock | anthropic SDK, streaming, fallbacks)
   │
   └──► Store (data/db.json, ghi debounce, atomic rename)
```
- Dev: API gắn vào Vite dev server (một lệnh `npm run dev`). Prod: `npm start` phục vụ `dist/` + API.
- Template engine: `{{input.x}}`, `{{steps.id}}`, `{{knowledge}}`, `{{company}}`, `{{language}}`; validator kiểm tra tham chiếu, mẫu, icon.
- Mock provider: chạy không cần key, stream theo từ, có **tính toán thật** cho hoá đơn (cộng dòng hàng, thuế, so khớp tổng) và bảng số liệu (biên lợi nhuận, tăng trưởng) để demo thuyết phục dù offline.
- Anthropic provider: `claude-opus-5-5` mặc định, effort cấu hình, prompt caching cho system prompt, server-side refusal fallbacks, lỗi được phân loại (auth / rate limit / network).
- Credit: trừ trước khi chạy, hoàn lại nếu provider lỗi; khách rời trang thì run vẫn hoàn tất và được lưu.

## 5. Thư viện quy trình ban đầu (11)
| id | Phòng ban | Vì sao có trong demo |
|---|---|---|
| company-assistant (chat) | Chung | Điểm vào dễ nhất cho người mới |
| customer-reply | CSKH | Nỗi đau phổ biến nhất ở khách FDI/phân phối |
| weekly-report | Vận hành | Quản lý mất nửa ngày mỗi tuần |
| meeting-actions | Vận hành | 2 bước: tóm tắt → email, cho thấy "quy trình" nhiều bước |
| policy-assistant (chat) | Nhân sự | Chứng minh "AI đọc tài liệu của bạn, không bịa" |
| sales-outreach | Kinh doanh | Doanh thu nhìn thấy ngay |
| invoice-extract | Tài chính | Trích xuất + kiểm tra tổng; mock tính thật |
| data-insight | Tài chính | Dán bảng Excel → nhận xét; mock tính thật |
| job-description | Nhân sự | 2 bước: JD → bộ câu hỏi phỏng vấn |
| social-post | Marketing | Song ngữ, 3 biến thể |
| translate-business | Chung | Lợi thế song ngữ của đội |

## 6. Vận hành với Claude Code (.claude/)
- **Rules** (tự nạp): kiến trúc, i18n, cách viết workflow, bảo mật/riêng tư, UX cho người mới, kiểm thử.
- **Skills**: `/new-workflow`, `/new-sandbox` (notes cuộc gọi → sandbox), `/demo-script`, `/tune-prompt`, `/release-check`.
- **Subagents**: `workflow-author`, `prospect-analyst`, `qa-smoke`, `ux-reviewer`, `prompt-tuner`.
- **Hooks**: chặn đọc `.env`/sửa `data/db.json`/force-push main; sau mỗi lần sửa file tự typecheck và validate catalog; trước khi dừng chạy quick check.

## 7. Chưa làm (cố ý) và bước tiếp theo
- **Hạ tầng**: JSON file store đủ cho vài chục sandbox; chuyển SQLite/Postgres khi >1 instance. Chưa có rate limit theo IP; thêm khi public.
- **Kết nối hệ thống thật** (MCP/M365/MISA/Zalo) – là Build project trả phí, ngoài phạm vi sandbox.
- **Upload file** (PDF/Excel): hiện dán văn bản; thêm Files API khi cần.
- **Email thông báo lead** (gửi cho founder) – nên nối Resend/SMTP ngay khi dùng thật.
- **Đa người quản trị / phân quyền** – một ADMIN_TOKEN là đủ cho 3 founder giai đoạn này.
- Thứ tự khuyến nghị: (1) đổi `ADMIN_TOKEN`, bật `AI_PROVIDER=anthropic`, đặt `VITE_BRAND_NAME`; (2) deploy (Railway/Render/VPS, `npm run build && npm start`, mount volume cho `data/`); (3) tạo sandbox cho 5 founding clients bằng `/new-sandbox`.
