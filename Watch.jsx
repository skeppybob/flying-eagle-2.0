import React, { useEffect, useMemo, useState } from "react";
import { Heart, MapPin, UserCheck, UserPlus, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import PostThumb from "@/components/flying-eagle/PostThumb";
import TopoBackground from "@/components/flying-eagle/TopoBackground";
import { useCallsignAuth } from "@/lib/callsignAuth";

const viewerId = localStorage.getItem("fep_viewer") || (() => { const id = crypto.randomUUID(); localStorage.setItem("fep_viewer", id); return id; })();

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [likes, setLikes] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { player } = useCallsignAuth();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [p, all, l, s] = await Promise.all([
        base44.entities.AirsoftPost.get(id),
        base44.entities.AirsoftPost.list("-created_date", 20),
        base44.entities.PostLike.list(),
        base44.entities.ChannelSubscription.list(),
      ]);
      if (!active) return;
      setPost(p); setRelated(all.filter(x => x.id !== id).slice(0, 8)); setLikes(l); setSubs(s); setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  const toggleLike = async () => {
    const current = likes.find(l => l.post_id === post.id && l.viewer_id === viewerId);
    if (current) { await base44.entities.PostLike.delete(current.id); setLikes(v => v.filter(l => l.id !== current.id)); }
    else { const made = await base44.entities.PostLike.create({ post_id: post.id, viewer_id: viewerId }); setLikes(v => [...v, made]); }
  };
  const toggleSub = async () => {
    const current = subs.find(s => s.creator_name === post.creator_name && s.viewer_id === viewerId);
    if (current) { await base44.entities.ChannelSubscription.delete(current.id); setSubs(v => v.filter(s => s.id !== current.id)); }
    else { const made = await base44.entities.ChannelSubscription.create({ creator_name: post.creator_name, viewer_id: viewerId }); setSubs(v => [...v, made]); }
  };

  const removePost = async () => {
    if (!window.confirm("Delete this post permanently?")) return;
    const related = likes.filter(l => l.post_id === post.id);
    await Promise.all([
      base44.entities.AirsoftPost.delete(post.id),
      ...related.map(l => base44.entities.PostLike.delete(l.id)),
    ]);
    navigate("/");
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#2c2c2c]"><Loader2 className="animate-spin text-white" /></div>;
  if (!post) return <div className="grid min-h-screen place-items-center bg-[#2c2c2c] text-white"><p>Post not found. <Link to="/" className="underline">Go home</Link></p></div>;

  const liked = likes.some(l => l.post_id === post.id && l.viewer_id === viewerId);
  const likeCount = likes.filter(l => l.post_id === post.id).length;
  const subbed = subs.some(s => s.creator_name === post.creator_name && s.viewer_id === viewerId);

  return (
    <main className="relative min-h-screen text-white">
      <TopoBackground />
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60 hover:text-white"><ArrowLeft size={16} /> Back</button>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="overflow-hidden rounded-sm border border-white/15 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
              {post.media_type === "video" ? (
                <video src={post.media_url} controls autoPlay playsInline className="aspect-video w-full object-contain" />
              ) : (
                <Image src={post.media_url} alt={post.title} className="aspect-video w-full" fittingType="fit" />
              )}
            </div>
            <h1 className="mt-6 serif text-3xl font-semibold text-white">{post.title}</h1>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-white/15 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-white/40 text-lg font-semibold text-white">{post.creator_name?.charAt(0).toUpperCase()}</div>
                <Link to={`/profile/${post.creator_name}`}><p className="font-medium text-white hover:underline">@{post.creator_name}</p></Link>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleLike} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${liked ? "border-red-500/60 bg-red-500/10 text-red-400" : "border-white/20 text-white hover:border-white"}`}><Heart size={16} fill={liked ? "currentColor" : "none"} /> {likeCount}</button>
                <button onClick={toggleSub} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${subbed ? "border-white/30 text-white" : "border-white bg-white text-[#2c2c2c]"}`}>{subbed ? <UserCheck size={15} /> : <UserPlus size={15} />} {subbed ? "Subscribed" : "Subscribe"}</button>
                {post.creator_name === player?.callsign && <button onClick={removePost} className="flex items-center gap-2 rounded-full border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"><Trash2 size={15} /> Delete</button>}
              </div>
            </div>
            <div className="mt-5 rounded-sm border border-white/15 bg-white/[0.03] p-5">
              {post.battle_location && <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/50"><MapPin size={14} />{post.battle_location}</p>}
              {post.description ? <p className="leading-7 text-white/75">{post.description}</p> : <p className="text-white/40">No description provided.</p>}
            </div>
          </div>
          <aside>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/50">More from the field</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {related.map(r => <PostThumb key={r.id} post={r} likeCount={likes.filter(l => l.post_id === r.id).length} />)}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
