import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "@/lib/callsignAuth";
import PostThumb from "@/components/flying-eagle/PostThumb";
import TopoBackground from "@/components/flying-eagle/TopoBackground";

const viewerId = localStorage.getItem("fep_viewer") || (() => { const id = crypto.randomUUID(); localStorage.setItem("fep_viewer", id); return id; })();

export default function Profile() {
  const { creator } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [subs, setSubs] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { player } = useCallsignAuth();
  const [contact, setContact] = useState({ phone: "", icloud_email: "", google_chat: "" });
  const [savingContact, setSavingContact] = useState(false);

  const load = async () => {
    const [all, s, l] = await Promise.all([
      base44.entities.AirsoftPost.list("-created_date"),
      base44.entities.ChannelSubscription.list(),
      base44.entities.PostLike.list(),
    ]);
    setPosts(all.filter(p => p.creator_name === creator));
    setSubs(s); setLikes(l);
    if (player && creator === player.callsign) {
      try {
        const me = await base44.entities.AirsoftPlayer.get(player.id);
        setContact({ phone: me.phone || "", icloud_email: me.icloud_email || "", google_chat: me.google_chat || "" });
      } catch {}
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [creator]);

  const followers = useMemo(() => subs.filter(s => s.creator_name === creator), [subs, creator]);
  const videoCount = useMemo(() => posts.filter(p => p.media_type === "video").length, [posts]);
  const totalLikes = useMemo(() => likes.filter(l => posts.some(p => p.id === l.post_id)).length, [likes, posts]);
  const subbed = subs.some(s => s.creator_name === creator && s.viewer_id === viewerId);

  const toggleSub = async () => {
    const current = subs.find(s => s.creator_name === creator && s.viewer_id === viewerId);
    if (current) { await base44.entities.ChannelSubscription.delete(current.id); setSubs(v => v.filter(s => s.id !== current.id)); }
    else { const made = await base44.entities.ChannelSubscription.create({ creator_name: creator, viewer_id: viewerId }); setSubs(v => [...v, made]); }
  };

  const saveContact = async () => {
    setSavingContact(true);
    try { await base44.entities.AirsoftPlayer.update(player.id, contact); } finally { setSavingContact(false); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#2c2c2c]"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <main className="relative min-h-screen text-white">
      <TopoBackground />
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60 hover:text-white"><ArrowLeft size={16} /> Back</button>
        <div className="rounded-sm border border-white/15 bg-white/[0.03] p-6 sm:p-10">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-white/40 serif text-3xl font-semibold text-white">{creator?.charAt(0).toUpperCase()}</div>
            <div className="flex-1">
              <h1 className="serif text-4xl font-semibold text-white">@{creator}</h1>
              <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm sm:justify-start">
                <span><b className="text-white">{posts.length}</b> <span className="text-white/50">posts</span></span>
                <span><b className="text-white">{videoCount}</b> <span className="text-white/50">videos</span></span>
                <span><b className="text-white">{followers.length}</b> <span className="text-white/50">followers</span></span>
                <span className="flex items-center gap-1"><Heart size={14} className="text-red-400" /><b className="text-white">{totalLikes}</b> <span className="text-white/50">likes</span></span>
              </div>
            </div>
            <button onClick={toggleSub} className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition ${subbed ? "border-white/30 text-white" : "border-white bg-white text-[#2c2c2c]"}`}>{subbed ? <UserCheck size={15} /> : <UserPlus size={15} />} {subbed ? "Subscribed" : "Subscribe"}</button>
          </div>
        </div>

        {player && creator === player.callsign && (
          <div className="mt-6 rounded-sm border border-white/15 bg-white/[0.03] p-6">
            <h2 className="serif text-2xl font-semibold text-white">Cross-app contact info</h2>
            <p className="mt-1 text-sm text-white/50">Let squad members reach you on Messages, iCloud, or Google Chat.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input placeholder="Phone (SMS/iMessage)" value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} className="field" />
              <input placeholder="iCloud email" value={contact.icloud_email} onChange={e => setContact({ ...contact, icloud_email: e.target.value })} className="field" />
              <input placeholder="Google Chat handle" value={contact.google_chat} onChange={e => setContact({ ...contact, google_chat: e.target.value })} className="field" />
            </div>
            <button onClick={saveContact} disabled={savingContact} className="mt-4 rounded-sm bg-white px-5 py-2.5 text-sm font-semibold text-[#2c2c2c] disabled:opacity-40">{savingContact ? "Saving…" : "Save contact info"}</button>
          </div>
        )}

        {followers.length > 0 && (
          <div className="mt-6 rounded-sm border border-white/15 bg-white/[0.03] p-5">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/50">Followers</h2>
            <div className="flex flex-wrap gap-2">
              {followers.map(f => <span key={f.id} className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70">Viewer {f.viewer_id.slice(0, 6)}</span>)}
            </div>
          </div>
        )}

        <h2 className="mb-5 mt-10 text-xs font-medium uppercase tracking-[0.2em] text-white/50">All posts</h2>
        {posts.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => <PostThumb key={post.id} post={post} likeCount={likes.filter(l => l.post_id === post.id).length} />)}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-white/20 py-16 text-center">
            <p className="serif text-2xl text-white">No posts yet</p>
            <p className="mt-2 text-sm text-white/50">This creator hasn't shared any media.</p>
          </div>
        )}
      </div>
    </main>
  );
}
