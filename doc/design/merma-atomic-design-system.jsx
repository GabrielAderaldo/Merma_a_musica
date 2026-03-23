import { useState } from "react";

const C = {
  bgDeep: "#0B0E17", bgSurface: "#121829", bgElevated: "#1A2340", bgOverlay: "#232E52",
  accent: "#8B5CF6", accentHover: "#A78BFA", gold: "#F59E0B", goldHover: "#FBBF24",
  success: "#22C55E", error: "#EF4444", warning: "#EAB308", info: "#3B82F6",
  textP: "#F1F5F9", textS: "#94A3B8", textM: "#64748B",
  borderS: "#1E293B", borderD: "#334155", borderStr: "#475569",
};
const PC = ["#8B5CF6","#F59E0B","#22C55E","#EF4444","#3B82F6","#EC4899","#14B8A6","#F97316","#06B6D4","#A855F7"];

const tabs = [
  { id: "foundation", label: "Fundação" },
  { id: "atoms", label: "Átomos" },
  { id: "molecules", label: "Moléculas" },
  { id: "organisms", label: "Organismos" },
  { id: "pages", label: "Páginas" },
];

function Swatch({ hex, name }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: hex, border: `1px solid ${C.borderD}`, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.textP, fontFamily: "'DM Sans'" }}>{name}</div>
        <div style={{ fontSize: 10, color: C.textM, fontFamily: "'JetBrains Mono'" }}>{hex}</div>
      </div>
    </div>
  );
}

function Sec({ children, title }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textS, fontFamily: "'DM Sans'", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: C.bgSurface, border: `1px solid ${C.borderS}`, borderRadius: 14, padding: 14, ...style }}>{children}</div>;
}

function Badge({ children, variant = "muted" }) {
  const v = { success: { bg: "rgba(34,197,94,0.12)", c: C.success }, error: { bg: "rgba(239,68,68,0.12)", c: C.error }, warning: { bg: "rgba(234,179,8,0.12)", c: C.warning }, info: { bg: "rgba(59,130,246,0.12)", c: C.info }, gold: { bg: "rgba(245,158,11,0.1)", c: C.gold }, muted: { bg: "rgba(100,116,139,0.12)", c: C.textM } }[variant];
  return <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans'", textTransform: "uppercase", letterSpacing: "0.5px", background: v.bg, color: v.c }}>{children}</span>;
}

function Av({ name, color, size = 32 }) {
  const fs = size < 32 ? 10 : size < 40 ? 12 : size < 56 ? 16 : 20;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: `${color}1A`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: size >= 48 ? "'Fredoka'" : "'DM Sans'", fontSize: fs, fontWeight: 600, color, flexShrink: 0 }}>{name[0].toUpperCase()}</div>;
}

function Btn({ children, variant = "primary", size = "md" }) {
  const s = { sm: { h: 30, px: 14, fs: 12 }, md: { h: 38, px: 22, fs: 14 }, lg: { h: 46, px: 28, fs: 16 }, xl: { h: 52, px: 36, fs: 18 } }[size];
  const vs = { primary: { bg: C.accent, c: "#fff", bd: "none" }, secondary: { bg: "transparent", c: C.accent, bd: `1.5px solid ${C.accent}` }, ghost: { bg: "transparent", c: C.textS, bd: "none" }, danger: { bg: C.error, c: "#fff", bd: "none" }, gold: { bg: C.gold, c: "#1A1A2E", bd: "none" } }[variant];
  return <button style={{ height: s.h, padding: `0 ${s.px}px`, fontSize: s.fs, fontWeight: 600, fontFamily: size === "xl" ? "'Fredoka'" : "'DM Sans'", borderRadius: size === "xl" ? 14 : 10, background: vs.bg, color: vs.c, border: vs.bd, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{children}</button>;
}

function LayerBadge({ layer }) {
  const colors = { atom: "#3B82F6", molecule: "#8B5CF6", organism: "#22C55E", template: "#F59E0B", page: "#EF4444" };
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: "'DM Sans'", textTransform: "uppercase", letterSpacing: "0.5px", background: `${colors[layer]}20`, color: colors[layer] }}>{layer}</span>;
}

