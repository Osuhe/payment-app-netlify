const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk3NzAsImV4cCI6MjA3Mjc2NTc3MH0.q2vvElpxavLYbhZpvf_QjTPBfy3WJDxFWlROyMGWT38';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanDatabase() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    
    // Paso 1: Obtener el conteo actual de transacciones
    console.log('📊 Obteniendo conteo de transacciones...');
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error al obtener el conteo:', countError);
      return;
    }
    
    console.log(`📊 Total de transacciones actuales: ${count}`);
    
    if (count === 0) {
      console.log('✅ La tabla de transacciones ya está vacía');
      return;
    }
    
    // Paso 2: Obtener todos los IDs de transacciones
    console.log('🔄 Obteniendo IDs de transacciones...');
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id')
      .limit(1000); // Limitar a 1000 para evitar sobrecargar
    
    if (fetchError) {
      console.error('Error al obtener transacciones:', fetchError);
      return;
    }
    
    if (!transactions || transactions.length === 0) {
      console.log('✅ No hay transacciones para eliminar');
      return;
    }
    
    console.log(`🔍 Se encontraron ${transactions.length} transacciones`);
    
    // Paso 3: Eliminar transacciones en lotes pequeños
    const batchSize = 10;
    let deletedCount = 0;
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const idsToDelete = batch.map(tx => tx.id);
      
      console.log(`🗑️  Eliminando lote de ${idsToDelete.length} transacciones...`);
      
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error('Error al eliminar lote:', deleteError);
      } else {
        deletedCount += idsToDelete.length;
        console.log(`✅ Eliminadas ${deletedCount}/${transactions.length} transacciones`);
      }
      
      // Pequeña pausa para evitar sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✅ Proceso de limpieza completado');
    
    // Verificación final
    const { count: finalCount, error: finalError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (finalError) {
      console.error('Error al verificar el conteo final:', finalError);
    } else {
      console.log(`📊 Total de transacciones restantes: ${finalCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

cleanDatabase();
