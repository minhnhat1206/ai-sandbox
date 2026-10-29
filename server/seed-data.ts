/**
 * Realistic sample data for the demo sandbox. Agents query these tables through
 * the connector tools, so numbers in demos are real computations, not prose.
 * All names and figures are fictional. "Today" in the sample data is 28/10/2026.
 */
import type { DataSource } from '../shared/types.ts';

const customers = `customer_id,name,segment,city,contact,phone,email,credit_limit,account_manager
C001,Siêu thị Minh Phát,Modern trade,Hồ Chí Minh,Anh Tuấn,0903111222,tuan@minhphat.example,500000000,Lan
C002,Tạp hoá Cô Ba,Traditional trade,Hồ Chí Minh,Cô Ba,0908222333,,30000000,Hùng
C003,Chuỗi cửa hàng Hoa Mai,Modern trade,Bình Dương,Chị Mai,0909333444,mai@hoamai.example,350000000,Lan
C004,Đại lý Thành Công,Wholesale,Đồng Nai,Anh Thành,0912444555,thanh@thanhcong.example,800000000,Hùng
C005,Nhà hàng Sen Vàng,Horeca,Hồ Chí Minh,Chị Sen,0913555666,sen@senvang.example,120000000,Minh
C006,Tạp hoá Anh Bảy,Traditional trade,Long An,Anh Bảy,0914666777,,25000000,Hùng
C007,Khách sạn Riverside,Horeca,Hồ Chí Minh,Mr. Tanaka,0915777888,purchasing@riverside.example,400000000,Minh
C008,Siêu thị GreenMart,Modern trade,Hồ Chí Minh,Chị Ngọc,0916888999,ngoc@greenmart.example,600000000,Lan
C009,Đại lý Phú Quý,Wholesale,Tây Ninh,Anh Quý,0917999000,quy@phuquy.example,450000000,Hùng
C010,Cà phê Mộc,Horeca,Hồ Chí Minh,Anh Mộc,0918000111,moc@caphemoc.example,60000000,Minh
C011,Tạp hoá Dì Út,Traditional trade,Hồ Chí Minh,Dì Út,0919111222,,20000000,Hùng
C012,Chuỗi tiện lợi 24h,Modern trade,Hồ Chí Minh,Anh Khoa,0920222333,khoa@24h.example,700000000,Lan`;

