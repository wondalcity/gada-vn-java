-- 024_fix_welding_name_vi.sql
-- Fix corrupted name_vi for WELDING trade (was '하Hàn xì', should be 'Hàn xì')

UPDATE ref.construction_trades
SET name_vi = 'Hàn xì'
WHERE code = 'WELDING'
  AND name_vi != 'Hàn xì';
