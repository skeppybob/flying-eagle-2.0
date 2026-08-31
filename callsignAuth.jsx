import React, { createContext, useContext, useState } from "react";
import { base44 } from "@/api/base44Client";

const Ctx = createContext(null);

async function hashPassword(pw) {
  const enc = new TextEncoder().encode("fep::" + pw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function CallsignAuthProvider({ children }) {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fep_player") || "null"); } catch { return null; }
  });
  const [guest, setGuest] = useState(() => localStorage.getItem("fep_guest") === "1");

  const persist = (p) => {
    setPlayer(p);
    if (p) localStorage.setItem("fep_player", JSON.stringify(p));
    else localStorage.removeItem("fep_player");
  };

  const register = async (callsign, password) => {
    const clean = callsign.trim();
    if (!clean) throw new Error("Choose a callsign");
    if (clean.length < 3) throw new Error("Callsign must be at least 3 characters");
    if (password.length < 4) throw new Error("Password must be at least 4 characters");
    const existing = await base44.entities.AirsoftPlayer.filter({ callsign: clean });
    if (existing.length) throw new Error("That callsign is already taken");
    const password_hash = await hashPassword(password);
    const rec = await base44.entities.AirsoftPlayer.create({ callsign: clean, password_hash });
    localStorage.setItem("fep_guest", "0"); setGuest(false);
    persist({ id: rec.id, callsign: rec.callsign });
  };

  const login = async (callsign, password) => {
    const found = await base44.entities.AirsoftPlayer.filter({ callsign: callsign.trim() });
    if (!found.length) throw new Error("No player with that callsign");
    const hash = await hashPassword(password);
    if (found[0].password_hash !== hash) throw new Error("Wrong password");
    localStorage.setItem("fep_guest", "0"); setGuest(false);
    persist({ id: found[0].id, callsign: found[0].callsign });
  };

  const logout = () => { persist(null); };

  const continueAsGuest = () => {
    localStorage.setItem("fep_guest", "1");
    localStorage.removeItem("fep_player");
    setGuest(true); setPlayer(null);
  };

  return (
    <Ctx.Provider value={{ player, guest, isAuthed: !!player, register, login, logout, continueAsGuest }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCallsignAuth = () => useContext(Ctx);
