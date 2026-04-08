import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const certificateId = searchParams.get("cid");

  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!certificateId) {
      setStatus("invalid");
      return;
    }

    const verify = async () => {
      try {
        const snap = await getDocs(collection(db, "registrations"));
        let found = null;
        
// certificate verify update Feb 2026

        outerLoop:
for (const docSnap of snap.docs) {
  const reg = docSnap.data();

  for (const p of reg.participants || []) {
    if (p.certificateId === certificateId) {
      found = {
        name: p.name,
        college: p.college,
        eventName: reg.eventName,
        date: reg.date,
        certificateId
      };
      break outerLoop;
    }
  }
}


        if (!found) {
          setStatus("invalid");
        } else {
          setData(found);
          setStatus("valid");
        }
      } catch (err) {
        console.error(err);
        setStatus("invalid");
      }
    };

    verify();
  }, [certificateId]);

  if (status === "loading") {
    return <h2 style={{ textAlign: "center" }}>🔍 Verifying certificate...</h2>;
  }

  if (status === "invalid") {
    return (
      <div style={{ textAlign: "center", marginTop: 60 }}>
        <h1 style={{ color: "red" }}>❌ Invalid Certificate</h1>
        <p>This certificate does not exist in our records.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: "60px auto", padding: 20 }}>
      <h1 style={{ color: "green", textAlign: "center" }}>
        ✅ Certificate Verified
      </h1>

      <table style={{ width: "100%", marginTop: 30 }}>
        <tbody>
          <tr><td><b>Student Name</b></td><td>{data.name}</td></tr>
          <tr><td><b>College</b></td><td>{data.college}</td></tr>
          <tr><td><b>Event</b></td><td>{data.eventName}</td></tr>
          <tr><td><b>Date</b></td><td>{data.date}</td></tr>
          <tr><td><b>Certificate ID</b></td><td>{data.certificateId}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
