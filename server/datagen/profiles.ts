/**
 * Industry presets for the synthetic-data studio. Used directly in demo mode and as the
 * starting point (or fallback) when Claude proposes a custom profile. All names are fictional.
 */
import type { IndustryProfile } from '../../shared/types.ts';

type C = [name: string, segment: number, city: string, contact: string];
type P = [name: string, category: string, unit: string, price: number, supplier: string];

const DEPTS = ['Kinh doanh', 'Kế toán', 'CSKH', 'Kho vận', 'Nhân sự', 'Mua hàng', 'Ban giám đốc', 'Marketing'];

function build(key: string, label: string, keywords: string[], segments: string[], customers: C[], products: P[], carriers: string[], prospects: [string, number][], qtyRange: [number, number], departments = DEPTS) {
  const profile: IndustryProfile = {
    key, label, segments,
    customers: customers.map(([name, seg, city, contact]) => ({ name, segment: segments[seg], city, contact })),
    products: products.map(([name, category, unit, price, supplier]) => ({ name, category, unit, price, supplier })),
    carriers, prospects: prospects.map(([name, seg]) => ({ name, segment: segments[seg] })), qtyRange, departments,
  };
  return { profile, keywords };
}

export const PRESETS = [
  build('fmcg', 'Phân phối hàng tiêu dùng nhanh', ['phan phoi', 'fmcg', 'tieu dung', 'thuc pham', 'do uong', 'tap hoa', 'sieu thi', 'distribution', 'grocery', 'beverage', 'food'],
    ['Modern trade', 'Wholesale', 'Horeca', 'Traditional trade'],
    [['Siêu thị Phước Lộc', 0, 'Hồ Chí Minh', 'Anh Tài'], ['Tạp hoá Cô Tư', 3, 'Hồ Chí Minh', 'Cô Tư'], ['Chuỗi cửa hàng An Hoà', 0, 'Bình Dương', 'Chị Hạnh'], ['Đại lý Hưng Thịnh', 1, 'Đồng Nai', 'Anh Thịnh'],
     ['Nhà hàng Hương Quê', 2, 'Hồ Chí Minh', 'Chị Hương'], ['Tạp hoá Anh Sáu', 3, 'Long An', 'Anh Sáu'], ['Khách sạn Lotus Garden', 2, 'Hồ Chí Minh', 'Ms. Linh'], ['Siêu thị Xanh Việt', 0, 'Hồ Chí Minh', 'Chị Thảo'],
     ['Đại lý Tân Phát', 1, 'Tây Ninh', 'Anh Phát'], ['Cà phê Phố Cũ', 2, 'Hồ Chí Minh', 'Anh Nam'], ['Tạp hoá Bà Năm', 3, 'Hồ Chí Minh', 'Bà Năm'], ['Chuỗi tiện lợi 365', 0, 'Hồ Chí Minh', 'Anh Khôi']],
    [['Nước mắm cá cơm 500ml', 'Gia vị', 'chai', 38000, 'Hải sản Phan Thiết'], ['Dầu ăn đậu nành 1L', 'Dầu ăn', 'chai', 48000, 'Dầu thực vật Phương Nam'], ['Gạo thơm Jasmine 5kg', 'Gạo', 'bao', 155000, 'Nông sản Cửu Long'],
     ['Mì ly thùng 24', 'Thực phẩm khô', 'thùng', 168000, 'Thực phẩm Sài Gòn'], ['Trà xanh chai thùng 24', 'Đồ uống', 'thùng', 192000, 'Đồ uống Miền Nam'], ['Sữa tươi 180ml thùng 48', 'Sữa', 'thùng', 336000, 'Sữa Đồng Xanh'],
     ['Nước khoáng 500ml thùng 24', 'Đồ uống', 'thùng', 96000, 'Nước khoáng Suối Tiên'], ['Cà phê hoà tan hộp 20 gói', 'Đồ uống', 'hộp', 62000, 'Cà phê Cao Nguyên'], ['Nước giặt 3,5kg', 'Hoá phẩm', 'túi', 145000, 'Hoá phẩm Ánh Dương'], ['Khăn giấy hộp 180 tờ', 'Hoá phẩm', 'hộp', 28000, 'Giấy Sài Gòn']],
    ['Xe công ty', 'Giao Nhanh Express', 'Xe máy'], [['Đại siêu thị Phú Mỹ Xanh', 0], ['Bếp ăn công nghiệp Linh Trung', 2], ['Đại lý Kim Ngân', 1], ['Chuỗi cà phê Hạt Mộc', 2]], [30, 1500]),

  build('packaging', 'Sản xuất bao bì nhựa và giấy', ['bao bi', 'nhua', 'giay', 'in an', 'carton', 'packaging', 'plastic', 'printing', 'mang pe'],
    ['FDI', 'Doanh nghiệp nội', 'Đại lý', 'Xuất khẩu'],
    [['Công ty TNHH Điện tử Sunwah Việt Nam', 0, 'Bắc Ninh', 'Ms. Park'], ['Công ty CP Thực phẩm Hoàng Gia', 1, 'Hồ Chí Minh', 'Chị Yến'], ['Đại lý Bao bì Minh Khang', 2, 'Bình Dương', 'Anh Khang'],
     ['Công ty TNHH Giày Đông Á', 0, 'Đồng Nai', 'Mr. Chen'], ['Công ty CP Nông sản Tây Nguyên', 1, 'Đắk Lắk', 'Anh Đức'], ['Đại lý Bao bì Phú An', 2, 'Long An', 'Chị An'], ['Green Pack Pty Ltd', 3, 'Sydney', 'Mr. Wilson'],
     ['Công ty TNHH Mỹ phẩm Hana', 1, 'Hồ Chí Minh', 'Chị Ngân'], ['Công ty TNHH Linh kiện Kyoei', 0, 'Bình Dương', 'Mr. Sato'], ['Đại lý Thành Đạt', 2, 'Cần Thơ', 'Anh Đạt'], ['Pacific Trading Co.', 3, 'Osaka', 'Mr. Tanaka'], ['Công ty CP Dược Bình Tâm', 1, 'Hồ Chí Minh', 'Chị Tâm']],
    [['Màng PE quấn pallet 50cm', 'Màng PE', 'cuộn', 185000, 'Hạt nhựa Long Thành'], ['Túi zipper in 2 màu 20x30', 'Túi nhựa', 'kg', 92000, 'Hạt nhựa Long Thành'], ['Thùng carton 5 lớp 60x40x40', 'Carton', 'cái', 21000, 'Giấy Tân Mai'],
     ['Thùng carton 3 lớp 40x30x30', 'Carton', 'cái', 9500, 'Giấy Tân Mai'], ['Túi PP dệt 50kg', 'Bao PP', 'cái', 7800, 'Sợi PP Việt Phát'], ['Băng keo trong 48mm', 'Phụ kiện', 'cuộn', 14000, 'Keo dán Á Châu'],
     ['Hộp giấy kraft in logo', 'Hộp giấy', 'cái', 6500, 'Giấy Tân Mai'], ['Màng co POF 30cm', 'Màng co', 'cuộn', 420000, 'Hạt nhựa Long Thành'], ['Pallet nhựa 1200x1000', 'Pallet', 'cái', 690000, 'Nhựa kỹ thuật Bình Dương'], ['Túi nilon HD đựng hàng', 'Túi nhựa', 'kg', 48000, 'Sợi PP Việt Phát']],
    ['Xe tải công ty', 'Vận tải Hưng Long', 'Container'], [['Công ty TNHH May mặc Hàn Việt', 0], ['Chuỗi cửa hàng Bách Hoá Phố', 1], ['Nordic Packaging AB', 3], ['Đại lý Bao bì Tiến Phát', 2]], [200, 6000],
    ['Kinh doanh', 'Kế toán', 'Sản xuất', 'Kho vận', 'Nhân sự', 'Mua hàng', 'Ban giám đốc', 'QA/QC']),

  build('building', 'Phân phối vật liệu xây dựng', ['vat lieu', 'xay dung', 'thep', 'xi mang', 'gach', 'son', 'construction', 'steel', 'cement', 'tile', 'noi that'],
    ['Nhà thầu', 'Đại lý', 'Chủ đầu tư', 'Khách lẻ'],
    [['Công ty CP Xây dựng Thái Hoà', 0, 'Hồ Chí Minh', 'Anh Bình'], ['Cửa hàng VLXD Tư Lộc', 1, 'Bình Dương', 'Anh Lộc'], ['Công ty Địa ốc Sông Xanh', 2, 'Hồ Chí Minh', 'Chị Vy'], ['Nhà thầu Phúc Thành', 0, 'Đồng Nai', 'Anh Thành'],
     ['Cửa hàng VLXD Ba Hùng', 1, 'Long An', 'Anh Hùng'], ['Anh Trọng (nhà phố Gò Vấp)', 3, 'Hồ Chí Minh', 'Anh Trọng'], ['Công ty CP Đầu tư Kim Sơn', 2, 'Bà Rịa - Vũng Tàu', 'Chị Mai'], ['Công ty TNHH Xây lắp Đông Á', 0, 'Hồ Chí Minh', 'Anh Toàn'],
     ['Đại lý Vật tư Hải Đăng', 1, 'Tây Ninh', 'Chị Đăng'], ['Chị Liên (sửa nhà Thủ Đức)', 3, 'Hồ Chí Minh', 'Chị Liên'], ['Nhà thầu Minh Phú', 0, 'Bình Dương', 'Anh Phú'], ['Cửa hàng VLXD Tám Lợi', 1, 'Cần Thơ', 'Anh Lợi']],
    [['Xi măng PCB40 bao 50kg', 'Xi măng', 'bao', 92000, 'Xi măng Kiên Lương'], ['Thép cuộn D8', 'Thép', 'kg', 16800, 'Thép Phương Nam'], ['Thép thanh D16 cây 11,7m', 'Thép', 'cây', 268000, 'Thép Phương Nam'],
     ['Gạch ống 8x8x18', 'Gạch', 'viên', 1350, 'Gạch Tuynel Bình Dương'], ['Gạch ốp lát 60x60 men bóng', 'Gạch ốp lát', 'm2', 185000, 'Gốm sứ Tâm Phát'], ['Sơn nước ngoại thất 18L', 'Sơn', 'thùng', 1650000, 'Sơn Á Đông'],
     ['Cát xây tô', 'Cát đá', 'm3', 420000, 'Vật liệu Sông Bé'], ['Đá 1x2', 'Cát đá', 'm3', 380000, 'Vật liệu Sông Bé'], ['Ống nhựa PVC D90', 'Ống nước', 'cây', 145000, 'Nhựa Phú Lâm'], ['Tôn lạnh 0,45mm', 'Tôn', 'm2', 98000, 'Tôn Sen Vàng']],
    ['Xe ben công ty', 'Xe cẩu thuê ngoài', 'Khách tự lấy'], [['Công ty CP Địa ốc Thiên Phúc', 2], ['Nhà thầu Cơ điện Nam Long', 0], ['Đại lý VLXD Hoàng Kim', 1], ['Ban QLDA Trường học Tân Kiên', 2]], [20, 2000]),

  build('fnb', 'Chuỗi nhà hàng và suất ăn', ['nha hang', 'ca phe', 'f b', 'fnb', 'am thuc', 'suat an', 'restaurant', 'cafe', 'coffee', 'bakery', 'catering', 'banh'],
    ['Doanh nghiệp', 'Trường học', 'Sự kiện', 'Đối tác giao hàng'],
    [['Công ty TNHH Điện tử Hanviet', 0, 'Hồ Chí Minh', 'Chị Hoa'], ['Trường Tiểu học Ánh Dương', 1, 'Hồ Chí Minh', 'Cô Thu'], ['Công ty Sự kiện Ngôi Sao', 2, 'Hồ Chí Minh', 'Anh Quang'], ['Nền tảng Giao Đồ Ăn Nhanh', 3, 'Hồ Chí Minh', 'Chị Ly'],
     ['Công ty CP Phần mềm Sóng Việt', 0, 'Hồ Chí Minh', 'Anh Vinh'], ['Trường Mầm non Hoa Sen', 1, 'Bình Dương', 'Cô Lan'], ['Wedding Center Bạch Kim', 2, 'Hồ Chí Minh', 'Anh Kim'], ['Công ty TNHH Logistics Cảng Xanh', 0, 'Hồ Chí Minh', 'Chị Trinh'],
     ['Ứng dụng Bếp Nhà', 3, 'Hồ Chí Minh', 'Anh Duy'], ['Trường THCS Bình Trị', 1, 'Hồ Chí Minh', 'Thầy Lợi'], ['Công ty Hội nghị Á Châu', 2, 'Đà Nẵng', 'Chị Nhi'], ['Công ty CP Dệt may Phương Bắc', 0, 'Hồ Chí Minh', 'Anh Công']],
    [['Suất cơm văn phòng tiêu chuẩn', 'Suất ăn', 'suất', 45000, 'Bếp trung tâm'], ['Suất cơm văn phòng cao cấp', 'Suất ăn', 'suất', 75000, 'Bếp trung tâm'], ['Suất ăn bán trú', 'Suất ăn', 'suất', 38000, 'Bếp trung tâm'],
     ['Tiệc buffet trưa', 'Tiệc', 'khách', 260000, 'Bếp trung tâm'], ['Teabreak hội nghị', 'Tiệc', 'khách', 85000, 'Bếp bánh Mộc'], ['Bánh mì kẹp đặc biệt', 'Bánh', 'cái', 32000, 'Bếp bánh Mộc'],
     ['Cà phê sữa đá chai 250ml', 'Đồ uống', 'chai', 29000, 'Xưởng rang Cầu Đất'], ['Trà đào cam sả ly lớn', 'Đồ uống', 'ly', 42000, 'Xưởng rang Cầu Đất'], ['Gà nướng mật ong', 'Món chính', 'phần', 125000, 'Bếp trung tâm'], ['Combo trái cây tráng miệng', 'Tráng miệng', 'hộp', 35000, 'Vườn trái cây Lái Thiêu']],
    ['Xe giao công ty', 'Đối tác giao hàng', 'Khách tự lấy'], [['Công ty TNHH Giày Á Âu', 0], ['Trường Quốc tế Bến Nghé', 1], ['Khách sạn Hội nghị Riverside', 2], ['Ứng dụng Ăn Ngon', 3]], [20, 600],
    ['Vận hành', 'Kế toán', 'CSKH', 'Bếp trung tâm', 'Nhân sự', 'Mua hàng', 'Ban giám đốc', 'Marketing']),

  build('medical', 'Phân phối thiết bị và vật tư y tế', ['y te', 'duoc', 'thiet bi y te', 'benh vien', 'phong kham', 'nha thuoc', 'pharma', 'medical', 'clinic', 'hospital', 'healthcare'],
    ['Bệnh viện', 'Phòng khám', 'Nhà thuốc', 'Đại lý'],
    [['Bệnh viện Đa khoa Tâm An', 0, 'Hồ Chí Minh', 'DS. Hằng'], ['Phòng khám Đa khoa An Bình', 1, 'Hồ Chí Minh', 'BS. Khoa'], ['Nhà thuốc Minh Châu', 2, 'Hồ Chí Minh', 'DS. Châu'], ['Đại lý Thiết bị Y tế Phương Đông', 3, 'Đồng Nai', 'Anh Đông'],
     ['Bệnh viện Quốc tế Sài Gòn Xanh', 0, 'Hồ Chí Minh', 'Ms. Grace'], ['Nha khoa Nụ Cười', 1, 'Bình Dương', 'BS. Nhung'], ['Chuỗi nhà thuốc Phúc An', 2, 'Hồ Chí Minh', 'DS. Phúc'], ['Bệnh viện Đa khoa Tân An', 0, 'Long An', 'DS. Tùng'],
     ['Phòng khám Nhi Đồng Xanh', 1, 'Hồ Chí Minh', 'BS. Vân'], ['Nhà thuốc Thiện Tâm', 2, 'Cần Thơ', 'DS. Tâm'], ['Đại lý Y tế Cửu Long', 3, 'Cần Thơ', 'Anh Long'], ['Trung tâm Xét nghiệm Medi Lab', 1, 'Hồ Chí Minh', 'Chị Diệp']],
    [['Găng tay y tế nitrile hộp 100', 'Vật tư tiêu hao', 'hộp', 98000, 'Vật tư Y tế Mekong'], ['Khẩu trang y tế 4 lớp hộp 50', 'Vật tư tiêu hao', 'hộp', 42000, 'Vật tư Y tế Mekong'], ['Bơm tiêm 5ml hộp 100', 'Vật tư tiêu hao', 'hộp', 165000, 'Vật tư Y tế Mekong'],
     ['Máy đo huyết áp điện tử', 'Thiết bị', 'cái', 890000, 'Thiết bị Y khoa Sao Mai'], ['Máy đo SpO2 kẹp ngón', 'Thiết bị', 'cái', 420000, 'Thiết bị Y khoa Sao Mai'], ['Que thử đường huyết hộp 50', 'Xét nghiệm', 'hộp', 260000, 'Chẩn đoán Việt Mỹ'],
     ['Cồn 70 độ chai 500ml', 'Sát khuẩn', 'chai', 32000, 'Hoá dược Phương Nam'], ['Băng gạc vô trùng 10x10', 'Vật tư tiêu hao', 'gói', 18000, 'Vật tư Y tế Mekong'], ['Dung dịch rửa tay 5L', 'Sát khuẩn', 'can', 380000, 'Hoá dược Phương Nam'], ['Test nhanh cúm A/B hộp 25', 'Xét nghiệm', 'hộp', 1250000, 'Chẩn đoán Việt Mỹ']],
    ['Xe công ty', 'Chuyển phát Y tế 24h', 'Khách tự lấy'], [['Bệnh viện Phụ sản Sông Tiền', 0], ['Chuỗi phòng khám Family Care', 1], ['Nhà thuốc Ngọc Lan', 2], ['Đại lý Y tế Tây Nguyên', 3]], [10, 400]),

  build('garment', 'May mặc và thời trang', ['may mac', 'det', 'thoi trang', 'giay dep', 'quan ao', 'dong phuc', 'garment', 'textile', 'fashion', 'apparel', 'uniform'],
    ['Thương hiệu', 'Doanh nghiệp (đồng phục)', 'Đại lý', 'Xuất khẩu'],
    [['Thương hiệu Mây Trắng', 0, 'Hồ Chí Minh', 'Chị Mây'], ['Công ty CP Bảo hiểm An Tâm', 1, 'Hồ Chí Minh', 'Chị Ngọc'], ['Shop Thời trang Lan Anh', 2, 'Hà Nội', 'Chị Lan Anh'], ['Urban Wear Pty Ltd', 3, 'Melbourne', 'Ms. Clarke'],
     ['Thương hiệu Gió Biển', 0, 'Đà Nẵng', 'Anh Hải'], ['Trường ĐH Kinh tế Phía Nam', 1, 'Hồ Chí Minh', 'Cô Phương'], ['Đại lý Quần áo Thu Hà', 2, 'Cần Thơ', 'Chị Hà'], ['Kobe Apparel Co.', 3, 'Kobe', 'Mr. Ito'],
     ['Công ty TNHH Xây dựng Sao Việt', 1, 'Bình Dương', 'Anh Sao'], ['Thương hiệu Cỏ Hồng', 0, 'Hồ Chí Minh', 'Chị Hồng'], ['Đại lý Thời trang Phố Hội', 2, 'Hội An', 'Anh Hội'], ['Bệnh viện Đa khoa Hồng Phúc', 1, 'Hồ Chí Minh', 'Chị Đức']],
    [['Áo thun cotton cổ tròn', 'Áo thun', 'cái', 85000, 'Vải Thành Lợi'], ['Áo polo đồng phục', 'Đồng phục', 'cái', 145000, 'Vải Thành Lợi'], ['Sơ mi công sở nam', 'Sơ mi', 'cái', 210000, 'Dệt Phú Hưng'],
     ['Quần tây nữ', 'Quần', 'cái', 240000, 'Dệt Phú Hưng'], ['Áo khoác gió 2 lớp', 'Áo khoác', 'cái', 320000, 'Vải dù Hưng Yên'], ['Đầm công sở', 'Đầm', 'cái', 380000, 'Dệt Phú Hưng'],
     ['Áo blouse y tế', 'Đồng phục', 'cái', 175000, 'Vải Thành Lợi'], ['Quần jean nam', 'Quần', 'cái', 290000, 'Denim Sài Gòn'], ['Nón lưỡi trai thêu logo', 'Phụ kiện', 'cái', 55000, 'Phụ liệu Á Đông'], ['Túi tote canvas in logo', 'Phụ kiện', 'cái', 48000, 'Phụ liệu Á Đông']],
    ['Xe công ty', 'Chuyển phát Bắc Nam', 'Container'], [['Thương hiệu Mộc Lan', 0], ['Công ty Tài chính Bình Tâm', 1], ['Nordic Basics AB', 3], ['Đại lý Thời trang Hoàng Yến', 2]], [50, 3000],
    ['Kinh doanh', 'Kế toán', 'Sản xuất', 'Kho vận', 'Nhân sự', 'Mua hàng', 'Ban giám đốc', 'Thiết kế']),

  build('electronics', 'Phân phối thiết bị điện tử và CNTT', ['dien tu', 'thiet bi van phong', 'may tinh', 'cong nghe', 'it', 'camera', 'electronics', 'laptop', 'computer', 'network'],
    ['Doanh nghiệp', 'Đại lý', 'Dự án', 'Khách lẻ'],
    [['Công ty CP Chứng khoán Sao Bắc', 0, 'Hồ Chí Minh', 'Anh Bắc'], ['Đại lý Tin học Vũ Phong', 1, 'Hồ Chí Minh', 'Anh Vũ'], ['Ban QLDA Bệnh viện Phú Định', 2, 'Hồ Chí Minh', 'Chị Thanh'], ['Anh Kiệt (văn phòng tại nhà)', 3, 'Hồ Chí Minh', 'Anh Kiệt'],
     ['Công ty TNHH Logistics Mekong', 0, 'Cần Thơ', 'Chị Thy'], ['Đại lý Máy tính Hải Nam', 1, 'Đồng Nai', 'Anh Nam'], ['Trường ĐH Công nghệ Phía Nam', 2, 'Hồ Chí Minh', 'Thầy Hiếu'], ['Công ty CP Bất động sản Hưng Phát', 0, 'Hồ Chí Minh', 'Anh Hưng'],
     ['Đại lý Thiết bị Số Tâm Như', 1, 'Bình Dương', 'Chị Như'], ['Chị Vân (cửa hàng online)', 3, 'Hồ Chí Minh', 'Chị Vân'], ['Công ty TNHH Kiểm toán Minh Tín', 0, 'Hồ Chí Minh', 'Ms. Hà'], ['Trường Cao đẳng Kỹ thuật Tây Ninh Xanh', 2, 'Tây Ninh', 'Anh Tín']],
    [['Laptop văn phòng 14 inch i5', 'Laptop', 'cái', 16900000, 'Phân phối Tin học Đông Nam'], ['Màn hình 24 inch IPS', 'Màn hình', 'cái', 3290000, 'Phân phối Tin học Đông Nam'], ['Máy in laser đen trắng', 'Máy in', 'cái', 4150000, 'Thiết bị Văn phòng Á Châu'],
     ['Camera IP ngoài trời 4MP', 'Camera', 'cái', 1250000, 'An ninh Số Việt'], ['Bộ phát WiFi 6 doanh nghiệp', 'Mạng', 'cái', 2890000, 'Mạng Viễn Thông Xanh'], ['Switch 24 cổng PoE', 'Mạng', 'cái', 6400000, 'Mạng Viễn Thông Xanh'],
     ['Ổ cứng SSD 1TB', 'Linh kiện', 'cái', 1690000, 'Linh kiện Sài Gòn'], ['Bàn phím chuột không dây', 'Phụ kiện', 'bộ', 450000, 'Linh kiện Sài Gòn'], ['Bộ lưu điện UPS 1000VA', 'Nguồn điện', 'cái', 2350000, 'Thiết bị Văn phòng Á Châu'], ['Mực in laser chính hãng', 'Vật tư', 'hộp', 1180000, 'Thiết bị Văn phòng Á Châu']],
    ['Xe công ty', 'Giao hàng Sao Việt', 'Khách tự lấy'], [['Công ty CP Dược phẩm Cửu Long Xanh', 0], ['Đại lý Máy tính Thành Nhân', 1], ['Ban QLDA Khu hành chính Phú Lợi', 2], ['Công ty TNHH Nội thất Phát Đạt', 0]], [2, 120]),

  build('agrifood', 'Chế biến và xuất khẩu nông sản', ['nong san', 'xuat khau', 'ca phe nhan', 'hat dieu', 'thuy san', 'trai cay', 'tieu', 'agri', 'seafood', 'export', 'cashew', 'pepper'],
    ['Nhà nhập khẩu', 'Nhà máy chế biến', 'Siêu thị trong nước', 'Đại lý'],
    [['Sunrise Foods GmbH', 0, 'Hamburg', 'Mr. Weber'], ['Công ty CP Thực phẩm Sao Mai', 1, 'Hồ Chí Minh', 'Anh Mai'], ['Siêu thị Nông sản Sạch Xanh', 2, 'Hồ Chí Minh', 'Chị Xanh'], ['Đại lý Nông sản Bảy Hiền', 3, 'Tây Ninh', 'Anh Hiền'],
     ['Golden Harvest Pty Ltd', 0, 'Brisbane', 'Ms. Brown'], ['Công ty TNHH Bánh kẹo Hữu Tình', 1, 'Bình Dương', 'Chị Nghị'], ['Chuỗi Thực phẩm Sạch Bếp Việt', 2, 'Hồ Chí Minh', 'Anh Việt'], ['Đại lý Hạt Ngon', 3, 'Bình Phước', 'Chị Ngon'],
     ['Osaka Trading KK', 0, 'Osaka', 'Mr. Kimura'], ['Công ty CP Gia vị Phương Đông', 1, 'Long An', 'Anh Phương'], ['Siêu thị Organic Mầm Xanh', 2, 'Hà Nội', 'Chị Mầm'], ['Đại lý Nông sản Miền Tây', 3, 'Cần Thơ', 'Anh Tây']],
    [['Hạt điều W320', 'Hạt điều', 'kg', 245000, 'HTX Điều Bình Phước'], ['Hạt điều W240', 'Hạt điều', 'kg', 285000, 'HTX Điều Bình Phước'], ['Tiêu đen 500 g/l', 'Hồ tiêu', 'kg', 152000, 'Nông trại Tiêu Chư Sê'],
     ['Cà phê Robusta S18', 'Cà phê', 'kg', 118000, 'HTX Cà phê Đắk Lắk'], ['Cà phê Arabica Cầu Đất', 'Cà phê', 'kg', 210000, 'HTX Cà phê Lâm Đồng'], ['Xoài sấy dẻo gói 500g', 'Trái cây sấy', 'gói', 98000, 'Xưởng sấy Đồng Tháp'],
     ['Mít sấy giòn gói 250g', 'Trái cây sấy', 'gói', 62000, 'Xưởng sấy Đồng Tháp'], ['Gạo ST25 túi 5kg', 'Gạo', 'túi', 165000, 'Nông sản Sóc Trăng Xanh'], ['Bột quế nguyên chất', 'Gia vị', 'kg', 135000, 'HTX Quế Văn Yên'], ['Hạt macca sấy nứt vỏ', 'Hạt dinh dưỡng', 'kg', 320000, 'Nông trại Macca Lâm Hà']],
    ['Container 20ft', 'Xe tải công ty', 'Chuyển phát nhanh'], [['Nordic Nuts AB', 0], ['Công ty CP Thực phẩm Bình An', 1], ['Chuỗi siêu thị Chi Lan', 2], ['Đại lý Nông sản Đông Nam Bộ', 3]], [50, 5000],
    ['Kinh doanh', 'Kế toán', 'Sản xuất', 'Kho vận', 'Nhân sự', 'Thu mua', 'Ban giám đốc', 'QA/QC']),

  build('trading', 'Thương mại thiết bị và văn phòng phẩm', [],
    ['Doanh nghiệp', 'Đại lý', 'Trường học', 'Khách lẻ'],
    [['Công ty CP Đầu tư Thái Bình Dương', 0, 'Hồ Chí Minh', 'Chị Dương'], ['Đại lý Văn phòng phẩm Hà Hồng', 1, 'Hồ Chí Minh', 'Anh Hà'], ['Trường THPT Bình Hưng', 2, 'Hồ Chí Minh', 'Cô Du'], ['Chị Hiền (văn phòng luật)', 3, 'Hồ Chí Minh', 'Chị Hiền'],
     ['Công ty TNHH Tư vấn Đông Phương', 0, 'Hà Nội', 'Anh Phương'], ['Đại lý Thiết bị Phú Gia', 1, 'Bình Dương', 'Anh Gia'], ['Trường Quốc tế Sông Hàn', 2, 'Hồ Chí Minh', 'Ms. Jones'], ['Công ty CP Vận tải Sao Nam', 0, 'Đồng Nai', 'Anh Nam'],
     ['Đại lý Văn phòng phẩm Long Thiên', 1, 'Cần Thơ', 'Chị Long'], ['Anh Phúc (cửa hàng photo)', 3, 'Hồ Chí Minh', 'Anh Phúc'], ['Công ty TNHH Kế toán Minh Bạch', 0, 'Hồ Chí Minh', 'Chị Bạch'], ['Trường Tiểu học Tân Hưng', 2, 'Long An', 'Thầy Đồng']],
    [['Giấy in A4 70gsm thùng 5 ram', 'Giấy', 'thùng', 385000, 'Giấy Gia Định'], ['Bút bi hộp 20 cây', 'Bút', 'hộp', 68000, 'Văn phòng phẩm Á Châu'], ['Bìa hồ sơ còng 7cm', 'Lưu trữ', 'cái', 42000, 'Văn phòng phẩm Á Châu'],
     ['Máy huỷ tài liệu', 'Thiết bị', 'cái', 3150000, 'Thiết bị Văn phòng Đông Á'], ['Ghế xoay văn phòng', 'Nội thất', 'cái', 1290000, 'Nội thất Phương Nam'], ['Bàn làm việc 1m2', 'Nội thất', 'cái', 1850000, 'Nội thất Phương Nam'],
     ['Bảng trắng 1,2x2,4m', 'Thiết bị', 'cái', 1450000, 'Thiết bị Văn phòng Đông Á'], ['Mực máy in đa năng', 'Vật tư', 'hộp', 520000, 'Thiết bị Văn phòng Đông Á'], ['Sổ tay bìa da A5', 'Quà tặng', 'cuốn', 95000, 'In ấn Kim Phát'], ['Nước rửa tay 500ml', 'Vệ sinh', 'chai', 45000, 'Hoá phẩm Ánh Dương']],
    ['Xe công ty', 'Giao Nhanh Express', 'Khách tự lấy'], [['Công ty CP Bảo hiểm Hưng Thịnh', 0], ['Đại lý Văn phòng phẩm Hải Âu', 1], ['Trường Song ngữ Quốc tế Á Châu', 2], ['Công ty TNHH Kiến trúc Không Gian', 0]], [10, 600]),
];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Best preset for a free-text industry description (Vietnamese or English). Falls back to "trading". */
export function matchPreset(text: string): IndustryProfile {
  const f = ` ${fold(text)} `;
  let best = PRESETS[PRESETS.length - 1];
  let bestScore = 0;
  for (const p of PRESETS) {
    const score = p.keywords.filter((k) => f.includes(` ${k} `) || f.includes(` ${k}`)).length;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return structuredClone(best.profile);
}

export function presetByKey(key: string): IndustryProfile | undefined {
  const p = PRESETS.find((x) => x.profile.key === key);
  return p ? structuredClone(p.profile) : undefined;
}

export const PRESET_KEYS = PRESETS.map((p) => ({ key: p.profile.key, label: p.profile.label }));
