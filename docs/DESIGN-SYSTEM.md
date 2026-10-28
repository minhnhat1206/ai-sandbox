# Lumen – hệ thống thiết kế của AI Sandbox

Mọi màn hình, icon và minh hoạ trong sản phẩm được vẽ riêng theo hệ này. Tài liệu
mô tả quyết định thiết kế, nguồn tham khảo mã nguồn mở đã áp dụng, và quy tắc để
người sau (hoặc Claude Code) mở rộng mà không làm vỡ tổng thể.

## 1. Ý tưởng dẫn dắt
Người dùng là nhân viên văn phòng Việt Nam lần đầu dùng AI, đang hồi hộp. Giao diện
phải **điềm tĩnh, ấm và đáng tin**: nền giấy ấm, một màu ngọc bích làm điểm tựa,
một tia vàng cho khoảnh khắc "à, hiểu rồi". Không neon, không gradient cầu vồng,
không biệt ngữ kỹ thuật ở phía khách.

Ẩn dụ thương hiệu: **cánh buồm** (chúng tôi đưa đội bạn đi) đồng thời là **đường
cong đi lên** (kết quả đo được), cộng **tia vàng** (khoảnh khắc sáng ra). Logo mark
`src/components/Logo.tsx`.

## 2. Nguồn mở đã tham khảo và cách áp dụng
| Nguồn | Giấy phép | Áp dụng |
|---|---|---|
| [Radix Colors](https://www.radix-ui.com/colors) – phương pháp thang 12 bậc | MIT | Hai thang `jade` và `sand` 12 bậc: 1–2 nền, 3–5 nền thành phần, 6–8 viền, 9–10 nền đặc, 11 chữ phụ, 12 chữ chính. Token trong `src/index.css` |
| [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) | SIL OFL | Font chữ chính, thiết kế cho dấu tiếng Việt, 400–800 |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | SIL OFL | Mã mời, id quy trình, số liệu dạng bảng (`tnum`) |
| [Tailwind CSS v4](https://tailwindcss.com) `@theme` | MIT | Token CSS → utility; không dùng plugin ngoài |
| [shadcn/ui](https://ui.shadcn.com) – cấu trúc thành phần | MIT | Anatomy của Button/Card/Dialog/Tabs/Toast; viết lại bằng Tailwind thuần trong `src/components/ui.tsx` |
| [Lucide](https://lucide.dev) & [Phosphor](https://phosphoricons.com) – quy ước lưới icon | ISC / MIT | Lưới 24px, lề 2px, nét 1.75px bo tròn, góc bo 1.5–2.5px. **Mọi icon được vẽ lại** trong `src/icons/index.tsx`, không dùng thư viện |
| Dataviz skill (Anthropic) – mark specs | – | Cột ≤ 24px, đầu bo 4px, khe 2px, lưới hairline, chữ dùng token chữ, tooltip hover, bảng ẩn cho trình đọc màn hình (`src/components/charts.tsx`) |

## 3. Token
```
jade  1 #f8fcfb … 9 #137a62 (solid) … 11 #0c5a49 (text) … 12 #0b2f27 (headline)
sand  1 #fcfbf8 … 2 #f7f5f0 (nền app) … 4 #e7e3da (viền) … 9 #7a7262 (muted) … 12 #1b1814
amber 3 #fbefd8 · 6 #f1cf86 · 9 #d98a1e · 11 #8a5a0e     (đánh giá, nhấn, demo)
coral 3 #fde6e1 · 9 #d9533b · 11 #9a3220                 (lỗi, xoá)
sky   3 #e3f0fb · 9 #2f7fc1 · 11 #1f5a8a                 (thông tin)
ink   900 #0e1c19 · 800 #132822 · 700 #1b3630            (bề mặt tối: hero, sidebar, CTA)
```
- Bóng: `--shadow-card` (nghỉ), `--shadow-lift` (hover/modal), `--shadow-glow` (nhấn jade).
- Bo góc: 12px thành phần, 20px thẻ (`rounded-xl2`), 28px khối lớn (`rounded-xl3`).
- Đường cong: `--ease-out-expo` cho xuất hiện, `--ease-spring` cho pop.

## 4. Chữ
- Tiêu đề: Be Vietnam Pro 700–800, `letter-spacing -0.025em`, `line-height 1.02` (`.display`).
- Nhãn nhỏ: `.eyebrow` 11px, in hoa, tracking 0.14em, màu jade-11.
- Thân: 14–15px, line-height 1.65. Số liệu: `tnum`.
- Kết quả AI: `.prose-sandbox` – h2 có chấm jade, bullet hình thoi, số thứ tự trong ô, bảng bo góc kẻ hairline, code block nền ink.

## 5. Bề mặt đặc trưng
- **Grain**: nhiễu SVG `feTurbulence` phủ 14% trên nền tối (`.grain`), không dùng ảnh.
- **Dotfield**: lưới chấm 18px (`.dotfield`, `.dotfield-dark`) sau hero, khung chat, welcome.
- **Hairline**: viền 1px bằng `box-shadow: inset` để không cộng vào kích thước (`.hairline`).
- **Paper**: khung kết quả có gradient giấy nhẹ (`.paper`).
- **Caret**: dấu nháy jade nhấp nháy khi đang stream (`.caret`).

## 6. Bộ icon Lumen (`src/icons/index.tsx`)
- Lưới 24, nét 1.75, `stroke-linecap/linejoin: round`.
- **UI icon**: chỉ nét. **Workflow icon**: duotone = lớp fill `currentColor` ở 16% + nét; đủ "trọng lượng" trong thẻ mà không nặng.
- Tên workflow icon trùng whitelist `shared/icons.ts` (validator chặn tên lạ). Thêm icon mới: vẽ path → thêm vào `ICONS` → thêm tên vào whitelist.
- Icon được dùng qua `<Icon name="…" size={…} />`; `IconTile` bọc icon trong ô jade gradient cho thẻ.

## 7. Minh hoạ (`src/components/illustrations.tsx`)
- `HeroPreview`: cửa sổ sandbox thu nhỏ (form trái, kết quả phải, dấu nháy stream, huy hiệu sao) có hoạt ảnh SMIL nhẹ.
- `StepArt 1–3`: trò chuyện → xây (đũa phép + tia) → đội dùng thử (người + dấu tick vàng).
- `EmptyArt`, `WaitingArt`: trạng thái trống/đợi kết quả.
- `Ring`: vòng tiến độ credit.

## 8. Chuyển động
- Xuất hiện: `animate-rise` 0.5s + `delay-1…6` xếp tầng; `animate-pop` cho modal/toast.
- Thẻ: `hover-lift` nâng 3px + bóng lift; nút: `press` thu 1.5% khi nhấn.
- Tôn trọng `prefers-reduced-motion`.

## 9. Thành phần (`src/components/ui.tsx`)
Button (primary gradient jade, secondary, soft, ghost, danger, dark; `icon`, `loading`),
Card, Badge (chấm trạng thái), Input/Textarea/Select (ring jade 3px), Field,
Alert (có icon), Modal (blur + pop), Tabs (pill), Stat (tile KPI), Stars (icon vẽ riêng,
hover preview), Toast (`useToast`), SectionHead, IconTile, Skeleton, EmptyState.

## 10. Nguyên tắc khi thêm màn hình
1. Bắt đầu từ `SectionHead` + một khối "hero" tối nếu màn hình có một con số dẫn dắt.
2. Chỉ một màu nhấn (jade); vàng chỉ cho đánh giá/nhãn demo/tia sáng; coral chỉ cho lỗi.
3. Mọi chuỗi qua `dict.ts` (VI + EN). Icon qua `Icon`, không SVG rời rạc trong trang.
4. Sau khi sửa UI: `npm run smoke` và xem ảnh trong `e2e/screenshots/`.
