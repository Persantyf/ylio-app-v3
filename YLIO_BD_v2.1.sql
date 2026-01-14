-- ============================================
-- ESQUEMA DE BASE DE DATOS YLIO v2.1
-- Sistema de Gestión de Ofertas Fotovoltaicas
-- PostgreSQL / Supabase
-- INCLUYE: Consumos brutos, SIPS completos
-- ============================================

-- ============================================
-- LIMPIAR TODO (ejecutar con cuidado)
-- ============================================
DROP TABLE IF EXISTS ofertas_prop_areas CASCADE;
DROP TABLE IF EXISTS ofertas_prop_baterias CASCADE;
DROP TABLE IF EXISTS ofertas_prop_inversores CASCADE;
DROP TABLE IF EXISTS ofertas_prop_modulos CASCADE;
DROP TABLE IF EXISTS ofertas_almac_existentes CASCADE;
DROP TABLE IF EXISTS ofertas_inversores_existentes CASCADE;
DROP TABLE IF EXISTS ofertas_modulos_existentes CASCADE;
DROP TABLE IF EXISTS ofertas_produccion_simulada CASCADE;
DROP TABLE IF EXISTS ofertas_produccion_real CASCADE;
DROP TABLE IF EXISTS ofertas_consumos_horarios CASCADE;
DROP TABLE IF EXISTS ofertas_consumos_brutos CASCADE;
DROP TABLE IF EXISTS ofertas_sips CASCADE;
DROP TABLE IF EXISTS ofertas CASCADE;

DROP FUNCTION IF EXISTS update_fecha_modificacion CASCADE;
DROP FUNCTION IF EXISTS generar_siguiente_oferta_id CASCADE;
DROP FUNCTION IF EXISTS validar_oferta_id CASCADE;

-- ============================================
-- TABLA PRINCIPAL: OFERTAS
-- ============================================