const orders = `order_id,order_date,customer_id,customer_name,product,qty,unit_price,amount,status,promised_date,delivered_date,carrier,region
48201,2026-10-01,C001,Siêu thị Minh Phát,Nước mắm Phú Quốc 500ml,1200,32000,38400000,delivered,2026-10-03,2026-10-03,Giao Nhanh,HCM
48202,2026-10-01,C004,Đại lý Thành Công,Dầu ăn 1L,2000,41000,82000000,delivered,2026-10-04,2026-10-04,Xe công ty,Đồng Nai
48203,2026-10-02,C005,Nhà hàng Sen Vàng,Gạo ST25 5kg,150,145000,21750000,delivered,2026-10-03,2026-10-05,Giao Nhanh,HCM
48204,2026-10-03,C008,Siêu thị GreenMart,Mì gói thùng 30,900,98000,88200000,delivered,2026-10-05,2026-10-05,Xe công ty,HCM
48205,2026-10-03,C002,Tạp hoá Cô Ba,Nước ngọt lon thùng 24,60,165000,9900000,delivered,2026-10-04,2026-10-04,Xe máy,HCM
48206,2026-10-06,C003,Chuỗi cửa hàng Hoa Mai,Sữa tươi 1L thùng 12,500,312000,156000000,delivered,2026-10-08,2026-10-09,Xe công ty,Bình Dương
48207,2026-10-06,C007,Khách sạn Riverside,Nước suối 500ml thùng 24,400,89000,35600000,delivered,2026-10-07,2026-10-07,Giao Nhanh,HCM
48208,2026-10-07,C009,Đại lý Phú Quý,Dầu ăn 1L,1500,41000,61500000,delivered,2026-10-10,2026-10-12,Xe công ty,Tây Ninh
48209,2026-10-08,C012,Chuỗi tiện lợi 24h,Nước ngọt lon thùng 24,800,165000,132000000,delivered,2026-10-10,2026-10-10,Xe công ty,HCM
48210,2026-10-09,C010,Cà phê Mộc,Sữa đặc lon thùng 48,40,520000,20800000,delivered,2026-10-10,2026-10-10,Xe máy,HCM
48211,2026-10-13,C001,Siêu thị Minh Phát,Mì gói thùng 30,700,98000,68600000,delivered,2026-10-15,2026-10-15,Xe công ty,HCM
48212,2026-10-14,C006,Tạp hoá Anh Bảy,Nước mắm Phú Quốc 500ml,120,32000,3840000,delivered,2026-10-16,2026-10-18,Xe máy,Long An
48213,2026-10-20,C005,Nhà hàng Sen Vàng,Gạo ST25 5kg,200,145000,29000000,in_transit,2026-10-22,,Giao Nhanh,HCM
48214,2026-10-20,C008,Siêu thị GreenMart,Sữa tươi 1L thùng 12,600,312000,187200000,delivered,2026-10-22,2026-10-22,Xe công ty,HCM
48215,2026-10-21,C004,Đại lý Thành Công,Gạo ST25 5kg,400,145000,58000000,delivered,2026-10-24,2026-10-26,Xe công ty,Đồng Nai
48216,2026-10-22,C003,Chuỗi cửa hàng Hoa Mai,Nước suối 500ml thùng 24,700,89000,62300000,delivered,2026-10-24,2026-10-24,Xe công ty,Bình Dương
48217,2026-10-23,C011,Tạp hoá Dì Út,Mì gói thùng 30,30,98000,2940000,delivered,2026-10-24,2026-10-24,Xe máy,HCM
48218,2026-10-24,C012,Chuỗi tiện lợi 24h,Nước suối 500ml thùng 24,1000,89000,89000000,delivered,2026-10-26,2026-10-27,Xe công ty,HCM
48219,2026-10-25,C007,Khách sạn Riverside,Gạo ST25 5kg,120,145000,17400000,delayed,2026-10-27,,Giao Nhanh,HCM
48220,2026-10-27,C009,Đại lý Phú Quý,Nước ngọt lon thùng 24,900,165000,148500000,processing,2026-10-30,,Xe công ty,Tây Ninh
48221,2026-10-27,C001,Siêu thị Minh Phát,Dầu ăn 1L,1800,41000,73800000,processing,2026-10-30,,Xe công ty,HCM
48222,2026-10-28,C010,Cà phê Mộc,Nước suối 500ml thùng 24,50,89000,4450000,processing,2026-10-29,,Xe máy,HCM`;

const receivables = `invoice_id,customer_id,customer_name,segment,issue_date,due_date,amount,paid,balance,days_overdue,account_manager
INV-2609,C004,Đại lý Thành Công,Wholesale,2026-09-02,2026-10-02,82000000,82000000,0,0,Hùng
INV-2611,C001,Siêu thị Minh Phát,Modern trade,2026-09-05,2026-10-20,38400000,0,38400000,8,Lan
INV-2614,C009,Đại lý Phú Quý,Wholesale,2026-09-08,2026-10-08,61500000,30000000,31500000,20,Hùng
INV-2618,C003,Chuỗi cửa hàng Hoa Mai,Modern trade,2026-09-10,2026-10-25,156000000,0,156000000,3,Lan
INV-2620,C005,Nhà hàng Sen Vàng,Horeca,2026-09-12,2026-09-27,21750000,0,21750000,31,Minh
INV-2623,C008,Siêu thị GreenMart,Modern trade,2026-09-15,2026-10-30,88200000,0,88200000,0,Lan
INV-2625,C007,Khách sạn Riverside,Horeca,2026-09-16,2026-10-01,35600000,0,35600000,27,Minh
INV-2627,C002,Tạp hoá Cô Ba,Traditional trade,2026-09-18,2026-09-25,9900000,5000000,4900000,33,Hùng
INV-2630,C012,Chuỗi tiện lợi 24h,Modern trade,2026-09-20,2026-11-04,132000000,0,132000000,0,Lan
INV-2632,C010,Cà phê Mộc,Horeca,2026-09-22,2026-10-07,20800000,0,20800000,21,Minh
INV-2635,C006,Tạp hoá Anh Bảy,Traditional trade,2026-09-24,2026-10-01,3840000,0,3840000,27,Hùng
INV-2638,C004,Đại lý Thành Công,Wholesale,2026-09-26,2026-10-26,58000000,0,58000000,2,Hùng
INV-2640,C011,Tạp hoá Dì Út,Traditional trade,2026-09-27,2026-10-04,2940000,0,2940000,24,Hùng
INV-2643,C001,Siêu thị Minh Phát,Modern trade,2026-10-01,2026-11-15,68600000,0,68600000,0,Lan
INV-2645,C009,Đại lý Phú Quý,Wholesale,2026-08-10,2026-09-10,45000000,0,45000000,48,Hùng
INV-2648,C005,Nhà hàng Sen Vàng,Horeca,2026-08-15,2026-08-30,18200000,0,18200000,59,Minh`;

