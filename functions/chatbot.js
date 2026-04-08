const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

/* ===============================
   TEXT NORMALIZATION
================================ */
function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ===============================
   ALL KEYWORD MATCH
================================ */
function matchAll(input, keywords = []) {
  return keywords.every(k => input.includes(k));
}

/* ===============================
   SAFE DATE HANDLER
================================ */
function getEventDate(event) {
  if (event.eventDate?.toDate) return event.eventDate.toDate();
  if (event.date) {
    const d = new Date(event.date);
    return isNaN(d) ? null : d;
  }
  return null;
}

function formatDate(event) {
  const d = getEventDate(event);
  return d ? d.toDateString() : "Date will be announced";
}

/* ===============================
   CHATBOT FUNCTION
================================ */
exports.chatbotReply = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const rawText = request.data.message || "";
    const input = normalize(rawText);
    
    // Set 'now' to help with strict date filtering
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!input) {
      return { reply: "Please ask a question 😊" };
    }

    /* STORE CHAT SESSION */
    const sessionRef = db
      .collection("user_chats")
      .doc(uid)
      .collection("sessions")
      .doc("default");

    await sessionRef.set(
      { updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    const messagesRef = sessionRef.collection("messages");

    await messagesRef.add({
      from: "user",
      text: rawText,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    let reply = "";

    // Fetch the events list once
    const eventsSnap = await db
      .collection("events")
      .where("status", "==", "approved")
      .get();
    
    const allEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    /* ===============================
       1️⃣ REGISTRATION HELP
    ================================ */
    if (matchAll(input, ["registeration"]) || input.includes("registration process") || input.includes("how to register") || input.includes("ragistration")) {
      reply = `📌 Event Registration Steps:

1️⃣ Go to Explore Events \n
2️⃣ Select the event \n
3️⃣ Click Register \n
4️⃣ Fill participant details \n 
5️⃣ Submit \n
6️⃣ QR code will be emailed \n\n

🎟️ QR is mandatory for entry.`;
    }

    /* ===============================
       2️⃣ MY REGISTRATIONS
    ================================ */
    else if (
      matchAll(input, ["my", "registration"]) ||
      matchAll(input, ["registered"]) ||
      matchAll(input, ["my", "events"])
    ) {
      const eventsMap = new Map();
      const directSnap = await db.collection("registrations").where("userId", "==", uid).get();
      directSnap.forEach(d => eventsMap.set(d.id, d.data().eventName));

      let groupSnap = [];
      try {
        const snap = await db.collection("registrations").where("participantsEmails", "array-contains", email).get();
        groupSnap = snap.docs;
      } catch (e) {}

      groupSnap.forEach(d => eventsMap.set(d.id, d.data().eventName));

      if (eventsMap.size === 0) {
        const allRegSnap = await db.collection("registrations").get();
        allRegSnap.forEach(doc => {
          const r = doc.data();
          r.participants?.forEach(p => {
            if (p.email === email) eventsMap.set(doc.id, r.eventName);
          });
        });
      }

      reply = eventsMap.size
        ? `📋 Your Registered Events:\n\n${[...eventsMap.values()].map(e => `• ${e}`).join("\n")}`
        : "📭 You have not registered for any events.";
    }

    /* ===============================
       3️⃣ CERTIFICATES
    ================================ */
    else if (matchAll(input, ["certificate"])) {
      const snap = await db.collection("registrations").get();
      const certs = [];
      snap.forEach(doc => {
        const r = doc.data();
        r.participants?.forEach(p => {
          if (p.email === email && p.certificateGenerated) certs.push(r.eventName);
        });
      });
      reply = certs.length
        ? `🎓 Certificates generated for:\n\n${certs.map(e => `• ${e}`).join("\n")}`
        : "⌛ Certificates are generated after attendance verification.";
    }

    /* ===============================
       4️⃣ DATE FILTERS (TODAY, PAST, MONTH, UPCOMING)
    ================================ */
 else if (input.includes("today")) {
      const todayStr = now.toDateString();
      const todayEvents = allEvents.filter(e => getEventDate(e)?.toDateString() === todayStr);
      reply = todayEvents.length 
        ? `📅 Today's Events:\n\n${todayEvents.map(e => `• ${e.name}`).join("\n")}` 
        : "📅 No events scheduled for today.";
    }
    else if (input.includes("past") || input.includes("history") || input.includes("yesterday")) {
      const pastEvents = allEvents.filter(e => {
          const d = getEventDate(e);
          return d && d < todayStart;
      });
      reply = pastEvents.length 
        ? `⏪ Past Events:\n\n${pastEvents.map(e => `• ${e.name} (${formatDate(e)})`).join("\n")}` 
        : "📅 No past events found.";
    }
    else if (input.includes("next month")) {
      // Logic for Next Month
      const nextMonth = (now.getMonth() + 1) % 12;
      const nextMonthYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
      
      const nextMonthEvents = allEvents.filter(e => {
        const d = getEventDate(e);
        return d && d.getMonth() === nextMonth && d.getFullYear() === nextMonthYear;
      });

      reply = nextMonthEvents.length 
        ? `🗓️ Events in Next Month:\n\n${nextMonthEvents.map(e => `• ${e.name} (${formatDate(e)})`).join("\n")}` 
        : "📅 No events found for next month.";
    }
    else if (input.includes("month") || input.includes("this month")) {
      const monthEvents = allEvents.filter(e => {
        const d = getEventDate(e);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      reply = monthEvents.length 
        ? `🗓️ Events this month:\n\n${monthEvents.map(e => `• ${e.name} (${formatDate(e)})`).join("\n")}` 
        : "📅 No events found for this month.";
    }
    else if (input.includes("upcoming") || matchAll(input, ["next", "event"])) {
      const upcoming = allEvents
        .filter(e => {
          const d = getEventDate(e);
          return d && d >= todayStart;
        })
        .sort((a, b) => getEventDate(a) - getEventDate(b));

      reply = upcoming.length
        ? `📅 Upcoming Events:\n\n${upcoming.map(e => `• ${e.name} — ${formatDate(e)}`).join("\n")}`
        : "📅 No upcoming events found.";
    }

    
   /* ===============================
   5️⃣ EVENT DETAILS & SEATS (FIXED)
================================ */

    else {
      // ✅ Use filter to find all events matching the name
      const matches = allEvents.filter(e => input.includes(normalize(e.name || e.title)));

      if (matches.length > 0) {
        // If user asks about seats, availability, or what's "left"
        if (input.includes("seat") || input.includes("available") || input.includes("slot") || input.includes("left")) {
          let seatInfo = "📊 **Seat Availability:**\n\n";
          
          for (const event of matches) {
            // ✅ MATCH FRONTEND LOGIC: Use maxSeats and currentRegistrations
            const maxSeats = parseInt(event.maxSeats) || parseInt(event.maxParticipants) || 0;
            const currentRegs = parseInt(event.currentRegistrations) || 0;
            
            const isFull = maxSeats > 0 && currentRegs >= maxSeats;
            const available = maxSeats > 0 ? (maxSeats - currentRegs) : null;

            seatInfo += `🔹 **${event.name || event.title}**\n`;
            seatInfo += `📅 Date: ${formatDate(event)}\n`;

            if (isFull) {
              seatInfo += `⚠️ **Status: FULL** (Registration Closed)\n`;
            } else if (available !== null) {
              seatInfo += `🔥 **Only ${available} seats left**\n`;
              seatInfo += `✅ Registered: ${currentRegs} / ${maxSeats}\n`;
            } else {
              seatInfo += `✅ **Seats Available** (Open Registration)\n`;
            }
            seatInfo += `\n`;
          }
          reply = seatInfo;
        } 
        else {
          // General event info for all matches
          let details = `📌 Found ${matches.length} matching event(s):\n\n`;
          matches.forEach(e => {
            details += `• **${e.name || e.title}**\n  Date: ${formatDate(e)}\n  Time: ${e.time || "TBA"}\n  Venue: ${e.venue || e.location || "TBA"}\n\n`;
          });
          details += `👉 Register via Explore Events`;
          reply = details;
        }
      } else {
        reply = "🤖 I can help with events, registrations, certificates, seats, and schedules. Please ask clearly.";
      }
    }

    /* SAVE BOT REPLY */
    await messagesRef.add({
      from: "bot",
      text: reply,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { reply };

  } catch (err) {
    console.error("CHATBOT ERROR:", err);
    return { reply: "⚠️ Something went wrong. Please try again." };
  }
});