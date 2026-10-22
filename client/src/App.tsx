import { useEffect, useState } from "react";
import { velceronConfigServiceClient } from "@velceron/gen-client";
import { GetSettingsRequest, GetSettingsResponse, SaveSettingsRequest } from "@velceron/gen-shared";

type Settings = GetSettingsResponse;
const defaults: Settings = { tickets:true, moderation:true, welcome:false, logs:true, ticketTitle:"Need help?", ticketDescription:"Click below to open a support ticket.", ticketButtonText:"Open a ticket", pingStaff:true, transcriptToCreator:true, transcriptToLogs:false, logChannelId:"" };

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [status, setStatus] = useState("Loading saved settings…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    velceronConfigServiceClient.getSettings({} as GetSettingsRequest).then((value) => {
      if (active) { setSettings({ ...defaults, ...value }); setStatus("Settings loaded. Changes are not saved until you click Save."); }
    }).catch(() => { if (active) setStatus("Could not connect to the app server yet. Make sure Velceron is installed and running."); });
    return () => { active = false; };
  }, []);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((old) => ({ ...old, [key]: value }));
  const toggle = (key: keyof Settings, label: string) => <label className="toggle-row" key={String(key)}><span>{label}</span><input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => set(key, e.target.checked as Settings[typeof key])} /><i /></label>;
  async function save() {
    setBusy(true); setStatus("Saving settings…");
    try {
      const request: SaveSettingsRequest = { ...settings };
      const result = await velceronConfigServiceClient.saveSettings(request);
      setStatus(result.message || (result.success ? "Settings saved." : "Settings could not be saved."));
    } catch { setStatus("Save failed. Check that the app server is running and try again."); }
    finally { setBusy(false); }
  }
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><div className="mark">V</div><div><strong>VELCERON</strong><small>COMMUNITY TOOLS</small></div></div><div className="nav-label">WORKSPACE</div><div className="nav active">◈ <span>Overview</span></div><div className="nav">⚙ <span>Configuration</span></div><div className="sidebar-bottom"><span className="status-dot" /> Root App <small>Control panel</small></div></aside>
    <section className="content"><header><div><p className="eyebrow">COMMUNITY MANAGEMENT / SETTINGS</p><h1>Control panel</h1><p className="subhead">Configure your community tools in one place.</p></div><div className="online"><span className="status-dot" /> APP SETTINGS</div></header>
      <div className="welcome"><div><p className="eyebrow">VELCERON WORKSPACE</p><h2>Your community, your rules.</h2><p>Choose the modules you want and customize your ticket panel. Click Save once when you're finished.</p></div><div className="orb">V</div></div>
      <div className="section-heading"><div><h2>Modules</h2><p>Turn features on or off for your community.</p></div><span className="pill">4 MODULES</span></div>
      <div className="module-grid">
        <article className="module-card"><div className="module-icon purple">▣</div><div><h3>Support tickets</h3><p>Private member support and ticket transcripts.</p></div>{toggle("tickets","Enabled")}</article>
        <article className="module-card"><div className="module-icon blue">⌁</div><div><h3>Moderation</h3><p>Moderation module switch.</p></div>{toggle("moderation","Enabled")}</article>
        <article className="module-card"><div className="module-icon orange">✦</div><div><h3>Welcome messages</h3><p>Welcome feature switch.</p></div>{toggle("welcome","Enabled")}</article>
        <article className="module-card"><div className="module-icon green">≡</div><div><h3>Logs</h3><p>Community and ticket logging module.</p></div>{toggle("logs","Enabled")}</article>
      </div>
      <div className="section-heading"><div><h2>Ticket template</h2><p>Customize what members see when opening a ticket.</p></div><span className="pill">CUSTOMIZABLE</span></div>
      <div className="panel"><div className="fields"><label>Panel title<input value={settings.ticketTitle} maxLength={120} onChange={e=>set("ticketTitle",e.target.value)} /></label><label>Button text<input value={settings.ticketButtonText} maxLength={80} onChange={e=>set("ticketButtonText",e.target.value)} /></label><label className="wide">Description<textarea value={settings.ticketDescription} maxLength={1000} rows={3} onChange={e=>set("ticketDescription",e.target.value)} /></label><label className="wide">Transcript log channel ID <input value={settings.logChannelId} placeholder="Optional channel ID" onChange={e=>set("logChannelId",e.target.value)} /><small>Used when transcript delivery to logs is enabled.</small></label></div>
      <div className="options"><h3>Ticket behavior</h3>{toggle("pingStaff","Ping configured staff when a ticket opens")}{toggle("transcriptToCreator","Send transcript notice to the ticket creator")}{toggle("transcriptToLogs","Send transcript to the selected log channel")}</div>
      <div className="preview"><div className="preview-label">LIVE PREVIEW</div><h3>{settings.ticketTitle || "Your ticket title"}</h3><p>{settings.ticketDescription || "Your ticket description will appear here."}</p><button type="button" className="preview-button">{settings.ticketButtonText || "Open a ticket"}</button></div></div>
      <footer><p className="message">{status}</p><button className="save" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"} <span>→</span></button></footer>
      <p className="footnote">Velceron • Settings are stored by the app server. Use /setup in your community to initialize private channels.</p>
    </section>
  </main>;
}