const inventory = `sku,product,category,on_hand,reserved,reorder_point,lead_time_days,avg_daily_sales,unit_cost,supplier,last_restock
P001,Nước mắm Phú Quốc 500ml,Gia vị,1850,0,1500,7,110,24000,Công ty Hải Sản Phú Quốc,2026-10-15
P002,Dầu ăn 1L,Dầu ăn,2200,1800,2500,10,310,33000,Dầu thực vật Nam Việt,2026-10-20
P003,Gạo ST25 5kg,Gạo,180,120,400,5,45,118000,Nông sản Sóc Trăng,2026-10-18
P004,Mì gói thùng 30,Thực phẩm khô,2600,0,1200,4,95,82000,Thực phẩm Á Châu,2026-10-22
P005,Nước ngọt lon thùng 24,Đồ uống,950,900,1500,6,160,138000,Đồ uống Sài Gòn,2026-10-12
P006,Sữa tươi 1L thùng 12,Sữa,420,0,600,3,70,270000,Sữa Việt,2026-10-25
P007,Nước suối 500ml thùng 24,Đồ uống,3100,50,1000,3,140,70000,Nước khoáng Vĩnh Hảo,2026-10-26
P008,Sữa đặc lon thùng 48,Sữa,260,0,150,7,12,450000,Sữa Việt,2026-10-05
P009,Bột giặt 3kg,Hoá phẩm,540,0,300,8,22,95000,Hoá phẩm Miền Nam,2026-09-30
P010,Nước rửa chén 800ml,Hoá phẩm,1200,0,500,8,40,21000,Hoá phẩm Miền Nam,2026-10-10`;

const tickets = `ticket_id,created_at,customer_name,channel,category,priority,status,summary,resolution_hours
T-1041,2026-10-20,Nhà hàng Sen Vàng,Zalo,Giao hàng trễ,high,open,Đơn 48213 chưa nhận sau 5 ngày,
T-1040,2026-10-19,Siêu thị Minh Phát,Email,Hoá đơn,normal,resolved,Sai mã số thuế trên hoá đơn INV-2611,6
T-1039,2026-10-18,Tạp hoá Anh Bảy,Điện thoại,Giao hàng trễ,normal,resolved,Đơn 48212 trễ 2 ngày,24
T-1038,2026-10-17,Khách sạn Riverside,Email,Chất lượng,high,resolved,3 thùng nước suối móp,12
T-1037,2026-10-15,Chuỗi cửa hàng Hoa Mai,Email,Giao hàng trễ,normal,resolved,Đơn 48206 trễ 1 ngày,10
T-1036,2026-10-14,Đại lý Phú Quý,Zalo,Giao hàng trễ,high,resolved,Đơn 48208 trễ 2 ngày thiếu xe,30
T-1035,2026-10-13,Cà phê Mộc,Zalo,Đổi trả,low,resolved,Đổi 2 thùng sữa đặc gần hạn,8
T-1034,2026-10-10,Siêu thị GreenMart,Email,Đóng gói,normal,resolved,Thùng carton mỏng bị rách,16
T-1033,2026-10-08,Chuỗi tiện lợi 24h,Email,Hoá đơn,low,resolved,Yêu cầu xuất hoá đơn gộp,4
T-1032,2026-10-06,Tạp hoá Cô Ba,Điện thoại,Công nợ,normal,open,Xin gia hạn thanh toán INV-2627,
T-1031,2026-10-03,Nhà hàng Sen Vàng,Zalo,Giao hàng trễ,normal,resolved,Đơn 48203 trễ 2 ngày,20
T-1030,2026-10-02,Đại lý Thành Công,Email,Chất lượng,high,resolved,Dầu ăn rò rỉ 15 chai,36`;


