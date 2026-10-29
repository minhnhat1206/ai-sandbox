/**
 * Realistic sample data for the demo sandbox. Agents query these tables through
 * the connector tools, so numbers in demos are real computations, not prose.
 * All names and figures are fictional.
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

export function demoDataSources(ts: string): DataSource[] {
  return [
    { id: 'ds_customers', name: 'customers', description: 'Danh sách khách hàng B2B: phân khúc, thành phố, liên hệ, hạn mức tín dụng, người phụ trách', csv: customers, updatedAt: ts },
    { id: 'ds_orders', name: 'orders', description: 'Đơn hàng tháng 10/2026: sản phẩm, số lượng, tiền, trạng thái, ngày hẹn/ngày giao, đơn vị vận chuyển', csv: orders, updatedAt: ts },
    { id: 'ds_receivables', name: 'receivables', description: 'Công nợ phải thu: hoá đơn, hạn thanh toán, số dư, số ngày quá hạn (tính đến 28/10/2026)', csv: receivables, updatedAt: ts },
    { id: 'ds_inventory', name: 'inventory', description: 'Tồn kho theo SKU: tồn thực tế, đã giữ, điểm đặt hàng lại, lead time, bán trung bình/ngày, nhà cung cấp', csv: inventory, updatedAt: ts },
    { id: 'ds_tickets', name: 'tickets', description: 'Ticket chăm sóc khách hàng tháng 10: kênh, loại, mức ưu tiên, trạng thái, giờ xử lý', csv: tickets, updatedAt: ts },
  ];
}
