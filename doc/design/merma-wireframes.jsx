import { useState } from "react";

const C = {
  bgDeep: "#0B0E17", bgSurface: "#121829", bgElevated: "#1A2340", bgOverlay: "#232E52",
  accent: "#8B5CF6", accentHover: "#A78BFA", gold: "#F59E0B",
  success: "#22C55E", error: "#EF4444", warning: "#EAB308", info: "#3B82F6",
  textP: "#F1F5F9", textS: "#94A3B8", textM: "#64748B",
  borderS: "#1E293B", borderD: "#334155",
};
const PC = ["#8B5CF6","#F59E0B","#22C55E","#EF4444","#3B82F6","#EC4899","#14B8A6","#F97316"];

const pages = [
  { id: "home", label: "Home" },
  { id: "login", label: "Login" },
  { id: "register", label: "Criar Conta" },
  { id: "forgot", label: "Esqueci Senha" },
  { id: "join", label: "Entrar Sala" },
  { id: "lobby", label: "Lobby" },
  { id: "round", label: "Rodada" },
  { id: "reveal", label: "Revelação" },
  { id: "results", label: "Resultados" },
  { id: "profile", label: "Perfil" },
  { id: "import", label: "Importar" },
  { id: "validation", label: "Validação" },
];

function Av({ n, c, s = 28 }) {
  return <div style={{ width: s, height: s, borderRadius: "50%", background: `${c}1A`, border: `2px solid ${c}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: s >= 40 ? "'Fredoka'" : "'DM Sans'", fontSize: s < 28 ? 9 : s < 36 ? 11 : s < 48 ? 14 : 18, fontWeight: 600, color: c, flexShrink: 0 }}>{n[0].toUpperCase()}</div>;
}

function Bdg({ children, v = "muted" }) {
  const vs = { success: { bg: "rgba(34,197,94,0.12)", c: C.success }, error: { bg: "rgba(239,68,68,0.12)", c: C.error }, warning: { bg: "rgba(234,179,8,0.12)", c: C.warning }, info: { bg: "rgba(59,130,246,0.12)", c: C.info }, gold: { bg: "rgba(245,158,11,0.1)", c: C.gold }, muted: { bg: "rgba(100,116,139,0.12)", c: C.textM } }[v];
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 9, fontWeight: 600, fontFamily: "'DM Sans'", textTransform: "uppercase", letterSpacing: "0.4px", background: vs.bg, color: vs.c }}>{children}</span>;
}

function Cover({ s = 36, has = true }) {
  if (!has) return <div style={{ width: s, height: s, borderRadius: s > 50 ? 10 : 6, background: C.bgElevated, border: `1px solid ${C.borderS}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: s * 0.38, color: C.textM, opacity: 0.5 }}>♪</span></div>;
  return <img src="https://e-cdns-images.dzcdn.net/images/cover/b05b3a1565d3ecdc7f132a59e918ab38/264x264-000000-80-0-0.jpg" alt="" style={{ width: s, height: s, borderRadius: s > 50 ? 10 : 6, objectFit: "cover", border: `1px solid ${C.borderS}`, flexShrink: 0 }} />;
}

function Cd({ children, style }) {
  return <div style={{ background: C.bgSurface, border: `1px solid ${C.borderS}`, borderRadius: 12, padding: 12, ...style }}>{children}</div>;
}

function DeviceFrame({ children, mode, label }) {
  const isMobile = mode === "mobile";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.textM, fontFamily: "'DM Sans'", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      <div style={{ width: isMobile ? 320 : "100%", maxWidth: isMobile ? 320 : 680, background: C.bgDeep, borderRadius: isMobile ? 20 : 10, border: `2px solid ${C.borderD}`, overflow: "hidden", margin: isMobile ? "0" : "0" }}>
        {isMobile && (
          <div style={{ height: 24, background: C.bgSurface, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${C.borderS}` }}>
            <div style={{ width: 60, height: 4, borderRadius: 2, background: C.borderD }} />
          </div>
        )}
        <div style={{ padding: isMobile ? "12px 14px 16px" : "16px 24px 20px", minHeight: isMobile ? 500 : 380 }}>
          {children}
        </div>
        {isMobile && (
          <div style={{ height: 20, background: C.bgSurface, display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${C.borderS}` }}>
            <div style={{ width: 100, height: 4, borderRadius: 2, background: C.borderD }} />
          </div>
        )}
      </div>
    </div>
  );
}

