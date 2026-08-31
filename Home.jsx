import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SiteHeader from "@/components/flying-eagle/SiteHeader";
import PostComposer from "@/components/flying-eagle/PostComposer";
import PostThumb from "@/components/flying-eagle/PostThumb";
import TopoBackground from "@/components/flying-eagle/TopoBackground";
import { Image } from "@/components/ui/image";
import { useCallsignAuth } from "@/lib/callsignAuth";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { isAuthed: authed } = useCallsignAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    const [p, l] = await Promise.all([base44.entities.AirsoftPost.list("-created_date"), base44.entities.PostLike.list()]);
    setPosts(p); setLikes(l); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    let v = filter === "all" ? posts : posts.filter(p => p.media_type === filter);
    const q = query.trim().toLowerCase();
    if (q) v = v.filter(p => (p.title || "").toLowerCase().includes(q) || (p.creator_name || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.battle_location || "").toLowerCase().includes(q));
    return v;
  }, [posts, filter, query]);
  const likeCountFor = (postId) => likes.filter(l => l.post_id === postId).length;

  return (
    <main className="min-h-screen text-white">
      <SiteHeader onPost={() => { if (authed) setOpen(true); else navigate("/login"); }} />
      <section className="relative border-b border-white/15 bg-[#2c2c2c]">
        <TopoBackground />
        <div className="relative mx-auto max-w-3xl px-6 py-16 sm:py-24">
          <div className="overflow-hidden rounded-sm border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <Image src="https://media.base44.com/images/public/6a90c8e5868de35f9bd5e54e/07c8bfac8_generated_image.png" alt="Airsoft squad in the field" className="aspect-[16/9] w-full" fittingType="fill" />
          </div>
          <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-7 text-white/70">The field journal of the airsoft community — raw battle media, tactical stories, and standout plays, shared by players like you.</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search battles, creators, locations…" className="field pl-11" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[["all", "All"], ["video", "Videos"], ["image", "Photos"]].map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)} className={`rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-widest transition ${filter === v ? "border-white bg-white text-[#2c2c2c]" : "border-white/20 text-white/70 hover:border-white/60"}`}>{label}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid place-items-center py-24"><Loader2 className="animate-spin text-white" /></div>
        ) : visible.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(post => <PostThumb key={post.id} post={post} likeCount={likeCountFor(post.id)} />)}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-white/20 py-20 text-center">
            <p className="serif text-2xl text-white">No battle posts yet</p>
            <p className="mt-2 text-sm text-white/50">Be the first to share action from the field.</p>
          </div>
        )}
      </section>
      <PostComposer open={open} onClose={() => setOpen(false)} onCreated={post => setPosts(v => [post, ...v])} />
    </main>
  );
}
