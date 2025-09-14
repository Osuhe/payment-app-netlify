const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk3NzAsImV4cCI6MjA3Mjc2NTc3MH0.q2vvElpxavLYbhZpvf_QjTPBfy3WJDxFWlROyMGWT38';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...');

    // 1. Crear la tabla transactions si no existe
    console.log('ℹ️ Verificando/creando tabla transactions...');
    const { error: createTableError } = await supabase.rpc('create_or_update_table', {
      table_name: 'transactions',
      table_definition: `
      CREATE TABLE IF NOT EXISTS public.transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transaction_code TEXT NOT NULL DEFAULT 'TRX-' || to_char(CURRENT_DATE, 'YYYYMMDD-') || lpad(floor(random() * 10000)::text, 4, '0'),
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        document_url TEXT,
        document_path TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT valid_email CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
        CONSTRAINT positive_amount CHECK (amount > 0)
      )`
    });
    
    if (createTableError) {
      console.error('❌ Error al crear la tabla:', createTableError);
      return;
    }
    console.log('✅ Tabla transactions verificada/creada exitosamente');
    
    // Crear índices si no existen
    console.log('🔍 Verificando/creando índices...');
    await supabase.rpc('create_index_if_not_exists', {
      index_name: 'idx_transactions_status',
      table_name: 'transactions',
      columns: 'status'
    });
    
    await supabase.rpc('create_index_if_not_exists', {
      index_name: 'idx_transactions_created_at',
      table_name: 'transactions',
      columns: 'created_at'
    });
    
    await supabase.rpc('create_index_if_not_exists', {
      index_name: 'idx_transactions_customer_email',
      table_name: 'transactions',
      columns: 'customer_email'
    });
    
    console.log('✅ Índices verificados/creados exitosamente');

    // 2. Configurar políticas de RLS (Row Level Security)
    console.log('🔒 Configurando políticas de seguridad...');
    
    // Deshabilitar RLS temporalmente
    await supabase.rpc('disable_rls_on_table', { table_name: 'transactions' });
    
    // Configurar políticas
    await Promise.all([
      // Política para lectura de transacciones (solo admin)
      supabase.rpc('create_policy', {
        policy_name: 'admin_select_policy',
        table_name: 'transactions',
        using: 'auth.role() = \'service_role\''
      }),
      
      // Política para inserción (solo admin)
      supabase.rpc('create_policy', {
        policy_name: 'admin_insert_policy',
        table_name: 'transactions',
        with_check: 'auth.role() = \'service_role\''
      }),
      
      // Política para actualización (solo admin)
      supabase.rpc('create_policy', {
        policy_name: 'admin_update_policy',
        table_name: 'transactions',
        using: 'auth.role() = \'service_role\''
      }),
      
      // Política para eliminación (solo admin)
      supabase.rpc('create_policy', {
        policy_name: 'admin_delete_policy',
        table_name: 'transactions',
        using: 'auth.role() = \'service_role\''
      })
    ]);

    // Habilitar RLS
    await supabase.rpc('enable_rls_on_table', { table_name: 'transactions' });
    
    console.log('✅ Configuración de seguridad completada');

    // 3. Verificar y crear funciones necesarias
    console.log('🔍 Verificando funciones de base de datos...');
    await createDatabaseFunctions();

    console.log('✨ Sincronización completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
  }
}

async function createDatabaseFunctions() {
  // Función para formatear fechas
  const { error: dateFnError } = await supabase.rpc('create_or_update_function', {
    function_name: 'format_date',
    function_definition: `
    CREATE OR REPLACE FUNCTION format_date(timestamp with time zone)
    RETURNS text AS $$
    BEGIN
      RETURN to_char($1, 'DD/MM/YYYY HH24:MI');
    END;
    $$ LANGUAGE plpgsql;
    `
  });
  
  if (dateFnError) {
    console.error('❌ Error al crear función format_date:', dateFnError);
  } else {
    console.log('✅ Función format_date creada/actualizada');
  }
  
  // Función para generar códigos de transacción
  const { error: codeFnError } = await supabase.rpc('create_or_update_function', {
    function_name: 'generate_transaction_code',
    function_definition: `
    CREATE OR REPLACE FUNCTION generate_transaction_code()
    RETURNS text AS $$
    BEGIN
      RETURN 'TRX-' || to_char(CURRENT_DATE, 'YYYYMMDD-') || 
             lpad(floor(random() * 10000)::text, 4, '0');
    END;
    $$ LANGUAGE plpgsql;
    `
  });
  
  if (codeFnError) {
    console.error('❌ Error al crear función generate_transaction_code:', codeFnError);
  } else {
    console.log('✅ Función generate_transaction_code creada/actualizada');
  }
}

// Ejecutar la sincronización
setupDatabase();