function BtnW({ children, variant = "primary", full = false, size = "md" }) {
  const h = size === "sm" ? 30 : size === "lg" ? 44 : size === "xl" ? 50 : 36;
  const fs = size === "sm" ? 11 : size === "lg" ? 16 : size === "xl" ? 17 : 13;
  const vs = {
    primary: { bg: C.accent, c: "#fff", bd: "none" },
    secondary: { bg: "transparent", c: C.accent, bd: `1.5px solid ${C.accent}` },
    ghost: { bg: "transparent", c: C.textS, bd: "none" },
    gold: { bg: C.gold, c: "#1A1A2E", bd: "none" },
    danger: { bg: C.error, c: "#fff", bd: "none" },
  }[variant];
  return <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: size === "xl" ? 12 : 8, background: vs.bg, color: vs.c, border: vs.bd, fontSize: fs, fontWeight: 600, fontFamily: size === "xl" ? "'Fredoka'" : "'DM Sans'", width: full ? "100%" : "auto", padding: full ? 0 : `0 ${h * 0.6}px`, cursor: "pointer" }}>{children}</div>;
}

function Header({ left, center, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", height: 40, marginBottom: 14 }}>
      <div style={{ flex: 1, fontSize: 12, color: C.textS, fontFamily: "'DM Sans'" }}>{left}</div>
      <div style={{ fontFamily: "'Fredoka'", fontSize: 15, fontWeight: 600, color: C.textP, textAlign: "center" }}>{center}</div>
      <div style={{ flex: 1, textAlign: "right", fontSize: 12, color: C.textS, fontFamily: "'DM Sans'" }}>{right}</div>
    </div>
  );
}

function InputW({ placeholder, size = "md", active = false, answered = false }) {
  const h = size === "lg" ? 48 : 38;
  const fs = size === "lg" ? 16 : 13;
  const bc = answered ? C.success : active ? C.accent : C.borderD;
  return <div style={{ height: h, background: size === "lg" ? C.bgSurface : C.bgElevated, border: `${active || answered ? 2 : 1}px solid ${bc}`, borderRadius: size === "lg" ? 12 : 8, padding: `0 ${size === "lg" ? 16 : 12}px`, display: "flex", alignItems: "center", fontSize: fs, color: C.textM, fontFamily: "'DM Sans'", fontStyle: "italic", boxShadow: active ? `0 0 0 3px ${C.accent}18` : answered ? `0 0 0 3px ${C.success}18` : "none" }}>{placeholder}</div>;
}

function PasswordField({ placeholder = "Sua senha", showStrength = false, label = "Senha", link = null }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textS, fontFamily: "'DM Sans'" }}>{label}</span>
        {link && <span style={{ fontSize: 10, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 500, cursor: "pointer" }}>{link}</span>}
      </div>
      <div style={{ height: 42, background: C.bgElevated, border: `1px solid ${C.borderD}`, borderRadius: 8, padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: C.textM, fontFamily: "'DM Sans'", fontStyle: "italic" }}>{placeholder}</span>
        <span style={{ fontSize: 14, color: C.textM, cursor: "pointer" }}>👁</span>
      </div>
      {showStrength && (
        <div style={{ marginTop: 5 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[C.success, C.success, C.accent, C.bgOverlay].map((c, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: c }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 500 }}>Boa</span>
        </div>
      )}
    </div>
  );
}

function AuthField({ label, placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textS, fontFamily: "'DM Sans'", marginBottom: 4 }}>{label}</div>
      <InputW placeholder={placeholder} />
    </div>
  );
}

function LogoCompact() {
  return (
    <div style={{ fontFamily: "'Fredoka'", fontSize: 18, fontWeight: 600, textAlign: "center", marginBottom: 4 }}>
      <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mermã, a Música!</span>
    </div>
  );
}

function PlatformRow() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
      {[{ n: "Spotify", c: "#1DB954" }, { n: "Deezer", c: "#A238FF" }, { n: "YouTube", c: "#FF0000" }].map(p => (
        <div key={p.n} style={{ padding: "5px 12px", borderRadius: 6, background: `${p.c}18`, border: `1px solid ${p.c}40`, fontSize: 10, fontWeight: 600, color: p.c, fontFamily: "'DM Sans'" }}>{p.n}</div>
      ))}
    </div>
  );
}

function OrDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0" }}>
      <div style={{ flex: 1, height: 1, background: C.borderD }} />
      <span style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'", fontWeight: 500 }}>ou</span>
      <div style={{ flex: 1, height: 1, background: C.borderD }} />
    </div>
  );
}

