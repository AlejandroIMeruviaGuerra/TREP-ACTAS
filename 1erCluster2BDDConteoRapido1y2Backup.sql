/* =========================================================
   CLUSTER 1: TREP / RECUENTO RÁPIDO
   Bases:
   - DBTrep_1 = principal
   - DBTrep_2 = réplica sincronizada
   ========================================================= */

IF DB_ID('DBTrep_1') IS NULL
BEGIN
    CREATE DATABASE DBTrep_1;
END;

IF DB_ID('DBTrep_2') IS NULL
BEGIN
    CREATE DATABASE DBTrep_2;
END;
GO

/* =========================================================
   CREAR TABLAS EN DBTrep_1
   ========================================================= */

USE DBTrep_1;
GO

CREATE TABLE distribucion_territorial (
    idDistribucion INT PRIMARY KEY,
    departamento VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL
);
GO

CREATE TABLE recintos_electorales (
    id_recinto INT PRIMARY KEY,
    idDistribucion INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    direccion VARCHAR(255),
    cantidad_mesas INT NOT NULL,

    CONSTRAINT FK_trep1_recinto_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion)
);
GO

CREATE TABLE actas_impresas (
    codigo_mesa VARCHAR(50) PRIMARY KEY,
    idDistribucion INT NOT NULL,
    id_recinto INT NOT NULL,
    nro_mesa INT NOT NULL,
    nro_votantes INT NOT NULL,

    CONSTRAINT FK_trep1_acta_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT FK_trep1_acta_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto)
);
GO

CREATE TABLE resultados_actas_trep (
    id_trep INT IDENTITY(1,1) PRIMARY KEY,

    codigo_mesa VARCHAR(50) NOT NULL,
    id_recinto INT NOT NULL,
    idDistribucion INT NOT NULL,

    fuente VARCHAR(50) NOT NULL, -- PDF_OCR, SMS, MOVIL
    nombre_archivo VARCHAR(255),
    telefono_origen VARCHAR(30),

    electores_habilitados INT NOT NULL,
    papeletas_anfora INT NOT NULL,
    papeletas_no_usadas INT NOT NULL,

    primer_partido INT NOT NULL,
    segundo_partido INT NOT NULL,
    tercer_partido INT NOT NULL,
    cuarto_partido INT NOT NULL,

    votos_validos INT NOT NULL,
    votos_blancos INT NOT NULL,
    votos_nulos INT NOT NULL,

    estado_acta VARCHAR(50) NOT NULL, -- VALIDO, INVALIDO, DUPLICADO
    observacion TEXT,
    fecha_registro DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_trep1_resultado_acta
    FOREIGN KEY (codigo_mesa)
    REFERENCES actas_impresas(codigo_mesa),

    CONSTRAINT FK_trep1_resultado_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto),

    CONSTRAINT FK_trep1_resultado_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT CK_trep1_papeletas
    CHECK (papeletas_anfora + papeletas_no_usadas = electores_habilitados),

    CONSTRAINT CK_trep1_votos_anfora
    CHECK (votos_validos + votos_nulos = papeletas_anfora),

    CONSTRAINT CK_trep1_votos_validos
    CHECK (
        primer_partido + segundo_partido + tercer_partido + cuarto_partido + votos_blancos = votos_validos
    )
);
GO

CREATE UNIQUE INDEX UX_trep1_codigo_mesa
ON resultados_actas_trep(codigo_mesa);
GO

CREATE TABLE logs_trep (
    id_log INT IDENTITY(1,1) PRIMARY KEY,
    codigo_mesa VARCHAR(50),
    fuente VARCHAR(50), -- PDF_OCR, SMS, MOVIL
    tipo_error VARCHAR(100),
    detalle TEXT,
    fecha_log DATETIME DEFAULT GETDATE()
);
GO

/* =========================================================
   CREAR TABLAS EN DBTrep_2
   ========================================================= */

USE DBTrep_2;
GO

CREATE TABLE distribucion_territorial (
    idDistribucion INT PRIMARY KEY,
    departamento VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL
);
GO

CREATE TABLE recintos_electorales (
    id_recinto INT PRIMARY KEY,
    idDistribucion INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    direccion VARCHAR(255),
    cantidad_mesas INT NOT NULL,

    CONSTRAINT FK_trep2_recinto_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion)
);
GO

CREATE TABLE actas_impresas (
    codigo_mesa VARCHAR(50) PRIMARY KEY,
    idDistribucion INT NOT NULL,
    id_recinto INT NOT NULL,
    nro_mesa INT NOT NULL,
    nro_votantes INT NOT NULL,

    CONSTRAINT FK_trep2_acta_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT FK_trep2_acta_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto)
);
GO

CREATE TABLE resultados_actas_trep (
    id_trep INT IDENTITY(1,1) PRIMARY KEY,

    codigo_mesa VARCHAR(50) NOT NULL,
    id_recinto INT NOT NULL,
    idDistribucion INT NOT NULL,

    fuente VARCHAR(50) NOT NULL, -- PDF_OCR, SMS, MOVIL
    nombre_archivo VARCHAR(255),
    telefono_origen VARCHAR(30),

    electores_habilitados INT NOT NULL,
    papeletas_anfora INT NOT NULL,
    papeletas_no_usadas INT NOT NULL,

    primer_partido INT NOT NULL,
    segundo_partido INT NOT NULL,
    tercer_partido INT NOT NULL,
    cuarto_partido INT NOT NULL,

    votos_validos INT NOT NULL,
    votos_blancos INT NOT NULL,
    votos_nulos INT NOT NULL,

    estado_acta VARCHAR(50) NOT NULL,
    observacion TEXT,
    fecha_registro DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_trep2_resultado_acta
    FOREIGN KEY (codigo_mesa)
    REFERENCES actas_impresas(codigo_mesa),

    CONSTRAINT FK_trep2_resultado_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto),

    CONSTRAINT FK_trep2_resultado_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT CK_trep2_papeletas
    CHECK (papeletas_anfora + papeletas_no_usadas = electores_habilitados),

    CONSTRAINT CK_trep2_votos_anfora
    CHECK (votos_validos + votos_nulos = papeletas_anfora),

    CONSTRAINT CK_trep2_votos_validos
    CHECK (
        primer_partido + segundo_partido + tercer_partido + cuarto_partido + votos_blancos = votos_validos
    )
);
GO

CREATE UNIQUE INDEX UX_trep2_codigo_mesa
ON resultados_actas_trep(codigo_mesa);
GO

CREATE TABLE logs_trep (
    id_log INT IDENTITY(1,1) PRIMARY KEY,
    codigo_mesa VARCHAR(50),
    fuente VARCHAR(50),
    tipo_error VARCHAR(100),
    detalle TEXT,
    fecha_log DATETIME DEFAULT GETDATE()
);
GO