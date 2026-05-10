import { procesarSMSRecibido } from "../services/sms.service.js";

export async function recibirSMSWebhook(req, res) {
    try {
        console.log("SMS recibido desde Twilio:", req.body);

        const resultado = await procesarSMSRecibido(req.body);

        console.log("Resultado SMS:", resultado);

        res.set("Content-Type", "text/xml");

        if (!resultado.ok) {
            return res.status(200).send(`
<Response>
  <Message>${resultado.message}</Message>
</Response>
      `.trim());
        }

        return res.status(200).send(`
<Response>
  <Message>SMS procesado correctamente</Message>
</Response>
    `.trim());
    } catch (error) {
        console.error("Error en webhook SMS:", error);

        res.set("Content-Type", "text/xml");

        return res.status(200).send(`
<Response>
  <Message>Error procesando SMS</Message>
</Response>
    `.trim());
    }
}