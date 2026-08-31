import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessagesSquare, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "@/lib/callsignAuth";
import { useChatNotifications } from "@/lib/chatNotifications";
import TopoBackground from "@/components/flying-eagle/TopoBackground";

export default function Chats() {
  const { player } = useCallsignAuth();
  const { unread, reloadMemberships } = useChatNotifications();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [lastMsgs, setLastMsgs] = useState({});
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState("");
  const [membersInput, setMembersInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);

  const load = async () => {
    if (!player) { navigate("/login"); return; }
    const members = await base44.entities.GroupChatMember.filter({ callsign: player.callsign });
    const ids = members.map(m => m.chat_id);
    if (!ids.length) { setChats([]); setLoading(false); return; }
    const all = await base44.entities.GroupChat.list("-created_date");
    const mine = all.filter(c => ids.includes(c.id));
    setChats(mine);
    const msgs = await base44.entities.GroupMessage.list("-created_date", 200);
    const latest = {};
    for (const m of msgs) { if (!latest[m.chat_id]) latest[m.chat_id] = m; }
    setLastMsgs(latest);
    setLoading(false);
  };

  useEffect(() => { load(); }, [player]);

  // Accept ?join=<token> invite links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("join");
    if (!token || !player) return;
    setJoining(true);
    (async () => {
      try {
        const invs = await base44.entities.ChatInvitation.filter({ token });
        if (!invs.length) { setJoining(false); return; }
        const inv = invs[0];
        const existing = await base44.entities.GroupChatMember.filter({ chat_id: inv.chat_id, callsign: player.callsign });
        if (!existing.length) await base44.entities.GroupChatMember.create({ chat_id: inv.chat_id, callsign: player.callsign });
        if (inv.status !== "joined") await base44.entities.ChatInvitation.update(inv.id, { status: "joined", joined_callsign: player.callsign });
        window.history.replaceState({}, "", "/chats");
        reloadMemberships();
        navigate(`/chat/${inv.chat_id}`);
      } finally { setJoining(false); }
    })();
  }, [player]);

  const createGroup = async (e) => {
    e.preventDefault();
    setSaving(true);
    const members = membersInput.split(",").map(s => s.trim()).filter(Boolean).filter(c => c !== player.callsign);
    const unique = Array.from(new Set([...members, player.callsign]));
    const chat = await base44.entities.GroupChat.create({ name: name.trim() || "New group", created_by_callsign: player.callsign });
    await base44.entities.GroupChatMember.bulkCreate(unique.map(c => ({ chat_id: chat.id, callsign: c })));
    setSaving(false); setOpenNew(false); setName(""); setMembersInput("");
    reloadMemberships();
    navigate(`/chat/${chat.id}`);
  };

  return (
    <main className="relative min-h-screen bg-[#2c2c2c] text-white">
      <TopoBackground />
      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="serif text-4xl font-semibold text-white">Group chats</h1>
            <p className="mt-1 text-sm text-white/50">Stay connected with your squad.</p>
          </div>
          {player && <button onClick={() => setOpenNew(true)} className="flex items-center gap-2 rounded-full border border-white bg-white px-4 py-2 text-sm font-medium text-[#2c2c2c]"><Plus size={16} /> New group</button>}
        </div>

        {joining ? (
          <div className="grid place-items-center py-24 text-center"><Loader2 className="animate-spin text-white" /><p className="mt-3 text-sm text-white/60">Joining chat…</p></div>
        ) : loading ? (
          <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-white" /></div>
        ) : chats.length ? (
          <div className="overflow-hidden rounded-sm border border-white/15">
            {chats.map((c, i) => {
              const lm = lastMsgs[c.id];
              const count = unread[c.id] || 0;
              return (
                <button key={c.id} onClick={() => navigate(`/chat/${c.id}`)} className={`flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/5 ${i ? "border-t border-white/10" : ""}`}>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/30 text-white"><MessagesSquare size={20} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{c.name}</p>
                    <p className="truncate text-xs text-white/50">{lm ? `@${lm.sender_callsign}: ${lm.text}` : "No messages yet"}</p>
                  </div>
                  {count > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-2 text-xs font-bold text-[#2c2c2c]">{count}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-white/20 py-20 text-center">
            <p className="serif text-2xl text-white">No group chats yet</p>
            <p className="mt-2 text-sm text-white/50">Start one to rally your squad.</p>
          </div>
        )}
      </div>

      {openNew && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <form onSubmit={createGroup} className="w-full max-w-md rounded-t-sm border border-white/15 bg-[#2c2c2c] p-6 shadow-2xl sm:rounded-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="serif text-2xl font-semibold text-white">New group chat</h2>
              <button type="button" onClick={() => setOpenNew(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>
            <input required placeholder="Group name" value={name} onChange={e => setName(e.target.value)} className="field" />
            <input placeholder="Add members (callsigns, comma separated)" value={membersInput} onChange={e => setMembersInput(e.target.value)} className="field mt-3" />
            <p className="mt-2 text-xs text-white/40">You're added automatically. Invite by email/phone/iCloud from inside the chat.</p>
            <button disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-white py-3 font-semibold text-[#2c2c2c] disabled:opacity-40">{saving && <Loader2 size={16} className="animate-spin" />} Create group</button>
          </form>
        </div>
      )}
    </main>
  );
}
