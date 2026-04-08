// src/components/ScannerUI.jsx
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";

/*
 Props:
  - eventId (string)          : required
  - onClose ()                : optional
  - onMarked (attendanceObj)  : optional
  - backendUrl (string)       : optional
*/

export default function ScannerUI({
  eventId,
  onClose = () => {},
  onMarked = () => {},
  backendUrl = null,
}) {
  if (!eventId) throw new Error("ScannerUI: eventId prop is required");

  const MOUNT_ID = "scanner-html5-qrcode";
  const scannerRef = useRef(null);
  const [statusText, setStatusText] = useState("Initializing...");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recent, setRecent] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [lastDecoded, setLastDecoded] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    listCameras().then(() => startScanner());
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVisibility() {
    if (document.hidden) {
      await stopScanner();
    } else {
      await startScanner();
    }
  }
  function handleResize() {
    if (running) restartScanner();
  }

  async function listCameras() {
    try {
      const cams = await Html5Qrcode.getCameras();
      setDevices(cams || []);
      if (!selectedDeviceId && cams && cams.length) {
        const phoneKeywords = [
          "phone",
          "vivo",
          "samsung",
          "android",
          "pixel",
          "oneplus",
          "xiaomi",
          "oppo",
          "huawei",
          "moto",
        ];
        function looksLikePhone(label = "") {
          const L = (label || "").toLowerCase();
          return phoneKeywords.some((k) => L.includes(k));
        }
        const good = cams.find((c) => c.label && !looksLikePhone(c.label)) || cams[0];
        setSelectedDeviceId(good.deviceId);
      }
    } catch (err) {
      console.warn("listCameras err", err);
    }
  }

  function getQrBoxSize() {
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    const base = Math.floor(Math.min(420, Math.max(240, minSide * 0.56)));
    return { width: base, height: base };
  }

  async function startScanner() {
    if (!mountedRef.current) return;
    if (running) return;
    try {
      const html5QrCode = new Html5Qrcode(MOUNT_ID, false);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: getQrBoxSize,
        experimentalFeatures: { useBarCodeDetectorIfSupported: false },
      };

      const constraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : { facingMode: "environment" };

      await html5QrCode.start(constraints, config, onScanSuccess, onScanFailure);
      setRunning(true);
      setPaused(false);
      setStatusText("Point camera to QR code");

      setTimeout(() => fixVideoStyle(), 200);
    } catch (err) {
      console.error("startScanner error", err);
      if (err && /NotAllowedError|PermissionDeniedError/i.test(String(err))) {
        setStatusText("Camera permission denied. Allow camera in browser settings.");
      } else {
        setStatusText("Unable to access camera. Use a secure connection (HTTPS) or try another browser.");
      }
    }
  }

  async function restartScanner() {
    try {
      await stopScanner();
      await listCameras();
      await startScanner();
    } catch (e) {
      console.warn("restart failed", e);
    }
  }

  async function stopScanner() {
    const html5QrCode = scannerRef.current;
    if (!html5QrCode) return;
    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (err) {
      // ignore
    }
    scannerRef.current = null;
    setRunning(false);
    setPaused(false);
  }

  function onScanFailure(error) {
    // silent fail
  }

  async function onScanSuccess(decodedText, decodedResult) {
  if (!decodedText) return;
  
  // ⭐️ Strict debounce: if this matches the last one within 2 seconds, ignore
  if (decodedText === lastDecoded) return; 
  setLastDecoded(decodedText);

  try {
    // Immediately stop the camera logic to prevent light-speed double scans
    if (scannerRef.current) {
        await scannerRef.current.pause();
        setPaused(true);
    }
  } catch (e) {
    console.warn("Could not pause scanner", e);
  }

    setStatusText("Processing scan...");
    let payload;
    try {
      payload = JSON.parse(decodedText);
    } catch {
      payload = { token: decodedText };
    }

    if (backendUrl) {
      try {
        const resp = await axios.post(backendUrl, { eventId, token: decodedText });
        if (resp.data?.success) {
          const attendance = resp.data.attendance || { studentId: payload.studentId || payload.token, status: "present", payload };
          await markSuccess(attendance);
          return;
        } else {
          setStatusText(resp.data?.message || "Server rejected token");
        }
      } catch (err) {
        console.error("backend error", err);
        setStatusText("Network error while contacting server");
      }
      setTimeout(async () => {
        setLastDecoded(null);
        setStatusText("Point camera to QR code");
        try { await scannerRef.current.resume(); setPaused(false); } catch(e) {}
      }, 1200);
      return;
    }

    const studentKey = payload.rollNo || payload.roll || payload.studentId || payload.token;
    if (!studentKey) {
      setStatusText("QR doesn't contain student identifier");
      setTimeout(async () => {
        setLastDecoded(null);
        setStatusText("Point camera to QR code");
        try { await scannerRef.current.resume(); setPaused(false); } catch(e) {}
      }, 1200);
      return;
    }

    const key = `attendance_${eventId}`;
    const raw = localStorage.getItem(key);
    const db = raw ? JSON.parse(raw) : {};
    db[studentKey] = db[studentKey] || {};
    if (payload.name) db[studentKey].name = payload.name;
    if (payload.rollNo) db[studentKey].rollNo = payload.rollNo;
    db[studentKey].status = "present";
    db[studentKey].ts = Date.now();
    localStorage.setItem(key, JSON.stringify(db));

    const attendance = {
      studentId: studentKey,
      status: "present",
      payload,
      ts: db[studentKey].ts,
    };

    await markSuccess(attendance);
  }

  // inside ScannerUI.jsx - check this function!
