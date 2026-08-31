import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCallsignAuth } from "./callsignAuth";

const Ctx = createContext(null);
const ONLINE_WINDOW_MS = 45000;

function activityFromPath(pathname) {
  if (pathname.startsWith("/watch")) return "Watching battle media";
  if (pathname.startsWith("/chat")) return "In a group chat";
  if (pathname.startsWith("/chats")) return "Browsing chats";
  if (pathname.startsWith("/profile")) return "Viewing a profile";
  if (pathname.startsWith("/login")) return "Online";
  return "On the feed";
}

export function PresenceProvider({ children }) {
  const { player } = useCallsignAuth();
  const location = useLocation();
  const pathRef = useRef(window.location.pathname);
  const [players, setPlayers] = useState([]);

  useEffect(() => { pathRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const list = await base44.entities.AirsoftPlayer.list();
      if (active) setPlayers(list);
    };
    load();
    const unsub = base44.entities.AirsoftPlayer.subscribe((ev) => {
      setPlayers(prev => {
        if (ev.type === "create") return prev.some(p => p.id === ev.data.id) ? prev : [...prev, ev.data];
        if (ev.type === "update") return prev.map(p => p.id === ev.data.id ? { ...p, ...ev.data } : p);
        if (ev.type === "delete") return prev.filter(p => p.id !== ev.data.id);
        return prev;
      });
    });
    return () => { active = false; unsub(); };
  }, []);

  useEffect(() => {
    if (!player) return;
    let active = true;
    const beat = async () => {
      try {
        await base44.entities.AirsoftPlayer.update(player.id, {
          last_heartbeat: new Date().toISOString(),
          activity: activityFromPath(pathRef.current),
        });
      } catch {}
    };
    beat();
    const interval = setInterval(beat, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [player]);

  const isOnline = (callsign) => {
    const p = players.find(x => x.callsign === callsign);
    if (!p || !p.last_heartbeat) return false;
    return Date.now() - new Date(p.last_heartbeat).getTime() < ONLINE_WINDOW_MS;
  };
  const getActivity = (callsign) => {
    if (!isOnline(callsign)) return "Offline";
    const p = players.find(x => x.callsign === callsign);
    return p?.activity || "Online";
  };
  const getContact = (callsign) => players.find(x => x.callsign === callsign) || null;

  return <Ctx.Provider value={{ players, isOnline, getActivity, getContact }}>{children}</Ctx.Provider>;
}

export const usePresence = () => useContext(Ctx);
