import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquare, Loader2, PenSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "@/lib/callsignAuth";
import { useNavigate, Link } from "react-router-dom";
import TopoBackground from "@/components/flying-eagle/TopoBackground";
import SiteHeader from "@/components/flying-eagle/SiteHeader";

export default function DirectMessages() {
  const { player, isAuthed } = useCallsignAuth();
  const navigate = useNavigate();
  const me = player?.callsign;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!me) { setLoading(false); return; }
    const all = await base44.entities.DirectMessage.list();
    setMessages(all);
    setLoading(false);
  };
  useEffect(() => { load(); const unsub = base44.entities.DirectMessage.subscribe(() => load()); return unsub; }, [me]);

  const convos = useMemo(() => {
    const map = new Map();
    messages.forEach(m => {
      const other = m.sender_callsign === me ? m.recipient_callsign : m.sender_callsign;
      if (!other) return;
      const prev = map.get(other);
      if (!prev || (m.created_date || "") > (prev.created_date || "")) map.set(other, m);
    });
    return [...map.entries()].sort((a, b) => (b[1].created_date || "").localeCompare(a[1].created_date || ""));
  }, [messages, me]);

  if (!isAuthed) {
    return (
      <main className="relative min-h-screen text-white">
        <TopoBackground />
        <SiteHeader />
        <div className="relative mx-auto max-w-md px-4 py-24 text-center">
          <MessageSquare className="mx-auto mb-4 text-white/40" size={40} />
          <h1 className="serif text-3xl">Sign in to message</h1>
          <Link to="/login" className="mt-6 inline-block rounded-sm bg-white px-6 py-2.5 text-sm font-semibold text-[#2c2c2c]">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-white">
      <TopoBackground />
      <SiteHeader />
      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60 hover:text-white"><ArrowLeft size={16} /> Back</button>
        <div className="flex items-center justify-between">
          <h1 className="serif text-4xl font-semibold">Direct Messages</h1>
          <Link to="/friends" className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"><PenSquare size={14} /> New</Link>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-white" /></div>
          ) : convos.length ? (
            <div className="grid gap-2">
              {convos.map(([other, m]) => (
                <Link key={other} to={`/dm/${other}`} className="flex items-center gap-4 rounded-sm border border-white/15 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/40 serif text-lg font-semibold">{other?.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">@{other}</p>
                    <p className="truncate text-sm text-white/50">{m.sender_callsign === me ? "You: " : ""}{m.text}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-white/20 py-16 text-center">
              <p className="serif text-2xl">No conversations yet</p>
              <p className="mt-2 text-sm text-white/50">Find someone on the <Link to="/friends" className="underline">Friends</Link> page and say hello.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
