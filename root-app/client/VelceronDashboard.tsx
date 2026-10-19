import React, { useState } from "react";

type Tab = "overview" | "moderation" | "warnings" | "activity" | "settings";

const nav: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "moderation", label: "Moderation", icon: "◇" },
  { id: "warnings", label: "Warnings", icon: "!" },
  { id: "activity", label: "Activity log", icon: "≋" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <section className="vc-card">
      <p className="vc-muted">{label}</p>
      <strong className="vc-metric">{value}</strong>
      <p className="vc-detail">{detail}</p>
    </section>
  );
}

/**
 * Velceron Root App dashboard UI.
 *
 * This is the client-side presentation layer only. Values are demo placeholders:
 * wire them to the Root App server before treating them as live community data.
 * Root identity is supplied by the Root client; do not add a separate password form.
 */
export default function VelceronDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmModeration, setConfirmModeration] = useState(false);
  const [moderationEnabled, setModerationEnabled] = useState(true);

  return (
    <main className="vc-shell">
      <style>{`
        .vc-shell{min-height:100%;padding:20px;background:#0b0d13;color:#f4f6fb;font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .vc-wrap{max-width:1100px;margin:0 auto}
        .vc-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
        .vc-brand{display:flex;align-items:center;gap:12px}
        .vc-logo{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:#7667ff;color:white;font-weight:800;font-size:18px}
        .vc-title{margin:0;font-size:22px;letter-spacing:-.5px}.vc-subtitle,.vc-muted,.vc-detail{color:#9aa3b7}
        .vc-subtitle{margin:2px 0 0}.vc-pill{border:1px solid #2a3446;background:#141a26;border-radius:999px;padding:7px 11px;color:#b9c2d6;font-size:12px}
        .vc-layout{display:grid;grid-template-columns:205px minmax(0,1fr);gap:18px}
        .vc-nav,.vc-card,.vc-panel{border:1px solid #252c3b;background:#121620;border-radius:16px}
        .vc-nav{padding:9px;height:max-content}.vc-nav button{width:100%;display:flex;align-items:center;gap:10px;text-align:left;padding:11px 12px;border:0;border-radius:10px;background:transparent;color:#aab3c7;cursor:pointer;font:inherit}
        .vc-nav button[aria-current="page"]{background:#252342;color:#fff}.vc-nav button:hover{background:#1c2230}
        .vc-content{min-width:0}.vc-heading{font-size:20px;margin:0 0 4px}.vc-intro{margin:0 0 18px;color:#9aa3b7}
        .vc-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
        .vc-card,.vc-panel{padding:17px}.vc-card p{margin:0}.vc-metric{display:block;font-size:28px;letter-spacing:-.7px;margin:8px 0}.vc-detail{font-size:12px}
        .vc-panel{margin-bottom:14px}.vc-panel h3{margin:0 0 12px;font-size:15px}
        .vc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #252c3b}.vc-row:first-of-type{border-top:0}
        .vc-btn{border:1px solid #38345e;background:#7667ff;color:white;border-radius:10px;padding:9px 12px;font:inherit;font-weight:600;cursor:pointer}.vc-btn.secondary{background:#191f2b;border-color:#30394b;color:#e4e8f2}
        .vc-status{display:inline-flex;align-items:center;gap:7px;color:#80e0b7;font-size:12px}.vc-dot{width:7px;height:7px;border-radius:50%;background:#55d7a0}
        .vc-table{width:100%;border-collapse:collapse}.vc-table th,.vc-table td{text-align:left;padding:11px 8px;border-top:1px solid #252c3b}.vc-table th{color:#9aa3b7;font-weight:500;font-size:12px}
        .vc-empty{padding:18px;border:1px dashed #30394b;border-radius:12px;color:#9aa3b7}
        @media(max-width:680px){.vc-shell{padding:12px}.vc-layout{grid-template-columns:1fr}.vc-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.vc-nav button{padding:9px;font-size:12px}.vc-metrics{grid-template-columns:1fr}.vc-header{align-items:flex-start}.vc-pill{display:none}.vc-table{font-size:12px}}
      `}</style>
      <div className="vc-wrap">
        <header className="vc-header">
          <div className="vc-brand">
            <div className="vc-logo">V</div>
            <div><h1 className="vc-title">Velceron</h1><p className="vc-subtitle">Community moderation</p></div>
          </div>
          <span className="vc-pill">Root App · Dashboard prototype</span>
        </header>
        <div className="vc-layout">
          <nav className="vc-nav" aria-label="Dashboard navigation">
            {nav.map(item => <button key={item.id} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
          </nav>
          <section className="vc-content">
            {tab === "overview" && <>
              <h2 className="vc-heading">Community overview</h2>
              <p className="vc-intro">A clear place to manage Velceron from inside Root.</p>
              <div className="vc-metrics">
                <Metric label="Bot status" value="Setup needed" detail="Connect the Root App server to live bot data" />
                <Metric label="Commands" value="7" detail="Current documented bot commands" />
                <Metric label="Warnings" value="—" detail="Live count appears after backend connection" />
              </div>
              <div className="vc-panel">
                <h3>Current bot capabilities</h3>
                {["/help and /ping", "/warn and /warnings", "/kick, /ban and /unban"].map(x => <div className="vc-row" key={x}><span>{x}</span><span className="vc-status"><span className="vc-dot" />In bot project</span></div>)}
              </div>
              <div className="vc-panel"><h3>Next integration steps</h3><p className="vc-muted">The app UI is prepared. Live statistics and moderation actions must be connected to a supported Root App server/API before they can safely change community data.</p></div>
            </>}
            {tab === "moderation" && <><h2 className="vc-heading">Moderation</h2><p className="vc-intro">Review the moderation controls before enabling live actions.</p><div className="vc-panel"><div className="vc-row"><div><strong>Moderation actions</strong><p className="vc-muted">Prototype toggle only — not connected to the bot yet.</p></div><button className="vc-btn secondary" onClick={() => setConfirmModeration(true)}>{moderationEnabled ? "Review disable" : "Review enable"}</button></div>{confirmModeration && <div className="vc-row"><span>Change prototype setting?</span><div><button className="vc-btn" onClick={() => {setModerationEnabled(!moderationEnabled);setConfirmModeration(false);}}>Confirm</button> <button className="vc-btn secondary" onClick={() => setConfirmModeration(false)}>Cancel</button></div></div>}<div className="vc-row"><span>Prototype status</span><span className="vc-pill">{moderationEnabled ? "Shown as enabled" : "Shown as disabled"}</span></div></div><div className="vc-empty">Live kick/ban controls will not be enabled until server-side permission checks and the bot connection are implemented.</div></>}
            {tab === "warnings" && <><h2 className="vc-heading">Warnings</h2><p className="vc-intro">Warning records for this community.</p><div className="vc-panel"><div className="vc-empty">No live warning data connected yet. This screen will display records from the Root-hosted bot database after a supported integration is in place.</div></div></>}
            {tab === "activity" && <><h2 className="vc-heading">Activity log</h2><p className="vc-intro">A readable audit trail for moderators.</p><div className="vc-panel"><div className="vc-empty">Activity logging is not connected yet. We will avoid displaying invented log entries as real events.</div></div></>}
            {tab === "settings" && <><h2 className="vc-heading">Settings</h2><p className="vc-intro">Dashboard and access configuration.</p><div className="vc-panel"><div className="vc-row"><div><strong>Authentication</strong><p className="vc-muted">Use the Root app session; no separate password form.</p></div><span className="vc-status"><span className="vc-dot" />Root-managed</span></div><div className="vc-row"><div><strong>Data source</strong><p className="vc-muted">Connect through supported Root server APIs.</p></div><span className="vc-pill">Not connected</span></div><div className="vc-row"><div><strong>Community isolation</strong><p className="vc-muted">Each installed Root app/bot instance must only access its own community's data.</p></div><span className="vc-pill">Required</span></div></div></>}
          </section>
        </div>
      </div>
    </main>
  );
}
