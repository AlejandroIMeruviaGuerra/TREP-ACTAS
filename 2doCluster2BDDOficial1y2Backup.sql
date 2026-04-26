/* =========================================================
   CLUSTER 2: OFICIAL / CÓMPUTO OFICIAL
   Bases:
   - DBOficial_1 = principal
   - DBOficial_2 = réplica sincronizada
   ========================================================= */

IF DB_ID('DBOficial_1') IS NULL
BEGIN
    CREATE DATABASE DBOficial_1;
END;

IF DB_ID('DBOficial_2') IS NULL
BEGIN
    CREATE DATABASE DBOficial_2;
END;
GO

/* =========================================================
   CREAR TABLAS EN DBOficial_1
   ========================================================= */

USE DBOficial_1;
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

    CONSTRAINT FK_oficial1_recinto_distribucion
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

    CONSTRAINT FK_oficial1_acta_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT FK_oficial1_acta_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto)
);
GO

CREATE TABLE usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    usuario VARCHAR(100) NOT NULL UNIQUE,
    rol VARCHAR(50) NOT NULL, -- TRANSCRIPTOR, NOTARIO, ADMIN, SISTEMA
    activo BIT DEFAULT 1
);
GO

INSERT INTO usuarios (nombre, usuario, rol, activo)
VALUES ('Sistema Automático', 'sistema', 'SISTEMA', 1);
GO

CREATE TABLE resultados_actas_oficial (
    id_oficial INT IDENTITY(1,1) PRIMARY KEY,

    codigo_mesa VARCHAR(50) NOT NULL,
    id_recinto INT NOT NULL,
    idDistribucion INT NOT NULL,

    fuente VARCHAR(50) NOT NULL, -- MANUAL, CSV, TXT

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

    createdAt DATETIME DEFAULT GETDATE(),
    createdByUser INT NOT NULL,

    updatedAt DATETIME NULL,
    updatedByUser INT NULL,

    CONSTRAINT FK_oficial1_resultado_acta
    FOREIGN KEY (codigo_mesa)
    REFERENCES actas_impresas(codigo_mesa),

    CONSTRAINT FK_oficial1_resultado_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto),

    CONSTRAINT FK_oficial1_resultado_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT FK_oficial1_created_user
    FOREIGN KEY (createdByUser)
    REFERENCES usuarios(id_usuario),

    CONSTRAINT FK_oficial1_updated_user
    FOREIGN KEY (updatedByUser)
    REFERENCES usuarios(id_usuario),

    CONSTRAINT CK_oficial1_papeletas
    CHECK (papeletas_anfora + papeletas_no_usadas = electores_habilitados),

    CONSTRAINT CK_oficial1_votos_anfora
    CHECK (votos_validos + votos_nulos = papeletas_anfora),

    CONSTRAINT CK_oficial1_votos_validos
    CHECK (
        primer_partido + segundo_partido + tercer_partido + cuarto_partido + votos_blancos = votos_validos
    )
);
GO

CREATE UNIQUE INDEX UX_oficial1_codigo_mesa
ON resultados_actas_oficial(codigo_mesa);
GO

CREATE TABLE logs_oficial (
    id_log INT IDENTITY(1,1) PRIMARY KEY,
    codigo_mesa VARCHAR(50),
    id_usuario INT NULL,
    tipo_error VARCHAR(100),
    detalle TEXT,
    fecha_log DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_oficial1_log_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
);
GO

/* =========================================================
   CREAR TABLAS EN DBOficial_2
   ========================================================= */

USE DBOficial_2;
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

    CONSTRAINT FK_oficial2_recinto_distribucion
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

    CONSTRAINT FK_oficial2_acta_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT FK_oficial2_acta_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto)
);
GO

CREATE TABLE usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    usuario VARCHAR(100) NOT NULL UNIQUE,
    rol VARCHAR(50) NOT NULL,
    activo BIT DEFAULT 1
);
GO

INSERT INTO usuarios (nombre, usuario, rol, activo)
VALUES ('Sistema Automático', 'sistema', 'SISTEMA', 1);
GO

CREATE TABLE resultados_actas_oficial (
    id_oficial INT IDENTITY(1,1) PRIMARY KEY,

    codigo_mesa VARCHAR(50) NOT NULL,
    id_recinto INT NOT NULL,
    idDistribucion INT NOT NULL,

    fuente VARCHAR(50) NOT NULL, -- MANUAL, CSV, TXT

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

    createdAt DATETIME DEFAULT GETDATE(),
    createdByUser INT NOT NULL,

    updatedAt DATETIME NULL,
    updatedByUser INT NULL,

    CONSTRAINT FK_oficial2_resultado_acta
    FOREIGN KEY (codigo_mesa)
    REFERENCES actas_impresas(codigo_mesa),

    CONSTRAINT FK_oficial2_resultado_recinto
    FOREIGN KEY (id_recinto)
    REFERENCES recintos_electorales(id_recinto),

    CONSTRAINT FK_oficial2_resultado_distribucion
    FOREIGN KEY (idDistribucion)
    REFERENCES distribucion_territorial(idDistribucion),

    CONSTRAINT FK_oficial2_created_user
    FOREIGN KEY (createdByUser)
    REFERENCES usuarios(id_usuario),

    CONSTRAINT FK_oficial2_updated_user
    FOREIGN KEY (updatedByUser)
    REFERENCES usuarios(id_usuario),

    CONSTRAINT CK_oficial2_papeletas
    CHECK (papeletas_anfora + papeletas_no_usadas = electores_habilitados),

    CONSTRAINT CK_oficial2_votos_anfora
    CHECK (votos_validos + votos_nulos = papeletas_anfora),

    CONSTRAINT CK_oficial2_votos_validos
    CHECK (
        primer_partido + segundo_partido + tercer_partido + cuarto_partido + votos_blancos = votos_validos
    )
);
GO

CREATE UNIQUE INDEX UX_oficial2_codigo_mesa
ON resultados_actas_oficial(codigo_mesa);
GO

CREATE TABLE logs_oficial (
    id_log INT IDENTITY(1,1) PRIMARY KEY,
    codigo_mesa VARCHAR(50),
    id_usuario INT NULL,
    tipo_error VARCHAR(100),
    detalle TEXT,
    fecha_log DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_oficial2_log_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
);
GO