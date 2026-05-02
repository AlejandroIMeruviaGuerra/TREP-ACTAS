import { useState } from "react";
import { getCurrentUser } from "../../../utils/auth";
import { uploadActaPdf } from "../../../services/mobileScanService";
import "./MobilePdfPage.css";

function MobilePdfPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const currentUser = getCurrentUser();

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setMessage("");

    if (!file) {
      setSelectedFile(null);
      setFileInfo(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setMessage("Solo se permite subir archivos PDF.");
      setSelectedFile(null);
      setFileInfo(null);
      return;
    }

    setSelectedFile(file);
    setFileInfo({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type,
    });
  }

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("Primero selecciona un PDF.");
      return;
    }

    setSending(true);
    setMessage("");

    const response = await uploadActaPdf(
      selectedFile,
      currentUser?.username || "usuario_movil"
    );

    setSending(false);

    if (!response.ok) {
      setMessage(response.message || "No se pudo enviar el PDF.");
      return;
    }

    setMessage("PDF enviado correctamente para revisión.");
    setSelectedFile(null);
    setFileInfo(null);
  }

  return (
    <div className="mpd-root">
      <section className="mpd-card">
        <div className="mpd-header">
          <span className="mpd-tag">Móvil</span>
          <h2>Escanear PDF de acta</h2>
          <p>
            Selecciona un archivo PDF desde el celular para enviarlo al sistema
            de procesamiento.
          </p>
        </div>

        <label className="mpd-upload-box">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />

          <div className="mpd-upload-content">
            <strong>Seleccionar PDF</strong>
            <span>Toca aquí para buscar el archivo en tu dispositivo</span>
          </div>
        </label>

        {fileInfo && (
          <div className="mpd-file-preview">
            <h3>Archivo seleccionado</h3>

            <p>
              <b>Nombre:</b> {fileInfo.name}
            </p>

            <p>
              <b>Tamaño:</b> {fileInfo.size} MB
            </p>

            <p>
              <b>Tipo:</b> PDF
            </p>
          </div>
        )}

        {message && <div className="mpd-message">{message}</div>}

        <button
          className="mpd-send-button"
          onClick={handleUpload}
          disabled={sending || !selectedFile}
        >
          {sending ? "Enviando..." : "Enviar PDF"}
        </button>
      </section>
    </div>
  );
}

export default MobilePdfPage;