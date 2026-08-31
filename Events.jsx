import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, MapPin, Plus, Loader2, Globe, Lock, Check, X, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "@/lib/callsignAuth";
import { useNavigate, Link } from "react-router-dom";
import TopoBackground from "@/components/flying-eagle/TopoBackground";
import SiteHeader from "@/components/flying-eagle/SiteHeader";

export default function Events() {
  const { player, isAuthed } = useCallsignAuth();
  const navigate = useNavigate();
  const me = player?.callsign;
  const [events, setEvents] = useState([]);
  const [invites, setInvites] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", event_date: "", visibility: "public" });
  const [selected, setSelected] = useState([]);

  const load = async () => {
    if (!me) { setLoading(false); return; }
    const [evs, invs, fs, pls] = await Promise.all([
      base44.entities.AirsoftEvent.list("-event_date"),
      base44.entities.EventInvitation.list(),
      base44.entities.Friendship.list(),
      base44.entities.AirsoftPlayer.list(),
    ]);
    setEvents(evs); setInvites(invs); setFriendships(fs); setPlayers(pls);
    setLoading(false);
  };
  useEffect(() => { load(); }, [me]);

  const friendOf = (c) => friendships.some(f => f.status === "accepted" && ((f.requester_callsign === me && f.recipient_callsign === c) || (f.recipient_callsign === me && f.requester_callsign === c)));
  const myFriends = useMemo(() => players.filter(p => friendOf(p.callsign)), [players, friendships]);

  const invitedCallsigns = (eventId) => invites.filter(i => i.event_id === eventId).map(i => i.invitee_callsign);
  const visibleEvents = useMemo(() => events.filter(e => {
    if (e.visibility === "public") return true;
    if (e.host_callsign === me) return true;
    return invites.some(i => i.event_id === e.id && i.invitee_callsign === me);
  }), [events, invites, me]);

  const myInvites = invites.filter(i => i.invitee_callsign === me && i.status === "pending");
  const eventById = (id) => events.find(e => e.id === id);

  const create = async (e) => {
    e.preventDefault();
    if (!form.title || !form.event_date) return;
    setBusy(true);
    try {
      const ev = await base44.entities.AirsoftEvent.create({ ...form, host_callsign: me });
      if (form.visibility === "private" && selected.length) {
        await base44.entities.EventInvitation.bulkCreate(selected.map(c => ({ event_id: ev.id, invitee_callsign: c, status: "pending" })));
      }
      setForm({ title: "", description: "", location: "", event_date: "", visibility: "public" });
      setSelected([]);
      setCreating(false);
      await load();
    } finally { setBusy(false); }
  };

  const rsvp = async (inv, status) => { const upd = await base44.entities.EventInvitation.update(inv.id, { status }); setInvites(v => v.map(x => x.id === inv.id ? upd : x)); };

  if (!isAuthed) {
    return (
      <main className="relative min-h-screen text-white">
        <TopoBackground />
        <SiteHeader />
        <div className="relative mx-auto max-w-md px-4 py-24 text-center">
          <Calendar className="mx-auto mb-4 text-white/40" size={40} />
          <h1 className="serif text-3xl">Sign in for events</h1>
          <Link to="/login" className="mt-6 inline-block rounded-sm bg-white px-6 py-2.5 text-sm font-semibold text-[#2c2c2c]">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-white">
      <TopoBackground />
      <SiteHeader />
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60 hover:text-white"><ArrowLeft size={16} /> Back</button>
        <div className="flex items-center justify-between">
          <h1 className="serif text-4xl font-semibold">Events</h1>
          <button onClick={() => setCreating(v => !v)} className="flex items-center gap-2 rounded-full border border-white bg-white px-5 py-2.5 text-sm font-semibold text-[#2c2c2c]"><Plus size={16} /> {creating ? "Cancel" : "Host event"}</button>
        </div>

        {creating && (
          <form onSubmit={create} className="mt-6 rounded-sm border border-white/15 bg-white/[0.03] p-6">
            <h2 className="serif text-2xl">Host an event</h2>
            <div className="mt-4 grid gap-3">
              <input placeholder="Event title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="field" required />
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} className="field" required />
                <input placeholder="Location / field" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="field" />
              </div>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="field min-h-24" />
              <div className="flex overflow-hidden rounded-full border border-white/15 bg-[#1c1c1c]">
                {[
                  ["public", "Public — 100% open", Globe],
                  ["private", "Friends only", Lock],
                ].map(([v, label, Icon], i) => (
                  <React.Fragment key={v}>
                    {i > 0 && <span className="w-px bg-white/15" />}
                    <button type="button" onClick={() => { setForm({ ...form, visibility: v }); if (v === "public") setSelected([]); }} className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${form.visibility === v ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}><Icon size={14} /> {label}</button>
                  </React.Fragment>
                ))}
              </div>
              {form.visibility === "private" && (
                <div className="rounded-sm border border-white/15 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/50"><Users size={14} /> Invite friends ({selected.length} selected)</p>
                  {myFriends.length ? (
                    <div className="grid max-h-56 gap-2 overflow-y-auto">
                      {myFriends.map(p => {
                        const on = selected.includes(p.callsign);
                        return (
                          <button type="button" key={p.id} onClick={() => setSelected(v => on ? v.filter(c => c !== p.callsign) : [...v, p.callsign])} className={`flex items-center gap-3 rounded-sm border px-3 py-2 text-left transition ${on ? "border-white bg-white/10" : "border-white/15 hover:bg-white/5"}`}>
                            <div className={`grid h-6 w-6 place-items-center rounded-full border ${on ? "border-white bg-white text-[#2c2c2c]" : "border-white/30"}`}>{on && <Check size={14} />}</div>
                            <span className="text-sm">@{p.callsign}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">No friends yet. Add players on the <Link to="/friends" className="underline">Friends</Link> page.</p>
                  )}
                </div>
              )}
              <button type="submit" disabled={busy} className="rounded-sm bg-white px-5 py-3 text-sm font-semibold text-[#2c2c2c] disabled:opacity-40">{busy ? "Creating…" : "Publish event"}</button>
            </div>
          </form>
        )}

        {myInvites.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">Your event invites</h2>
            <div className="grid gap-3">
              {myInvites.map(inv => {
                const ev = eventById(inv.event_id);
                if (!ev) return null;
                return (
                  <div key={inv.id} className="rounded-sm border border-white/15 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/45"><Calendar size={14} /> {ev.visibility} · @{ev.host_callsign}</div>
                    <h3 className="mt-2 serif text-2xl">{ev.title}</h3>
                    {ev.event_date && <p className="text-sm text-white/60">{ev.event_date}{ev.location ? ` · ${ev.location}` : ""}</p>}
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => rsvp(inv, "accepted")} className="flex items-center gap-1.5 rounded-full border border-white bg-white px-4 py-2 text-xs font-medium text-[#2c2c2c]"><Check size={14} /> Going</button>
                      <button onClick={() => rsvp(inv, "declined")} className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:text-white"><X size={14} /> Can't go</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/50">All events</h2>
          {loading ? (
            <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-white" /></div>
          ) : visibleEvents.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleEvents.map(ev => {
                const guestList = invitedCallsigns(ev.id);
                const myInvite = invites.find(i => i.event_id === ev.id && i.invitee_callsign === me);
                return (
                  <div key={ev.id} className="rounded-sm border border-white/15 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/45">{ev.visibility === "public" ? <Globe size={13} /> : <Lock size={13} />}{ev.visibility}</span>
                      {ev.host_callsign === me && <span className="text-xs text-white/40">You're hosting</span>}
                    </div>
                    <h3 className="mt-2 serif text-2xl">{ev.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                      {ev.event_date && <span className="flex items-center gap-1"><Calendar size={13} /> {ev.event_date}</span>}
                      {ev.location && <span className="flex items-center gap-1"><MapPin size={13} /> {ev.location}</span>}
                    </div>
                    {ev.description && <p className="mt-3 text-sm leading-6 text-white/70">{ev.description}</p>}
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/45">
                      <span>Hosted by <Link to={`/profile/${ev.host_callsign}`} className="text-white/70 hover:underline">@{ev.host_callsign}</Link></span>
                      {ev.visibility === "private" && guestList.length > 0 && <span>· {guestList.length} invited</span>}
                    </div>
                    {myInvite && myInvite.status === "pending" && (
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => rsvp(myInvite, "accepted")} className="flex items-center gap-1.5 rounded-full border border-white bg-white px-4 py-2 text-xs font-medium text-[#2c2c2c]"><Check size={14} /> Going</button>
                        <button onClick={() => rsvp(myInvite, "declined")} className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:text-white"><X size={14} /> Can't go</button>
                      </div>
                    )}
                    {myInvite && myInvite.status !== "pending" && <p className="mt-4 text-xs text-white/50">You're {myInvite.status === "accepted" ? "going" : "not going"}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-white/20 py-16 text-center">
              <p className="serif text-2xl">No events yet</p>
              <p className="mt-2 text-sm text-white/50">Host the first skirmish and invite your squad.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
