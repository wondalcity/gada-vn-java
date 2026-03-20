-- Construction trades reference data
INSERT INTO ref.construction_trades (code, name_ko, name_vi, name_en) VALUES
    ('CONCRETE', '콘크리트', 'Bê tông', 'Concrete'),
    ('STEEL', '철근', 'Cốt thép', 'Steel Reinforcement'),
    ('MASONRY', '조적', 'Xây gạch', 'Masonry'),
    ('CARPENTRY', '목수', 'Mộc', 'Carpentry'),
    ('PLUMBING', '배관', 'Ống nước', 'Plumbing'),
    ('ELECTRICAL', '전기', 'Điện', 'Electrical'),
    ('PAINTING', '도장', 'Sơn', 'Painting'),
    ('TILING', '타일', 'Ốp lát', 'Tiling'),
    ('WELDING', '용접', '하Hàn xì', 'Welding'),
    ('EXCAVATION', '굴착', 'Đào đắp', 'Excavation'),
    ('SCAFFOLDING', '비계', 'Giàn giáo', 'Scaffolding'),
    ('ROOFING', '지붕', 'Mái', 'Roofing'),
    ('INSULATION', '단열', 'Cách nhiệt', 'Insulation'),
    ('HVAC', '설비', 'Điều hòa không khí', 'HVAC'),
    ('GENERAL', '일반', 'Lao động phổ thông', 'General Labor');

-- Vietnam provinces reference data (major ones)
INSERT INTO ref.vn_provinces (code, name_vi, name_en) VALUES
    ('HN', 'Hà Nội', 'Hanoi'),
    ('HCM', 'Hồ Chí Minh', 'Ho Chi Minh City'),
    ('DN', 'Đà Nẵng', 'Da Nang'),
    ('HP', 'Hải Phòng', 'Hai Phong'),
    ('CT', 'Cần Thơ', 'Can Tho'),
    ('BR-VT', 'Bà Rịa - Vũng Tàu', 'Ba Ria - Vung Tau'),
    ('BD', 'Bình Dương', 'Binh Duong'),
    ('DN-T', 'Đồng Nai', 'Dong Nai'),
    ('LA', 'Long An', 'Long An'),
    ('QN', 'Quảng Nam', 'Quang Nam'),
    ('HUE', 'Thừa Thiên Huế', 'Thua Thien Hue'),
    ('NT', 'Nha Trang', 'Nha Trang'),
    ('BH', 'Bình Thuận', 'Binh Thuan'),
    ('KH', 'Khánh Hòa', 'Khanh Hoa'),
    ('GL', 'Gia Lai', 'Gia Lai');