function WLogin() {
  return (
    <>
      <DeviceFrame mode="mobile" label="Mobile — Login">
        <Header left="← Voltar" center="" right="" />
        <div style={{ paddingTop: 8 }}>
          <LogoCompact />
          <div style={{ fontFamily: "'Fredoka'", fontSize: 20, fontWeight: 600, color: C.textP, textAlign: "center", marginBottom: 20 }}>Entrar na sua conta</div>
          <AuthField label="Email" placeholder="seu@email.com" />
          <PasswordField label="Senha" placeholder="••••••••" link="Esqueci minha senha →" />
          <BtnW variant="primary" full size="lg">Entrar</BtnW>
          <OrDivider />
          <PlatformRow />
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span style={{ fontSize: 12, color: C.textM, fontFamily: "'DM Sans'" }}>Não tem conta? </span>
            <span style={{ fontSize: 12, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 600, cursor: "pointer" }}>Criar conta →</span>
          </div>
        </div>
      </DeviceFrame>
      <DeviceFrame mode="desktop" label="Desktop — Login (centralizado)">
        <div style={{ maxWidth: 360, margin: "0 auto", paddingTop: 24 }}>
          <LogoCompact />
          <div style={{ fontFamily: "'Fredoka'", fontSize: 22, fontWeight: 600, color: C.textP, textAlign: "center", marginBottom: 24 }}>Entrar na sua conta</div>
          <AuthField label="Email" placeholder="seu@email.com" />
          <PasswordField label="Senha" placeholder="••••••••" link="Esqueci minha senha →" />
          <div style={{ marginTop: 4 }}><BtnW variant="primary" full size="lg">Entrar</BtnW></div>
          <OrDivider />
          <PlatformRow />
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span style={{ fontSize: 13, color: C.textM, fontFamily: "'DM Sans'" }}>Não tem conta? </span>
            <span style={{ fontSize: 13, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 600, cursor: "pointer" }}>Criar conta →</span>
          </div>
        </div>
      </DeviceFrame>
    </>
  );
}

function WRegister() {
  return (
    <>
      <DeviceFrame mode="mobile" label="Mobile — Criar Conta">
        <Header left="← Voltar" center="" right="" />
        <div style={{ paddingTop: 4 }}>
          <LogoCompact />
          <div style={{ fontFamily: "'Fredoka'", fontSize: 20, fontWeight: 600, color: C.textP, textAlign: "center", marginBottom: 16 }}>Criar sua conta</div>
          <AuthField label="Nickname" placeholder="Como quer ser chamado?" />
          <AuthField label="Email" placeholder="seu@email.com" />
          <PasswordField label="Senha" placeholder="Mínimo 8 caracteres" showStrength />
          <PasswordField label="Confirmar senha" placeholder="Repita sua senha" />
          <BtnW variant="primary" full size="lg">Criar conta</BtnW>
          <OrDivider />
          <PlatformRow />
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span style={{ fontSize: 12, color: C.textM, fontFamily: "'DM Sans'" }}>Já tem conta? </span>
            <span style={{ fontSize: 12, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 600, cursor: "pointer" }}>Entrar →</span>
          </div>
        </div>
      </DeviceFrame>
      <DeviceFrame mode="desktop" label="Desktop — Criar Conta (centralizado)">
        <div style={{ maxWidth: 360, margin: "0 auto", paddingTop: 16 }}>
          <LogoCompact />
          <div style={{ fontFamily: "'Fredoka'", fontSize: 22, fontWeight: 600, color: C.textP, textAlign: "center", marginBottom: 20 }}>Criar sua conta</div>
          <AuthField label="Nickname" placeholder="Como quer ser chamado?" />
          <AuthField label="Email" placeholder="seu@email.com" />
          <PasswordField label="Senha" placeholder="Mínimo 8 caracteres" showStrength />
          <PasswordField label="Confirmar senha" placeholder="Repita sua senha" />
          <div style={{ marginTop: 4 }}><BtnW variant="primary" full size="lg">Criar conta</BtnW></div>
          <OrDivider />
          <PlatformRow />
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span style={{ fontSize: 13, color: C.textM, fontFamily: "'DM Sans'" }}>Já tem conta? </span>
            <span style={{ fontSize: 13, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 600, cursor: "pointer" }}>Entrar →</span>
          </div>
        </div>
      </DeviceFrame>
    </>
  );
}

function WForgot() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <DeviceFrame mode="mobile" label={sent ? "Mobile — Email enviado" : "Mobile — Esqueci minha senha"}>
        <Header left="← Voltar" center="" right="" />
        {!sent ? (
          <div style={{ paddingTop: 16 }}>
            <LogoCompact />
            <div style={{ fontFamily: "'Fredoka'", fontSize: 20, fontWeight: 600, color: C.textP, textAlign: "center", marginBottom: 8 }}>Esqueci minha senha</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textS, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>Digite seu email e vamos te enviar um link para redefinir sua senha.</div>
            <AuthField label="Email" placeholder="seu@email.com" />
            <div style={{ marginTop: 4 }} onClick={() => setSent(true)}><BtnW variant="primary" full size="lg">Enviar link</BtnW></div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <span style={{ fontSize: 12, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 500, cursor: "pointer" }}>Lembrei! Voltar ao login →</span>
            </div>
          </div>
        ) : (
          <div style={{ paddingTop: 40, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${C.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontSize: 28, color: C.accent }}>✉</span>
            </div>
            <div style={{ fontFamily: "'Fredoka'", fontSize: 20, fontWeight: 600, color: C.textP, marginBottom: 8 }}>Email enviado!</div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textS, lineHeight: 1.5, marginBottom: 24, padding: "0 12px" }}>Confira sua caixa de entrada e clique no link para redefinir sua senha.</div>
            <div onClick={() => setSent(false)}><BtnW variant="primary" full size="lg">Voltar ao login</BtnW></div>
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <span style={{ fontSize: 11, color: C.textM, fontFamily: "'DM Sans'" }}>Não recebeu? </span>
              <span style={{ fontSize: 11, color: C.textS, fontFamily: "'DM Sans'", fontWeight: 500, cursor: "pointer" }}>Reenviar →</span>
            </div>
          </div>
        )}
      </DeviceFrame>
    </>
  );
}

