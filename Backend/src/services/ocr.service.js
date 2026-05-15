import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de rutas para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonScriptPath = path.join(__dirname, '../ocr/scanner.py');
const tempDir = path.join(__dirname, '../../temp');

// Asegurar que la carpeta temp exista
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

export const procesarImagenOCR = (fileBuffer, originalName) => {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${originalName}`);
        
        // 1. Guardar el archivo temporal
        fs.writeFileSync(tempFilePath, fileBuffer);

        // 2. Ejecutar script de Python
        const pythonProcess = spawn('python', [pythonScriptPath, tempFilePath]);

        let dataExtraida = '';
        let errorSalida = '';

        pythonProcess.stdout.on('data', (data) => {
            dataExtraida += data.toString();
        });

        // --- LA MAGIA ESTÁ AQUÍ ---
        pythonProcess.stderr.on('data', (data) => {
            errorSalida += data.toString();
            // Esto obliga a Node.js a imprimir los "Rayos X" en tu consola
            console.log(data.toString()); 
        });
        // --------------------------

        pythonProcess.on('close', (code) => {
            // 3. Limpiar el archivo temporal
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            if (code !== 0) {
                return reject(new Error(`Error ejecutando Python: ${errorSalida}`));
            }

            try {
                // 4. Devolver el JSON estructurado
                const jsonData = JSON.parse(dataExtraida);
                if (jsonData.error) {
                    return reject(new Error(jsonData.error));
                }
                resolve(jsonData);
            } catch (error) {
                reject(new Error(`Error parseando respuesta de Python: ${dataExtraida}`));
            }
        });
    });
};