import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, UserPlus, Phone, X, Copy, Check, Users, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "@/lib/callsignAuth";
import { useChatNotifications } from "@/lib/chatNotifications";
import { usePresence } from "@/lib/presence";
import TopoBackground from "@/components/flying-eagle/TopoBackground";

const JOIN_BASE = "https://eagle-battle-feed.base44.app/chats?join=";

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { player } = useCallsignAuth();
  const { markChatRead } = useChatNotifications();
  const { isOnline, getActivity, getContact } = usePresence();
  const [chat, setChat] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const scrollRef = useRef(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [lastLink, setLastLink] = useState("");
  const [copied, setCopied] = useState(false);

  const [callOpen, setCallOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const load = async () => {
    if (!player) { navigate("/login"); return; }
    const [c, allMembers, allMsgs] = await Promise.all([
      base44.entities.GroupChat.get(id),
      base44.entities.GroupChatMember.filter({ chat_id: id }),
      base44.entities.GroupMessage.filter({ chat_id: id }),
    ]);
    if (!allMembers.some(m => m.callsign === player.callsign)) { setDenied(true); setLoading(false); return; }
    setChat(c); setMembers(allMembers);
    const sorted = allMsgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setMessages(sorted);
    setLoading(false);
    markChatRead(id);
  };
  useEffect(() => { load(); }, [id, player]);

  useEffect(() => {
    const unsub = base44.entities.GroupMessage.subscribe((ev) => {
      if (ev.type !== "create" || ev.data.chat_id !== id) return;
      setMessages(prev => prev.some(m => m.id === ev.data.id) ? prev : [...prev, ev.data]);
      if (ev.data.sender_callsign !== player?.callsign) markChatRead(id);
    });
    return unsub;
  }, [id, player]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    const made = await base44.entities.GroupMessage.create({ chat_id: id, sender_callsign: player.callsign, text: t });
    setMessages(prev => prev.some(m => m.id === made.id) ? prev : [...prev, made]);
  };

  const detectType = (val) => {
    const v = val.trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "email";
    if (/icloud/.test(v)) return "icloud";
    if (/^\+?\d[\d\s-]{6,}$/.test(val.trim())) return "phone";
    return "icloud";
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    const c = contact.trim();
    if (!c) return;
    setInviteBusy(true); setInviteMsg(""); setLastLink(""); setCopied(false);
    const type = detectType(c);
    const token = crypto.randomUUID();
    try {
      const inv = await base44.entities.ChatInvitation.create({
        chat_id: id, contact: c, contact_type: type, token, invited_by_callsign: player.callsign, status: "pending",
      });
      const link = JOIN_BASE + encodeURIComponent(token);
      setLastLink(link);
      if (type === "email") {
        const res = await base44.functions.invoke("sendChatInvite", { invitation_id: inv.id, chat_name: chat?.name });
        if (res.data?.ok) setInviteMsg("Invite email sent to " + c + ".");
        else if (res.data?.skipped) setInviteMsg("Couldn't email that address — share the link below instead.");
        else setInviteMsg("Invite created, but the email didn't send. Share the link below.");
      } else {
        setInviteMsg("Invite created. Share the link below via Messages/text to " + c + ".");
      }
    } catch (err) {
      setInviteMsg("Something went wrong: " + err.message);
    } finally {
      setInviteBusy(false);
    }
  };

  const leaveChat = async () => {
    const mine = members.find(m => m.callsign === player.callsign);
    if (mine) await base44.entities.GroupChatMember.delete(mine.id);
    navigate("/chats");
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(lastLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#2c2c2c]"><Loader2 className="animate-spin text-white" /></div>;
  if (denied) return (
    <main className="grid min-h-screen place-items-center bg-[#2c2c2c] px-4 text-center text-white">
      <div><p className="serif text-3xl">Not a member</p><p className="mt-2 text-sm text-white/50">You don't have access to this group chat.</p><button onClick={() => navigate("/chats")} className="mt-6 rounded-sm border border-white/30 px-5 py-2 text-sm">Back to chats</button></div>
    </main>
  );

  return (
    <main className="relative flex h-screen flex-col bg-[#2c2c2c] text-white">
      <TopoBackground />
      <div className="relative border-b border-white/15 bg-[#1c1c1c] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => navigate("/chats")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white" title="Back"><ArrowLeft size={18} /></button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-medium text-white">{chat?.name}</p>
            <p className="flex items-center justify-center gap-1.5 text-xs text-white/50"><span className={`h-1.5 w-1.5 rounded-full ${members.some(m => isOnline(m.callsign)) ? "bg-[#107C10]" : "bg-white/25"}`} />{members.length} members · {members.filter(m => isOnline(m.callsign)).length} online</p>
          </div>
          <div className="h-9 w-9 shrink-0" />
        </div>
        <div className="mx-auto mt-3 flex max-w-2xl overflow-hidden rounded-full border border-white/15 bg-[#2c2c2c]">
          <button onClick={() => setMembersOpen(true)} className="group flex flex-1 items-center justify-center gap-2 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/75 transition hover:bg-white/10 hover:text-white"><Users size={16} /> Squad</button>
          <span className="w-px bg-white/15" />
          <button onClick={() => setCallOpen(true)} className="flex flex-1 items-center justify-center gap-2 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/75 transition hover:bg-[#107C10] hover:text-white"><Phone size={16} /> Call</button>
          <span className="w-px bg-white/15" />
          <button onClick={() => setInviteOpen(true)} className="flex flex-1 items-center justify-center gap-2 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/75 transition hover:bg-white/10 hover:text-white"><UserPlus size={16} /> Invite</button>
          <span className="w-px bg-white/15" />
          <button onClick={leaveChat} className="flex flex-1 items-center justify-center gap-2 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/75 transition hover:bg-red-600 hover:text-white"><LogOut size={16} /> Leave</button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map(m => {
            const mine = m.sender_callsign === player.callsign;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                {!mine && <span className="mb-1 px-1 text-[10px] font-medium uppercase tracking-widest text-white/50">@{m.sender_callsign}</span>}
                <div className={`max-w-[80%] rounded-sm px-4 py-2.5 text-sm ${mine ? "bg-white text-[#2c2c2c]" : "border border-white/15 bg-white/[0.04] text-white"}`}>{m.text}</div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </div>

      <form onSubmit={send} className="relative border-t border-white/15 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Message your squad…" className="field" />
          <button type="submit" disabled={!text.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-sm bg-white text-[#2c2c2c] disabled:opacity-40"><Send size={18} /></button>
        </div>
      </form>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <form onSubmit={sendInvite} className="w-full max-w-md rounded-t-sm border border-white/15 bg-[#2c2c2c] p-6 shadow-2xl sm:rounded-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="serif text-2xl font-semibold text-white">Invite to chat</h2>
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>
            <input required placeholder="Email, phone, or iCloud" value={contact} onChange={e => setContact(e.target.value)} className="field" />
            <p className="mt-2 text-xs text-white/40">Email invites are sent automatically. For phone/iCloud, copy the link and send it via Messages.</p>
            <button disabled={inviteBusy || !contact.trim()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-white py-3 font-semibold text-[#2c2c2c] disabled:opacity-40">{inviteBusy && <Loader2 size={16} className="animate-spin" />} Send invite</button>
            {inviteMsg && <p className="mt-3 text-sm text-white/70">{inviteMsg}</p>}
            {lastLink && (
              <div className="mt-3">
                <div className="flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 p-2">
                  <span className="truncate text-xs text-white/70">{lastLink}</span>
                  <button type="button" onClick={copyLink} className="ml-auto flex items-center gap-1 text-xs font-medium text-white">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}</button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {callOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#2c2c2c]">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <p className="serif text-lg text-white">{chat?.name} — squad call</p>
            <button onClick={() => setCallOpen(false)} className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-1.5 text-sm text-white transition hover:bg-white/10"><X size={16} /> Leave</button>
          </div>
          <iframe
            src={`https://meet.jit.si/eagle-${id}#config.prejoinPageEnabled=false&config.subject=${encodeURIComponent(chat?.name || "Squad call")}`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="flex-1 border-0"
            title="Call"
          />
        </div>
      )}

      {membersOpen && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-sm border border-white/15 bg-[#2c2c2c] p-6 shadow-2xl sm:rounded-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="serif text-2xl font-semibold text-white">Squad</h2>
              <button type="button" onClick={() => setMembersOpen(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-2">
              {members.map(m => {
                const online = isOnline(m.callsign);
                const c = getContact(m.callsign);
                const mine = m.callsign === player?.callsign;
                const hasContact = c && (c.phone || c.icloud_email || c.google_chat);
                return (
                  <div key={m.id} className="rounded-sm border border-white/15 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? "bg-green-400" : "bg-white/25"}`} />
                      <p className="font-medium text-white">@{m.callsign}{mine ? " (you)" : ""}</p>
                      <span className="ml-auto text-xs text-white/50">{getActivity(m.callsign)}</span>
                    </div>
                    {!mine && hasContact && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.phone && <a href={`sms:${c.phone}`} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:bg-white/10">Text</a>}
                        {c.icloud_email && <a href={`mailto:${c.icloud_email}`} className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:bg-white/10">iCloud</a>}
                        {c.google_chat && <a href="https://chat.google.com/" target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-3 py-1 text-xs text-white transition hover:bg-white/10">Google Chat</a>}
                      </div>
                    )}
                    {!mine && !hasContact && <p className="mt-2 text-xs text-white/30">No contact info shared.</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
