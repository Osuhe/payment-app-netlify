-- Configuración de Supabase Storage para documentos
-- Este archivo debe ejecutarse en el panel de Supabase SQL Editor

-- 1. Crear el bucket 'documentos' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas para el bucket 'documentos'
-- Permitir subida de archivos (INSERT)
CREATE POLICY "Permitir subida de documentos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documentos' 
        AND auth.role() = 'anon'
    );

-- Permitir lectura pública de documentos (SELECT)
CREATE POLICY "Permitir lectura pública de documentos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documentos'
    );

-- Permitir actualización de documentos (UPDATE)
CREATE POLICY "Permitir actualización de documentos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documentos'
        AND auth.role() = 'anon'
    );

-- Permitir eliminación de documentos (DELETE) - opcional, solo para admin
CREATE POLICY "Permitir eliminación de documentos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documentos'
        AND auth.role() = 'authenticated'
    );

-- Verificar que el bucket fue creado correctamente
SELECT * FROM storage.buckets WHERE id = 'documentos';

-- Verificar las políticas creadas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%documentos%';
