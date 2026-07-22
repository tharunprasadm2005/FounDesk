import { useState } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { NOTIFICATION_TYPES, NOTIF_ICONS } from "./SettingsConstants";
import { FileText, Mail, ChevronDown, Moon, Send, Save, Bell, AlertCircle, Sun, Clock, CheckCircle, Users, RefreshCw, MessageCircle, Shield, CreditCard, Calendar, UserCheck } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Inline, Stack } from "../../components/layout";

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
    <div className="animate-in fade-in">
      <Inline gap="gap-[12px]" className="mb-[32px] flex-wrap">
        <Button onClick={() => { setShowEmailTemplates(!showEmailTemplates); if (!emailTemplates.length) fetchEmailTemplates(); }} variant={showEmailTemplates ? "primary" : "secondary"}>
          <FileText size={14} className="mr-1" /> Email Templates
        </Button>
        <Button onClick={handleResendVerification} variant="secondary">
          <Mail size={14} className="mr-1" /> Resend Verification Email
        </Button>
      </Inline>

      {showEmailTemplates && (
        <Card padding="p-[24px]" className="mb-[32px] bg-washi-white">
          <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px]">Email Notification Templates</h3>
          {emailTemplates.length === 0 ? (
            <p className="text-[12px] text-stone-400 italic mb-[16px]">No templates found.</p>
          ) : (
            <div className="overflow-x-auto mb-[16px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200">
                    {["Type", "Title", "Message"].map(h => (
                      <th key={h} className="py-[12px] px-[16px] text-[10px] font-bold text-stone-400 tracking-widest uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {emailTemplates.map((tpl, i) => (
                    <tr key={i}>
                      <td className="py-[12px] px-[16px] text-[13px] font-medium text-sumi-900">{tpl.type || tpl.name || "—"}</td>
                      <td className="py-[12px] px-[16px] text-[13px] text-sumi-900">{tpl.title || tpl.subject || "—"}</td>
                      <td className="py-[12px] px-[16px] text-[13px] text-stone-500 max-w-[240px] truncate">{tpl.message || tpl.body || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button onClick={() => setShowEmailTemplates(false)} variant="secondary" size="sm">Close</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[32px]">
        {NOTIFICATION_TYPES.map((n, idx) => {
          const enabled = notificationPrefs[n.key] !== false;
          const expanded = notifExpanded[n.key];
          const NotifIcon = NOTIF_ICONS[n.category === "alerts" ? "alert" : n.category === "reports" ? "clock" : n.category === "team" ? "users" : n.category === "tasks" ? "check-square" : n.category === "ai" ? "cpu" : n.category === "social" ? "message-circle" : n.category === "security" ? "shield" : n.category === "billing" ? "credit-card" : n.category === "system" ? "alert" : "calendar"] || Bell;
          const qhStart = notificationPrefs[`${n.key}_quiet_hours_start`];
          const qhEnd = notificationPrefs[`${n.key}_quiet_hours_end`];
          const inQuietHours = isInQuietHours(qhStart, qhEnd);
          return (
            <Card key={n.key} padding="p-[20px]" className="bg-washi-white">
              <Inline justify="justify-between" items="items-center" className={expanded ? "mb-[16px]" : ""}>
                <Inline gap="gap-[12px]" items="items-center">
                  <div className="w-[32px] h-[32px] rounded-[4px] bg-stone-100 flex items-center justify-center shrink-0">
                    <NotifIcon size={16} className="text-stone-400" />
                  </div>
                  <Inline items="items-center" gap="gap-[8px]">
                    <span className="text-[14px] font-medium text-sumi-900">{n.label}</span>
                    {inQuietHours && (
                      <span className="px-[6px] py-[2px] rounded-[2px] bg-indigo-ink/10 text-indigo-ink text-[9px] font-bold tracking-wide uppercase flex items-center gap-[4px]">
                        <Moon size={10} /> Quiet Hours
                      </span>
                    )}
                  </Inline>
                </Inline>
                <Inline gap="gap-[12px]" items="items-center">
                  <button onClick={() => onNotificationPrefsChange({ ...notificationPrefs, [n.key]: !enabled })}
                    className={`relative w-[36px] h-[20px] rounded-full transition-colors outline-none cursor-pointer border-none ${enabled ? "bg-moss-600" : "bg-stone-200"}`}>
                    <div className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-washi-white transition-transform ${enabled ? "translate-x-[16px]" : "translate-x-0"}`} />
                  </button>
                  <button onClick={() => setNotifExpanded(p => ({ ...p, [n.key]: !expanded }))} className="p-[4px] text-stone-400 hover:text-sumi-900 bg-transparent border-none cursor-pointer outline-none">
                    <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                  </button>
                </Inline>
              </Inline>
              {expanded && (
                <div className="pt-[16px] border-t border-stone-200 mt-[16px]">
                  <Stack gap="gap-[12px]">
                    <div className="grid grid-cols-3 gap-[8px]">
                      <select className="h-[32px] px-[8px] rounded-[4px] border border-stone-200 bg-washi-white text-[11px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors" value={notificationPrefs[`${n.key}_channel`] || "all"}>
                        <option value="all">All Channels</option>
                        <option value="email">Email</option>
                        <option value="push">Push</option>
                        <option value="in-app">In-App</option>
                        <option value="slack">Slack</option>
                      </select>
                      <select className="h-[32px] px-[8px] rounded-[4px] border border-stone-200 bg-washi-white text-[11px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors" value={notificationPrefs[`${n.key}_frequency`] || "immediate"}>
                        <option value="immediate">Immediate</option>
                        <option value="daily">Daily Digest</option>
                        <option value="weekly">Weekly</option>
                        <option value="off">Off</option>
                      </select>
                      <select className="h-[32px] px-[8px] rounded-[4px] border border-stone-200 bg-washi-white text-[11px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors" value={notificationPrefs[`${n.key}_priority`] || "normal"}>
                        <option value="high">🔴 High</option>
                        <option value="normal">🟡 Normal</option>
                        <option value="low">🟢 Low</option>
                      </select>
                    </div>
                    <Inline items="items-center" gap="gap-[8px]">
                      <span className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">Quiet Hours:</span>
                      <input type="time" className="h-[32px] px-[8px] rounded-[4px] border border-stone-200 bg-washi-white text-[11px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors w-[100px]"
                        value={notificationPrefs[`${n.key}_quiet_hours_start`] || ""}
                        onChange={e => onNotificationPrefsChange({ ...notificationPrefs, [`${n.key}_quiet_hours_start`]: e.target.value })} />
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">to</span>
                      <input type="time" className="h-[32px] px-[8px] rounded-[4px] border border-stone-200 bg-washi-white text-[11px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors w-[100px]"
                        value={notificationPrefs[`${n.key}_quiet_hours_end`] || ""}
                        onChange={e => onNotificationPrefsChange({ ...notificationPrefs, [`${n.key}_quiet_hours_end`]: e.target.value })} />
                    </Inline>
                    <div className="pt-[4px]">
                      <Button onClick={() => toast(`Test ${n.label} notification sent.`, "info")} variant="secondary" size="sm">
                        <Send size={12} className="mr-1" /> Test
                      </Button>
                    </div>
                  </Stack>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="border-t border-stone-200 pt-[24px]">
        <Button onClick={handleSaveNotifs} variant="primary">
          <Save size={14} className="mr-1" /> Save Preferences
        </Button>
      </div>
    </div>
  );
}
