-- Crear función para truncar tablas de forma segura
CREATE OR REPLACE FUNCTION public.safe_truncate_table(table_name text)
RETURNS void AS $$
DECLARE
    stmt text;
BEGIN
    -- Verificar que la tabla existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = safe_truncate_table.table_name
    ) THEN
        -- Deshabilitar triggers temporalmente
        EXECUTE format('ALTER TABLE %I DISABLE TRIGGER ALL', table_name);
        
        -- Truncar la tabla
        EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
        
        -- Volver a habilitar triggers
        EXECUTE format('ALTER TABLE %I ENABLE TRIGGER ALL', table_name);
        
        RAISE NOTICE 'Tabla % truncada exitosamente', table_name;
    ELSE
        RAISE EXCEPTION 'La tabla % no existe en el esquema public', table_name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos a la función
REVOKE ALL ON FUNCTION public.safe_truncate_table FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_truncate_table TO anon, authenticated, service_role;
