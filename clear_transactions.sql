-- Deshabilitar temporalmente RLS
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las transacciones
TRUNCATE TABLE public.transactions RESTART IDENTITY CASCADE;

-- Volver a habilitar RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
