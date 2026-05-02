require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const mobileRoutes = require("./api/mobile/mobile.routes");
app.use("/api/mobile", mobileRoutes);
// Conexión a Supabase usando las variables de tu .env
const supabase = createClient(process.env.NODO1_SUPABASE_URL, process.env.NODO1_SUPABASE_KEY);

app.post('/api/sms/webhook', async (req, res) => {
    const { telefono, texto_sms } = req.body;
    
    try {
        // 1. Validar Notario
        const { data: notario } = await supabase.from('notarios_autorizados').select('*').eq('telefono', telefono).single();
        if (!notario) return res.status(403).json({ error: 'Notario no autorizado' });

        // 2. Idempotencia (Hash SHA-256)
        const hash = crypto.createHash('sha256').update(telefono + texto_sms).digest('hex');

        // 3. Parser SMS (Mesa|Hab,Anf,NoU,Bla,Nul|Id:Votos,Id:Votos)
        const partes = texto_sms.split('|');
        const codigo_mesa = partes[0];
        const [hab, anf, nou, bla, nul] = partes[1].split(',').map(Number);
        const votos = partes[2].split(',').map(v => ({ id_p: Number(v.split(':')[0]), cant: Number(v.split(':')[1]) }));

        // 4. Validar Matemáticas
        let estado = ((anf + nou) === hab) && ((votos.reduce((a, b) => a + b.cant, 0) + bla + nul) === anf) ? 'VALIDA' : 'OBSERVADA';

        // 5. Inserción (Event Store primero)
        const { error: errEvent } = await supabase.from('event_store_trep').insert([{
            codigo_mesa, tipo_evento: 'SMS_RECEIVE', payload_original: texto_sms, hash_verificacion: hash
        }]);

        if (errEvent && errEvent.code === '23505') return res.status(200).json({ message: 'SMS Duplicado (Idempotencia)' });

        // 6. Carga de resultados
        await supabase.from('actas_trep').insert([{ codigo_mesa, papeletas_anfora: anf, papeletas_no_usadas: nou, votos_blancos: bla, votos_nulos: nul, estado_acta: estado }]);
        
        const detalle = votos.map(v => ({ codigo_mesa, id_partido: v.id_p, cantidad_votos: v.cant }));
        await supabase.from('detalle_votos_trep').insert(detalle);

        res.status(200).json({ message: 'Procesado y guardado en Supabase', estado });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

const puerto = process.env.PORT || 3001;
app.listen(puerto, () => console.log(`🚀 Microservicio SMS conectado a Supabase en el puerto ${puerto}`));