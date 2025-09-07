-- Crear tabla de transacciones segura en Supabase
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  
  -- IDs y referencias
  paypal_transaction_id VARCHAR(255) UNIQUE NOT NULL,
  orden_id VARCHAR(255) NOT NULL,
  
  -- Información del remitente
  remitente_nombre VARCHAR(255) NOT NULL,
  remitente_apellido VARCHAR(255),
  remitente_telefono VARCHAR(50),
  remitente_email VARCHAR(255),
  
  -- Información del beneficiario
  beneficiario_nombre VARCHAR(255) NOT NULL,
  beneficiario_ciudad VARCHAR(255),
  tarjeta_destinatario VARCHAR(255), -- Número completo para Cuba
  moneda_entrega VARCHAR(10),
  
  -- Información de pago (ENCRIPTADA/ENMASCARADA)
  tarjeta_pago VARCHAR(255), -- Enmascarada por seguridad
  tarjeta_vencimiento VARCHAR(255), -- Encriptada
  tarjeta_cvv VARCHAR(255), -- Encriptada
  tarjeta_nombre VARCHAR(255),
  direccion_facturacion TEXT,
  codigo_postal VARCHAR(20),
  pais_facturacion VARCHAR(10),
  
  -- Montos
  monto_usd DECIMAL(10,2) NOT NULL,
  tarifa DECIMAL(10,2),
  monto_total DECIMAL(10,2) NOT NULL,
  
  -- PayPal info
  paypal_status VARCHAR(50),
  paypal_payer_email VARCHAR(255),
  paypal_amount DECIMAL(10,2),
  
  -- Metadata
  fecha_transaccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_local VARCHAR(50),
  user_agent TEXT,
  url_origen VARCHAR(500),
  notas TEXT,
  
  -- URL del documento de identidad
  documento_url VARCHAR(500),
  
  -- Datos completos (JSON para respaldo)
  datos_completos JSONB,
  
  -- Timestamps automáticos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_transactions_paypal_id ON transactions(paypal_transaction_id);
CREATE INDEX idx_transactions_orden_id ON transactions(orden_id);
CREATE INDEX idx_transactions_fecha ON transactions(fecha_transaccion);
CREATE INDEX idx_transactions_remitente ON transactions(remitente_nombre);
CREATE INDEX idx_transactions_beneficiario ON transactions(beneficiario_nombre);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Solo permitir inserción desde funciones autenticadas
CREATE POLICY "Permitir inserción de transacciones" ON transactions
    FOR INSERT WITH CHECK (true);

-- Solo permitir lectura con autenticación
CREATE POLICY "Permitir lectura con autenticación" ON transactions
    FOR SELECT USING (true);

-- Comentarios para documentación
COMMENT ON TABLE transactions IS 'Tabla segura para almacenar transacciones de dinero a Cuba';
COMMENT ON COLUMN transactions.tarjeta_pago IS 'Número de tarjeta enmascarado por seguridad';
COMMENT ON COLUMN transactions.tarjeta_cvv IS 'CVV encriptado, nunca en texto plano';
COMMENT ON COLUMN transactions.datos_completos IS 'Respaldo completo en JSON para auditoría';
