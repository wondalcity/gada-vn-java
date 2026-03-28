-- ============================================================
-- GADA VN — Construction Site Dummy Images
-- 004_site_images.sql
-- ============================================================
-- Uses picsum.photos with fixed numeric seeds.
-- URL format: https://picsum.photos/seed/{N}/800/600
-- Same seed always returns the same image — stable for dev.
-- cover_image_idx = 0 unless noted otherwise.
-- ============================================================

BEGIN;

-- ── Site from 001_dev_data (하노이 현장) ──────────────────────────
UPDATE app.construction_sites SET
  image_s3_keys = ARRAY[
    'https://picsum.photos/seed/101/800/600',
    'https://picsum.photos/seed/102/800/600',
    'https://picsum.photos/seed/103/800/600',
    'https://picsum.photos/seed/104/800/600',
    'https://picsum.photos/seed/105/800/600'
  ],
  cover_image_idx = 0
WHERE id = '00000000-0000-0000-0000-000000000030';

-- ── Site 1: 하노이 오피스텔 A동 ────────────────────────────────────
UPDATE app.construction_sites SET
  image_s3_keys = ARRAY[
    'https://picsum.photos/seed/201/800/600',
    'https://picsum.photos/seed/202/800/600',
    'https://picsum.photos/seed/203/800/600',
    'https://picsum.photos/seed/204/800/600',
    'https://picsum.photos/seed/205/800/600',
    'https://picsum.photos/seed/206/800/600',
    'https://picsum.photos/seed/207/800/600'
  ],
  cover_image_idx = 0
WHERE id = '00000000-0000-0000-0004-000000000001';

-- ── Site 2: 롯데몰 하노이 확장공사 ────────────────────────────────
UPDATE app.construction_sites SET
  image_s3_keys = ARRAY[
    'https://picsum.photos/seed/301/800/600',
    'https://picsum.photos/seed/302/800/600',
    'https://picsum.photos/seed/303/800/600',
    'https://picsum.photos/seed/304/800/600',
    'https://picsum.photos/seed/305/800/600',
    'https://picsum.photos/seed/306/800/600',
    'https://picsum.photos/seed/307/800/600',
    'https://picsum.photos/seed/308/800/600'
  ],
  cover_image_idx = 2
WHERE id = '00000000-0000-0000-0004-000000000002';

-- ── Site 3: 호치민 빌라 B단지 ──────────────────────────────────────
UPDATE app.construction_sites SET
  image_s3_keys = ARRAY[
    'https://picsum.photos/seed/401/800/600',
    'https://picsum.photos/seed/402/800/600',
    'https://picsum.photos/seed/403/800/600',
    'https://picsum.photos/seed/404/800/600',
    'https://picsum.photos/seed/405/800/600',
    'https://picsum.photos/seed/406/800/600'
  ],
  cover_image_idx = 0
WHERE id = '00000000-0000-0000-0004-000000000003';

-- ── Site 4: 빈홈 스마트시티 C동 (10장 최대) ───────────────────────
UPDATE app.construction_sites SET
  image_s3_keys = ARRAY[
    'https://picsum.photos/seed/501/800/600',
    'https://picsum.photos/seed/502/800/600',
    'https://picsum.photos/seed/503/800/600',
    'https://picsum.photos/seed/504/800/600',
    'https://picsum.photos/seed/505/800/600',
    'https://picsum.photos/seed/506/800/600',
    'https://picsum.photos/seed/507/800/600',
    'https://picsum.photos/seed/508/800/600',
    'https://picsum.photos/seed/509/800/600',
    'https://picsum.photos/seed/510/800/600'
  ],
  cover_image_idx = 1
WHERE id = '00000000-0000-0000-0004-000000000004';

-- ── Site 5: 다낭 해운대 리조트 공사 ───────────────────────────────
UPDATE app.construction_sites SET
  image_s3_keys = ARRAY[
    'https://picsum.photos/seed/601/800/600',
    'https://picsum.photos/seed/602/800/600',
    'https://picsum.photos/seed/603/800/600',
    'https://picsum.photos/seed/604/800/600',
    'https://picsum.photos/seed/605/800/600',
    'https://picsum.photos/seed/606/800/600'
  ],
  cover_image_idx = 0
WHERE id = '00000000-0000-0000-0004-000000000005';

-- ── Site 6: 하이퐁 공업단지 D구역 ─────────────────────────────────
UPDATE app.construction_sites SET
  image_s3_keys = ARRAY[
    'https://picsum.photos/seed/701/800/600',
    'https://picsum.photos/seed/702/800/600',
    'https://picsum.photos/seed/703/800/600',
    'https://picsum.photos/seed/704/800/600',
    'https://picsum.photos/seed/705/800/600'
  ],
  cover_image_idx = 0
WHERE id = '00000000-0000-0000-0004-000000000006';

COMMIT;