function WHome() {
  return (
    <>
      <DeviceFrame mode="mobile" label="Mobile — 320px">
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontFamily: "'Fredoka'", fontSize: 26, fontWeight: 600, marginBottom: 2 }}>
            <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mermã, a Música!</span>
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textS, marginBottom: 28 }}>Quiz musical com as playlists dos seus amigos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <BtnW variant="primary" full size="xl">Criar Sala</BtnW>
            <BtnW variant="secondary" full size="xl">Entrar na Sala</BtnW>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 14px", justifyContent: "center" }}>
            <div style={{ height: 1, width: 28, background: C.borderD }} />
            <span style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'" }}>ou entre para salvar progresso</span>
            <div style={{ height: 1, width: 28, background: C.borderD }} />
          </div>
          <div><BtnW variant="ghost" full>Entrar na conta</BtnW></div>
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: C.textM, fontFamily: "'DM Sans'" }}>Não tem conta? </span>
            <span style={{ fontSize: 11, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 600 }}>Criar conta →</span>
          </div>
        </div>
      </DeviceFrame>
      <DeviceFrame mode="desktop" label="Desktop — 680px">
        <div style={{ textAlign: "center", paddingTop: 48 }}>
          <div style={{ fontFamily: "'Fredoka'", fontSize: 36, fontWeight: 600, marginBottom: 4 }}>
            <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mermã, a Música!</span>
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 15, color: C.textS, marginBottom: 36 }}>Quiz musical com as playlists dos seus amigos</div>
          <div style={{ display: "flex", gap: 12, maxWidth: 400, margin: "0 auto" }}>
            <div style={{ flex: 1 }}><BtnW variant="primary" full size="xl">Criar Sala</BtnW></div>
            <div style={{ flex: 1 }}><BtnW variant="secondary" full size="xl">Entrar na Sala</BtnW></div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 32 }}>
            <span style={{ fontSize: 13, color: C.textS, fontFamily: "'DM Sans'", cursor: "pointer" }}>Entrar na conta</span>
            <span style={{ fontSize: 13, color: C.accent, fontFamily: "'DM Sans'", fontWeight: 600, cursor: "pointer" }}>Criar conta →</span>
          </div>
        </div>
      </DeviceFrame>
    </>
  );
}

function WJoin() {
  return (
    <>
      <DeviceFrame mode="mobile" label="Mobile — Entrar na Sala">
        <Header left="← Voltar" center="Entrar na Sala" />
        <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textS, fontFamily: "'DM Sans'", marginBottom: 4 }}>Código da sala</div>
            <InputW placeholder="ABC123" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textS, fontFamily: "'DM Sans'", marginBottom: 4 }}>Seu nickname</div>
            <InputW placeholder="Como quer ser chamado?" />
          </div>
          <div style={{ marginTop: 8 }}><BtnW variant="primary" full size="lg">Entrar</BtnW></div>
          <div style={{ textAlign: "center" }}><BtnW variant="ghost">Voltar ao início</BtnW></div>
        </div>
      </DeviceFrame>
    </>
  );
}