async function markSuccess(attendance) {
    setShowSuccess(true);
    setStatusText("Marked Present ✔"); // Keep this for UI
    if (navigator.vibrate) navigator.vibrate(150);

    // Ensure there is NO window.alert() here. 
    // Only call onMarked(attendance);
    try { onMarked(attendance); } catch (e) { }
}

  async function fixVideoStyle() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    mount.style.position = "absolute";
    mount.style.inset = "0";
    mount.style.width = "100%";
    mount.style.height = "100%";
    mount.style.zIndex = 1;
    const video = mount.querySelector("video");
    if (video) {
      video.style.objectFit = "cover";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.transform = "none";
      video.style.zIndex = 1;
    }
    const canvas = mount.querySelector("canvas");
    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
  }

  // -------- gallery upload handling ----------
  async function onFileSelected(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setStatusText("Decoding image...");
    try {
      if (scannerRef.current && typeof scannerRef.current.scanFileV2 === "function") {
        const result = await scannerRef.current.scanFileV2(f, true);
        const decoded = result?.decodedText || result;
        if (decoded) {
          await handleDecodedFromFile(decoded);
          return;
        }
      } else {
        if (window.Html5Qrcode && typeof window.Html5Qrcode.getCameras === "function" && window.Html5Qrcode.scanFile) {
          const decoded = await window.Html5Qrcode.scanFile(f, true);
          if (decoded) { await handleDecodedFromFile(decoded); return; }
        }
        const text = await f.text();
        if (text && text.length < 1000) {
          await handleDecodedFromFile(text.trim());
          return;
        }
        throw new Error("Could not decode file (no support)");
      }
    } catch (err) {
      console.error("file decode err", err);
      alert("Unable to decode image. Try a clearer QR photo or use camera scanning.");
      setStatusText("Point camera to QR code");
      return;
    }
  }

  async function handleDecodedFromFile(decodedText) {
    setLastDecoded(decodedText);
    let payload;
    try { payload = JSON.parse(decodedText); } catch { payload = { token: decodedText }; }

    if (backendUrl) {
      try {
        const resp = await axios.post(backendUrl, { eventId, token: decodedText });
        if (resp.data?.success) {
          const attendance = resp.data.attendance || { studentId: payload.studentId || payload.token, status: "present", payload };
          await markSuccess(attendance);
          return;
        } else {
          setStatusText(resp.data?.message || "Server rejected token");
        }
      } catch (err) {
        setStatusText("Network error while contacting server");
        console.error(err);
      }
    }

   const studentKey = decodedText;
    if (!studentKey) { alert("Image does not contain recognizable student id"); return; }

    const key = `attendance_${eventId}`;
    const raw = localStorage.getItem(key);
    const db = raw ? JSON.parse(raw) : {};
    db[studentKey] = db[studentKey] || {};
    if (payload.name) db[studentKey].name = payload.name;
    db[studentKey].status = "present";
    db[studentKey].ts = Date.now();
    localStorage.setItem(key, JSON.stringify(db));

    await markSuccess({ studentId: studentKey, status: "present", payload });
  }

  // UI controls (with vibration)
  async function handlePause() {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.pause();
      setPaused(true);
      setStatusText("Paused");
      if (navigator.vibrate) navigator.vibrate([40, 30]);
    } catch {
      try { await stopScanner(); setPaused(true); setStatusText("Paused"); if (navigator.vibrate) navigator.vibrate(60); } catch{}
    }
  }
  async function handleResume() {
    if (!scannerRef.current) { await startScanner(); if (navigator.vibrate) navigator.vibrate(50); return; }
    try {
      await scannerRef.current.resume();
      setPaused(false);
      setStatusText("Point camera to QR code");
      if (navigator.vibrate) navigator.vibrate(50);
    } catch {
      try { await startScanner(); if (navigator.vibrate) navigator.vibrate(50); } catch(e){} }
  }
  async function changeCamera(deviceId) {
    setSelectedDeviceId(deviceId);
    try { await restartScanner(); } catch(e) { console.warn(e); }
  }

  // microcopy animated dots while scanning
  const ScanningMicrocopy = () => (
    <span aria-hidden style={{ marginLeft: 8, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
      Scanning
      <span style={{ marginLeft: 6, display: "inline-block", width: 36 }}>
        <span style={{ animation: "dots 1.2s steps(4, end) infinite", display: "inline-block" }}>...</span>
      </span>
    </span>
  );

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true">
      <style>{`
        /* hide accidental form inputs that might appear */
        [role="dialog"] input[type="text"], [role="dialog"] textarea { display:none !important; }

        /* small spinner animation */
        @keyframes ringSpin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }

        /* animated scan line movement */
        @keyframes scanMove {
          0% { transform: translateY(-48%); opacity: 0; }
          10% { opacity: 0.22; }
          50% { transform: translateY(0%); opacity: 0.9; }
          90% { opacity: 0.22; }
          100% { transform: translateY(48%); opacity: 0; }
        }

        /* animated dots for microcopy */
        @keyframes dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }

        /* ensure scanner mount and video fill */
        #${MOUNT_ID}, #${MOUNT_ID} video, #${MOUNT_ID} canvas {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          z-index: 1 !important;
        }
      `}</style>

      {/* camera mount for html5-qrcode */}
      <div id={MOUNT_ID} style={styles.cameraMount} />

      {/* frosted top bar */}
      <div style={styles.topBar}>
        <button onClick={async () => { await stopScanner(); onClose(); }} style={styles.topBtn} aria-label="Back">←</button>

        <div style={styles.topTitle}>Scan QR Code</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {devices.length > 0 && (
            <select
              aria-label="Select camera"
              value={selectedDeviceId || ""}
              onChange={(e) => changeCamera(e.target.value)}
              style={styles.select}
            >
              {devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
            </select>
          )}

          <button
            onClick={() => {
              setStatusText("Flash toggle (device support varies)");
              setTimeout(() => setStatusText("Point camera to QR code"), 900);
            }}
            style={styles.topBtn}
            aria-label="Toggle flash"
            title="Toggle flash (if supported)"
          >🔦</button>
        </div>
      </div>

      {/* center scanner frame */}
      <div style={styles.center}>
        <div style={styles.frameWrap}>
          <div style={styles.frameInner}>
            <div style={styles.cornerTL} />
            <div style={styles.cornerTR} />
            <div style={styles.cornerBL} />
            <div style={styles.cornerBR} />
            <div style={styles.pulseRing} />
            <div style={styles.scanLine} aria-hidden="true" />
            {!running && <div style={styles.loader}><div style={{ animation: "ringSpin 1.2s linear infinite" }}>◐</div></div>}
            <div style={styles.hintText}>{running ? <ScanningMicrocopy /> : "Point camera to QR code"}</div>
          </div>
        </div>
      </div>

      {/* bottom panel */}
      <div style={styles.bottom}>
        <div style={styles.statusRow}>
          <div style={styles.statusBubble}>{statusText}</div>

          <div style={styles.controls}>
            <label style={styles.uploadLabel}>
              📁 Upload
              <input type="file" accept="image/*" onChange={onFileSelected} style={{ display: "none" }} />
            </label>

            <button onClick={handlePause} style={{ ...styles.smallBtn, opacity: paused ? 0.6 : 1 }} disabled={paused}>Pause</button>
            <button onClick={handleResume} style={{ ...styles.smallBtn, background: "#0ea5e9", color: "#fff" }}>{paused ? "Resume" : "Resume"}</button>
          </div>
        </div>

        <div style={styles.bottomSheet}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Recent scans</div>
            <div style={{ marginTop: 8, minHeight: 36 }}>
              {recent.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 13 }}>No recent scans</div>
              ) : recent.map(r => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                  <div style={{ color: "#0f172a" }}>{r.name}</div>
                  <div style={{ color: "#6b7280" }}>{r.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 120, display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={async () => { await stopScanner(); onClose(); }} style={styles.smallBtn}>Close</button>
            <button onClick={() => alert("Help: Allow camera and select the device if necessary")} style={{ ...styles.smallBtn, background: "#0ea5e9", color: "#fff" }}>Help</button>
          </div>
        </div>
      </div>

      {/* success overlay */}
      {showSuccess && (
        <div style={styles.successOverlay}>
          <div style={styles.successCard}>
            <div style={{ fontSize: 28 }}>✔</div>
            <div style={{ marginTop: 8, fontWeight: 600 }}>Marked Present</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- styles ----------
const styles = {
  overlay: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.72)", display: "flex", flexDirection: "column", alignItems: "stretch" },
  cameraMount: { position: "absolute", inset: 0, zIndex: 1, background: "#000" },

  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 60,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", background: "rgba(0,0,0,0.28)", backdropFilter: "blur(6px)", color: "#fff",
  },
  topBtn: { background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 8, borderRadius: 10 },
  topTitle: { fontWeight: 600, fontSize: 16, color: "#fff", textAlign: "center" },
  select: { padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.28)", color: "#fff" },

  center: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 },
  frameWrap: { width: "min(68vw,420px)", height: "min(68vw,420px)", display: "flex", alignItems: "center", justifyContent: "center" },
  frameInner: { position: "relative", width: "100%", height: "100%", borderRadius: 20, border: "2px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cornerTL: { position: "absolute", left: 12, top: 12, width: 28, height: 28, borderLeft: "4px solid #38bdf8", borderTop: "4px solid #38bdf8", borderRadius: 6 },
  cornerTR: { position: "absolute", right: 12, top: 12, width: 28, height: 28, borderRight: "4px solid #38bdf8", borderTop: "4px solid #38bdf8", borderRadius: 6 },
  cornerBL: { position: "absolute", left: 12, bottom: 12, width: 28, height: 28, borderLeft: "4px solid #38bdf8", borderBottom: "4px solid #38bdf8", borderRadius: 6 },
  cornerBR: { position: "absolute", right: 12, bottom: 12, width: 28, height: 28, borderRight: "4px solid #38bdf8", borderBottom: "4px solid #38bdf8", borderRadius: 6 },
  pulseRing: { position: "absolute", width: "86%", height: "86%", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.04)", pointerEvents: "none" },

  // animated scan line
  scanLine: {
    position: "absolute",
    left: "6%",
    right: "6%",
    height: 3,
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(14,165,233,0.95) 40%, rgba(255,255,255,0.12) 60%, rgba(255,255,255,0) 100%)",
    zIndex: 6,
    boxShadow: "0 8px 30px rgba(14,165,233,0.12)",
    animation: "scanMove 2.0s linear infinite",
    pointerEvents: "none",
    transform: "translateY(-48%)"
  },

  loader: { position: "absolute", zIndex: 5, fontSize: 36, color: "rgba(255,255,255,0.9)" },
  hintText: { position: "absolute", bottom: 12, fontSize: 13, color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: 8 },

  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 60, padding: 12, display: "flex", flexDirection: "column", gap: 10 },
  statusRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  statusBubble: { background: "rgba(255,255,255,0.06)", color: "#fff", padding: "8px 12px", borderRadius: 999, fontSize: 13 },

  controls: { display: "flex", gap: 8, alignItems: "center" },

  // upload label styled to match theme (white text on dark)
  uploadLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 10,
    background: "#0f172a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 8px 24px rgba(2,6,23,0.12)"
  },

  // updated smallBtn - dark, visible, elevated
  smallBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#0f172a",    // dark slate
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    boxShadow: "0 6px 18px rgba(2,6,23,0.18)",
    transition: "transform .12s ease, box-shadow .12s ease",
  },

  bottomSheet: { display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 12, padding: 12, boxShadow: "0 12px 30px rgba(2,6,23,0.12)" },

  successOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 },
  successCard: { background: "rgba(255,255,255,0.98)", padding: 18, borderRadius: 12, display: "flex", alignItems: "center", flexDirection: "column", minWidth: 160, boxShadow: "0 20px 40px rgba(2,6,23,0.2)" },
};