function Foundation() {
  return (
    <div>
      <Sec title="Superfícies">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Swatch hex="#0B0E17" name="Deep" /><Swatch hex="#121829" name="Surface" />
          <Swatch hex="#1A2340" name="Elevated" /><Swatch hex="#232E52" name="Overlay" />
        </div>
      </Sec>
      <Sec title="Accent (Marca)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Swatch hex="#8B5CF6" name="Primary (Roxo)" /><Swatch hex="#A78BFA" name="Primary Hover" />
          <Swatch hex="#F59E0B" name="Gold (Dourado)" /><Swatch hex="#FBBF24" name="Gold Hover" />
        </div>
      </Sec>
      <Sec title="Semânticas">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Swatch hex="#22C55E" name="Success" /><Swatch hex="#EF4444" name="Error" />
          <Swatch hex="#EAB308" name="Warning" /><Swatch hex="#3B82F6" name="Info" />
        </div>
      </Sec>
      <Sec title="Jogadores (10 slots)">
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {PC.map((c, i) => <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "'DM Sans'" }}>{i + 1}</div>)}
        </div>
      </Sec>
      <Sec title="Tipografia">
        <Card>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'", marginBottom: 2 }}>FREDOKA — Display</div>
            <div style={{ fontFamily: "'Fredoka'", fontSize: 30, fontWeight: 600, color: C.textP, lineHeight: 1.1 }}>Mermã, a Música!</div>
            <div style={{ fontFamily: "'Fredoka'", fontSize: 20, fontWeight: 500, color: C.textP, marginTop: 4 }}>Lobby da Sala</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'", marginBottom: 2 }}>DM SANS — UI / Body</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 15, color: C.textP, lineHeight: 1.5 }}>Quiz musical com as playlists dos seus amigos.</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.textS, marginTop: 2 }}>Texto auxiliar e metadados</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'", marginBottom: 2 }}>JETBRAINS MONO — Timer / Código</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 32, fontWeight: 700, color: C.accent }}>24</span>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 20, fontWeight: 600, color: C.textP, letterSpacing: 2 }}>ABC123</span>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 15, fontWeight: 600, color: C.gold }}>+850</span>
            </div>
          </div>
        </Card>
      </Sec>
    </div>
  );
}

