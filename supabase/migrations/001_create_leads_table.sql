-- Migración: Crear tabla de leads para capturar información de WhatsApp
-- Autor: Ejercicio Kapso + Supabase
-- Fecha: 2025-11-11

-- Crear la tabla de leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    name TEXT,
    email TEXT,
    interest TEXT,
    conversation_state JSONB DEFAULT '{"step": "INITIAL", "data": {}}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índice en phone_number para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON public.leads(phone_number);

-- Crear índice en created_at para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada UPDATE
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política: Permitir a Edge Functions insertar y actualizar
CREATE POLICY "Enable insert for service role" ON public.leads
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON public.leads
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable select for service role" ON public.leads
    FOR SELECT
    TO service_role
    USING (true);

-- Política: Permitir lectura a usuarios autenticados (opcional, para dashboard)
CREATE POLICY "Enable read access for authenticated users" ON public.leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Comentarios en la tabla y columnas para documentación
COMMENT ON TABLE public.leads IS 'Tabla que almacena leads capturados desde WhatsApp vía Kapso';
COMMENT ON COLUMN public.leads.id IS 'Identificador único del lead';
COMMENT ON COLUMN public.leads.phone_number IS 'Número de teléfono de WhatsApp del lead (formato internacional)';
COMMENT ON COLUMN public.leads.name IS 'Nombre completo del lead';
COMMENT ON COLUMN public.leads.email IS 'Correo electrónico del lead';
COMMENT ON COLUMN public.leads.interest IS 'Interés seleccionado por el lead (productos, precios, llamada, soporte)';
COMMENT ON COLUMN public.leads.conversation_state IS 'Estado de la conversación en formato JSON para tracking del flujo';
COMMENT ON COLUMN public.leads.created_at IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN public.leads.updated_at IS 'Fecha y hora de última actualización del registro';

-- Vista para consultas comunes (opcional)
CREATE OR REPLACE VIEW public.leads_summary AS
SELECT 
    id,
    phone_number,
    name,
    email,
    interest,
    (conversation_state->>'step') as current_step,
    created_at,
    updated_at
FROM public.leads
ORDER BY created_at DESC;

-- Comentario en la vista
COMMENT ON VIEW public.leads_summary IS 'Vista simplificada de leads con el paso actual de conversación';

-- Grant permissions para la vista
GRANT SELECT ON public.leads_summary TO service_role;
GRANT SELECT ON public.leads_summary TO authenticated;

