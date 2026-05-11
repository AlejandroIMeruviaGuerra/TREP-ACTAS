import { useState } from "react";
import { getCurrentUser } from "../../../utils/auth";
import { uploadActaPhoto } from "../../../services/mobileScanService";
import "./MobileCameraPage.css";

function MobileCameraPage() {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  // Mejoramos el estado del mensaje para saber si es éxito o error
  const [message, setMessage] = useState({ text: "", type: "" }); 
  const [sending, setSending] = useState(false);

  const currentUser = getCurrentUser();

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    setMessage({ text: "", type: "" });

    if (!file) {
      clearPhoto();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Formato inválido. Solo se permiten imágenes.", type: "error" });
      clearPhoto();
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    // No borramos el mensaje si acaba de ser un éxito
  }

  async function handleUpload() {
    if (!photoFile) {
      setMessage({ text: "Primero toma o selecciona una foto.", type: "error" });
      return;
    }

    setSending(true);
    setMessage({ text: "", type: "" });

    const response = await uploadActaPhoto(
      photoFile,
      currentUser?.username || "usuario_movil"
    );

    setSending(false);

    if (!response.ok) {
      setMessage({ text: response.message || "No se pudo enviar la foto.", type: "error" });
      return;
    }

    setMessage({ text: "¡Acta enviada correctamente para su extracción!", type: "success" });
    setPhotoFile(null);
    setPhotoPreview("");
  }

  return (
    <div className="mca-root">
      <section className="mca-card">
        <div className="mca-header">
          <span className="mca-tag">Módulo de Captura</span>
          <h2>Digitalizar Acta</h2>
          <p>
            Asegúrate de que la foto esté nítida y el acta bien iluminada antes de enviarla.
          </p>
        </div>

        {/* Zona de Botones de Acción (Estilo App Nativa) */}
        {!photoPreview && (
          <div className="mca-action-grid">
            <label className={`mca-action-btn mca-camera-btn ${sending ? 'disabled' : ''}`}>
              <input
                type="file"
                accept="image/*"
                capture="environment" /* Abre la cámara trasera en móviles */
                onChange={handlePhotoChange}
                disabled={sending}
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <span>Usar Cámara</span>
            </label>

            <label className={`mca-action-btn mca-gallery-btn ${sending ? 'disabled' : ''}`}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                disabled={sending}
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>Abrir Galería</span>
            </label>
          </div>
        )}

        {/* Zona de Vista Previa Mejorada */}
        {photoPreview && (
          <div className="mca-preview-container">
            <div className="mca-preview-header">
              <h3>Documento capturado</h3>
              <button className="mca-clear-icon-btn" onClick={clearPhoto} disabled={sending} title="Descartar foto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>

            <div className="mca-image-wrapper">
              <img src={photoPreview} alt="Vista previa del acta" />
              {/* Overlay sutil para indicar que es un documento */}
              <div className="mca-scan-overlay"></div> 
            </div>

            <div className="mca-photo-details">
              <span className="mca-badge">{(photoFile.size / 1024 / 1024).toFixed(2)} MB</span>
              <span className="mca-filename">{photoFile.name}</span>
            </div>
          </div>
        )}

        {/* Mensajes dinámicos */}
        {message.text && (
          <div className={`mca-message mca-${message.type}`}>
            {message.type === 'error' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Footer flotante para el botón de envío en móviles */}
        <div className="mca-footer">
          <button
            className={`mca-send-button ${sending ? 'is-loading' : ''}`}
            onClick={handleUpload}
            disabled={sending || !photoFile}
          >
            {sending ? (
              <>
                <svg className="mca-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                Procesando...
              </>
            ) : (
              <>
                <span>Enviar al Sistema</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default MobileCameraPage;