function Atoms() {
  const [inputVal, setInputVal] = useState("");
  return (
    <div>
      <Sec title="Botão (Button)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          <Btn variant="primary">Criar Sala</Btn>
          <Btn variant="secondary">Entrar</Btn>
          <Btn variant="gold">Pronto!</Btn>
          <Btn variant="danger">Sair</Btn>
          <Btn variant="ghost">Pular</Btn>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Btn size="sm">SM</Btn><Btn size="md">MD</Btn><Btn size="lg">LG</Btn>
        </div>
        <div style={{ marginTop: 6 }}><Btn variant="primary" size="xl">Bora Jogar!</Btn></div>
      </Sec>
      <Sec title="Badge">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Badge variant="success">Pronto</Badge><Badge variant="error">Errado</Badge>
          <Badge variant="warning">Quase</Badge><Badge variant="info">Host</Badge>
          <Badge variant="gold">1º Lugar</Badge><Badge variant="muted">Esperando</Badge>
        </div>
      </Sec>
      <Sec title="Avatar (tamanhos)">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Av name="G" color={PC[0]} size={24} />
          <Av name="M" color={PC[1]} size={28} />
          <Av name="J" color={PC[2]} size={36} />
          <Av name="A" color={PC[3]} size={48} />
          <Av name="P" color={PC[4]} size={64} />
        </div>
      </Sec>
      <Sec title="AlbumCover (sm / md / lg + fallback)">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src="https://e-cdns-images.dzcdn.net/images/cover/b05b3a1565d3ecdc7f132a59e918ab38/264x264-000000-80-0-0.jpg" alt="Album cover sm" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", border: `1px solid ${C.borderS}` }} />
          <img src="https://e-cdns-images.dzcdn.net/images/cover/b05b3a1565d3ecdc7f132a59e918ab38/264x264-000000-80-0-0.jpg" alt="Album cover md" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", border: `1px solid ${C.borderS}` }} />
          <img src="https://e-cdns-images.dzcdn.net/images/cover/b05b3a1565d3ecdc7f132a59e918ab38/264x264-000000-80-0-0.jpg" alt="Album cover lg" style={{ width: 96, height: 96, borderRadius: 14, objectFit: "cover", border: `1px solid ${C.borderS}` }} />
          <div style={{ width: 64, height: 64, borderRadius: 10, background: C.bgElevated, border: `1px solid ${C.borderS}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 24, color: C.textM, opacity: 0.6 }}>♪</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'", marginTop: 6 }}>sm (40px) · md (64px) · lg (96px) · fallback</div>
      </Sec>
      <Sec title="TextInput (md)">
        <input placeholder="Código da sala..." style={{ width: "100%", height: 42, background: C.bgElevated, border: `1px solid ${C.borderD}`, borderRadius: 10, padding: "0 14px", fontSize: 14, color: C.textP, fontFamily: "'DM Sans'", outline: "none", boxSizing: "border-box" }} />
      </Sec>
      <Sec title="TextInput (lg — resposta)">
        <div style={{ position: "relative" }}>
          <input value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder="Digite sua resposta..." style={{ width: "100%", height: 52, background: C.bgSurface, border: `2px solid ${inputVal ? C.success : C.accent}`, borderRadius: 14, padding: "0 18px", fontSize: 17, color: C.textP, fontFamily: "'DM Sans'", fontWeight: 500, outline: "none", boxShadow: `0 0 0 4px ${inputVal ? "rgba(34,197,94,0.12)" : "rgba(139,92,246,0.12)"}`, boxSizing: "border-box" }} />
          {inputVal && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: C.success, fontSize: 18 }}>✓</span>}
        </div>
      </Sec>
      <Sec title="Toggle / Slider / Progress">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: C.accent, position: "relative" }}><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 20, transition: "left 200ms" }} /></div>
            <span style={{ fontSize: 13, color: C.textS, fontFamily: "'DM Sans'" }}>Permitir repetição</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="range" min="10" max="60" defaultValue="30" style={{ flex: 1, accentColor: C.accent }} />
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, fontWeight: 600, color: C.textP, minWidth: 28 }}>30s</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: C.bgOverlay, overflow: "hidden" }}>
            <div style={{ width: "65%", height: "100%", borderRadius: 3, background: C.accent }} />
          </div>
        </div>
      </Sec>
    </div>
  );
}

function Molecules() {
  return (
    <div>
      <Sec title="PlayerIdentity">
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Av name="Gabriel" color={PC[0]} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, color: C.textP }}>Gabriel</span>
                <Badge variant="info">Host</Badge>
              </div>
              <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM }}>Spotify conectado</span>
            </div>
            <Badge variant="success">Pronto</Badge>
          </div>
        </Card>
      </Sec>
      <Sec title="InviteCode">
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bgElevated, padding: "10px 14px", borderRadius: 10, border: `1px dashed ${C.borderD}` }}>
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 22, fontWeight: 600, color: C.textP, letterSpacing: 3, flex: 1 }}>ABC123</span>
          <Btn variant="ghost" size="sm">Copiar</Btn>
        </div>
      </Sec>
      <Sec title="TimerDisplay (3 estados)">
        <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
          {[{ v: 24, c: C.accent, l: "Normal" }, { v: 8, c: C.gold, l: "Urgente" }, { v: 3, c: C.error, l: "Crítico" }].map((t) => (
            <div key={t.l} style={{ textAlign: "center" }}>
              <div style={{ width: 66, height: 66, borderRadius: "50%", border: `3px solid ${t.c}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 26, fontWeight: 700, color: t.c }}>{t.v}</span>
              </div>
              <span style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'" }}>{t.l}</span>
            </div>
          ))}
        </div>
      </Sec>
      <Sec title="AudioWave">
        <div style={{ display: "flex", justifyContent: "center", gap: 3, padding: "8px 0" }}>
          {[10, 16, 22, 14, 20, 12, 18, 24, 16, 12, 20, 14].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: C.accent, opacity: 0.5 + Math.random() * 0.5 }} />
          ))}
        </div>
      </Sec>
      <Sec title="PlayerResponseRow">
        {[
          { n: "Gabriel", a: "Bohemian Rhapsody", ok: true, pts: "+920", c: PC[0] },
          { n: "Maria", a: "boemian rapsody", ok: true, pts: "+680", c: PC[1] },
          { n: "João", a: "We Will Rock You", ok: false, pts: "", c: PC[2] },
        ].map((r) => (
          <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: r.ok ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)", borderRadius: 8, border: `1px solid ${r.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)"}`, marginBottom: 4 }}>
            <Av name={r.n} color={r.c} size={22} />
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textP }}>{r.n}</span>
              <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM, marginLeft: 6 }}>{r.a}</span>
            </div>
            {r.pts && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 600, color: C.gold }}>{r.pts}</span>}
            <span style={{ fontSize: 13 }}>{r.ok ? "✅" : "❌"}</span>
          </div>
        ))}
      </Sec>
      <Sec title="HighlightStat">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[{ i: "🔥", t: "Maior Streak", v: "5 seguidas", p: "Gabriel", c: PC[0] }, { i: "⚡", t: "Mais Rápida", v: "1.2s", p: "Maria", c: PC[1] }].map((h) => (
            <div key={h.t} style={{ background: `linear-gradient(135deg, ${C.bgSurface}, ${C.bgElevated})`, border: `1px solid rgba(139,92,246,0.2)`, borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{h.i}</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.textM, fontWeight: 600, textTransform: "uppercase" }}>{h.t}</div>
              <div style={{ fontFamily: "'Fredoka'", fontSize: 16, fontWeight: 600, color: C.textP }}>{h.v}</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: h.c, marginTop: 1 }}>{h.p}</div>
            </div>
          ))}
        </div>
      </Sec>
      <Sec title="PlatformButton">
        <div style={{ display: "flex", gap: 8 }}>
          {[{ n: "Spotify", c: "#1DB954" }, { n: "Deezer", c: "#A238FF" }, { n: "YouTube", c: "#FF0000" }].map((p) => (
            <button key={p.n} style={{ height: 36, padding: "0 14px", background: `${p.c}18`, color: p.c, border: `1px solid ${p.c}40`, borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans'", cursor: "pointer" }}>{p.n}</button>
          ))}
        </div>
      </Sec>
    </div>
  );
}

function Organisms() {
  return (
    <div>
      <Sec title="PlayerList (Lobby)">
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: "'Fredoka'", fontSize: 17, fontWeight: 500, color: C.textP }}>Jogadores (3/20)</span>
        </div>
        {[{ n: "Gabriel", c: PC[0], s: "Pronto", host: true, sub: "Spotify" }, { n: "Maria", c: PC[1], s: "Pronto", host: false, sub: "Sem playlist" }, { n: "João", c: PC[2], s: "Esperando", host: false, sub: "Deezer" }].map((p) => (
          <Card key={p.n} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Av name={p.n} color={p.c} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.textP }}>{p.n}</span>
                  {p.host && <Badge variant="info">Host</Badge>}
                </div>
                <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM }}>{p.sub}</span>
              </div>
              <Badge variant={p.s === "Pronto" ? "success" : "muted"}>{p.s}</Badge>
            </div>
          </Card>
        ))}
      </Sec>
      <Sec title="GamePlayArea (Rodada)">
        <div style={{ background: C.bgDeep, borderRadius: 14, padding: "16px 16px 20px", border: `1px solid ${C.borderS}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textM }}>Rodada <span style={{ color: C.textP, fontWeight: 600 }}>3</span>/10</span>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.gold, fontWeight: 600 }}>1.850 pts</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", border: `3px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 28, fontWeight: 700, color: C.accent }}>24</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 14 }}>
            {[10, 16, 22, 14, 20, 12, 18, 24, 16, 12].map((h, i) => <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: C.accent, opacity: 0.5 + (i % 3) * 0.2 }} />)}
          </div>
          <input placeholder="Digite sua resposta..." readOnly style={{ width: "100%", height: 48, background: C.bgSurface, border: `2px solid ${C.accent}`, borderRadius: 14, padding: "0 16px", fontSize: 16, color: C.textP, fontFamily: "'DM Sans'", fontWeight: 500, outline: "none", boxShadow: `0 0 0 4px rgba(139,92,246,0.12)`, boxSizing: "border-box", marginBottom: 12 }} />
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {["G", "M", "J", "A"].map((n, i) => (
              <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: `${PC[i]}1A`, border: `2px solid ${PC[i]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: PC[i], fontFamily: "'DM Sans'", opacity: i < 2 ? 1 : 0.4 }}>{i < 2 ? "✓" : n}</div>
            ))}
          </div>
        </div>
      </Sec>
      <Sec title="RoundReveal (Revelação)">
        <div style={{ background: C.bgDeep, borderRadius: 14, padding: "16px 16px 20px", border: `1px solid ${C.borderS}` }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <img src="https://e-cdns-images.dzcdn.net/images/cover/b05b3a1565d3ecdc7f132a59e918ab38/264x264-000000-80-0-0.jpg" alt="A Night at the Opera — Queen" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", margin: "0 auto 8px", display: "block", border: `1px solid ${C.borderS}` }} />
            <div style={{ fontFamily: "'Fredoka'", fontSize: 18, fontWeight: 500, color: C.textP }}>Bohemian Rhapsody</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.textS }}>Queen</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM, marginTop: 1 }}>A Night at the Opera</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM, marginTop: 2 }}>Da playlist de <span style={{ color: PC[0] }}>Gabriel</span></div>
          </div>
          {[{ n: "Gabriel", a: "Bohemian Rhapsody", ok: true, pts: "+920", c: PC[0] }, { n: "Maria", a: "boemian rapsody", ok: true, pts: "+680", c: PC[1] }, { n: "João", a: "We Will Rock You", ok: false, pts: "", c: PC[2] }, { n: "Ana", a: "", ok: false, pts: "", c: PC[3] }].map((r) => (
            <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: r.ok ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)", borderRadius: 8, border: `1px solid ${r.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)"}`, marginBottom: 4 }}>
              <Av name={r.n} color={r.c} size={20} />
              <div style={{ flex: 1 }}><span style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textP }}>{r.n}</span><span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM, marginLeft: 6 }}>{r.a || "Não respondeu"}</span></div>
              {r.pts && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, fontWeight: 600, color: C.gold }}>{r.pts}</span>}
              <span style={{ fontSize: 12 }}>{r.ok ? "✅" : "❌"}</span>
            </div>
          ))}
        </div>
      </Sec>
    </div>
  );
}

