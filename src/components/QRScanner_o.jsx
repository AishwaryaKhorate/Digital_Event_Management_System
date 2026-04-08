import { Html5Qrcode } from "html5-qrcode";
import { useEffect } from "react";

export default function QRScanner({ onScanSuccess, onClose }) {

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        onScanSuccess(decodedText);  // send scanned value back
        scanner.stop();
      },
      (error) => {}
    );

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScanSuccess]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Scan QR Code</h2>
        <div id="reader" style={{ width: "100%" }}></div>

        <button style={styles.closeBtn} onClick={onClose}>
          Close Scanner
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000
  },
  modal: {
    width: "400px",
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    textAlign: "center"
  },
  closeBtn: {
    marginTop: "15px",
    padding: "10px 15px",
    border: "none",
    background: "#ff4444",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer"
  }
};
