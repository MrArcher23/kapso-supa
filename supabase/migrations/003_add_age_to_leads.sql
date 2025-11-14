-- Agregar columna age a la tabla leads
-- Esta columna almacenará la edad del lead

ALTER TABLE public.leads
ADD COLUMN age INTEGER;

-- Agregar constraint para validar que la edad sea razonable (mayor a 0 y menor a 150)
ALTER TABLE public.leads
ADD CONSTRAINT age_check CHECK (age IS NULL OR (age > 0 AND age < 150));


