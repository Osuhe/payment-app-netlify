const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearDatabase() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    
    // Obtener todas las transacciones en lotes y eliminarlas
    console.log('🗑️  Obteniendo y eliminando transacciones en lotes...');
    
    let hasMore = true;
    let offset = 0;
    const batchSize = 100;
    let totalDeleted = 0;
    
    while (hasMore) {
      // Obtener un lote de transacciones
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id')
        .range(offset, offset + batchSize - 1);
      
      if (fetchError) {
        throw new Error(`Error al obtener transacciones: ${fetchError.message}`);
      }
      
      if (!transactions || transactions.length === 0) {
        hasMore = false;
        continue;
      }
      
      // Extraer los IDs para eliminar
      const idsToDelete = transactions.map(tx => tx.id);
      
      // Eliminar el lote actual
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error(`Error al eliminar lote de transacciones: ${deleteError.message}`);
        // Continuar con el siguiente lote
      } else {
        totalDeleted += idsToDelete.length;
        console.log(`✅ Eliminadas ${idsToDelete.length} transacciones (total: ${totalDeleted})`);
      }
      
      offset += batchSize;
    }
    
    console.log('✅ Proceso de eliminación completado');
    
    // Verificar que la tabla esté vacía
    console.log('🔍 Verificando que la tabla esté vacía...');
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error al verificar la tabla:', countError);
    } else {
      console.log(`📊 Total de transacciones restantes: ${count}`);
    }
    
    console.log('✨ Proceso completado con éxito');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearDatabase();