function WLobby() {
  const players = [
    { n: "Gabriel", c: PC[0], ready: true, host: true, pl: "Spotify" },
    { n: "Maria", c: PC[1], ready: true, host: false, pl: "Sem playlist" },
    { n: "João", c: PC[2], ready: false, host: false, pl: "Deezer" },
    { n: "Ana", c: PC[3], ready: false, host: false, pl: null },
  ];
  const PlayerList = () => (
    <div>
      <div style={{ fontFamily: "'Fredoka'", fontSize: 15, fontWeight: 500, color: C.textP, marginBottom: 8 }}>Jogadores (4/20)</div>
      {players.map(p => (
        <Cd key={p.n} style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Av n={p.n} c={p.c} s={30} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textP }}>{p.n}</span>
                {p.host && <Bdg v="info">Host</Bdg>}
              </div>
              <span style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.textM }}>{p.pl || "Anônimo"}</span>
            </div>
            <Bdg v={p.ready ? "success" : "muted"}>{p.ready ? "Pronto" : "Esperando"}</Bdg>
          </div>
        </Cd>
      ))}
    </div>
  );
  const ConfigPanel = () => (
    <div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.textP, marginBottom: 10 }}>Configuração</div>
      {[
        { l: "Tempo por rodada", v: "30s" },
        { l: "Total de músicas", v: "12" },
        { l: "Tipo de resposta", v: "Qualquer um" },
        { l: "Pontuação", v: "Velocidade" },
      ].map(c => (
        <div key={c.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.borderS}` }}>
          <span style={{ fontSize: 11, color: C.textS, fontFamily: "'DM Sans'" }}>{c.l}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textP, fontFamily: "'JetBrains Mono'" }}>{c.v}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
        <span style={{ fontSize: 11, color: C.textS, fontFamily: "'DM Sans'" }}>Permitir repetição</span>
        <div style={{ width: 34, height: 18, borderRadius: 9, background: C.bgOverlay, position: "relative" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: 2 }} /></div>
      </div>
      <div style={{ marginTop: 12 }}><BtnW variant="primary" full size="lg">Iniciar Partida</BtnW></div>
    </div>
  );
  const InviteBar = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bgElevated, padding: "8px 12px", borderRadius: 8, border: `1px dashed ${C.borderD}`, marginBottom: 12 }}>
      <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 600, color: C.textP, letterSpacing: 2, flex: 1 }}>ABC123</span>
      <BtnW variant="ghost" size="sm">Copiar</BtnW>
      <BtnW variant="ghost" size="sm">Compartilhar</BtnW>
    </div>
  );
  return (
    <>
      <DeviceFrame mode="mobile" label="Mobile — Lobby">
        <Header left="" center="Lobby" right="" />
        <InviteBar />
        <PlayerList />
        <div style={{ marginTop: 10 }}><Cd><ConfigPanel /></Cd></div>
        <div style={{ marginTop: 12, background: C.bgSurface, borderTop: `1px solid ${C.borderS}`, padding: "10px 0 0", marginLeft: -14, marginRight: -14, paddingLeft: 14, paddingRight: 14 }}>
          <BtnW variant="gold" full size="lg">Pronto!</BtnW>
        </div>
      </DeviceFrame>
      <DeviceFrame mode="desktop" label="Desktop — Lobby (duas colunas)">
        <Header left="" center="Lobby" right="" />
        <InviteBar />
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}><PlayerList /></div>
          <div style={{ width: 260 }}>
            <Cd><ConfigPanel /></Cd>
          </div>
        </div>
      </DeviceFrame>
    </>
  );
}

function WRound() {
  return (
    <>
      <DeviceFrame mode="mobile" label="Mobile — Rodada Ativa">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.textM }}>Rodada <span style={{ color: C.textP, fontWeight: 600 }}>3</span>/10</span>
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: C.gold, fontWeight: 600 }}>1.850 pts</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", border: `3px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 30, fontWeight: 700, color: C.accent }}>24</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 16 }}>
          {[10,16,22,14,20,12,18,24,16,12,20,14].map((h,i) => <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: C.accent, opacity: 0.4 + (i%3)*0.2 }} />)}
        </div>
        <InputW placeholder="Digite sua resposta..." size="lg" active />
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
          {["G","M","J","A"].map((n,i) => (
            <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: `${PC[i]}1A`, border: `2px solid ${PC[i]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: PC[i], fontFamily: "'DM Sans'", opacity: i<1 ? 1 : 0.4 }}>{i<1 ? "✓" : n}</div>
          ))}
        </div>
      </DeviceFrame>
      <DeviceFrame mode="desktop" label="Desktop — Rodada (com scoreboard lateral)">
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textM }}>Rodada <span style={{ color: C.textP, fontWeight: 600 }}>3</span>/10</span>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.gold, fontWeight: 600 }}>1.850 pts</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 84, height: 84, borderRadius: "50%", border: `3px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 34, fontWeight: 700, color: C.accent }}>24</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 16 }}>
              {[10,16,22,14,20,12,18,24,16,12,20,14].map((h,i) => <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: C.accent, opacity: 0.4 + (i%3)*0.2 }} />)}
            </div>
            <InputW placeholder="Digite sua resposta..." size="lg" active />
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
              {["G","M","J","A"].map((n,i) => <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: `${PC[i]}1A`, border: `2px solid ${PC[i]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: PC[i], opacity: i<1?1:0.4 }}>{i<1?"✓":n}</div>)}
            </div>
          </div>
          <div style={{ width: 180 }}>
            <Cd>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textS, marginBottom: 8 }}>Placar</div>
              {[{n:"Gabriel",s:1850,c:PC[0]},{n:"Maria",s:1200,c:PC[1]},{n:"João",s:800,c:PC[2]},{n:"Ana",s:400,c:PC[3]}].map((p,i) => (
                <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: i<3 ? `1px solid ${C.borderS}` : "none" }}>
                  <span style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'", width: 14 }}>{i+1}.</span>
                  <Av n={p.n} c={p.c} s={20} />
                  <span style={{ flex: 1, fontSize: 11, color: C.textP, fontFamily: "'DM Sans'" }}>{p.n}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: i===0 ? C.gold : C.textS, fontFamily: "'JetBrains Mono'" }}>{p.s}</span>
                </div>
              ))}
            </Cd>
          </div>
        </div>
      </DeviceFrame>
    </>
  );
}

function WReveal() {
  const answers = [
    { n: "Gabriel", a: "Bohemian Rhapsody", ok: true, pts: "+920", c: PC[0] },
    { n: "Maria", a: "boemian rapsody", ok: true, pts: "+680", c: PC[1] },
    { n: "João", a: "We Will Rock You", ok: false, pts: "", c: PC[2] },
    { n: "Ana", a: "", ok: false, pts: "", c: PC[3] },
  ];
  const RevealContent = () => (
    <>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <Cover s={60} />
        <div style={{ fontFamily: "'Fredoka'", fontSize: 17, fontWeight: 500, color: C.textP, marginTop: 8 }}>Bohemian Rhapsody</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.textS }}>Queen</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.textM, marginTop: 1 }}>A Night at the Opera</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.textM, marginTop: 2 }}>Da playlist de <span style={{ color: PC[0] }}>Gabriel</span></div>
      </div>
      {answers.map(r => (
        <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: r.ok ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.04)", borderRadius: 6, border: `1px solid ${r.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)"}`, marginBottom: 3 }}>
          <Av n={r.n} c={r.c} s={18} />
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textP }}>{r.n}</span>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.textM, marginLeft: 4 }}>{r.a || "Não respondeu"}</span>
          </div>
          {r.pts && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 600, color: C.gold }}>{r.pts}</span>}
          <span style={{ fontSize: 11 }}>{r.ok ? "✅" : "❌"}</span>
        </div>
      ))}
      <div style={{ height: 4, borderRadius: 2, background: C.bgOverlay, marginTop: 10, overflow: "hidden" }}>
        <div style={{ width: "40%", height: "100%", borderRadius: 2, background: C.accent }} />
      </div>
      <div style={{ textAlign: "center", fontSize: 9, color: C.textM, fontFamily: "'DM Sans'", marginTop: 3 }}>Próxima rodada em 2s...</div>
    </>
  );
  return (
    <>
      <DeviceFrame mode="mobile" label="Mobile — Revelação">
        <Header left="Rodada 3/10" center="" right="" />
        <RevealContent />
      </DeviceFrame>
      <DeviceFrame mode="desktop" label="Desktop — Revelação (com scoreboard)">
        <Header left="Rodada 3/10" center="" right="" />
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}><RevealContent /></div>
          <div style={{ width: 180 }}>
            <Cd>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textS, marginBottom: 8 }}>Placar atualizado</div>
              {[{n:"Gabriel",s:2770,c:PC[0]},{n:"Maria",s:1880,c:PC[1]},{n:"João",s:800,c:PC[2]},{n:"Ana",s:400,c:PC[3]}].map((p,i) => (
                <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: i<3 ? `1px solid ${C.borderS}` : "none" }}>
                  <span style={{ fontSize: 10, color: C.textM, width: 14 }}>{i+1}.</span>
                  <Av n={p.n} c={p.c} s={20} />
                  <span style={{ flex: 1, fontSize: 11, color: C.textP }}>{p.n}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: i===0?C.gold:C.textS, fontFamily: "'JetBrains Mono'" }}>{p.s}</span>
                </div>
              ))}
            </Cd>
          </div>
        </div>
      </DeviceFrame>
    </>
  );
}

