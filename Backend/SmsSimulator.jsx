import React, { useState } from 'react';

export default function SmsSimulator() {
  const [telefono, setTelefono] = useState('77123456'); // Notario autorizado
  const [mensaje, setMensaje] = useState('35000|589,500,89,10,10|1:200,2:150,3:130');
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEnvio = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLog({ type: 'info', text: 'Procesando SMS en el servidor...' });
    
    try {
      const response = await fetch('http://localhost:3001/api/sms/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, texto_sms: mensaje })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.message.includes('Duplicado')) {
          setLog({ type: 'warning', text: `⚠️ ${data.message}` });
        } else {
          setLog({ type: 'success', text: `✅ Éxito: ${data.message} (Estado: ${data.estado})` });
        }
      } else {
        setLog({ type: 'error', text: `❌ Error: ${data.error}` });
      }
    } catch (error) {
      setLog({ type: 'error', text: '❌ Error crítico: No se pudo conectar con el Backend. ¿Está corriendo en el puerto 3001?' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0d1117', color: '#c9d1d9', minHeight: '100vh', padding: '50px', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#161b22', padding: '35px', borderRadius: '12px', border: '1px solid #30363d', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        <h2 style={{ color: '#58a6ff', borderBottom: '1px solid #30363d', paddingBottom: '15px', marginTop: 0 }}>
          📱 Simulador TREP - SMS a la Nube
        </h2>
        
        <form onSubmit={handleEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '25px' }}>
          <div>
            <label style={{ display: 'block', color: '#8b949e', marginBottom: '8px', fontWeight: 'bold' }}>Teléfono del Notario:</label>
            <input 
              type="text" 
              value={telefono} 
              onChange={(e) => setTelefono(e.target.value)}
              style={{ width: '100%', padding: '14px', backgroundColor: '#010409', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', color: '#8b949e', marginBottom: '8px', fontWeight: 'bold' }}>Trama del SMS (Datos):</label>
            <textarea 
              rows="4"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              style={{ width: '100%', padding: '14px', backgroundColor: '#010409', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '6px', resize: 'none', fontSize: '16px', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
            <small style={{ color: '#8b949e', display: 'block', marginTop: '10px' }}>
              Formato: <strong>Mesa | Hab,Anf,NoUsadas,Bla,Nul | IdPart:Votos,IdPart:Votos</strong>
            </small>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '16px', 
              backgroundColor: loading ? '#23863680' : '#238636', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', 
              fontSize: '16px', 
              transition: 'background-color 0.2s' 
            }}
          >
            {loading ? 'Enviando a Supabase...' : 'Enviar SMS'}
          </button>
        </form>

        {log && (
          <div style={{ 
            marginTop: '30px', 
            padding: '20px', 
            backgroundColor: log.type === 'success' ? 'rgba(35, 134, 54, 0.1)' : log.type === 'error' ? 'rgba(248, 81, 73, 0.1)' : log.type === 'warning' ? 'rgba(210, 153, 34, 0.1)' : '#010409', 
            color: log.type === 'success' ? '#3fb950' : log.type === 'error' ? '#f85149' : log.type === 'warning' ? '#d29922' : '#c9d1d9', 
            border: `1px solid ${log.type === 'success' ? 'rgba(35, 134, 54, 0.4)' : log.type === 'error' ? 'rgba(248, 81, 73, 0.4)' : log.type === 'warning' ? 'rgba(210, 153, 34, 0.4)' : '#30363d'}`,
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            {log.text}
          </div>
        )}
      </div>
    </div>
  );
}