import { useState } from "react";
import { getCurrentUser } from "../../../utils/auth";
import { uploadActaPhoto } from "../../../services/mobileScanService";
import "./MobileCameraPage.css";

function MobileCameraPage() {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const currentUser = getCurrentUser();

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    setMessage("");

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Solo se permiten imágenes.");
      setPhotoFile(null);
      setPhotoPreview("");
      return;
    }

    setPhotoFile(file);

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreview(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    setMessage("");
  }

  async function handleUpload() {
    if (!photoFile) {
      setMessage("Primero toma o selecciona una foto.");
      return;
    }

    setSending(true);
    setMessage("");

    const response = await uploadActaPhoto(
      photoFile,
      currentUser?.username || "usuario_movil"
    );

    setSending(false);

    if (!response.ok) {
      setMessage(response.message || "No se pudo enviar la foto.");
      return;
    }

    setMessage("Foto enviada correctamente para extracción de datos.");
    setPhotoFile(null);
    setPhotoPreview("");
  }

  return (
    <div className="mca-root">
      <section className="mca-card">
        <div className="mca-header">
          <span className="mca-tag">Cámara móvil</span>
          <h2>Tomar foto de acta</h2>
          <p>
            Usa la cámara del celular para capturar el acta y enviarla al
            sistema.
          </p>
        </div>

        <label className="mca-camera-button">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
          />

          Abrir cámara
        </label>

        <label className="mca-gallery-button">
          <input type="file" accept="image/*" onChange={handlePhotoChange} />

          Seleccionar desde galería
        </label>

        {photoPreview && (
          <div className="mca-preview-box">
            <h3>Vista previa</h3>

            <img src={photoPreview} alt="Vista previa del acta" />

            <div className="mca-photo-info">
              <p>
                <b>Archivo:</b> {photoFile?.name}
              </p>

              <p>
                <b>Tamaño:</b>{" "}
                {photoFile ? (photoFile.size / 1024 / 1024).toFixed(2) : 0} MB
              </p>
            </div>

            <button className="mca-clear-button" onClick={clearPhoto}>
              Quitar foto
            </button>
          </div>
        )}

        {message && <div className="mca-message">{message}</div>}

        <button
          className="mca-send-button"
          onClick={handleUpload}
          disabled={sending || !photoFile}
        >
          {sending ? "Enviando..." : "Enviar foto"}
        </button>
      </section>
    </div>
  );
}

export default MobileCameraPage;