function Pages() {
  return (
    <div>
      <Sec title="Tela Inicial">
        <div style={{ background: C.bgDeep, borderRadius: 14, padding: "32px 20px", textAlign: "center", border: `1px solid ${C.borderS}` }}>
          <div style={{ fontFamily: "'Fredoka'", fontSize: 28, fontWeight: 600, marginBottom: 2 }}>
            <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mermã, a Música!</span>
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.textS, marginBottom: 24 }}>Quiz musical com as playlists dos seus amigos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 240, margin: "0 auto" }}>
            <button style={{ height: 48, background: C.accent, color: "#fff", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 600, fontFamily: "'Fredoka'", cursor: "pointer" }}>Criar Sala</button>
            <button style={{ height: 48, background: "transparent", color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 14, fontSize: 17, fontWeight: 600, fontFamily: "'Fredoka'", cursor: "pointer" }}>Entrar na Sala</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px auto 0", justifyContent: "center" }}>
            <div style={{ height: 1, width: 32, background: C.borderD }} />
            <span style={{ fontSize: 11, color: C.textM, fontFamily: "'DM Sans'" }}>conecte suas playlists</span>
            <div style={{ height: 1, width: 32, background: C.borderD }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
            {[{ n: "Spotify", c: "#1DB954" }, { n: "Deezer", c: "#A238FF" }, { n: "YouTube", c: "#FF0000" }].map((p) => (
              <button key={p.n} style={{ height: 32, padding: "0 12px", background: `${p.c}18`, color: p.c, border: `1px solid ${p.c}40`, borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans'", cursor: "pointer" }}>{p.n}</button>
            ))}
          </div>
        </div>
      </Sec>
      <Sec title="Resultados (Pódio + Destaques)">
        <div style={{ background: C.bgDeep, borderRadius: 14, padding: "20px 16px", border: `1px solid ${C.borderS}` }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: "'Fredoka'", fontSize: 20, fontWeight: 600, color: C.textP }}>Resultados</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginBottom: 20 }}>
            <div style={{ textAlign: "center" }}>
              <Av name="Maria" color={PC[1]} size={40} />
              <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textP, marginTop: 4 }}>Maria</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 600, color: C.textS }}>2.100</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.textM }}>2º</div>
            </div>
            <div style={{ textAlign: "center", transform: "translateY(-8px)" }}>
              <div style={{ boxShadow: `0 0 20px rgba(245,158,11,0.3)`, borderRadius: "50%", display: "inline-block" }}>
                <Av name="Gabriel" color={PC[0]} size={56} />
              </div>
              <div style={{ fontFamily: "'Fredoka'", fontSize: 16, fontWeight: 600, color: C.textP, marginTop: 4 }}>Gabriel</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 700, color: C.gold }}>2.850</div>
              <Badge variant="gold">1º Lugar</Badge>
            </div>
            <div style={{ textAlign: "center" }}>
              <Av name="João" color={PC[2]} size={40} />
              <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textP, marginTop: 4 }}>João</div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, fontWeight: 600, color: C.textS }}>1.900</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.textM }}>3º</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[{ i: "🔥", t: "Maior Streak", v: "5", p: "Gabriel" }, { i: "⚡", t: "Mais Rápida", v: "1.2s", p: "Maria" }, { i: "🎵", t: "Conhecedor", v: "8/10", p: "Gabriel" }, { i: "😅", t: "Na Trave", v: "3x", p: "Ana" }].map((h) => (
              <div key={h.t} style={{ background: `linear-gradient(135deg, ${C.bgSurface}, ${C.bgElevated})`, border: `1px solid rgba(139,92,246,0.15)`, borderRadius: 10, padding: 10 }}>
                <span style={{ fontSize: 16 }}>{h.i}</span>
                <div style={{ fontFamily: "'DM Sans'", fontSize: 9, color: C.textM, fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>{h.t}</div>
                <div style={{ fontFamily: "'Fredoka'", fontSize: 14, fontWeight: 600, color: C.textP }}>{h.v}</div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.accent }}>{h.p}</div>
              </div>
            ))}
          </div>
        </div>
      </Sec>
      <Sec title="Perfil do Jogador">
        <div style={{ background: C.bgDeep, borderRadius: 14, padding: "20px 16px", border: `1px solid ${C.borderS}` }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <Av name="Gabriel" color={PC[0]} size={56} />
            <div style={{ fontFamily: "'Fredoka'", fontSize: 18, fontWeight: 600, color: C.textP, marginTop: 6 }}>Gabriel</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: "#1DB95418", border: "1px solid #1DB95440", fontSize: 11, fontWeight: 600, color: "#1DB954", fontFamily: "'DM Sans'" }}>Spotify: gabs123</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: `${C.bgElevated}`, border: `1px solid ${C.borderD}`, fontSize: 11, fontWeight: 600, color: C.textM, fontFamily: "'DM Sans'", cursor: "pointer" }}>YouTube: conectar</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              {[{ v: "3", l: "playlists" }, { v: "127", l: "faixas" }, { v: "94%", l: "disponível" }].map((s) => (
                <div key={s.l} style={{ background: C.bgElevated, padding: "6px 12px", borderRadius: 6, textAlign: "center" }}>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 700, color: C.textP }}>{s.v}</div>
                  <div style={{ fontFamily: "'DM Sans'", fontSize: 9, color: C.textM }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Fredoka'", fontSize: 15, fontWeight: 500, color: C.textP }}>Minhas Playlists (3)</span>
            </div>
            {[
              { n: "Meus Rocks", t: "41/45", pct: 91, sel: true },
              { n: "Pagode Raiz", t: "38/40", pct: 95, sel: false },
              { n: "Indie Brasileiro", t: "22/30", pct: 73, sel: false },
            ].map((p) => (
              <Card key={p.n} style={{ marginBottom: 6, border: p.sel ? `2px solid ${C.accent}` : `1px solid ${C.borderS}`, boxShadow: p.sel ? "0 0 12px rgba(139,92,246,0.15)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: C.bgElevated, border: `1px solid ${C.borderS}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 18, color: C.textM, opacity: 0.6 }}>♪</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.textP }}>{p.n}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: p.pct > 80 ? C.success : C.warning }}>{p.t} disponíveis</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: C.bgOverlay, marginTop: 4, overflow: "hidden" }}>
                      <div style={{ width: `${p.pct}%`, height: "100%", borderRadius: 2, background: p.pct > 80 ? C.success : C.warning }} />
                    </div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${p.sel ? C.accent : C.borderD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {p.sel && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <button style={{ width: "100%", height: 42, background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans'", cursor: "pointer", marginTop: 4 }}>Importar Playlist</button>
        </div>
      </Sec>
      <Sec title="Importar Playlist (Browser)">
        <div style={{ background: C.bgDeep, borderRadius: 14, padding: "16px 16px 20px", border: `1px solid ${C.borderS}` }}>
          <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
            {[{ n: "Spotify", c: "#1DB954", active: true }, { n: "Deezer", c: "#A238FF", active: false }, { n: "YouTube", c: "#FF0000", active: false }].map((p) => (
              <div key={p.n} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderBottom: p.active ? `2px solid ${p.c}` : `1px solid ${C.borderS}`, cursor: "pointer" }}>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans'", color: p.active ? p.c : C.textM }}>{p.n}</span>
              </div>
            ))}
          </div>
          {[
            { n: "Top Brasil 2026", t: 50 },
            { n: "Discover Weekly", t: 30 },
            { n: "Rock Classics", t: 80 },
          ].map((p) => (
            <Card key={p.n} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: C.bgElevated, border: `1px solid ${C.borderS}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18, color: C.textM, opacity: 0.6 }}>♪</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.textP }}>{p.n}</div>
                  <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM }}>{p.t} faixas</div>
                </div>
                <Btn variant="secondary" size="sm">Importar</Btn>
              </div>
            </Card>
          ))}
        </div>
      </Sec>
      <Sec title="Detalhes da Playlist (Validação)">
        <div style={{ background: C.bgDeep, borderRadius: 14, padding: "16px 16px 20px", border: `1px solid ${C.borderS}` }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[{ v: "41", l: "disponíveis", c: C.success }, { v: "2", l: "fallback", c: C.warning }, { v: "2", l: "indispon.", c: C.error }].map((s) => (
              <div key={s.l} style={{ flex: 1, background: C.bgElevated, padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: 9, color: C.textM, textTransform: "uppercase" }}>{s.l}</div>
              </div>
            ))}
          </div>
          {[
            { n: "Bohemian Rhapsody", a: "Queen", st: "success", hasImg: true },
            { n: "Stairway to Heaven", a: "Led Zeppelin", st: "success", hasImg: true },
            { n: "Música Regional", a: "Artista Local", st: "warning", hasImg: true },
            { n: "Faixa Removida", a: "Desconhecido", st: "error", hasImg: false },
          ].map((t) => (
            <div key={t.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.borderS}` }}>
              {t.hasImg ? (
                <img src="https://e-cdns-images.dzcdn.net/images/cover/b05b3a1565d3ecdc7f132a59e918ab38/264x264-000000-80-0-0.jpg" alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: `1px solid ${C.borderS}`, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 6, background: C.bgElevated, border: `1px solid ${C.borderS}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14, color: C.textM, opacity: 0.5 }}>♪</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: t.st === "error" ? C.textM : C.textP, textDecoration: t.st === "error" ? "line-through" : "none" }}>{t.n}</div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM }}>{t.a}</div>
              </div>
              <Badge variant={t.st === "success" ? "success" : t.st === "warning" ? "warning" : "error"}>{t.st === "success" ? "OK" : t.st === "warning" ? "Fallback" : "Indisp."}</Badge>
              {t.st === "success" && <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${C.borderD}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><span style={{ fontSize: 10, color: C.textS }}>▶</span></div>}
            </div>
          ))}
        </div>
      </Sec>
      <Sec title="Mapa de Composição">
        <Card style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", color: C.textS, lineHeight: 1.8 }}>
          <div><LayerBadge layer="atom" /> <span style={{ color: C.textM }}>15 átomos</span></div>
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.borderS}`, marginLeft: 6 }}>
            <div><LayerBadge layer="molecule" /> <span style={{ color: C.textM }}>15 moléculas</span></div>
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.borderS}`, marginLeft: 6 }}>
              <div><LayerBadge layer="organism" /> <span style={{ color: C.textM }}>15 organismos</span></div>
              <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.borderS}`, marginLeft: 6 }}>
                <div><LayerBadge layer="template" /> <span style={{ color: C.textM }}>4 templates</span></div>
                <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.borderS}`, marginLeft: 6 }}>
                  <div><LayerBadge layer="page" /> <span style={{ color: C.textM }}>12 páginas</span></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, color: C.textP, fontFamily: "'DM Sans'", fontWeight: 600 }}>= 61 componentes total</div>
        </Card>
      </Sec>
    </div>
  );
}

export default function AtomicDS() {
  const [tab, setTab] = useState("foundation");
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: C.bgDeep, color: C.textP, minHeight: "100vh", maxWidth: 520, margin: "0 auto", padding: "0 14px 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fredoka:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
        <div style={{ fontFamily: "'Fredoka'", fontSize: 22, fontWeight: 600, marginBottom: 2 }}>
          <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mermã, a Música!</span>
        </div>
        <div style={{ fontSize: 12, color: C.textM }}>Atomic Design System — v2.0</div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans'", cursor: "pointer", whiteSpace: "nowrap", background: tab === t.id ? C.accent : C.bgElevated, color: tab === t.id ? "#fff" : C.textS, transition: "all 150ms" }}>{t.label}</button>
        ))}
      </div>
      {tab === "foundation" && <Foundation />}
      {tab === "atoms" && <Atoms />}
      {tab === "molecules" && <Molecules />}
      {tab === "organisms" && <Organisms />}
      {tab === "pages" && <Pages />}
    </div>
  );
}