CREATE TABLE ofertas (
    -- METADATOS SISTEMA
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
    
    -- ============================================
    -- PASO 1: PROYECTO
    -- ============================================
    
    -- Carga de Archivos
    archivo_sips TEXT,
    fuente_datos_consumo VARCHAR(50),
    archivo_consumo TEXT,
    
    -- Identificación del Proyecto
    oferta_id VARCHAR(10) UNIQUE NOT NULL,
    oferta_denominacion VARCHAR(200),
    oferta_version INT DEFAULT 1,
    oferta_descripcion_version TEXT,
    oferta_fecha_solicitud DATE,
    oferta_fecha_inicio DATE,
    
    -- Datos del Cliente
    cliente_denominacion VARCHAR(200),
    cliente_razon_social VARCHAR(200),
    cliente_cif VARCHAR(15),
    cliente_cnae VARCHAR(4),
    
    -- Ubicación del Proyecto
    proyecto_direccion VARCHAR(300),
    proyecto_cp VARCHAR(5),
    proyecto_municipio VARCHAR(100),
    proyecto_provincia VARCHAR(100),
    proyecto_comunidad VARCHAR(100),
    proyecto_pais VARCHAR(100) DEFAULT 'España',
    proyecto_latitud DECIMAL(10,7),
    proyecto_longitud DECIMAL(10,7),
    proyecto_coordenada_x INT,
    proyecto_coordenada_y INT,
    proyecto_huso INT,
    proyecto_referencia_catastral VARCHAR(20),
    
    -- Datos SIPS (precargados desde archivo)
    sips_cups VARCHAR(25),
    sips_distribuidora VARCHAR(100),
    sips_tarifa VARCHAR(10),
    sips_tension VARCHAR(20),
    sips_potencia_max_bie DECIMAL(10,2),
    sips_derechos_extension DECIMAL(10,2),
    sips_derechos_acceso DECIMAL(10,2),
    sips_potencia_p1 DECIMAL(10,2),
    sips_potencia_p2 DECIMAL(10,2),
    sips_potencia_p3 DECIMAL(10,2),
    sips_potencia_p4 DECIMAL(10,2),
    sips_potencia_p5 DECIMAL(10,2),
    sips_potencia_p6 DECIMAL(10,2),
    sips_consumo_anual INT,
    sips_consumo_p1 DECIMAL(12,2),
    sips_consumo_p2 DECIMAL(12,2),
    sips_consumo_p3 DECIMAL(12,2),
    sips_consumo_p4 DECIMAL(12,2),
    sips_consumo_p5 DECIMAL(12,2),
    sips_consumo_p6 DECIMAL(12,2),
    
    -- Estadísticas de consumo (calculado)
    oferta_consumos JSONB,
    consumos_brutos_estadisticas JSONB,
    
    -- ============================================
    -- PASO 2: TARIFA
    -- ============================================
    cups VARCHAR(25),
    tarifa_acceso VARCHAR(10),
    distribuidora VARCHAR(100),
    comercializadora VARCHAR(100),
    tension VARCHAR(20),
    potencia_max_bie DECIMAL(10,3),
    derechos_extension DECIMAL(10,3),
    derechos_acceso DECIMAL(10,3),
    
    potencia_p1 DECIMAL(10,2),
    potencia_p2 DECIMAL(10,2),
    potencia_p3 DECIMAL(10,2),
    potencia_p4 DECIMAL(10,2),
    potencia_p5 DECIMAL(10,2),
    potencia_p6 DECIMAL(10,2),
    
    tipo_precios_potencia VARCHAR(30),
    precio_potencia_p1 DECIMAL(10,6),
    precio_potencia_p2 DECIMAL(10,6),
    precio_potencia_p3 DECIMAL(10,6),
    precio_potencia_p4 DECIMAL(10,6),
    precio_potencia_p5 DECIMAL(10,6),
    precio_potencia_p6 DECIMAL(10,6),
    
    tipo_contrato_elec VARCHAR(20),
    
    tipo_precios_energia VARCHAR(30),
    precio_energia_p1 DECIMAL(10,6),
    precio_energia_p2 DECIMAL(10,6),
    precio_energia_p3 DECIMAL(10,6),
    precio_energia_p4 DECIMAL(10,6),
    precio_energia_p5 DECIMAL(10,6),
    precio_energia_p6 DECIMAL(10,6),
    
    bonificacion_iee INT,
    coste_alquiler_contador DECIMAL(10,6),
    
    -- ============================================
    -- PASO 3: SITUACIÓN ACTUAL
    -- ============================================
    fv_existente VARCHAR(2),
    fv_existente_modalidad_autoconsumo VARCHAR(50),
    fv_existente_potencia_max_vertido DECIMAL(10,2),
    almac_existente VARCHAR(2),
    
    fv_existente_potencia_pico DECIMAL(10,3),
    fv_existente_potencia_nominal DECIMAL(10,2),
    fv_existente_ratio_dcac DECIMAL(4,2),
    
    fv_existente_archivo_produccion_real TEXT,
    fv_existente_produccion_real_estadisticas JSONB,
    fv_existente_archivo_produccion_simulado TEXT,
    fv_existente_produccion_simulada_estadisticas JSONB,
    fv_existente_produccion_anual_estimada DECIMAL(12,1),
    fv_existente_produccion_anual_real DECIMAL(12,1),
    fv_existente_ratio_produccion DECIMAL(8,1),
    
    almac_existente_capacidad DECIMAL(10,2),
    almac_existente_potencia DECIMAL(10,2),
    
    -- ============================================
    -- PASO 4: PROPUESTA
    -- ============================================
    oferta_fv BOOLEAN DEFAULT TRUE,
    oferta_bateria BOOLEAN DEFAULT FALSE,
    
    base_oferta_num_mod INT,
    base_oferta_potencia_pico DECIMAL(10,3),
    base_oferta_potencia_nominal DECIMAL(10,2),
    base_oferta_ratio_dcac DECIMAL(4,2),
    
    base_oferta_prod_fv_fuente VARCHAR(50),
    base_oferta_prod_fv_tipo_fichero VARCHAR(20)
);

