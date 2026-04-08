import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/navbar";
import QRCode from "qrcode";

export default function RegistrationSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState("");
  const qrData = state?.qrData;
    const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!qrData) return;
    // We encode the specific ID for the leader (index 0)
    const payload = `${qrData.registrationId}-0`; 

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H",
      width: 350,
      margin: 3,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrUrl);
  }, [qrData]);

  if (!qrData) return <div style={{ padding: 40 }}><h2>Invalid access</h2><button onClick={() => navigate("/explore")}>Go Back</button></div>;

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `${qrData.registrationId}.png`;
    link.click();
  };

  return (
    <div className="app-shell">
<Sidebar 
               isOpen={isSidebarOpen} 
               onClose={() => setIsSidebarOpen(false)} 
             />      
             <div className="content-area">
<Navbar onMenuClick={() => setIsSidebarOpen(true)} />
<main style={{ 
    flex: 0.3,                    // Takes up remaining height
    display: "flex", 
    flexDirection: "column", 
    justifyContent: "center",   // Centers vertically
    alignItems: "center",       // Centers horizontally
    textAlign: "center",
    padding: "10px",
    paddingTop: "60px"
}}></main>
                     <main style={{ padding: 40, textAlign: "center" }}>
          <h2>✅ Registration Successful</h2>
          <p><b>{qrData.eventName}</b></p>
          <p>Registration ID: <b>{qrData.registrationId}</b></p>
          <p>Date: {qrData.registeredDate}</p>
          <p>Time: {qrData.registeredTime}</p>
          {qrUrl && (
            <>
              <img src={qrUrl} alt="QR Code" style={{ margin: "20px 0", width: "260px", border: "6px solid #fff", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }} />
              <br />
              <button onClick={downloadQR} style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>⬇ Download QR Ticket</button>
            </>
          )}
          <span>        </span><button style={{ marginTop: 30, padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }} onClick={() => navigate("/explore")}>Back to Events</button>
        </main>
      </div>
    </div>
  );
}