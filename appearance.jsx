import React, { createContext, useContext, useEffect, useState } from "react";

const KEY = "fep_appearance";

export const DEFAULTS = {
  bgMode: "color",
  bgColor: "#2c2c2c",
  bgImage: "",
  barPosition: "top",
  buttonOrder: ["home", "friends", "events", "messages", "dms", "channel", "post"],
  font: "serif",
};

export const FONTS = {
  serif: { heading: "'Cormorant Garamond', ui-serif, Georgia, serif", body: "ui-sans-serif, system-ui, sans-serif" },
  sans: { heading: "'Inter', ui-sans-serif, system-ui, sans-serif", body: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  mono: { heading: "ui-monospace, SFMono-Regular, Menlo, monospace", body: "ui-monospace, SFMono-Regular, Menlo, monospace" },
};

const AppearanceContext = createContext(null);

export function AppearanceProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings));
    const body = document.body;
    if (settings.bgMode === "image" && settings.bgImage) {
      body.style.backgroundImage = `url("${settings.bgImage}")`;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundColor = "#2c2c2c";
    } else {
      body.style.backgroundImage = "";
      body.style.backgroundColor = settings.bgColor;
    }
    body.style.paddingTop = "0";
    body.style.paddingBottom = "0";
    body.style.paddingLeft = "0";
    body.style.paddingRight = "0";
    if (settings.barPosition === "bottom") body.style.paddingBottom = "60px";
    else if (settings.barPosition === "left") body.style.paddingLeft = "84px";
    else if (settings.barPosition === "right") body.style.paddingRight = "84px";

    const f = FONTS[settings.font] || FONTS.serif;
    document.documentElement.style.setProperty("--font-heading", f.heading);
    document.documentElement.style.setProperty("--font-display", f.heading);
    document.documentElement.style.setProperty("--font-body", f.body);
  }, [settings]);

  const update = (patch) => setSettings(s => ({ ...s, ...patch }));
  return <AppearanceContext.Provider value={{ settings, update }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) return { settings: DEFAULTS, update: () => {} };
  return ctx;
}