function WResults() {
  return (
    <DeviceFrame mode="mobile" label="Mobile — Resultados">
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: "'Fredoka'", fontSize: 18, fontWeight: 600, color: C.textP }}>Resultados</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 10, marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}>
          <Av n="Maria" c={PC[1]} s={36} />
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textP, marginTop: 3 }}>Maria</div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.textS }}>5.200</div>
          <div style={{ fontSize: 9, color: C.textM }}>2º</div>
        </div>
        <div style={{ textAlign: "center", transform: "translateY(-6px)" }}>
          <div style={{ boxShadow: `0 0 16px rgba(245,158,11,0.3)`, borderRadius: "50%", display: "inline-block" }}>
            <Av n="Gabriel" c={PC[0]} s={50} />
          </div>
          <div style={{ fontFamily: "'Fredoka'", fontSize: 15, fontWeight: 600, color: C.textP, marginTop: 3 }}>Gabriel</div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 700, color: C.gold }}>7.850</div>
          <Bdg v="gold">1º Lugar</Bdg>
        </div>
        <div style={{ textAlign: "center" }}>
          <Av n="João" c={PC[2]} s={36} />
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.textP, marginTop: 3 }}>João</div>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: C.textS }}>4.100</div>
          <div style={{ fontSize: 9, color: C.textM }}>3º</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, background: C.bgSurface, marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: C.textM }}>4.</span><Av n="Ana" c={PC[3]} s={20} /><span style={{ flex: 1, fontSize: 11, color: C.textP }}>Ana</span><span style={{ fontSize: 11, color: C.textS, fontFamily: "'JetBrains Mono'" }}>2.300</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[{ i: "🔥", t: "Maior Streak", v: "5", p: "Gabriel" }, { i: "⚡", t: "Mais Rápida", v: "1.2s", p: "Maria" }, { i: "🎵", t: "Conhecedor", v: "8/10", p: "Gabriel" }, { i: "😅", t: "Na Trave", v: "3x", p: "Ana" }].map(h => (
          <div key={h.t} style={{ background: `linear-gradient(135deg, ${C.bgSurface}, ${C.bgElevated})`, border: `1px solid rgba(139,92,246,0.12)`, borderRadius: 8, padding: 8 }}>
            <span style={{ fontSize: 14 }}>{h.i}</span>
            <div style={{ fontSize: 8, color: C.textM, fontWeight: 600, textTransform: "uppercase", fontFamily: "'DM Sans'" }}>{h.t}</div>
            <div style={{ fontFamily: "'Fredoka'", fontSize: 13, fontWeight: 600, color: C.textP }}>{h.v}</div>
            <div style={{ fontSize: 9, color: C.accent, fontFamily: "'DM Sans'" }}>{h.p}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 3, borderRadius: 2, background: C.bgOverlay, marginTop: 12, overflow: "hidden" }}>
        <div style={{ width: "60%", height: "100%", borderRadius: 2, background: C.textM }} />
      </div>
      <div style={{ textAlign: "center", fontSize: 9, color: C.textM, marginTop: 3, fontFamily: "'DM Sans'" }}>Voltando ao lobby em 3s...</div>
    </DeviceFrame>
  );
}

