-- Agregar columna business_name a la tabla leads
ALTER TABLE public.leads 
ADD COLUMN business_name text;

-- Comentario para documentar la columna
COMMENT ON COLUMN public.leads.business_name IS 'Nombre del negocio o empresa del lead';