-- ============================================
-- TABLA: DATOS SIPS COMPLETOS
-- ============================================

CREATE TABLE ofertas_sips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE UNIQUE,
    
    cups VARCHAR(25),
    distribuidora VARCHAR(100),
    comercializadora VARCHAR(100),
    tarifa VARCHAR(10),
    tension VARCHAR(20),
    potencia_max_bie DECIMAL(10,2),
    derechos_extension DECIMAL(10,2),
    derechos_acceso DECIMAL(10,2),
    
    potencia_p1 DECIMAL(10,2),
    potencia_p2 DECIMAL(10,2),
    potencia_p3 DECIMAL(10,2),
    potencia_p4 DECIMAL(10,2),
    potencia_p5 DECIMAL(10,2),
    potencia_p6 DECIMAL(10,2),
    
    consumo_anual INT,
    consumo_p1 DECIMAL(12,2),
    consumo_p2 DECIMAL(12,2),
    consumo_p3 DECIMAL(12,2),
    consumo_p4 DECIMAL(12,2),
    consumo_p5 DECIMAL(12,2),
    consumo_p6 DECIMAL(12,2),
    
    cp VARCHAR(5),
    municipio VARCHAR(100),
    provincia VARCHAR(100),
    cnae VARCHAR(10),
    
    archivo_origen TEXT,
    fecha_carga TIMESTAMPTZ DEFAULT NOW(),
    datos_raw JSONB
);

CREATE INDEX idx_sips_oferta ON ofertas_sips(oferta_id);

-- ============================================
-- TABLA: CONSUMOS BRUTOS (archivo original)
-- ============================================

CREATE TABLE ofertas_consumos_brutos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora INT NOT NULL CHECK (hora BETWEEN 0 AND 23),
    consumo DECIMAL(12,4) NOT NULL,
    ano_original INT,
    linea_original TEXT
);

CREATE INDEX idx_consumos_brutos_oferta ON ofertas_consumos_brutos(oferta_id);
CREATE INDEX idx_consumos_brutos_fecha ON ofertas_consumos_brutos(fecha);

-- ============================================
-- TABLA: CONSUMOS PROCESADOS (8760 horas)
-- ============================================

CREATE TABLE ofertas_consumos_horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora INT NOT NULL CHECK (hora BETWEEN 0 AND 23),
    consumo DECIMAL(12,4) NOT NULL,
    
    UNIQUE(oferta_id, fecha, hora)
);

CREATE INDEX idx_consumos_oferta ON ofertas_consumos_horarios(oferta_id);
CREATE INDEX idx_consumos_fecha ON ofertas_consumos_horarios(fecha);

-- ============================================
-- TABLA: PRODUCCIÓN REAL (8760 registros)
-- ============================================

CREATE TABLE ofertas_produccion_real (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora INT NOT NULL CHECK (hora BETWEEN 0 AND 23),
    produccion DECIMAL(12,4) NOT NULL,
    
    UNIQUE(oferta_id, fecha, hora)
);

CREATE INDEX idx_prod_real_oferta ON ofertas_produccion_real(oferta_id);

-- ============================================
-- TABLA: PRODUCCIÓN SIMULADA (8760 registros)
-- ============================================

CREATE TABLE ofertas_produccion_simulada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora INT NOT NULL CHECK (hora BETWEEN 0 AND 23),
    produccion DECIMAL(12,4) NOT NULL,
    
    UNIQUE(oferta_id, fecha, hora)
);

CREATE INDEX idx_prod_sim_oferta ON ofertas_produccion_simulada(oferta_id);

-- ============================================
-- TABLA: MÓDULOS EXISTENTES (Paso 3)
-- ============================================

CREATE TABLE ofertas_modulos_existentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    fv_existente_modulo_id INT NOT NULL,
    fv_existente_modulo_marca VARCHAR(50),
    fv_existente_modulo_modelo VARCHAR(100),
    fv_existente_modulo_potencia DECIMAL(8,2),
    fv_existente_modulo_cantidad INT DEFAULT 1,
    
    UNIQUE(oferta_id, fv_existente_modulo_id)
);

