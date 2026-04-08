import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import {
  Send,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Pencil,
  Star,
  Menu,
  X
} from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

/* ======================
    CSS - FIX FOR DESKTOP ALIGNMENT
====================== */
const CSS = `
:root{
  --bg:#f7f7f8;
  --sidebar:#ffffff;
  --border:#e5e7eb;
  --muted:#64748b;
  --accent:#10a37f;
  --primary:#2563eb;
}
*{box-sizing:border-box;font-family:Inter,system-ui}
html,body,#root{height:100%;margin:0;overflow:hidden}
.app{height:100vh;background:var(--bg);display:flex;flex-direction:column}

/* NAVBAR */
.global-navbar{
  position:fixed;top:0;left:0;right:0;height:60px;
  background:#fff;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 15px;z-index:100;
}
.nav-left { display: flex; align-items:center; gap: 10px; }
.logo-block{background:var(--primary);padding:8px 16px;border-radius:8px}
.logo-text{font-weight:800;color:#fff;font-size:16px}

.back-btn {
  background: var(--primary);
  color: white !important;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
}

/* SIDEBAR */
.sidebar{
  position:fixed;top:60px;left:0;
  width:280px;height:calc(100vh - 60px);
  background:#fff;border-right:1px solid var(--border);
  display:flex;flex-direction:column;z-index:95;
  transition: transform 0.3s ease;
}

/* DESKTOP HEADER ALIGNMENT */
/* Ensure the container doesn't squash the elements */
/* SIDEBAR HEADER - Added border-bottom for the line */
.sidebar-header {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid var(--border); /* This draws the line */
  margin-bottom: 5px; /* Adds a tiny space before the history starts */
}

/* Base style for both to ensure identical sizing */
/* SHARED SIZING FOR BUTTON & SEARCHBOX */
.new-chat, 
.search_chats {
  width: 100% !important;
  height: 45px !important;
  border-radius: 8px !important;
  box-sizing: border-box !important;
  display: flex !important;
  align-items: center !important;
  margin: 0 !important;
}

.new-chat {
  background: var(--accent);
  color: #fff;
  border: none;
  font-weight: 600;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

/* THE SEARCHBOX FIX - Matches your JSX class name */
.search_chats {
  background: #f1f5f9 !important; /* Proper gray background as seen in your screenshot */
  border: 1px solid var(--border) !important;
  padding: 0 12px !important;
}

.search_chats input {
  flex: 1;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  font-size: 14px;
  color: #1f2937;
  height: 100% !important; /* Forces text to vertical center on desktop */
  padding: 0 !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
}

.search_chats svg {
  flex-shrink: 0;
  color: #64748b;
  margin-right: 10px;
}
/* HISTORY */
.history{flex:1;overflow-y:auto;padding:10px}
.chat-item{
  padding:12px;border-radius:8px;display:flex;align-items:center;
  gap:10px;cursor:pointer;position:relative;margin-bottom:4px;
}
.chat-item:hover{background:#f3f4f6}
.chat-item.active{background:#eef2ff;color:var(--primary)}
.chat-title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}

/* MENU BUTTONS */
.menu-btn{padding:6px;border-radius:6px;display:flex;align-items:center;color:#374151}
.chat-item:hover .menu-btn { background:#e5e7eb }
.chat-menu{
  position:absolute;right:10px;top:45px;
  background:#fff;border:1px solid var(--border);
  border-radius:8px;width:160px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15);
  z-index:1000; overflow: hidden;
}
.chat-menu button{
  width:100%;padding:12px;border:none;background:white;
  display:flex;align-items:center;gap:10px;cursor:pointer;
  font-size:14px;color:#374151;text-align:left;
}
.chat-menu button:hover{background:#f3f4f6}
.chat-menu .danger{color:#ef4444}

/* CHAT AREA */
.chat-area{
  margin-left:280px;margin-top:60px;
  height:calc(100vh - 60px);
  display:flex;flex-direction:column;transition: margin-left 0.3s ease;
}

.messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:20px}
.msg{max-width:85%;font-size:15px;line-height:1.6}
.msg.user{
  align-self:flex-end;background:#fff;
  border:1px solid var(--border);
  padding:12px 14px;border-radius:14px;
}
.msg.bot{align-self:flex-start}
.bot-label{font-size:13px;font-weight:700;margin-bottom:4px;color:var(--accent)}

.input-bar{padding:16px;background:#fff;border-top:1px solid var(--border)}
.input-shell{
  max-width:800px;margin:auto;display:flex;gap:10px;
  border:1px solid var(--border);border-radius:14px;padding:10px;background:#fff;
}
.input-shell textarea{flex:1;border:none;outline:none;resize:none;height:24px;font-size:15px}

/* MOBILE SPECIFIC */
.mobile-nav-btn { display: none; background: none; border: none; cursor: pointer; color: var(--primary); }
.mobile-nav-btn:hover { background: #e0e7ff; }
.sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }

@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .sidebar-overlay.open { display: block; }
  .chat-area { margin-left: 0; }
  .mobile-nav-btn { display: block; }
}
  /* ===============================
   📱 FIX: Input Bar Sticking Outside Screen
   =============================== */

.input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;

  padding: 10px 12px;
  background: #ffffff;
  border-top: 1px solid var(--border);
  z-index: 999;
}

/* Make chat messages scroll ABOVE input */
.messages {
  padding-bottom: 90px !important;
}

/* Professional input shell */
.input-shell {
  max-width: 800px;
  margin: auto;
  display: flex;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 50px;
  padding: 10px 15px;
  background: #fafafa;
}

/* Textarea styling */
.input-shell textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 16px;
  background: transparent;
  padding-top: 6px;
}

/* Send Button */
.send {
  background: var(--primary);
  border: none;
  padding: 10px 14px;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send:active {
  background: #000000ff;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .input-shell {
    max-width: 100%;
  }
}
.close-chat-btn {
  background: white;
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-chat-btn:hover {
  background: #000000ff;
}

/* Fix Close Button Visibility */
.close-chat-btn {
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.15);
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

/* Ensure icon is visible */
.close-chat-btn svg {
  stroke: #333 !important;
}

/* Extra boost for mobile */
@media (max-width: 768px) {
  .close-chat-btn {
    box-shadow: 0 3px 14px rgba(0,0,0,0.25);
    border: 1px solid rgba(0,0,0,0.25);
  }
}

`;

