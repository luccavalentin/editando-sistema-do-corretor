ALTER TYPE public.checklist_type ADD VALUE IF NOT EXISTS 'checklist_diario';
ALTER TABLE public.checklists ALTER COLUMN os_id DROP NOT NULL;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS setor text;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS data date DEFAULT CURRENT_DATE;