CREATE INDEX idx_mod_exist_oferta ON ofertas_modulos_existentes(oferta_id);

-- ============================================
-- TABLA: INVERSORES EXISTENTES (Paso 3)
-- ============================================

CREATE TABLE ofertas_inversores_existentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    fv_existente_inversor_id INT NOT NULL,
    fv_existente_inversor_marca VARCHAR(50),
    fv_existente_inversor_modelo VARCHAR(100),
    fv_existente_inversor_potencia DECIMAL(10,2),
    fv_existente_inversor_cantidad INT DEFAULT 1,
    
    UNIQUE(oferta_id, fv_existente_inversor_id)
);

CREATE INDEX idx_inv_exist_oferta ON ofertas_inversores_existentes(oferta_id);

-- ============================================
-- TABLA: BATERÍAS EXISTENTES (Paso 3)
-- ============================================

CREATE TABLE ofertas_almac_existentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    almac_existente_bateria_id INT NOT NULL,
    almac_existente_bateria_marca VARCHAR(50),
    almac_existente_bateria_modelo VARCHAR(100),
    almac_existente_bateria_capacidad_unit DECIMAL(5,2),
    almac_existente_bateria_potencia_unit DECIMAL(5,2),
    almac_existente_bateria_cantidad INT DEFAULT 1,
    
    UNIQUE(oferta_id, almac_existente_bateria_id)
);

CREATE INDEX idx_almac_exist_oferta ON ofertas_almac_existentes(oferta_id);

-- ============================================
-- TABLA: MÓDULOS PROPUESTA (Paso 4)
-- ============================================

CREATE TABLE ofertas_prop_modulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    base_oferta_modulo_id INT NOT NULL,
    base_oferta_modulo_marca VARCHAR(50),
    base_oferta_modulo_modelo VARCHAR(100),
    base_oferta_modulo_potencia INT,
    base_oferta_modulo_cantidad INT DEFAULT 1,
    
    UNIQUE(oferta_id, base_oferta_modulo_id)
);

CREATE INDEX idx_mod_prop_oferta ON ofertas_prop_modulos(oferta_id);

-- ============================================
-- TABLA: INVERSORES PROPUESTA (Paso 4)
-- ============================================

CREATE TABLE ofertas_prop_inversores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    base_oferta_inversor_id INT NOT NULL,
    base_oferta_inversor_marca VARCHAR(50),
    base_oferta_inversor_modelo VARCHAR(100),
    base_oferta_inversor_potencia DECIMAL(10,2),
    base_oferta_inversor_cantidad INT DEFAULT 1,
    
    UNIQUE(oferta_id, base_oferta_inversor_id)
);

CREATE INDEX idx_inv_prop_oferta ON ofertas_prop_inversores(oferta_id);

-- ============================================
-- TABLA: ÁREAS DE PRODUCCIÓN (Paso 4)
-- ============================================

CREATE TABLE ofertas_prop_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    base_oferta_area_id INT NOT NULL,
    base_oferta_area_nom VARCHAR(50) DEFAULT 'Área',
    base_oferta_area_orientacion DECIMAL(4,1),
    base_oferta_area_inclinacion DECIMAL(3,1),
    base_oferta_area_modulo_modelo VARCHAR(100),
    base_oferta_area_modulo_cantidad INT,
    base_oferta_area_potencia_pico DECIMAL(10,3),
    base_oferta_area_estructuras VARCHAR(50),
    base_oferta_area_prod_unit BOOLEAN DEFAULT FALSE,
    base_oferta_area_archivo_prod_fv TEXT,
    base_oferta_area_prod_fv DECIMAL(12,1),
    base_oferta_area_horas_nom DECIMAL(5,1),
    
    UNIQUE(oferta_id, base_oferta_area_id)
);

CREATE INDEX idx_areas_prop_oferta ON ofertas_prop_areas(oferta_id);

