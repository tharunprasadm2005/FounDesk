import { useState } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { NOTIFICATION_TYPES, NOTIF_ICONS, SETTINGS_STYLE as s } from "./SettingsConstants";
import { FileText, Mail, ChevronDown, Moon, Send, Save, Bell, AlertCircle, Sun, Clock, CheckCircle, Users, RefreshCw, MessageCircle, Shield, CreditCard, Calendar, UserCheck } from "lucide-react";

export default function NotificationsTab({ notificationPrefs, onNotificationPrefsChange }) {
  const { toast } = useToast();
  const [notifExpanded, setNotifExpanded] = useState({});
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [showEmailTemplates, setShowEmailTemplates] = useState(false);

  const fetchEmailTemplates = async () => {
    try { const res = await api.get("/api/notifications/templates"); setEmailTemplates(Array.isArray(res.data) ? res.data : []); } catch { console.error("Failed to fetch templates"); }
  };

  const handleResendVerification = async () => {
    try { await api.post("/api/notifications/resend-verification"); toast("Verification email sent.", "success"); } catch { toast("Failed to resend verification.", "error"); }
  };

  const handleSaveNotifs = async () => {
    try { await api.put("/api/notifications/preferences", notificationPrefs); toast("Notification preferences saved.", "success"); } catch { toast("Failed to save preferences.", "error"); }
  };

  const handleMarkAllRead = async (wsId) => {
    try { await api.post(`/api/workspaces/${wsId}/notifications/mark-all-read`); toast("Marked all as read.", "success"); } catch { toast("Failed to mark all as read.", "error"); }
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isInQuietHours = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (startMin <= endMin) return currentMinutes >= startMin && currentMinutes <= endMin;
    return currentMinutes >= startMin || currentMinutes <= endMin;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => { setShowEmailTemplates(!showEmailTemplates); if (!emailTemplates.length) fetchEmailTemplates(); }} className="btn-action-secondary">
          <FileText size={14} /> Email Templates
        </button>
        <button onClick={handleResendVerification} className="btn-action-secondary"><Mail size={14} /> Resend Verification Email</button>
      </div>

      {showEmailTemplates && (
        <div className="card-glass" style={{ padding: "16px", marginBottom: "16px" }}>
          <div className="card-label" style={{ marginBottom: "8px" }}>Email Notification Templates</div>
          {emailTemplates.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--graphite)" }}>No templates found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                  {["Type", "Title", "Message"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--graphite)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emailTemplates.map((tpl, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--sand)", fontWeight: 600 }}>{tpl.type || tpl.name || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--sand)" }}>{tpl.title || tpl.subject || "—"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--graphite)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tpl.message || tpl.body || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={() => setShowEmailTemplates(false)} className="btn-action-secondary" style={{ marginTop: "8px", fontSize: "10px", padding: "4px 10px" }}>Close</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px" }}>
        {NOTIFICATION_TYPES.map((n, idx) => {
          const enabled = notificationPrefs[n.key] !== false;
          const expanded = notifExpanded[n.key];
          const NotifIcon = NOTIF_ICONS[n.category === "alerts" ? "alert" : n.category === "reports" ? "clock" : n.category === "team" ? "users" : n.category === "tasks" ? "check-square" : n.category === "ai" ? "cpu" : n.category === "social" ? "message-circle" : n.category === "security" ? "shield" : n.category === "billing" ? "credit-card" : n.category === "system" ? "alert" : "calendar"] || Bell;
          const qhStart = notificationPrefs[`${n.key}_quiet_hours_start`];
          const qhEnd = notificationPrefs[`${n.key}_quiet_hours_end`];
          const inQuietHours = isInQuietHours(qhStart, qhEnd);
          return (
            <div key={n.key} className="card-glass" style={{ padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? "10px" : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <NotifIcon size={14} style={{ color: "var(--graphite)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--sand)" }}>{n.label}</span>
                  {inQuietHours && (
                    <span className="badge" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)", fontSize: "9px" }}>
                      <Moon size={10} style={{ verticalAlign: "middle", marginRight: "2px" }} /> Quiet Hours
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button onClick={() => onNotificationPrefsChange({ ...notificationPrefs, [n.key]: !enabled })}
                    className={`neu-toggle ${enabled ? "on" : ""}`}><div className="thumb" /></button>
                  <button onClick={() => setNotifExpanded(p => ({ ...p, [n.key]: !expanded }))} className="btn-action-secondary" style={{ padding: "4px" }}>
                    <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "", transition: "transform 0.2s" }} />
                  </button>
                </div>
              </div>
              {expanded && (
                <div style={{ borderTop: "1px solid rgba(107,107,111,0.08)", marginTop: "10px", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <select className="plan-select" style={{ flex: 1, height: "32px", fontSize: "11px" }} value={notificationPrefs[`${n.key}_channel`] || "all"}>
                      <option value="all">All Channels</option>
                      <option value="email">Email</option>
                      <option value="push">Push</option>
                      <option value="in-app">In-App</option>
                      <option value="slack">Slack</option>
                    </select>
                    <select className="plan-select" style={{ flex: 1, height: "32px", fontSize: "11px" }} value={notificationPrefs[`${n.key}_frequency`] || "immediate"}>
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly</option>
                      <option value="off">Off</option>
                    </select>
                    <select className="plan-select" style={{ width: "80px", height: "32px", fontSize: "11px" }} value={notificationPrefs[`${n.key}_priority`] || "normal"}>
                      <option value="high">🔴 High</option>
                      <option value="normal">🟡 Normal</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: "10px", color: "var(--graphite)" }}>Quiet Hours:</div>
                    <input type="time" className="plan-input" style={{ width: "100px", fontSize: "11px", padding: "4px 6px" }}
                      value={notificationPrefs[`${n.key}_quiet_hours_start`] || ""}
                      onChange={e => onNotificationPrefsChange({ ...notificationPrefs, [`${n.key}_quiet_hours_start`]: e.target.value })} />
                    <span style={{ fontSize: "10px", color: "var(--graphite)" }}>to</span>
                    <input type="time" className="plan-input" style={{ width: "100px", fontSize: "11px", padding: "4px 6px" }}
                      value={notificationPrefs[`${n.key}_quiet_hours_end`] || ""}
                      onChange={e => onNotificationPrefsChange({ ...notificationPrefs, [`${n.key}_quiet_hours_end`]: e.target.value })} />
                  </div>
                  <button onClick={() => toast(`Test ${n.label} notification sent.`, "info")} className="btn-action-secondary" style={{ fontSize: "10px", padding: "4px 10px", alignSelf: "flex-start" }}>
                    <Send size={10} /> Test
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={handleSaveNotifs} className="btn-ember" style={{ marginTop: "16px" }}><Save size={14} /> Save Preferences</button>
    </div>
  );
}