const aiSurvey = `employee_id,department,role,uses_ai,main_tool,account_type,frequency,data_shared,repetitive_hours_week,trained,top_task
S01,Kinh doanh,Trưởng phòng,yes,ChatGPT,personal,daily,customer_data,6,no,Soạn email báo giá
S02,Kinh doanh,Nhân viên,yes,ChatGPT,personal,daily,customer_data,8,no,Viết tin nhắn Zalo cho khách
S03,Kinh doanh,Nhân viên,yes,Gemini,personal,weekly,none,5,no,Tìm thông tin khách hàng
S04,Kinh doanh,Nhân viên,no,none,none,never,none,7,no,Nhập đơn hàng
S05,Kế toán,Kế toán trưởng,yes,ChatGPT,personal,weekly,financial,10,no,Đối soát công nợ
S06,Kế toán,Nhân viên,yes,ChatGPT,personal,daily,financial,12,no,Nhập hoá đơn
S07,Kế toán,Nhân viên,no,none,none,never,none,9,no,Đối chiếu sao kê
S08,CSKH,Trưởng nhóm,yes,ChatGPT,company,daily,customer_data,6,yes,Trả lời khiếu nại
S09,CSKH,Nhân viên,yes,ChatGPT,personal,daily,customer_data,10,no,Trả lời Zalo
S10,CSKH,Nhân viên,yes,Copilot,company,weekly,none,9,yes,Tổng hợp ticket
S11,CSKH,Nhân viên,no,none,none,never,none,8,no,Gọi xác nhận đơn
S12,Kho vận,Quản lý kho,yes,Gemini,personal,rarely,internal_docs,6,no,Báo cáo tồn kho
S13,Kho vận,Nhân viên,no,none,none,never,none,5,no,Lập phiếu xuất kho
S14,Kho vận,Điều phối,yes,ChatGPT,personal,weekly,internal_docs,7,no,Xếp lịch xe
S15,Nhân sự,Trưởng phòng,yes,ChatGPT,personal,weekly,employee_data,6,no,Soạn JD và hợp đồng
S16,Nhân sự,Nhân viên,yes,ChatGPT,personal,daily,employee_data,8,no,Trả lời câu hỏi nội quy
S17,Mua hàng,Trưởng phòng,yes,Copilot,company,weekly,financial,5,yes,So sánh báo giá
S18,Mua hàng,Nhân viên,no,none,none,never,none,7,no,Theo dõi đơn đặt hàng
S19,Ban giám đốc,Giám đốc,yes,ChatGPT,personal,weekly,financial,4,no,Đọc báo cáo
S20,Ban giám đốc,Phó giám đốc,yes,Copilot,company,daily,internal_docs,3,yes,Chuẩn bị họp
S21,Marketing,Nhân viên,yes,ChatGPT,personal,daily,none,6,no,Viết bài Facebook
S22,Marketing,Nhân viên,yes,Canva AI,personal,daily,none,5,no,Thiết kế banner
S23,Kinh doanh,Nhân viên,yes,ChatGPT,personal,daily,customer_data,7,no,Tổng hợp doanh số
S24,Kế toán,Nhân viên,yes,Gemini,personal,rarely,financial,6,no,Viết email nhắc nợ`;

const priceList = `sku,product,unit,list_price,modern_trade,wholesale,horeca,traditional_trade,min_qty
P001,Nước mắm Phú Quốc 500ml,chai,36000,32000,31000,33500,34500,24
P002,Dầu ăn 1L,chai,46000,41000,39500,43000,44000,12
P003,Gạo ST25 5kg,bao,160000,145000,139000,148000,152000,10
P004,Mì gói thùng 30,thùng,108000,98000,94000,101000,104000,5
P005,Nước ngọt lon thùng 24,thùng,182000,165000,158000,170000,175000,5
P006,Sữa tươi 1L thùng 12,thùng,345000,312000,300000,320000,330000,5
P007,Nước suối 500ml thùng 24,thùng,98000,89000,85000,91000,94000,10
P008,Sữa đặc lon thùng 48,thùng,575000,520000,500000,530000,550000,2
P009,Bột giặt 3kg,túi,118000,106000,101000,110000,113000,6
P010,Nước rửa chén 800ml,chai,27000,24000,23000,25000,26000,12`;

