// ============================================
// SERVICIOS SUPABASE - YLIO
// Funciones para guardar datos en la base de datos
// ============================================

import { createClient } from '@supabase/supabase-js';

// Configuración Supabase (usar variables de entorno en producción)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// GUARDAR DATOS SIPS
// ============================================
export const guardarDatosSIPS = async (ofertaId, datosSIPS) => {
  try {
    const sipsData = {
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
      archivo_origen: datosSIPS.archivo_sips
    };

    const { data, error } = await supabase.rpc('guardar_sips', {
      p_oferta_id: ofertaId,
      p_sips_data: sipsData
    });

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
    // Preparar datos para envío (máximo 1000 registros por batch)
    const batchSize = 1000;
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

      const { data, error } = await supabase
        .from('ofertas_consumos_brutos')
        .insert(batch);

      if (error) throw error;
      totalInsertados += batch.length;
      console.log(`📊 Insertados ${totalInsertados}/${consumosBrutos.length} consumos brutos`);
    }

    console.log(`✅ ${totalInsertados} consumos brutos guardados correctamente`);
    return { success: true, count: totalInsertados };
  } catch (error) {
    console.error('❌ Error guardando consumos brutos:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// GUARDAR CONSUMOS PROCESADOS (8760 horas transformadas)
// ============================================
export const guardarConsumosProcesados = async (ofertaId, consumosProcesados) => {
  try {
    const batchSize = 1000;
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

      const { data, error } = await supabase
        .from('ofertas_consumos_horarios')
        .insert(batch);

      if (error) throw error;
      totalInsertados += batch.length;
      console.log(`📊 Insertados ${totalInsertados}/${consumosProcesados.length} consumos procesados`);
    }

    // Actualizar estadísticas en la tabla ofertas
    const consumoTotal = consumosProcesados.reduce((sum, c) => sum + c.consumo, 0);
    const { error: updateError } = await supabase
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

    if (updateError) console.warn('⚠️ Error actualizando estadísticas:', updateError);

    console.log(`✅ ${totalInsertados} consumos procesados guardados correctamente`);
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

    // Transformar al formato de la app
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
// CARGAR DATOS SIPS
// ============================================
export const cargarDatosSIPS = async (ofertaId) => {
  try {
    const { data, error } = await supabase
      .from('ofertas_sips')
      .select('*')
      .eq('oferta_id', ofertaId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    console.log(`✅ Datos SIPS cargados`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error cargando SIPS:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// GUARDAR OFERTA COMPLETA (Paso 1)
// ============================================
export const guardarOfertaPaso1 = async (ofertaId, datos) => {
  try {
    const ofertaData = {
      // Identificación
      oferta_id: ofertaId,
      oferta_denominacion: datos.denominacion_oferta,
      oferta_version: parseInt(datos.version) || 1,
      oferta_descripcion_version: datos.descripcion_version,
      oferta_fecha_solicitud: datos.fecha_solicitud || null,
      oferta_fecha_inicio: datos.fecha_inicio || null,
      
      // Cliente
      cliente_denominacion: datos.cliente_denominacion,
      cliente_razon_social: datos.cliente_nombre,
      cliente_cif: datos.cliente_cif,
      cliente_cnae: datos.cnae,
      
      // Ubicación
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
      
      // Archivos
      archivo_sips: datos.archivo_sips,
      fuente_datos_consumo: datos.fuente_consumo,
      archivo_consumo: datos.archivo_consumo,
      
      // Datos SIPS (resumen)
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
      sips_consumo_anual: datos.sips_consumo_anual,
      
      // Estadísticas consumo
      oferta_consumos: datos.consumos_estadisticas ? {
        total: parseFloat(datos.consumos_estadisticas.consumoTotal),
        media: parseFloat(datos.consumos_estadisticas.consumoMedia),
        registros: datos.consumos_estadisticas.totalRegistros
      } : null,
      
      // Estadísticas brutos
      consumos_brutos_estadisticas: datos.consumos_horarios_bruto ? {
        totalRegistros: datos.consumos_horarios_bruto.length,
        fechaInicio: datos.consumos_horarios_bruto[0]?.fecha,
        fechaFin: datos.consumos_horarios_bruto[datos.consumos_horarios_bruto.length - 1]?.fecha
      } : null
    };

    // Upsert de la oferta
    const { data, error } = await supabase
      .from('ofertas')
      .upsert(ofertaData, { onConflict: 'oferta_id' })
      .select();

    if (error) throw error;

    console.log('✅ Oferta Paso 1 guardada correctamente');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error guardando oferta:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// FUNCIÓN PRINCIPAL: GUARDAR TODO PASO 1
// ============================================
export const guardarTodoPaso1 = async (ofertaId, datos) => {
  const resultados = {
    oferta: null,
    sips: null,
    consumosBrutos: null,
    consumosProcesados: null
  };

  try {
    // 1. Guardar oferta principal
    resultados.oferta = await guardarOfertaPaso1(ofertaId, datos);
    if (!resultados.oferta.success) throw new Error('Error guardando oferta');

    // 2. Guardar datos SIPS si existen
    if (datos.archivo_sips && datos.sips_cups) {
      resultados.sips = await guardarDatosSIPS(ofertaId, datos);
    }

    // 3. Guardar consumos brutos si existen
    if (datos.consumos_horarios_bruto && datos.consumos_horarios_bruto.length > 0) {
      resultados.consumosBrutos = await guardarConsumosBrutos(ofertaId, datos.consumos_horarios_bruto);
    }

    // 4. Guardar consumos procesados si existen
    if (datos.consumos_horarios && datos.consumos_horarios.length > 0) {
      resultados.consumosProcesados = await guardarConsumosProcesados(ofertaId, datos.consumos_horarios);
    }

    console.log('✅ Paso 1 guardado completamente:', resultados);
    return { success: true, resultados };
  } catch (error) {
    console.error('❌ Error en guardarTodoPaso1:', error);
    return { success: false, error: error.message, resultados };
  }
};

// ============================================
// EXPORTAR TODAS LAS FUNCIONES
// ============================================
export default {
  supabase,
  guardarDatosSIPS,
  guardarConsumosBrutos,
  guardarConsumosProcesados,
  cargarConsumosBrutos,
  cargarConsumosProcesados,
  cargarDatosSIPS,
  guardarOfertaPaso1,
  guardarTodoPaso1
};
