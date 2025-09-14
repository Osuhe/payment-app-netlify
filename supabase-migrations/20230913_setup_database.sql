-- Crear extensión si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tipo de enumeración para el estado de las transacciones
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
    END IF;
END$$;

-- Crear tabla de transacciones si no existe
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_code TEXT NOT NULL DEFAULT 'TRX-' || to_char(CURRENT_DATE, 'YYYYMMDD-') || lpad(floor(random() * 10000)::text, 4, '0'),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status transaction_status DEFAULT 'pending',
    document_url TEXT,
    document_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_email CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_email ON public.transactions(customer_email);

-- Función para actualizar automáticamente el campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Función para habilitar RLS en una tabla
CREATE OR REPLACE FUNCTION public.enable_rls_on_table(table_name text)
RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para deshabilitar RLS en una tabla
CREATE OR REPLACE FUNCTION public.disable_rls_on_table(table_name text)
RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear o reemplazar políticas
CREATE OR REPLACE FUNCTION public.create_policy(
    policy_name text,
    table_name text,
    using_condition text DEFAULT NULL,
    with_check_condition text DEFAULT NULL,
    command text DEFAULT 'ALL'
)
RETURNS void AS $$
DECLARE
    policy_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = table_name 
        AND policyname = policy_name
    ) INTO policy_exists;
    
    IF policy_exists THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
    END IF;
    
    EXECUTE format(
        'CREATE POLICY %I ON %I 
         FOR %s 
         TO authenticated, service_role' || 
        CASE WHEN using_condition IS NOT NULL THEN ' USING (' || using_condition || ')' ELSE '' END ||
        CASE WHEN with_check_condition IS NOT NULL THEN ' WITH CHECK (' || with_check_condition || ')' ELSE '' END,
        policy_name, table_name, command
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS en la tabla de transacciones
SELECT public.enable_rls_on_table('transactions');

-- Crear políticas de seguridad
SELECT public.create_policy(
    'admin_select_policy',
    'transactions',
    'auth.role() = ''service_role'''
);

SELECT public.create_policy(
    'admin_insert_policy',
    'transactions',
    NULL,
    'auth.role() = ''service_role''',
    'INSERT'
);

SELECT public.create_policy(
    'admin_update_policy',
    'transactions',
    'auth.role() = ''service_role''',
    'auth.role() = ''service_role''',
    'UPDATE'
);

SELECT public.create_policy(
    'admin_delete_policy',
    'transactions',
    'auth.role() = ''service_role''',
    NULL,
    'DELETE'
);

-- Crear función para buscar transacciones
CREATE OR REPLACE FUNCTION public.search_transactions(search_term text)
RETURNS SETOF transactions AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM transactions
    WHERE 
        customer_name ILIKE '%' || search_term || '%' OR
        customer_email ILIKE '%' || search_term || '%' OR
        transaction_code ILIKE '%' || search_term || '%' OR
        CAST(amount AS TEXT) LIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Crear función para obtener estadísticas
CREATE OR REPLACE FUNCTION public.get_transaction_stats()
RETURNS TABLE(
    total_count bigint,
    pending_count bigint,
    completed_count bigint,
    failed_count bigint,
    total_amount numeric,
    last_updated timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint AS total_count,
        COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending_count,
        COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed_count,
        COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_amount,
        NOW() AS last_updated
    FROM transactions;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