function WProfile() {
  return (
    <DeviceFrame mode="mobile" label="Mobile — Perfil">
      <Header left="← Voltar" center="Meu Perfil" right="" />
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <Av n="Gabriel" c={PC[0]} s={50} />
        <div style={{ fontFamily: "'Fredoka'", fontSize: 17, fontWeight: 600, color: C.textP, marginTop: 4 }}>Gabriel</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 6 }}>
          <span style={{ padding: "2px 8px", borderRadius: 12, background: "#1DB95418", border: "1px solid #1DB95440", fontSize: 9, fontWeight: 600, color: "#1DB954", fontFamily: "'DM Sans'" }}>Spotify: gabs</span>
          <span style={{ padding: "2px 8px", borderRadius: 12, background: C.bgElevated, border: `1px solid ${C.borderD}`, fontSize: 9, fontWeight: 600, color: C.textM, fontFamily: "'DM Sans'" }}>YouTube: conectar</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {[{ v: "3", l: "playlists" }, { v: "127", l: "faixas" }, { v: "94%", l: "disponível" }].map(s => (
            <div key={s.l} style={{ background: C.bgElevated, padding: "5px 10px", borderRadius: 6, textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, fontWeight: 700, color: C.textP }}>{s.v}</div>
              <div style={{ fontSize: 8, color: C.textM, fontFamily: "'DM Sans'" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontFamily: "'Fredoka'", fontSize: 14, fontWeight: 500, color: C.textP, marginBottom: 6 }}>Minhas Playlists (3)</div>
      {[
        { n: "Meus Rocks", t: "41/45", pct: 91, sel: true },
        { n: "Pagode Raiz", t: "38/40", pct: 95, sel: false },
        { n: "Indie Brasileiro", t: "22/30", pct: 73, sel: false },
      ].map(p => (
        <Cd key={p.n} style={{ marginBottom: 5, border: p.sel ? `2px solid ${C.accent}` : `1px solid ${C.borderS}`, boxShadow: p.sel ? `0 0 10px ${C.accent}18` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Cover s={34} has={p.n !== "Indie Brasileiro"} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textP }}>{p.n}</div>
              <div style={{ fontSize: 10, color: p.pct > 80 ? C.success : C.warning, fontFamily: "'DM Sans'" }}>{p.t} disponíveis</div>
              <div style={{ height: 3, borderRadius: 2, background: C.bgOverlay, marginTop: 3, overflow: "hidden" }}>
                <div style={{ width: `${p.pct}%`, height: "100%", borderRadius: 2, background: p.pct > 80 ? C.success : C.warning }} />
              </div>
            </div>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${p.sel ? C.accent : C.borderD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {p.sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent }} />}
            </div>
          </div>
        </Cd>
      ))}
      <div style={{ marginTop: 10 }}><BtnW variant="primary" full>Importar Playlist</BtnW></div>
    </DeviceFrame>
  );
}

