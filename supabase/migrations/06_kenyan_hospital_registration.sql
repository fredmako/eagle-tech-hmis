-- Migration 06: Add Kenyan Hospital Registration Details to facilities table

ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS kmpdc_reg_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS mfl_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS regulatory_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS county VARCHAR(100),
ADD COLUMN IF NOT EXISTS sub_county VARCHAR(100),
ADD COLUMN IF NOT EXISTS lr_number VARCHAR(100);
