import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "@/lib/callsignAuth";
import TopoBackground from "@/components/flying-eagle/TopoBackground";

export default function DM() {
  const { callsign } = useParams();
  const { player } = useCallsignAuth();
  const navigate = useNavigate();
  const me = player?.callsign;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const load = async () => {
    if (!me) return;
    const all = await base44.entities.DirectMessage.list();
    const conv = all
      .filter(m => (m.sender_callsign === me && m.recipient_callsign === callsign) || (m.sender_callsign === callsign && m.recipient_callsign === me))
      .sort((a, b) => (a.created_date || "").localeCompare(b.created_date || ""));
    setMessages(conv);
    setLoading(false);
  };
  useEffect(() => {
    setLoading(true);
    load();
    const unsub = base44.entities.DirectMessage.subscribe(() => load());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callsign, me]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const m = await base44.entities.DirectMessage.create({ sender_callsign: me, recipient_callsign: callsign, text: text.trim() });
    setMessages(v => [...v, m]);
    setText("");
  };

  if (!player) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#2c2c2c] text-white">
        <div className="text-center">
          <p className="serif text-2xl">Sign in to message players.</p>
          <Link to="/login" className="mt-4 inline-block rounded-sm bg-white px-6 py-2.5 text-sm font-semibold text-[#2c2c2c]">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex h-screen flex-col text-white">
      <TopoBackground />
      <div className="relative border-b border-white/15 bg-[#1c1c1c] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => navigate("/dms")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"><ArrowLeft size={18} /></button>
          <Link to={`/profile/${callsign}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/40 serif text-lg font-semibold">{callsign?.charAt(0).toUpperCase()}</Link>
          <div className="min-w-0 flex-1">
            <Link to={`/profile/${callsign}`} className="font-medium hover:underline">@{callsign}</Link>
            <p className="text-xs text-white/45">Direct message</p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {loading ? (
            <p className="py-10 text-center text-sm text-white/40">Loading…</p>
          ) : messages.length ? (
            messages.map(m => {
              const mine = m.sender_callsign === me;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] rounded-sm px-4 py-2.5 text-sm ${mine ? "bg-white text-[#2c2c2c]" : "border border-white/15 bg-white/[0.04] text-white"}`}>{m.text}</div>
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-sm text-white/40">No messages yet. Say hello.</p>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <form onSubmit={send} className="relative border-t border-white/15 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input value={text} onChange={e => setText(e.target.value)} placeholder={`Message @${callsign}…`} className="field" />
          <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#2c2c2c] transition hover:bg-white/80"><Send size={18} /></button>
        </div>
      </form>
    </main>
  );
}