const deals = `deal_id,customer,segment,stage,value,probability,owner,created_date,last_activity,next_step,expected_close
D-201,Siêu thị GreenMart,Modern trade,negotiation,420000000,70,Lan,2026-08-20,2026-10-24,Gửi báo giá Tết lần 2,2026-11-10
D-202,Chuỗi tiện lợi 24h,Modern trade,proposal,650000000,50,Lan,2026-09-02,2026-10-05,Chờ phản hồi đề xuất mở rộng 20 cửa hàng,2026-10-31
D-203,Khách sạn Majestic Bến Thành,Horeca,qualified,180000000,30,Minh,2026-09-15,2026-10-01,Hẹn demo sản phẩm,2026-11-20
D-204,Bếp ăn công nghiệp Tân Thuận,Horeca,proposal,360000000,50,Minh,2026-09-10,2026-10-22,Đàm phán giá gạo ST25,2026-11-15
D-205,Đại lý Hoàng Long,Wholesale,lead,250000000,10,Hùng,2026-10-10,2026-10-12,Gọi giới thiệu,2026-12-15
D-206,Đại lý Thành Công,Wholesale,negotiation,300000000,70,Hùng,2026-08-01,2026-09-28,Chờ duyệt chiết khấu 6%,2026-10-15
D-207,Chuỗi cà phê Hạt Nâu,Horeca,qualified,120000000,30,Minh,2026-09-25,2026-10-26,Gửi mẫu sữa đặc,2026-11-30
D-208,Siêu thị Minh Phát,Modern trade,won,280000000,100,Lan,2026-07-15,2026-10-02,Đã ký hợp đồng,2026-10-02
D-209,Trường quốc tế Sài Gòn Xanh,Horeca,proposal,200000000,50,Minh,2026-09-18,2026-09-30,Chờ kết quả đấu thầu,2026-10-25
D-210,Hệ thống Bách hoá Phố,Modern trade,lead,500000000,10,Lan,2026-10-20,2026-10-27,Gửi hồ sơ năng lực,2027-01-15
D-211,Đại lý Phú Quý,Wholesale,negotiation,220000000,70,Hùng,2026-09-05,2026-10-03,Chờ thanh toán công nợ cũ trước khi ký,2026-11-05
D-212,Nhà hàng Sen Vàng,Horeca,lost,90000000,0,Minh,2026-08-10,2026-09-20,Mất vào đối thủ giá thấp hơn,2026-09-20
D-213,Công ty suất ăn Phương Nam,Horeca,qualified,340000000,30,Hùng,2026-10-05,2026-10-25,Khảo sát bếp,2026-12-10
D-214,Chuỗi cửa hàng Hoa Mai,Modern trade,proposal,260000000,50,Lan,2026-09-28,2026-10-20,Trình bày chương trình Tết,2026-11-25`;

const bank = `txn_id,date,description,amount,direction
BT01,2026-10-21,CK THANH TOAN INV-2611 SIEU THI MINH PHAT,38400000,credit
BT02,2026-10-22,NHA HANG SEN VANG TT HOA DON THANG 9,21750000,credit
BT03,2026-10-23,DAI LY PHU QUY CK,20000000,credit
BT04,2026-10-24,KS RIVERSIDE PAYMENT INV2625,35600000,credit
BT05,2026-10-24,CK TU TK 0123456789 NGUYEN VAN A,5000000,credit
BT06,2026-10-25,CA PHE MOC TT INV-2632,20800000,credit
BT07,2026-10-26,CA PHE MOC TT INV-2632,20800000,credit
BT08,2026-10-26,TAP HOA CO BA THANH TOAN,4900000,credit
BT09,2026-10-26,PHI QUAN LY TAI KHOAN THANG 10,22000,debit
BT10,2026-10-27,TT NCC DAU THUC VAT NAM VIET PO-1189,150000000,debit
BT11,2026-10-27,CHUOI TIEN LOI 24H CK TRUOC INV-2630,50000000,credit
BT12,2026-10-28,LAI TIEN GUI KY HAN,185000,credit`;

