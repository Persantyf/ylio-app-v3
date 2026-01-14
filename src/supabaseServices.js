// ============================================
// SERVICIOS SUPABASE - YLIO
// Funciones para guardar datos en la base de datos
// ============================================

import { createClient } from '@supabase/supabase-js';

// Configuración Supabase (usando variables de entorno de Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// GUARDAR DATOS SIPS
// ============================================
export const guardarDatosSIPS = async (ofertaId, datosSIPS) => {
  try {
    const sipsData = {
      oferta_id: ofertaId,
      cups: datosSIPS.sips_cups,
      distribuidora: datosSIPS.sips_distribuidora,
      comercializadora: datosSIPS.sips_comercializadora,
      tarifa: datosSIPS.sips_tarifa,
      tension: datosSIPS.sips_tension,
      potencia_max_bie: datosSIPS.sips_potencia_max_bie,
      derechos_extension: datosSIPS.sips_derechos_extension,
      derechos_acceso: datosSIPS.sips_derechos_acceso,
      potencia_p1: datosSIPS.sips_potencia_p1,
      potencia_p2: datosSIPS.sips_potencia_p2,
      potencia_p3: datosSIPS.sips_potencia_p3,
      potencia_p4: datosSIPS.sips_potencia_p4,
      potencia_p5: datosSIPS.sips_potencia_p5,
      potencia_p6: datosSIPS.sips_potencia_p6,
      consumo_anual: datosSIPS.sips_consumo_anual,
      consumo_p1: datosSIPS.sips_consumo_p1,
      consumo_p2: datosSIPS.sips_consumo_p2,
      consumo_p3: datosSIPS.sips_consumo_p3,
      consumo_p4: datosSIPS.sips_consumo_p4,
      consumo_p5: datosSIPS.sips_consumo_p5,
      consumo_p6: datosSIPS.sips_consumo_p6,
      cp: datosSIPS.ubicacion_cp,
      municipio: datosSIPS.ubicacion_municipio,
      provincia: datosSIPS.ubicacion_provincia,
      cnae: datosSIPS.cnae,
      archivo_origen: datosSIPS.archivo_sips,
      datos_raw: datosSIPS
    };

    const { data, error } = await supabase
      .from('ofertas_sips')
      .upsert(sipsData, { onConflict: 'oferta_id' })
      .select();

    if (error) throw error;
    console.log('✅ Datos SIPS guardados correctamente');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error guardando SIPS:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// GUARDAR CONSUMOS BRUTOS (archivo original)
// ============================================
export const guardarConsumosBrutos = async (ofertaId, consumosBrutos) => {
  try {
    const batchSize = 500;
    let totalInsertados = 0;

    // Primero eliminar los existentes
    const { error: deleteError } = await supabase
      .from('ofertas_consumos_brutos')
      .delete()
      .eq('oferta_id', ofertaId);

    if (deleteError) throw deleteError;

    // Insertar en batches
    for (let i = 0; i < consumosBrutos.length; i += batchSize) {
      const batch = consumosBrutos.slice(i, i + batchSize).map(c => ({
        oferta_id: ofertaId,
        fecha: c.fecha,
        hora: c.hora,
        consumo: c.consumo,
        año_original: c.añoOriginal || parseInt(c.fecha.substring(0, 4)),
        linea_original: c.lineaOriginal || null
      }));

      const { error } = await supabase
        .from('ofertas_consumos_brutos')
        .insert(batch);

      if (error) throw error;
      totalInsertados += batch.length;
    }

    console.log(`✅ ${totalInsertados} consumos brutos guardados`);
    return { success: true, count: totalInsertados };
  } catch (error) {
    console.error('❌ Error guardando consumos brutos:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// GUARDAR CONSUMOS PROCESADOS (8760 horas)
// ============================================
export const guardarConsumosProcesados = async (ofertaId, consumosProcesados) => {
  try {
    const batchSize = 500;
    let totalInsertados = 0;

    // Primero eliminar los existentes
    const { error: deleteError } = await supabase
      .from('ofertas_consumos_horarios')
      .delete()
      .eq('oferta_id', ofertaId);

    if (deleteError) throw deleteError;

    // Insertar en batches
    for (let i = 0; i < consumosProcesados.length; i += batchSize) {
      const batch = consumosProcesados.slice(i, i + batchSize).map(c => ({
        oferta_id: ofertaId,
        fecha: c.fechaOriginal || c.fecha,
        hora: c.hora,
        consumo: c.consumo
      }));

      const { error } = await supabase
        .from('ofertas_consumos_horarios')
        .insert(batch);

      if (error) throw error;
      totalInsertados += batch.length;
    }

    // Actualizar estadísticas en la tabla ofertas
    const consumoTotal = consumosProcesados.reduce((sum, c) => sum + c.consumo, 0);
    await supabase
      .from('ofertas')
      .update({
        oferta_consumos: {
          total: consumoTotal,
          media: consumoTotal / consumosProcesados.length,
          max: Math.max(...consumosProcesados.map(c => c.consumo)),
          min: Math.min(...consumosProcesados.map(c => c.consumo)),
          registros: consumosProcesados.length
        }
      })
      .eq('oferta_id', ofertaId);

    console.log(`✅ ${totalInsertados} consumos procesados guardados`);
    return { success: true, count: totalInsertados };
  } catch (error) {
    console.error('❌ Error guardando consumos procesados:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// CARGAR CONSUMOS BRUTOS (para re-procesar)
// ============================================
export const cargarConsumosBrutos = async (ofertaId) => {
  try {
    const { data, error } = await supabase
      .from('ofertas_consumos_brutos')
      .select('fecha, hora, consumo, año_original, linea_original')
      .eq('oferta_id', ofertaId)
      .order('fecha')
      .order('hora');

    if (error) throw error;

    const consumos = data.map(c => ({
      fecha: c.fecha,
      hora: c.hora,
      consumo: parseFloat(c.consumo),
      añoOriginal: c.año_original,
      lineaOriginal: c.linea_original
    }));

    console.log(`✅ ${consumos.length} consumos brutos cargados`);
    return { success: true, data: consumos };
  } catch (error) {
    console.error('❌ Error cargando consumos brutos:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// CARGAR CONSUMOS PROCESADOS
// ============================================
export const cargarConsumosProcesados = async (ofertaId) => {
  try {
    const { data, error } = await supabase
      .from('ofertas_consumos_horarios')
      .select('fecha, hora, consumo')
      .eq('oferta_id', ofertaId)
      .order('fecha')
      .order('hora');

    if (error) throw error;

    const consumos = data.map(c => ({
      fecha: c.fecha,
      hora: c.hora,
      consumo: parseFloat(c.consumo)
    }));

    console.log(`✅ ${consumos.length} consumos procesados cargados`);
    return { success: true, data: consumos };
  } catch (error) {
    console.error('❌ Error cargando consumos procesados:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// GUARDAR OFERTA (datos generales)
// ============================================
export const guardarOferta = async (ofertaId, datos) => {
  try {
    const ofertaData = {
      oferta_id: ofertaId,
      oferta_denominacion: datos.denominacion_oferta,
      oferta_version: parseInt(datos.version) || 1,
      oferta_descripcion_version: datos.descripcion_version,
      oferta_fecha_solicitud: datos.fecha_solicitud || null,
      oferta_fecha_inicio: datos.fecha_inicio || null,
      
      cliente_denominacion: datos.cliente_denominacion,
      cliente_razon_social: datos.cliente_nombre,
      cliente_cif: datos.cliente_cif,
      cliente_cnae: datos.cnae,
      
      proyecto_direccion: datos.ubicacion_direccion,
      proyecto_cp: datos.ubicacion_cp,
      proyecto_municipio: datos.ubicacion_municipio,
      proyecto_provincia: datos.ubicacion_provincia,
      proyecto_comunidad: datos.ubicacion_comunidad,
      proyecto_latitud: datos.ubicacion_latitud ? parseFloat(datos.ubicacion_latitud) : null,
      proyecto_longitud: datos.ubicacion_longitud ? parseFloat(datos.ubicacion_longitud) : null,
      proyecto_coordenada_x: datos.coordenada_x ? parseInt(datos.coordenada_x) : null,
      proyecto_coordenada_y: datos.coordenada_y ? parseInt(datos.coordenada_y) : null,
      proyecto_huso: datos.huso ? parseInt(datos.huso) : null,
      proyecto_referencia_catastral: datos.referencia_catastral,
      
      archivo_sips: datos.archivo_sips,
      fuente_datos_consumo: datos.fuente_consumo,
      archivo_consumo: datos.archivo_consumo,
      
      sips_cups: datos.sips_cups,
      sips_distribuidora: datos.sips_distribuidora,
      sips_tarifa: datos.sips_tarifa,
      sips_tension: datos.sips_tension,
      sips_potencia_p1: datos.sips_potencia_p1,
      sips_potencia_p2: datos.sips_potencia_p2,
      sips_potencia_p3: datos.sips_potencia_p3,
      sips_potencia_p4: datos.sips_potencia_p4,
      sips_potencia_p5: datos.sips_potencia_p5,
      sips_potencia_p6: datos.sips_potencia_p6,
      sips_consumo_anual: datos.sips_consumo_anual
    };

    const { data, error } = await supabase
      .from('ofertas')
      .upsert(ofertaData, { onConflict: 'oferta_id' })
      .select();

    if (error) throw error;
    console.log('✅ Oferta guardada correctamente');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error guardando oferta:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// CARGAR OFERTA COMPLETA
// ============================================
export const cargarOferta = async (ofertaId) => {
  try {
    const { data, error } = await supabase
      .from('ofertas')
      .select('*')
      .eq('oferta_id', ofertaId)
      .single();

    if (error) throw error;
    console.log('✅ Oferta cargada');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error cargando oferta:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// OBTENER SIGUIENTE ID DE OFERTA
// ============================================
export const obtenerSiguienteOfertaId = async () => {
  try {
    const { data, error } = await supabase
      .from('ofertas')
      .select('oferta_id')
      .order('oferta_id', { ascending: false })
      .limit(1);

    if (error) throw error;

    let siguienteNum = 1;
    if (data && data.length > 0) {
      const ultimoId = data[0].oferta_id;
      const num = parseInt(ultimoId.substring(2));
      siguienteNum = num + 1;
    }

    const nuevoId = '10' + String(siguienteNum).padStart(3, '0');
    console.log('✅ Siguiente ID:', nuevoId);
    return { success: true, id: nuevoId };
  } catch (error) {
    console.error('❌ Error obteniendo siguiente ID:', error);
    return { success: false, error: error.message };
  }
};
