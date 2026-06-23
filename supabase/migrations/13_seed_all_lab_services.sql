-- Migration: Seed all default 25 Laboratory services into facilities catalog
CREATE OR REPLACE FUNCTION public.merge_lab_services(facility_id text) RETURNS void AS $$
DECLARE
  svc jsonb;
  new_services jsonb := '[
    {"name": "Malaria BS/RDT", "category": "Lab", "charge": 150},
    {"name": "Full Blood Count (FBC)", "category": "Lab", "charge": 400},
    {"name": "Urinalysis Dipstick", "category": "Lab", "charge": 200},
    {"name": "Widal Agglutination Test", "category": "Lab", "charge": 300},
    {"name": "Blood Sugar (Fasting/Random)", "category": "Lab", "charge": 150},
    {"name": "Lipid Profile", "category": "Lab", "charge": 800},
    {"name": "H. pylori Stool Antigen", "category": "Lab", "charge": 500},
    {"name": "Liver Function Tests (LFT)", "category": "Lab", "charge": 1200},
    {"name": "Renal Function Tests (RFT)", "category": "Lab", "charge": 1200},
    {"name": "Blood Grouping & Rh", "category": "Lab", "charge": 250},
    {"name": "HIV 1/2 Screening Test", "category": "Lab", "charge": 200},
    {"name": "Syphilis VDRL / RPR", "category": "Lab", "charge": 250},
    {"name": "HBsAg (Hepatitis B)", "category": "Lab", "charge": 350},
    {"name": "HCV Ab (Hepatitis C)", "category": "Lab", "charge": 400},
    {"name": "Serum Pregnancy (hCG)", "category": "Lab", "charge": 450},
    {"name": "Thyroid Profile (TSH Only)", "category": "Lab", "charge": 1000},
    {"name": "PSA (Prostate Specific Antigen)", "category": "Lab", "charge": 1500},
    {"name": "Glycated Hemoglobin (HbA1c)", "category": "Lab", "charge": 1200},
    {"name": "Serum Uric Acid", "category": "Lab", "charge": 400},
    {"name": "ESR (Erythrocyte Sedimentation Rate)", "category": "Lab", "charge": 300},
    {"name": "Stool Microscopy", "category": "Lab", "charge": 250},
    {"name": "Sputum GeneXpert (TB PCR)", "category": "Lab", "charge": 2500},
    {"name": "Brucella Slide Antigen", "category": "Lab", "charge": 350},
    {"name": "Typhoid Antigen Test", "category": "Lab", "charge": 400},
    {"name": "High Vaginal Swab (HVS) Wet Mount", "category": "Lab", "charge": 300}
  ]'::jsonb;
  current_list jsonb;
  merged_list jsonb;
  exists_flag boolean;
BEGIN
  SELECT services_list INTO current_list FROM public.facilities WHERE id = facility_id;
  IF current_list IS NULL THEN
    current_list := '[]'::jsonb;
  END IF;
  
  merged_list := current_list;
  
  FOR svc IN SELECT * FROM jsonb_array_elements(new_services) LOOP
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(merged_list) x 
      WHERE LOWER((x->>'name')::text) = LOWER((svc->>'name')::text)
    ) INTO exists_flag;
    
    IF NOT exists_flag THEN
      merged_list := merged_list || jsonb_build_array(svc);
    END IF;
  END LOOP;
  
  UPDATE public.facilities SET services_list = merged_list WHERE id = facility_id;
END;
$$ LANGUAGE plpgsql;

-- Execute for f1 and f2
SELECT public.merge_lab_services('f1');
SELECT public.merge_lab_services('f2');

-- Also execute for any other registered facilities dynamically
DO $$
DECLARE
  f_rec RECORD;
BEGIN
  FOR f_rec IN SELECT id FROM public.facilities WHERE id NOT IN ('f1', 'f2') LOOP
    PERFORM public.merge_lab_services(f_rec.id);
  END LOOP;
END;
$$;

DROP FUNCTION public.merge_lab_services(text);