const expenses = `claim_id,employee,department,expense_date,submitted_date,category,amount,nights,pax,has_invoice,description
E-01,Trần Hùng,Kinh doanh,2026-10-05,2026-10-07,taxi,185000,,,yes,Taxi đi gặp Đại lý Thành Công
E-02,Trần Hùng,Kinh doanh,2026-10-05,2026-10-07,taxi,420000,,,no,Taxi Biên Hoà về TP.HCM
E-03,Lê Lan,Kinh doanh,2026-10-08,2026-10-09,meal,2400000,,4,yes,Tiếp khách Siêu thị GreenMart
E-04,Nguyễn Minh,Kinh doanh,2026-10-12,2026-10-14,hotel,1500000,2,,yes,Khách sạn Tây Ninh 2 đêm
E-05,Nguyễn Minh,Kinh doanh,2026-10-12,2026-10-14,per_diem,800000,2,,no,Công tác phí Tây Ninh 2 ngày
E-06,Phạm Thu,Kế toán,2026-09-10,2026-10-20,taxi,150000,,,yes,Taxi đi ngân hàng
E-07,Võ Tâm,Kho vận,2026-10-15,2026-10-16,other,350000,,,no,Mua dây đai pallet
E-08,Lê Lan,Kinh doanh,2026-10-18,2026-10-19,hotel,2100000,2,,yes,Khách sạn Đà Lạt hội nghị khách hàng
E-09,Trần Hùng,Kinh doanh,2026-10-20,2026-10-21,taxi,210000,,,yes,Taxi đi Đại lý Phú Quý
E-10,Trần Hùng,Kinh doanh,2026-10-20,2026-10-21,taxi,210000,,,yes,Taxi đi Đại lý Phú Quý
E-11,Đỗ Nga,Nhân sự,2026-10-22,2026-10-23,meal,900000,,3,yes,Ăn trưa cùng ứng viên vòng cuối
E-12,Nguyễn Minh,Kinh doanh,2026-10-24,2026-10-25,per_diem,150000,1,,no,Công tác phí nội thành
E-13,Võ Tâm,Kho vận,2026-10-25,2026-10-26,taxi,95000,,,yes,Taxi chở mẫu hàng
E-14,Phạm Thu,Kế toán,2026-10-26,2026-10-27,other,1800000,,,no,Gia hạn phần mềm kế toán`;

const reviews = `review_id,date,source,customer,rating,product,order_id,text
R01,2026-10-03,Google,Nhà hàng Sen Vàng,2,Gạo ST25 5kg,48203,Giao trễ 2 ngày phải mua gạo ngoài cho kịp tiệc.
R02,2026-10-05,Zalo,Siêu thị GreenMart,4,Mì gói thùng 30,48204,Giao đúng hẹn nhân viên thân thiện. Thùng carton hơi mỏng.
R03,2026-10-07,Facebook,Khách sạn Riverside,3,Nước suối 500ml thùng 24,48207,3 thùng bị móp đổi hàng nhanh nhưng mất công kiểm.
R04,2026-10-09,Google,Đại lý Phú Quý,2,Dầu ăn 1L,48208,Trễ 2 ngày vì thiếu xe gọi hotline không ai nghe.
R05,2026-10-10,Zalo,Chuỗi tiện lợi 24h,5,Nước ngọt lon thùng 24,48209,Giao chuẩn hoá đơn điện tử gửi ngay. Rất hài lòng.
R06,2026-10-11,Google,Cà phê Mộc,4,Sữa đặc lon thùng 48,48210,Giá tốt hơn nhà cung cấp cũ mong có chiết khấu theo tháng.
R07,2026-10-14,Shopee,Khách lẻ,1,Nước mắm Phú Quốc 500ml,,Chai bị rò rỉ hộp đóng gói sơ sài.
R08,2026-10-16,Google,Siêu thị Minh Phát,5,Mì gói thùng 30,48211,Nhân viên kinh doanh hỗ trợ nhiệt tình.
R09,2026-10-18,Zalo,Tạp hoá Anh Bảy,2,Nước mắm Phú Quốc 500ml,48212,Giao trễ xe máy giao hàng không gọi trước.
R10,2026-10-20,Facebook,Khách lẻ,3,Gạo ST25 5kg,,Gạo ngon nhưng giá cao hơn chợ.
R11,2026-10-22,Google,Siêu thị GreenMart,5,Sữa tươi 1L thùng 12,48214,Giao sớm hơn hẹn đóng gói chắc chắn.
R12,2026-10-23,Shopee,Khách lẻ,2,Mì gói thùng 30,,Thùng rách thiếu 2 gói.
R13,2026-10-24,Zalo,Chuỗi cửa hàng Hoa Mai,4,Nước suối 500ml thùng 24,48216,Ổn nhưng hoá đơn gửi chậm 3 ngày.
R14,2026-10-26,Google,Đại lý Thành Công,3,Gạo ST25 5kg,48215,Trễ 2 ngày giá cạnh tranh.
R15,2026-10-27,Facebook,Chuỗi tiện lợi 24h,3,Nước suối 500ml thùng 24,48218,Trễ 1 ngày làm trống kệ cuối tuần.
R16,2026-10-28,Zalo,Nhà hàng Sen Vàng,1,Gạo ST25 5kg,48213,Đơn 48213 trễ gần 1 tuần không ai báo sẽ cân nhắc đổi nhà cung cấp.`;