function useInjectCSS(css) {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [css]);
}

export default function Chatbot() {
  useInjectCSS(CSS);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuRef = useRef(null);
  const msgRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const functions = getFunctions();
  const chatbotCallable = httpsCallable(functions, "chatbotReply");

  useEffect(() => {
    if (!authReady || !user) return;
    const loadChats = async () => {
      const sessionsRef = collection(db, "user_chats", user.uid, "sessions");
      const q = query(sessionsRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const loaded = [];
      for (const s of snap.docs) {
        const msgs = await getDocs(query(collection(db, "user_chats", user.uid, "sessions", s.id, "messages"), orderBy("createdAt")));
        loaded.push({ id: s.id, ...s.data(), messages: msgs.docs.map(d => d.data()) });
      }
      if (loaded.length) { setChats(loaded); setActiveChatId(loaded[0].id); }
      else { createNewChat(); }
    };
    loadChats();
  }, [authReady, user]);

  const createNewChat = async () => {
    if (!user) return;
    const sessionRef = doc(collection(db, "user_chats", user.uid, "sessions"));
    const timestamp = serverTimestamp();
    
    await setDoc(sessionRef, { 
      title: "New chat", 
      pinned: false, 
      createdAt: timestamp, 
      updatedAt: timestamp 
    });

    const welcomeMsg = { from: "bot", text: "🤖 Hi! I'm digiChat. How can I help you today?", createdAt: timestamp };
    await addDoc(collection(sessionRef, "messages"), welcomeMsg);

    setChats(p => [{ id: sessionRef.id, title: "New chat", pinned: false, messages: [welcomeMsg] }, ...p]);
    setActiveChatId(sessionRef.id);
    setIsSidebarOpen(false);
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const hasAskedQuestion = activeChat?.messages?.some(m => m.from === "user");

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || !user) return;
    const text = input; setInput(""); setTyping(true);
    const sessionRef = doc(db, "user_chats", user.uid, "sessions", activeChat.id);
    const messagesRef = collection(sessionRef, "messages");

    await addDoc(messagesRef, { from: "user", text, createdAt: serverTimestamp() });
    setChats(p => p.map(c => c.id === activeChat.id ? { ...c, messages: [...c.messages, { from: "user", text }] } : c));

    if (activeChat.title === "New chat") {
      const newTitle = text.slice(0, 32);
      await updateDoc(sessionRef, { title: newTitle, updatedAt: serverTimestamp() });
      setChats(p => p.map(c => c.id === activeChat.id ? { ...c, title: newTitle } : c));
    }

    try {
      const res = await chatbotCallable({ message: text });
      const reply = res?.data?.reply || "Unable to process request.";
      await addDoc(messagesRef, { from: "bot", text: reply, createdAt: serverTimestamp() });
      setChats(p => p.map(c => c.id === activeChat.id ? { ...c, messages: [...c.messages, { from: "bot", text: reply }] } : c));
    } finally { setTyping(false); }
  };

  const updateChat = async (id, data) => {
    await updateDoc(doc(db, "user_chats", user.uid, "sessions", id), data);
    setChats(p => p.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deleteChat = async (id) => {
    await deleteDoc(doc(db, "user_chats", user.uid, "sessions", id));
    setChats(p => p.filter(c => c.id !== id));
    setMenuOpenId(null);
  };

  if (!authReady) return null;

  const visibleChats = chats
    .filter(c => c.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.pinned === true) - (a.pinned === true));

  return (
    <div className="app">
      <div className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`} onClick={() => setIsSidebarOpen(false)} />

      <div className="global-navbar">
  <div className="nav-left">
    <button className="mobile-nav-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
  {isSidebarOpen ? (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#2563eb" fill="none" strokeWidth="2">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  ) : (
    <Menu size={24} />
  )}
</button>

  </div>

  {/* Close Chat Button */}
  <button className="close-chat-btn" onClick={() => window.history.back()}>
    <X size={22} />
  </button>
</div>


      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          {/* NEW CHAT BUTTON */}
          <button className="new-chat" disabled={!hasAskedQuestion} onClick={() => hasAskedQuestion && createNewChat()}>
            <Plus size={18} /> New chat
          </button>
          
          {/* SEARCH BAR - DESKTOP ALIGNED */}
          <div className="search_chats">
            <Search size={18} color="#64748b" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="   Search chats..." 
            />
          </div>
        </div>

        <div className="history">
          {visibleChats.map(chat => (
            <div key={chat.id} className={`chat-item ${chat.id === activeChatId ? "active" : ""}`} onClick={() => { setActiveChatId(chat.id); setIsSidebarOpen(false); }}>
              {editingChatId === chat.id ? (
                <input autoFocus value={chat.title}
                  onChange={e => setChats(p => p.map(c => c.id === chat.id ? { ...c, title: e.target.value } : c))}
                  onBlur={() => { updateChat(chat.id, { title: chat.title }); setEditingChatId(null); }}
                  onKeyDown={e => e.key === "Enter" && setEditingChatId(null)}
                />
              ) : (
                <span className="chat-title">{chat.title}</span>
              )}
              {chat.pinned && <Star size={14} fill="#facc15" stroke="#facc15" />}
              <div className="menu-btn" onClick={e => { e.stopPropagation(); setMenuOpenId(chat.id); }}>
                <MoreVertical size={16} />
              </div>
              {menuOpenId === chat.id && (
                <div className="chat-menu" ref={menuRef} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { updateChat(chat.id, { pinned: !chat.pinned }); setMenuOpenId(null); }}>
                    <Star size={14} /> {chat.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => { setEditingChatId(chat.id); setMenuOpenId(null); }}>
                    <Pencil size={14} /> Rename
                  </button>
                  <button className="danger" onClick={() => deleteChat(chat.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <section className="chat-area">
        <div className="messages" ref={msgRef}>
          {activeChat?.messages.map((m, i) => (
            <div key={i} className={`msg ${m.from}`}>
              {m.from === "bot" && <div className="bot-label">digiChat</div>}
              {m.text}
            </div>
          ))}
          {typing && <div className="msg bot">digiChat is typing…</div>}
        </div>

        <div className="input-bar">
          <div className="input-shell">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Message digiChat…"
            />
            <button className="send" onClick={sendMessage}><Send size={18} /></button>
          </div>
        </div>
      </section>
    </div>
  );
}