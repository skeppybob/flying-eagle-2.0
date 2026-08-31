import React, { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, UserCheck, Check, X, MessageSquare, Calendar, ArrowLeft, Loader2, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "@/lib/callsignAuth";
import { useNavigate, Link } from "react-router-dom";
import TopoBackground from "@/components/flying-eagle/TopoBackground";
import SiteHeader from "@/components/flying-eagle/SiteHeader";

const SEEN_KEY = "fep_discovered_seen";

export default function Friends() {
  const { player, isAuthed } = useCallsignAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [events, setEvents] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("discover");
  const [query, setQuery] = useState("");
  const [discoverSeed, setDiscoverSeed] = useState(0);

  const me = player?.callsign;

  const load = async () => {
    if (!me) { setLoading(false); return; }
    const [pls, fs, evs, invs] = await Promise.all([
      base44.entities.AirsoftPlayer.list(),
      base44.entities.Friendship.list(),
      base44.entities.AirsoftEvent.list("-event_date"),
      base44.entities.EventInvitation.list(),
    ]);
    setPlayers(pls); setFriendships(fs); setEvents(evs); setInvites(invs);
    setLoading(false);
  };
  useEffect(() => { load(); }, [me]);

  const friendOf = (c) => friendships.some(f => f.status === "accepted" && ((f.requester_callsign === me && f.recipient_callsign === c) || (f.recipient_callsign === me && f.requester_callsign === c)));
  const pendingSent = (c) => friendships.some(f => f.status === "pending" && f.requester_callsign === me && f.recipient_callsign === c);
  const pendingReceived = (c) => friendships.some(f => f.status === "pending" && f.recipient_callsign === me && f.requester_callsign === c);

  const others = useMemo(() => players.filter(p => p.callsign !== me), [players, me]);

  const discovered = useMemo(() => {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    const pool = others.filter(p => !friendOf(p.callsign) && !pendingSent(p.callsign) && !pendingReceived(p.callsign));
    const fresh = pool.filter(p => !seen.includes(p.callsign));
    const list = fresh.length >= 10 || pool.length === 0 ? fresh : [...fresh, ...pool.filter(p => !fresh.includes(p))];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list.slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [others, friendships, discoverSeed]);

  useEffect(() => {
    if (!discovered.length) return;
    const seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
    discovered.forEach(p => seen.add(p.callsign));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  }, [discovered]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return others.filter(p => p.callsign.toLowerCase().includes(q)).slice(0, 24);
  }, [others, query]);

  const addFriend = async (c) => { const made = await base44.entities.Friendship.create({ requester_callsign: me, recipient_callsign: c, status: "pending" }); setFriendships(v => [...v, made]); };
  const acceptFriend = async (f) => { const upd = await base44.entities.Friendship.update(f.id, { status: "accepted" }); setFriendships(v => v.map(x => x.id === f.id ? upd : x)); };
  const declineFriend = async (f) => { await base44.entities.Friendship.delete(f.id); setFriendships(v => v.filter(x => x.id !== f.id)); };

  const myFriends = useMemo(() => others.filter(p => friendOf(p.callsign)), [others, friendships]);
  const requestsToMe = friendships.filter(f => f.recipient_callsign === me && f.status === "pending");
  const myEventInvites = invites.filter(i => i.invitee_callsign === me && i.status === "pending");
  const eventById = (id) => events.find(e => e.id === id);
  const rsvp = async (inv, status) => { const upd = await base44.entities.EventInvitation.update(inv.id, { status }); setInvites(v => v.map(x => x.id === inv.id ? upd : x)); };

  if (!isAuthed) {
    return (
      <main className="relative min-h-screen text-white">
        <TopoBackground />
        <SiteHeader />
        <div className="relative mx-auto max-w-md px-4 py-24 text-center">
          <Users className="mx-auto mb-4 text-white/40" size={40} />
          <h1 className="serif text-3xl">Sign in to find your squad</h1>
          <p className="mt-2 text-sm text-white/50">Friends, direct messages, and event invites are available once you're in.</p>
          <Link to="/login" className="mt-6 inline-block rounded-sm bg-white px-6 py-2.5 text-sm font-semibold text-[#2c2c2c]">Sign in</Link>
        </div>
      </main>
    );
  }

  const tabs = [["discover", "Discover"], ["friends", `My Squad (${myFriends.length})`], ["requests", `Requests (${requestsToMe.length})`], ["invites", `Event Invites (${myEventInvites.length})`]];

  const PlayerRow = ({ p }) => (
    <div className="flex items-center gap-4 rounded-sm border border-white/15 bg-white/[0.03] p-4">
      <Link to={`/profile/${p.callsign}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/40 serif text-xl font-semibold text-white">{p.callsign?.charAt(0).toUpperCase()}</Link>
      <div className="min-w-0 flex-1">
        <Link to={`/profile/${p.callsign}`} className="font-medium text-white hover:underline">@{p.callsign}</Link>
        {p.activity && <p className="truncate text-xs text-white/45">{p.activity}</p>}
      </div>
      <div className="flex items-center gap-2">
        {friendOf(p.callsign) ? (
          <Link to={`/dm/${p.callsign}`} className="flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"><MessageSquare size={14} /> Message</Link>
        ) : pendingSent(p.callsign) ? (
          <span className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white/40"><UserCheck size={14} /> Sent</span>
        ) : pendingReceived(p.callsign) ? (
          <span className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/40">Wants to add you</span>
        ) : (
          <button onClick={() => addFriend(p.callsign)} className="flex items-center gap-2 rounded-full border border-white bg-white px-4 py-2 text-xs font-medium text-[#2c2c2c] transition hover:bg-white/80"><UserPlus size={14} /> Add</button>
        )}
      </div>
    </div>
  );

  return (
    <main className="relative min-h-screen text-white">
      <TopoBackground />
      <SiteHeader />
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60 hover:text-white"><ArrowLeft size={16} /> Back</button>
        <h1 className="serif text-4xl font-semibold">Friends</h1>

        <div className="mt-6 flex overflow-x-auto rounded-full border border-white/15 bg-[#1c1c1c]">
          {tabs.map(([v, label], i) => (
            <React.Fragment key={v}>
              {i > 0 && <span className="w-px shrink-0 bg-white/15" />}
              <button onClick={() => setTab(v)} className={`flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] transition ${tab === v ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}>{label}</button>
            </React.Fragment>
          ))}
        </div>

        <div className="mt-6">
          {(tab === "discover" || tab === "friends") && (
            <div className="relative mb-5">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search players by callsign…" className="field pl-11" />
            </div>
          )}

          {loading ? (
            <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-white" /></div>
          ) : query.trim() ? (
            searchResults.length ? (
              <div className="grid gap-3">{searchResults.map(p => <PlayerRow key={p.id} p={p} />)}</div>
            ) : (
              <p className="rounded-sm border border-dashed border-white/20 py-16 text-center text-white/50">No players match "{query}".</p>
            )
          ) : tab === "discover" ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">10 new players you haven't seen</p>
                <button onClick={() => setDiscoverSeed(s => s + 1)} className="text-xs font-medium uppercase tracking-widest text-white/60 hover:text-white">Refresh</button>
              </div>
              {discovered.length ? (
                <div className="grid gap-3">{discovered.map(p => <PlayerRow key={p.id} p={p} />)}</div>
              ) : (
                <p className="rounded-sm border border-dashed border-white/20 py-16 text-center text-white/50">No new players to discover right now.</p>
              )}
            </>
          ) : tab === "friends" ? (
            myFriends.length ? (
              <div className="grid gap-3">{myFriends.map(p => <PlayerRow key={p.id} p={p} />)}</div>
            ) : (
              <p className="rounded-sm border border-dashed border-white/20 py-16 text-center text-white/50">No friends yet. Discover and add players above.</p>
            )
          ) : tab === "requests" ? (
            requestsToMe.length ? (
              <div className="grid gap-3">
                {requestsToMe.map(f => {
                  const p = players.find(x => x.callsign === f.requester_callsign);
                  return (
                    <div key={f.id} className="flex items-center gap-4 rounded-sm border border-white/15 bg-white/[0.03] p-4">
                      <Link to={`/profile/${f.requester_callsign}`} className="grid h-12 w-12 place-items-center rounded-full border border-white/40 serif text-xl font-semibold">{f.requester_callsign?.charAt(0).toUpperCase()}</Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/profile/${f.requester_callsign}`} className="font-medium hover:underline">@{f.requester_callsign}</Link>
                        <p className="text-xs text-white/45">wants to join your squad</p>
                      </div>
                      <button onClick={() => acceptFriend(f)} className="flex items-center gap-1.5 rounded-full border border-white bg-white px-4 py-2 text-xs font-medium text-[#2c2c2c]"><Check size={14} /> Accept</button>
                      <button onClick={() => declineFriend(f)} className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:text-white"><X size={14} /> Decline</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-sm border border-dashed border-white/20 py-16 text-center text-white/50">No pending friend requests.</p>
            )
          ) : (
            myEventInvites.length ? (
              <div className="grid gap-3">
                {myEventInvites.map(inv => {
                  const ev = eventById(inv.event_id);
                  if (!ev) return null;
                  return (
                    <div key={inv.id} className="rounded-sm border border-white/15 bg-white/[0.03] p-5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/45"><Calendar size={14} /> {ev.visibility} event · hosted by @{ev.host_callsign}</div>
                      <h3 className="mt-2 serif text-2xl">{ev.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                        {ev.event_date && <span>{ev.event_date}</span>}
                        {ev.location && <span>· {ev.location}</span>}
                      </div>
                      {ev.description && <p className="mt-3 text-sm leading-6 text-white/70">{ev.description}</p>}
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => rsvp(inv, "accepted")} className="flex items-center gap-1.5 rounded-full border border-white bg-white px-4 py-2 text-xs font-medium text-[#2c2c2c]"><Check size={14} /> Going</button>
                        <button onClick={() => rsvp(inv, "declined")} className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:text-white"><X size={14} /> Can't go</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-sm border border-dashed border-white/20 py-16 text-center text-white/50">No pending event invites. <Link to="/events" className="underline">Browse events</Link></p>
            )
          )}
        </div>
      </div>
    </main>
  );
}