-- ============================================
-- TABLA: BATERÍAS PROPUESTA (Paso 4)
-- ============================================

CREATE TABLE ofertas_prop_baterias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oferta_id VARCHAR(10) REFERENCES ofertas(oferta_id) ON DELETE CASCADE,
    base_oferta_bateria_id INT NOT NULL DEFAULT 1,
    base_oferta_bateria_marca VARCHAR(50),
    base_oferta_bateria_modelo VARCHAR(100),
    base_oferta_bateria_capacidad_unit DECIMAL(5,2),
    base_oferta_bateria_potencia_unit DECIMAL(5,2),
    
    UNIQUE(oferta_id, base_oferta_bateria_id)
);

CREATE INDEX idx_bat_prop_oferta ON ofertas_prop_baterias(oferta_id);

-- ============================================
-- TRIGGER: ACTUALIZAR FECHA MODIFICACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION update_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ofertas_fecha_mod
    BEFORE UPDATE ON ofertas
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_modificacion();

-- ============================================
-- FUNCIÓN: GENERAR SIGUIENTE OFERTA_ID
-- ============================================

CREATE OR REPLACE FUNCTION generar_siguiente_oferta_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    ultimo_num INT;
    nuevo_id VARCHAR(10);
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(oferta_id FROM 3) AS INT)), 0)
    INTO ultimo_num
    FROM ofertas
    WHERE oferta_id ~ '^10[0-9]+$';
    
    nuevo_id := '10' || LPAD((ultimo_num + 1)::TEXT, 3, '0');
    
    RETURN nuevo_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

CREATE OR REPLACE VIEW v_ofertas_resumen AS
SELECT 
    o.oferta_id,
    o.oferta_denominacion,
    o.oferta_version,
    o.cliente_denominacion,
    o.proyecto_municipio,
    o.proyecto_provincia,
    o.tarifa_acceso,
    o.sips_consumo_anual,
    o.fv_existente,
    o.oferta_fv,
    o.oferta_bateria,
    o.base_oferta_potencia_pico AS propuesta_kwp,
    o.fecha_creacion,
    o.fecha_modificacion,
    (SELECT COUNT(*) FROM ofertas_consumos_brutos cb WHERE cb.oferta_id = o.oferta_id) AS registros_brutos,
    (SELECT COUNT(*) FROM ofertas_consumos_horarios ch WHERE ch.oferta_id = o.oferta_id) AS registros_procesados
FROM ofertas o
ORDER BY o.fecha_modificacion DESC;

CREATE OR REPLACE VIEW v_consumos_resumen AS
SELECT 
    o.oferta_id,
    o.oferta_denominacion,
    (SELECT COUNT(*) FROM ofertas_consumos_brutos cb WHERE cb.oferta_id = o.oferta_id) AS registros_brutos,
    (SELECT COUNT(*) FROM ofertas_consumos_horarios ch WHERE ch.oferta_id = o.oferta_id) AS registros_procesados,
    (SELECT SUM(consumo) FROM ofertas_consumos_horarios ch WHERE ch.oferta_id = o.oferta_id) AS consumo_total_kwh,
    (SELECT MIN(fecha) FROM ofertas_consumos_horarios ch WHERE ch.oferta_id = o.oferta_id) AS fecha_inicio,
    (SELECT MAX(fecha) FROM ofertas_consumos_horarios ch WHERE ch.oferta_id = o.oferta_id) AS fecha_fin
FROM ofertas o;

-- ============================================
-- DESHABILITAR RLS PARA DESARROLLO
-- (En producción, crear políticas específicas)
-- ============================================

ALTER TABLE ofertas DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_sips DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_consumos_brutos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_consumos_horarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_produccion_real DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_produccion_simulada DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_modulos_existentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_inversores_existentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_almac_existentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_prop_modulos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_prop_inversores DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_prop_areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE ofertas_prop_baterias DISABLE ROW LEVEL SECURITY;

-- ============================================
-- FIN DEL ESQUEMA v2.1
-- ============================================