export function demoDataSources(ts: string): DataSource[] {
  return [
    { id: 'ds_customers', name: 'customers', description: 'Danh sách khách hàng B2B: phân khúc, thành phố, liên hệ, hạn mức tín dụng, người phụ trách', csv: customers, updatedAt: ts },
    { id: 'ds_orders', name: 'orders', description: 'Đơn hàng tháng 10/2026: sản phẩm, số lượng, tiền, trạng thái, ngày hẹn/ngày giao, đơn vị vận chuyển', csv: orders, updatedAt: ts },
    { id: 'ds_receivables', name: 'receivables', description: 'Công nợ phải thu: hoá đơn, hạn thanh toán, số dư, số ngày quá hạn (tính đến 28/10/2026)', csv: receivables, updatedAt: ts },
    { id: 'ds_inventory', name: 'inventory', description: 'Tồn kho theo SKU: tồn thực tế, đã giữ, điểm đặt hàng lại, lead time, bán trung bình/ngày, nhà cung cấp', csv: inventory, updatedAt: ts },
    { id: 'ds_tickets', name: 'tickets', description: 'Ticket chăm sóc khách hàng tháng 10: kênh, loại, mức ưu tiên, trạng thái, giờ xử lý', csv: tickets, updatedAt: ts },
    { id: 'ds_price_list', name: 'price_list', description: 'Bảng giá 2026 theo phân khúc (chưa VAT), đơn vị tính, số lượng tối thiểu', csv: priceList, updatedAt: ts },
    { id: 'ds_deals', name: 'deals', description: 'Pipeline bán hàng: giai đoạn, giá trị, xác suất, người phụ trách, hoạt động gần nhất, bước tiếp theo', csv: deals, updatedAt: ts },
    { id: 'ds_bank', name: 'bank_transactions', description: 'Sao kê ngân hàng 21–28/10/2026 (tiền vào/ra, nội dung chuyển khoản)', csv: bank, updatedAt: ts },
    { id: 'ds_expenses', name: 'expenses', description: 'Đề nghị thanh toán chi phí tháng 10 (taxi, khách sạn, tiếp khách, công tác phí)', csv: expenses, updatedAt: ts },
    { id: 'ds_reviews', name: 'reviews', description: 'Đánh giá khách hàng tháng 10 từ Google, Zalo, Facebook, Shopee', csv: reviews, updatedAt: ts },
    { id: 'ds_ai_survey', name: 'ai_survey', description: 'Khảo sát sử dụng AI nội bộ (24 nhân viên): công cụ, loại tài khoản, dữ liệu đã đưa vào AI, số giờ việc lặp lại/tuần, đã được đào tạo chưa', csv: aiSurvey, updatedAt: ts },
  ];
}