function WImport() {
  return (
    <DeviceFrame mode="mobile" label="Mobile — Importar Playlist">
      <Header left="← Voltar" center="Importar Playlist" right="" />
      <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
        {[{ n: "Spotify", c: "#1DB954", a: true }, { n: "Deezer", c: "#A238FF", a: false }, { n: "YouTube", c: "#FF0000", a: false }].map(p => (
          <div key={p.n} style={{ flex: 1, textAlign: "center", padding: "7px 0", borderBottom: p.a ? `2px solid ${p.c}` : `1px solid ${C.borderS}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans'", color: p.a ? p.c : C.textM }}>{p.n}</span>
          </div>
        ))}
      </div>
      {[
        { n: "Top Brasil 2026", t: 50 },
        { n: "Discover Weekly", t: 30 },
        { n: "Rock Classics", t: 80 },
        { n: "MPB Essentials", t: 45 },
        { n: "Workout Mix", t: 35 },
      ].map(p => (
        <Cd key={p.n} style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Cover s={34} has={p.t > 40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.textP }}>{p.n}</div>
              <div style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'" }}>{p.t} faixas</div>
            </div>
            <BtnW variant="secondary" size="sm">Importar</BtnW>
          </div>
        </Cd>
      ))}
    </DeviceFrame>
  );
}

function WValidation() {
  const tracks = [
    { n: "Bohemian Rhapsody", a: "Queen", st: "ok", img: true },
    { n: "Stairway to Heaven", a: "Led Zeppelin", st: "ok", img: true },
    { n: "Hotel California", a: "Eagles", st: "ok", img: true },
    { n: "Música Regional", a: "Artista Local", st: "warn", img: true },
    { n: "Faixa Removida", a: "Desconhecido", st: "err", img: false },
  ];
  return (
    <DeviceFrame mode="mobile" label="Mobile — Detalhes da Playlist">
      <Header left="← Voltar" center="Meus Rocks" right="" />
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {[{ v: "41", l: "disponíveis", c: C.success }, { v: "2", l: "fallback", c: C.warning }, { v: "2", l: "indispon.", c: C.error }].map(s => (
          <div key={s.l} style={{ flex: 1, background: C.bgElevated, padding: "6px 4px", borderRadius: 6, textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 8, color: C.textM, textTransform: "uppercase", fontFamily: "'DM Sans'" }}>{s.l}</div>
          </div>
        ))}
      </div>
      {tracks.map((t, i) => (
        <div key={t.n} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 0", borderBottom: i < tracks.length - 1 ? `1px solid ${C.borderS}` : "none" }}>
          <Cover s={32} has={t.img} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: t.st === "err" ? C.textM : C.textP, textDecoration: t.st === "err" ? "line-through" : "none" }}>{t.n}</div>
            <div style={{ fontSize: 10, color: C.textM, fontFamily: "'DM Sans'" }}>{t.a}</div>
          </div>
          <Bdg v={t.st === "ok" ? "success" : t.st === "warn" ? "warning" : "error"}>{t.st === "ok" ? "OK" : t.st === "warn" ? "Fallback" : "Indisp."}</Bdg>
          {t.st === "ok" && <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${C.borderD}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 8, color: C.textS }}>▶</span></div>}
        </div>
      ))}
      <div style={{ marginTop: 12 }}><BtnW variant="secondary" full>Re-importar Playlist</BtnW></div>
    </DeviceFrame>
  );
}

export default function Wireframes() {
  const [page, setPage] = useState("home");
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#08090F", color: C.textP, minHeight: "100vh", maxWidth: 720, margin: "0 auto", padding: "0 12px 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fredoka:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", padding: "20px 0 14px" }}>
        <div style={{ fontFamily: "'Fredoka'", fontSize: 20, fontWeight: 600 }}>
          <span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Wireframes</span>
        </div>
        <div style={{ fontSize: 11, color: C.textM }}>Mermã, a Música! — 12 páginas · Mobile + Desktop</div>
      </div>
      <div style={{ display: "flex", gap: 3, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {pages.map(p => (
          <button key={p.id} onClick={() => setPage(p.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans'", cursor: "pointer", whiteSpace: "nowrap", background: page === p.id ? C.accent : C.bgElevated, color: page === p.id ? "#fff" : C.textS, transition: "all 150ms" }}>{p.label}</button>
        ))}
      </div>
      {page === "home" && <WHome />}
      {page === "login" && <WLogin />}
      {page === "register" && <WRegister />}
      {page === "forgot" && <WForgot />}
      {page === "join" && <WJoin />}
      {page === "lobby" && <WLobby />}
      {page === "round" && <WRound />}
      {page === "reveal" && <WReveal />}
      {page === "results" && <WResults />}
      {page === "profile" && <WProfile />}
      {page === "import" && <WImport />}
      {page === "validation" && <WValidation />}
    </div>
  );
}
