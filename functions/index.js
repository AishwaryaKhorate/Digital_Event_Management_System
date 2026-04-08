const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const nodemailer = require('nodemailer');
const QRCode = require("qrcode");
const crypto = require("crypto"); // Built-in Node module
const Razorpay = require("razorpay");

// Initialize Razorpay with secrets


// Only load dotenv if we are running locally
if (!process.env.FUNCTION_NAME && !process.env.K_SERVICE) {
    require('dotenv').config();
}

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

setGlobalOptions({
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60 
});

// --- HELPER: Get Transporter (Safely reads secrets inside functions) ---
function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER || process.env.EMAIL_USER,
            pass: process.env.GMAIL_PASS || process.env.EMAIL_PASS,
        }
    });
}

// --- HELPER: Create Admin Notification ---
async function createAdminNotification(title, body, type = 'info') {
    try {
        await db.collection('notifications').add({
            title,
            body,
            type,
            read: false,
            userId: null,
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        logger.error("Notification Error:", err);
    }
}

// --- HELPER: Send Invitation Email ---
async function sendInvitationEmail(email, link) {
    const transporter = getTransporter();
    const sender = process.env.GMAIL_USER || process.env.EMAIL_USER;
    const mailOptions = {
        from: `Digi Event Team <${sender}>`,
        to: email,
        subject: 'You are invited to be an Organizer for Digi Event!',
        html: `
            <h2>Welcome to the Team!</h2>
            <p>You have been invited to manage events as an Organizer.</p>
            <a href="${link}" style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px;">
                Set Password and Access Dashboard
            </a>
            <p>Thanks,<br>The Digi Event Team</p>`
    };
    return transporter.sendMail(mailOptions);
}

// 1. UPDATE USER ROLE
exports.updateUserRoleSecure = onCall(async (request) => {
    const { userId, newRole, userName } = request.data; 
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Admin only.');
    }
    await admin.auth().setCustomUserClaims(userId, { role: newRole });
    await db.collection('users').doc(userId).update({ role: newRole });
    await createAdminNotification("Role Updated", `User ${userName} is now a ${newRole}`, "user_update");
    return { status: 'success' };
});

// 2. DELETE USER
exports.deleteUserSecure = onCall(async (request) => {
    const { userId, userName } = request.data;
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Admin only.');
    }
    try {
        await admin.auth().deleteUser(userId);
        await db.collection('users').doc(userId).delete();
        await createAdminNotification("User Deleted", `The account for ${userName } was permanently removed.`, "alert");
        return { status: 'success' };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

// 3. INVITE ORGANIZER
exports.inviteOrganizerSecure = onCall({
    secrets: ["GMAIL_USER", "GMAIL_PASS"] 
}, async (request) => {
    const { email } = request.data;
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Admin only.');
    }
    try {
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
        } catch (e) {
            user = await admin.auth().createUser({ email, emailVerified: false });
        }
        await admin.auth().setCustomUserClaims(user.uid, { role: 'organizer' });
        const link = await admin.auth().generatePasswordResetLink(email, {
            url: `http://localhost:5173/signup`,
            handleCodeInApp: true
        });
        await db.collection('users').doc(user.uid).set({
            email, role: 'organizer', createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await sendInvitationEmail(email, link);
        await createAdminNotification("Organizer Invited", `Invitation sent to ${email}`, "organizer_invite");
        return { status: 'success' };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

// 4. SUBMIT EVENT
exports.submitEventSecure = onCall(async (request) => {
    const eventData = request.data;
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
    try {
        const newEvent = {
            ...eventData,
            organizerId: request.auth.uid,
            organizerName: eventData.organizerName || "Unknown",
            organizerEmail: eventData.organizerEmail || request.auth.token.email,
            status: "pending", 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const docRef = await db.collection('events').add(newEvent);
        await createAdminNotification("New Pending Event", `Organizer ${newEvent.organizerName} submitted: ${eventData.name}`, "alert");
        return { status: 'success', eventId: docRef.id };
    } catch (error) {
        throw new HttpsError('internal', 'Failed to save event.');
    }
});

// 5. UPDATE EVENT STATUS
exports.updateEventStatusSecure = onCall(async (request) => {
    const { eventId, status, rejectionReason } = request.data;
    if (request.auth?.token?.role !== 'admin') throw new HttpsError('permission-denied', 'Admin only.');
    try {
        const updateData = { status };
        if (status === "rejected") updateData.rejectionReason = rejectionReason || "No reason provided";
        await db.collection('events').doc(eventId).update(updateData);
        const eventSnap = await db.collection('events').doc(eventId).get();
        const eventData = eventSnap.data();
        await db.collection('notifications').add({
            userId: eventData.organizerId, 
            title: status === "approved" ? "✅ Event Approved" : "❌ Event Rejected",
            body: status === "approved" ? `Your event "${eventData.name}" is approved!` : `Rejected: ${rejectionReason}`,
            type: status === "approved" ? "success" : "alert",
            read: false,
            createdAt: new Date().toISOString()
        });
        return { status: 'success' };
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

// 6. SEND QR CODE
exports.sendRegistrationQR = onCall({
    secrets: ["GMAIL_USER", "GMAIL_PASS"]
}, async (request) => {
    const { registrationId, submittedByEmail, eventName, qrImageBase64, participantNames } = request.data;
    const sender = process.env.GMAIL_USER || process.env.EMAIL_USER;
    const transporter = getTransporter();
    
    try {
        const regRef = db.collection('registrations').doc(registrationId);
        const regSnap = await regRef.get();
        
        // 🛡️ DUPLICATE GUARD: If 'qrSent' is true, exit immediately.
        if (regSnap.exists && regSnap.data().qrSent === true) {
            logger.info(`QR already sent for Registration: ${registrationId}. Skipping.`);
            return { success: true, message: "QR already sent previously." };
        }

        // Format names for the email (e.g., "Rahul, Sneha & Amit")
        const teamNames = Array.isArray(participantNames) ? participantNames.join(", ") : "Team Member";

       const mailOptions = {
    from: `Digi Event Team <${sender}>`,
    to: submittedByEmail,
    subject: `Group Entry Pass: ${eventName}`,
   html: `
<div style="background-color:#f4f4f4;padding:20px;font-family:Arial,Segoe UI,sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0"
    style="max-width:500px;background:#ffffff;border:2px solid #1e3a8a;border-radius:14px;">
    
    <tr>
      <td style="padding:24px 26px 20px 26px;">

        <!-- Title -->
        <h2 style="
          margin:0 0 12px 0;
          font-size:22px;
          color:#1e3a8a;
          text-align:center;
          line-height:1.3;">
          Team Entry Pass
        </h2>

        <!-- Event + Participants -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr>
            <td style="font-size:14px;color:#555;line-height:1.4;padding:2px 0;">
              <strong>Event:</strong> <span style="color:#000;">${eventName}</span>
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#555;line-height:1.4;padding:2px 0;">
              <strong>Participants:</strong> <span style="color:#000;">${teamNames}</span>
            </td>
          </tr>
        </table>

        <!-- Note -->
        <div style="
          margin:10px 0 14px 0;
          padding:8px 10px;
          font-size:12.5px;
          line-height:1.4;
          color:#c62828;
          background:#fff5f5;
          border:1px dashed #c62828;
          border-radius:6px;
          text-align:center;">
          <strong>Note:</strong> This single QR code will check in the entire team at once.
        </div>

        <!-- QR -->
        <div style="text-align:center;margin:12px 0 10px 0;">
          <img src="cid:qrCodeImage"
            width="220"
            style="display:block;margin:0 auto;border:1px solid #eee;"
            alt="QR Code"/>
        </div>

        <!-- Footer -->
        <p style="
          margin:0;
          font-size:11.5px;
          color:#888;
          text-align:center;
          line-height:1.3;">
          Generated by Digi Event Team
        </p>

      </td>
    </tr>
  </table>
</div>
`,
    attachments: [{
        filename: `Ticket_${eventName}.png`,
        content: qrImageBase64.split("base64,")[1],
        encoding: 'base64',
        cid: 'qrCodeImage'
    }]
};

        // Send the email
        await transporter.sendMail(mailOptions);

        // ✅ MARK AS SENT: Update Firestore so this function never sends it again
        await regRef.set({ qrSent: true }, { merge: true });

        return { success: true };
    } catch (error) {
        logger.error("QR Send Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

// 7. FIRESTORE TRIGGER: Feedback
exports.onFeedbackCreated = onDocumentCreated("feedback/{feedbackId}", async (event) => {
    const data = event.data.data();
    if (!data) return;
    
    const eventName = data.event || "General Platform";
    const stars = data.stars || 0;
    const userName = data.name || 'A student';

    // 1. Notify Admin (userId: null)
    await createAdminNotification(
        "New Feedback Received",
        `New ${stars}-star feedback from ${userName} for ${eventName}.`,
        "info"
    );

    // 2. Notify Organizer (Real-time trigger for Organizer's Red Dot)
    if (data.organizerId) {
        await db.collection('notifications').add({
            userId: data.organizerId, // This triggers the Navbar Red Dot
            title: "⭐ New Event Feedback",
            body: `${userName} left a ${stars}-star review for "${eventName}"`,
            type: "success", // Green background in your UI
            read: false,
            createdAt: new Date().toISOString() // Required for relativeTime()
        });
    }
});

// 8. FIRESTORE TRIGGER: Highlights
exports.onStudentHighlightCreated = onDocumentCreated(
  "highlights/{highlightId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Only notify if a student uploads and there is an organizer linked
    if (data.role !== "student") return;
    if (!data.organizerId) return;

    const studentName = data.userName || "A student";
    const eventName = data.eventName || "your event";

    await db.collection("notifications").add({
      userId: data.organizerId, // This triggers the Navbar Red Dot
      title: "📸 New Student Highlight",
      body: `${studentName} shared a moment from "${eventName}".`,
      type: "user_update", // Blue background in your UI
      read: false,
      createdAt: new Date().toISOString()
    });
  }
);


// ======================================================================
// 9. CERTIFICATE GENERATION SECTION (PERFECTED)
// ======================================================================
exports.generateAndSendCertificates = onCall({
    memory: '1GiB',
    timeoutSeconds: 300,
    secrets: ["GMAIL_USER", "GMAIL_PASS"]
}, async (request) => {
    const { eventName  } = request.data;
    
    // 1. Check Auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Login required.');
    }

    // 2. Setup Transporter inside the function to use Secrets
    const sender = process.env.GMAIL_USER || process.env.EMAIL_USER;
    const transporter = getTransporter();

    try {
      // ✅ VERIFY SMTP ONCE (CORRECT PLACE)
      await new Promise((resolve, reject) => {
        transporter.verify((error, success) => {
          if (error) {
            console.error("SMTP CONNECTION FAILED:", error);
            reject(error);
          } else {
            console.log("SMTP READY: Email service is working");
            resolve(success);
          }
        });
      });

      // 1️⃣ Fetch all registrations for event
const regSnap = await db
  .collection('registrations')
  .where('eventName', '==', eventName)
  .get();

// 2️⃣ ADD COUNTERS HERE
let sent = 0;
let skipped = 0;

// 3️⃣ LOOP THROUGH REGISTRATIONS
for (const regDoc of regSnap.docs) {
  const docId = regDoc.id;
  const regData = regDoc.data();

  const updatedParticipants = [...regData.participants];
  let wasUpdated = false;
const dateText = regData.date || new Date().toLocaleDateString('en-GB');
  const { createCanvas } = require("canvas");
const width = 1200;
const height = 850;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// 4️⃣ LOOP THROUGH PARTICIPANTS
      for (let i = 0; i < updatedParticipants.length; i++) {
        const p = updatedParticipants[i];

        // ✅ VALIDATION
        if (p.attendanceStatus !== "Present") {
          skipped++;
          continue;
        }

        if (p.certificateGenerated === true) {
          skipped++;
          continue;
        }

        const crypto = require("crypto");

const certificateId =
  "SGI-" +
  crypto.randomBytes(6).toString("hex") +
  "-" +
  Date.now();

// Change this line in your Cloud Function
const verifyUrl = `https://digi-event-seven.vercel.app/verify?cid=${certificateId}`;
const verificationHash = crypto
  .createHash("sha256")
  .update(certificateId + p.email + regData.eventName)
  .digest("hex");
const qrDataUrl = await QRCode.toDataURL(verifyUrl);


          // ---------- CERTIFICATE DESIGN ----------
          ctx.fillStyle = '#ffffff';
          ctx.clearRect(0, 0, width, height);
          ctx.fillRect(0, 0, width, height);

          ctx.strokeStyle = '#1e3a8a';
          ctx.lineWidth = 30;
          ctx.strokeRect(15, 15, width - 30, height - 30);

          ctx.strokeStyle = '#C5A059';
          ctx.lineWidth = 5;
          ctx.strokeRect(45, 45, width - 90, height - 90);

          ctx.textAlign = 'center';

          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 50px serif';
          ctx.fillText('SANJAY GHODAWAT INSTITUTE', width / 2, 120);

          ctx.fillStyle = '#333';
          ctx.font = '22px sans-serif';
          ctx.fillText(
            'Approved by A.I.C.T.E, New Delhi and DTE Mumbai',
            width / 2,
            155
          );

          ctx.fillStyle = '#C5A059';
          ctx.font = 'italic bold 75px serif';
          ctx.fillText('Certificate of Participation', width / 2, 280);

          ctx.fillStyle = '#444';
          ctx.font = '28px sans-serif';
          ctx.fillText('This is to certify that', width / 2, 350);

          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 70px serif';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 4;
          ctx.fillText(p.name.toUpperCase(), width / 2, 440);

          ctx.shadowBlur = 0;

          ctx.fillStyle = '#444';
          ctx.font = '26px sans-serif';
          ctx.fillText(`from ${p.college || "SGI"}`, width / 2, 500);
          ctx.fillText('has successfully participated in the event', width / 2, 545);

          ctx.fillStyle = '#b91c1c';
          ctx.font = 'bold 50px sans-serif';
          ctx.fillText(`"${regData.eventName}"`, width / 2, 610);

          const dateText = regData.date || new Date().toLocaleDateString();
          ctx.fillStyle = '#666';
          ctx.font = '20px sans-serif';
          ctx.fillText(`Date: ${dateText}`, width / 2, 670);

          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(150, 750); ctx.lineTo(400, 750);
          ctx.moveTo(800, 750); ctx.lineTo(1050, 750);
          ctx.stroke();

          ctx.fillStyle = '#333';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('Event Coordinator', 275, 780);
          ctx.fillText('Director / Principal', 925, 780);

const { loadImage } = require("canvas");
const qrImage = await loadImage(qrDataUrl);

// === QR in TOP RIGHT CORNER ===
const qrSize = 150;

// place QR inside golden border at top-right
const qrX = width - qrSize - 40;  // 70px from right side
const qrY = 70;                   // 70px from top border

ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

// text under QR
ctx.font = "14px sans-serif";
ctx.fillStyle = "#555";
ctx.textAlign = "center";
ctx.fillText("Scan to Verify", qrX + qrSize / 2, qrY + qrSize + 20);


          // ---------- STORAGE ----------
          const certBuffer = canvas.toBuffer('image/png');
          const fileName = `certificates/${docId}_${p.email.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          const file = admin.storage().bucket().file(fileName);

          await file.save(certBuffer, {
            metadata: { contentType: 'image/png' },
            public: true
          });

          const publicUrl = file.publicUrl();

          // ---------- EMAIL ----------
          await transporter.sendMail({
    from: `"SGI DigiEvent" <${sender}>`,
    to: p.email,
    subject: `Certificate of Participation: ${regData.eventName}`,
    html: `
<div style="background:#f4f6f8;padding:20px;font-family:Segoe UI,Arial,sans-serif;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0"
    style="max-width:560px;background:#ffffff;border-radius:12px;border-top:6px solid #1e3a8a;">
    
    <tr>
      <td style="padding:26px 28px 22px 28px;text-align:center;">

        <!-- Icon -->
        <div style="font-size:34px;line-height:1;margin-bottom:10px;">🎓</div>

        <!-- Title -->
        <h2 style="
          margin:0 0 6px 0;
          font-size:22px;
          color:#1e3a8a;
          line-height:1.3;">
          Congratulations, ${p.name}!
        </h2>

        <!-- Message -->
        <p style="
          margin:0;
          font-size:14.5px;
          color:#444;
          line-height:1.5;">
          Your <strong>Certificate of Participation</strong> for
        </p>

        <p style="
          margin:4px 0 12px 0;
          font-size:15px;
          font-weight:600;
          color:#b91c1c;
          line-height:1.4;">
          "${regData.eventName}"
        </p>

        <!-- Button -->
        <table align="center" cellpadding="0" cellspacing="0" style="margin:14px auto 10px auto;">
          <tr>
            <td style="background:#1e3a8a;border-radius:6px;">
              <a href="${publicUrl}"
                style="
                  display:inline-block;
                  padding:12px 22px;
                  font-size:14px;
                  font-weight:600;
                  color:#ffffff;
                  text-decoration:none;">
                Download Certificate
              </a>
            </td>
          </tr>
        </table>

        <!-- Info -->
        <p style="
          margin:0;
          font-size:12.5px;
          color:#666;
          line-height:1.4;">
          The certificate is also attached as a high-resolution image.
        </p>

        <!-- Divider -->
        <hr style="border:none;border-top:1px solid #eee;margin:18px 0;">

        <!-- Footer -->
        <p style="
          margin:0;
          font-size:12.5px;
          color:#777;
          line-height:1.4;">
          Regards,<br>
          <strong>SGI DigiEvent Team</strong><br>
          Sanjay Ghodawat Institute
        </p>

      </td>
    </tr>
  </table>
</div>
`,
    attachments: [{
        filename: `${regData.eventName}_Certificate.png`,
        content: certBuffer,
        contentType: 'image/png'
    }]
});
// 🔍 Find friend by email
const userSnap = await db
  .collection("users")
  .where("email", "==", p.email)
  .limit(1)
  .get();

if (!userSnap.empty) {
  const userId = userSnap.docs[0].id;

  // 🔢 Increase certificate count
  await db.collection("users").doc(userId).update({
    certificatesCount: admin.firestore.FieldValue.increment(1),
  });

  // 🔔 Save certificate notification
  await db.collection("notifications").add({
    userId,
    title: "🎓 Certificate Issued",
    body: `Your certificate for "${regData.eventName}" is now available.`,
    type: "certificate",
    read: false,
  createdAt: new Date().toISOString(),
  });
}

updatedParticipants[i].certificateGenerated = true;
        updatedParticipants[i].certificateUrl = publicUrl;
        wasUpdated = true;
        sent++;
        updatedParticipants[i].certificateId = certificateId;
updatedParticipants[i].verificationUrl = verifyUrl;
updatedParticipants[i].verificationHash = verificationHash;

      }

      // 5️⃣ UPDATE REGISTRATION ONLY IF NEEDED
      if (wasUpdated) {
        await db.collection('registrations').doc(docId).update({
          participants: updatedParticipants,
          lastProcessed: new Date().toISOString(),
          date: dateText // ✅ ADD THIS LINE: This saves the date to Firestore
        });
      }
    }

    // 6️⃣ FINAL RESPONSE
    return {
      success: true,
      sent,
      skipped,
      message: "Certificate release completed"
    };

  } catch (error) {
    console.error("CERT_FAIL:", error);
    throw new HttpsError('internal', error.message);
  }
});
// 10. Event Approved Trigger
exports.onEventApproved = onDocumentUpdated("events/{eventId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (after.status === "approved" && before.status !== "approved") {
        const studentsSnap = await db.collection("users").where("role", "==", "student").get();
        const batch = db.batch();
        studentsSnap.forEach((userDoc) => {
            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
                userId: userDoc.id, title: "🎉 New Event!", body: `${after.name} is now live!`, type: "event_approved", read: false, createdAt: new Date().toISOString()
            });
        });
        return batch.commit();
    }
});

// 11. Official Highlight Trigger
exports.onOfficialHighlightCreated = onDocumentCreated("highlights/{highlightId}", async (event) => {
    const data = event.data.data();

    // 1. Only run if the role is "organizer"
    if (!data || data.role !== "organizer") {
        return null; 
    }

    try {
        // 2. Fetch every user who is a student
        const studentsSnap = await db.collection("users")
            .where("role", "==", "student")
            .get();

        if (studentsSnap.empty) {
            console.log("No students found to notify.");
            return null;
        }

        const batch = db.batch();

        // 3. Create a notification for each student
        studentsSnap.forEach((userDoc) => {
            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
                userId: userDoc.id,
                title: "📸 Official Highlight",
                body: `An organizer shared a new moment: ${data.title}`,
                read: false,
                createdAt: new Date().toISOString(),
                type: "highlight"
            });
        });

        console.log(`Notifying ${studentsSnap.size} students.`);
        return batch.commit();

    } catch (error) {
        console.error("Notification Error:", error);
        return null;
    }
});


// 12. Attendance Trigger
exports.onAttendanceMarked = onDocumentUpdated(
  "registrations/{regId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after || !after.participants) return;

    for (let i = 0; i < after.participants.length; i++) {
      const beforeP = before.participants[i];
      const afterP = after.participants[i];

      // Absent → Present
      if (
        beforeP?.attendanceStatus !== "Present" &&
        afterP?.attendanceStatus === "Present"
      ) {
        // 🔍 Find friend by email
        const userSnap = await db
          .collection("users")
          .where("email", "==", afterP.email)
          .limit(1)
          .get();

        if (userSnap.empty) continue;

        const userId = userSnap.docs[0].id;

        // 🔢 Increase attendance count
        await db.collection("users").doc(userId).update({
          attendedCount: admin.firestore.FieldValue.increment(1),
        });

        // 🔔 Save notification NOW
        await db.collection("notifications").add({
          userId,
          title: "✅ Attendance Marked",
          body: `You were marked present for "${after.eventName}".`,
          type: "attendance_confirmed",
          read: false,
      createdAt: new Date().toISOString(),
        });
      }
    }
  }
);


// 13. Chatbot
exports.chatbotReply = require("./chatbot").chatbotReply;


// 14. CREATE RAZORPAY ORDER
exports.createRazorpayOrder = onCall({
    secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to register.');
    }

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount, currency = "INR" } = request.data;

    try {
        const options = {
            amount: amount * 100, // convert to paise
            currency: currency,
            receipt: `reg_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        return { orderId: order.id };
    } catch (error) {
        logger.error("Razorpay Order Error:", error);
        throw new HttpsError('internal', error.message);
    }
});



// 15. VERIFY PAYMENT AND SAVE REGISTRATION
exports.verifyRazorpayPayment = onCall({
    secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"]
}, async (request) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        registrationData 
    } = request.data;

    // 1. Verify the signature to prevent fraud
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        throw new HttpsError("invalid-argument", "Transaction signature is invalid.");
    }

    // 2. Transactional Update (Save Registration + Increment Seats)
    try {
        const registrationId = `REG-${Date.now()}`;
        const eventRef = db.collection("events").doc(registrationData.eventId);

        await db.runTransaction(async (transaction) => {
            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists) throw new Error("Event not found!");

            const eventData = eventDoc.data();
            const currentCount = eventData.currentRegistrations || 0;
            const max = parseInt(eventData.maxSeats) || 0;

            if (max > 0 && currentCount >= max) {
                throw new Error("Seats filled while processing payment.");
            }

            // Save the registration document
            const newRegRef = db.collection("registrations").doc(registrationId);
            transaction.set(newRegRef, {
                ...registrationData,
                registrationId,
                status: "Confirmed",
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update the event counter
            transaction.update(eventRef, {
currentRegistrations: currentCount + (registrationData.participants?.length || 1)            });
        });

        return { success: true, registrationId };
    } catch (error) {
        logger.error("Payment Verification Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

// 16. Edit Event page
exports.updateEventSecure = onCall(async (request) => {
    const { eventId, ...updatedData } = request.data;

    if (!request.auth) throw new HttpsError("unauthenticated", "Unauthorized");

    const eventRef = admin.firestore().collection("events").doc(eventId);
    const snap = await eventRef.get();

    if (!snap.exists) throw new HttpsError("not-found", "Event not found");

    const event = snap.data();

    if (event.organizerId !== request.auth.uid)
        throw new HttpsError("permission-denied", "Not event owner");

    if (event.status !== "pending")
        throw new HttpsError("failed-precondition", "Event already approved. Cannot edit");

    await eventRef.update({
        ...updatedData,
        updatedAt: new Date().toISOString()
    });

    return { success: true };
});

