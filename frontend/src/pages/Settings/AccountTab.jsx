import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { FONT_SANS, SETTINGS_STYLE as s } from "./SettingsConstants";
import {
  Camera, ShieldCheck, Edit, Lock, Shield, Monitor, Link, Download, Key,
  Trash2, Check, X, Smartphone, LogOut, Save, Copy
} from "lucide-react";

export default function AccountTab() {
  const navigate = useNavigate();
  const toast = useToast();
  let currentUser = {};
  try { currentUser = JSON.parse(localStorage.getItem("user") || "{}"); } catch (err) { console.error("[Settings] Failed to parse user from localStorage:", err); }

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", timezone: "", locale: "" });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [totpData, setTotpData] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [show2FA, setShow2FA] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const avatarFileRef = useRef(null);

  const fetchSessions = async () => {
    try { const res = await api.get("/api/users/me/sessions"); setSessions(Array.isArray(res.data) ? res.data : []); } catch (err) { console.error("[Settings] Failed to fetch sessions:", err); }
  };

  const fetchConnectedAccounts = async () => {
    try { const res = await api.get("/api/users/me/connected-accounts"); setConnectedAccounts(Array.isArray(res.data) ? res.data : []); } catch (err) { console.error("[Settings] Failed to fetch connected accounts:", err); }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await api.put("/api/users/me", { name: profileForm.name, email: profileForm.email, timezone: profileForm.timezone, locale: profileForm.locale });
      const updated = { ...currentUser, ...(res.data?.user || res.data || {}) };
      localStorage.setItem("user", JSON.stringify(updated));
      window.location.reload();
    } catch (err) { toast(err.response?.data?.error || "Failed to update profile.", "error"); }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) { toast("Please fill in both fields.", "error"); return; }
    if (passwordForm.new_password.length < 6) { toast("New password must be at least 6 characters.", "error"); return; }
    if (passwordForm.new_password !== passwordForm.confirm) { toast("Passwords do not match.", "error"); return; }
    try {
      await api.put("/api/users/me/password", { current_password: passwordForm.current_password, new_password: passwordForm.new_password });
      setShowPasswordChange(false);
      setPasswordForm({ current_password: "", new_password: "", confirm: "" });
      toast("Password changed successfully.", "success");
    } catch (err) { toast(err.response?.data?.error || "Failed to change password.", "error"); }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await api.post("/api/users/me/2fa/generate");
      setTotpData(res.data);
      setShow2FA(true);
    } catch { toast("Failed to setup 2FA.", "error"); }
  };

  const handleVerify2FA = async () => {
    if (!totpCode.trim()) return;
    try {
      await api.post("/api/users/me/2fa/verify", { code: totpCode });
      setShow2FA(false);
      setTotpData(null);
      setTotpCode("");
      toast("2FA enabled successfully.", "success");
    } catch (err) { toast(err.response?.data?.error || "Invalid code.", "error"); }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Disable two-factor authentication?")) return;
    try { await api.post("/api/users/me/2fa/disable"); toast("2FA disabled.", "success"); } catch { toast("Failed to disable 2FA.", "error"); }
  };

  const handleRevokeSession = async (id) => {
    try { await api.delete(`/api/users/me/sessions/${id}`); fetchSessions(); } catch { toast("Failed to revoke session.", "error"); }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete("/api/users/me", { data: { confirm: true } });
      localStorage.clear();
      navigate("/");
    } catch { toast("Failed to delete account.", "error"); }
  };

  const copyToClipboard = (text) => { navigator.clipboard?.writeText(text); };

  const handleFetchRecoveryCodes = async () => {
    try {
      const res = await api.get("/api/users/me/2fa/recovery-codes");
      setRecoveryCodes(Array.isArray(res.data?.codes) ? res.data.codes : Array.isArray(res.data) ? res.data : []);
      setShowRecoveryCodes(true);
    } catch { toast("Failed to fetch recovery codes.", "error"); }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get("/api/users/me/export?format=json");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "foundesk-export.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast("Failed to export data.", "error"); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData(); fd.append("avatar", file);
      await api.post("/api/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const userRes = await api.get("/api/users/me");
      localStorage.setItem("user", JSON.stringify(userRes.data?.user || userRes.data || {}));
      window.location.reload();
    } catch { toast("Failed to upload avatar.", "error"); }
  };

  const profileComplete = [currentUser.name, currentUser.email, currentUser.timezone && currentUser.timezone !== "UTC", currentUser.avatar_url].filter(Boolean).length;
  const score = Math.round((profileComplete / 4) * 100);

  return (
    <div>
      <div className="card-glass" style={{ padding: "24px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", backgroundColor: "rgba(255,90,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-orange)", fontWeight: 700, fontSize: "20px", border: "1px solid rgba(255,90,0,0.2)" }}>
              {(currentUser.name || currentUser.email || "U")[0].toUpperCase()}
            </div>
            <input type="file" accept="image/*" ref={avatarFileRef} onChange={handleAvatarUpload} style={{ display: "none" }} />
            <button onClick={() => avatarFileRef.current?.click()} style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--brand-orange)", border: "2px solid #18181b", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Upload photo">
              <Camera size={10} style={{ color: "#fff" }} />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "17px", fontWeight: 700, color: "var(--sand)", fontFamily: FONT_SANS }}>{currentUser.name || "User"}</span>
              {currentUser.totp_enabled && <ShieldCheck size={14} style={{ color: "#4ade80" }} />}
            </div>
            <div style={{ fontSize: "12px", color: "var(--graphite)" }}>{currentUser.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "var(--graphite)", marginBottom: "4px" }}>Profile</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "60px", height: "4px", backgroundColor: "rgba(107,107,111,0.15)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${score}%`, backgroundColor: score === 100 ? "#4ade80" : "var(--brand-orange)", borderRadius: "2px", transition: "width 0.3s" }} />
              </div>
              <span style={{ fontSize: "10px", color: "var(--graphite)", fontWeight: 600 }}>{score}%</span>
            </div>
          </div>
        </div>

        {editingProfile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={s.label}>Name</label><input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
              <div><label style={s.label}>Email</label><input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={s.label}>Timezone</label>
                <select value={profileForm.timezone} onChange={e => setProfileForm(p => ({ ...p, timezone: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                  {["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div><label style={s.label}>Locale</label>
                <select value={profileForm.locale} onChange={e => setProfileForm(p => ({ ...p, locale: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                  {["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "ja-JP", "zh-CN", "hi-IN"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleSaveProfile} className="btn-ember"><Save size={14} /> Save Changes</button>
              <button onClick={() => { setEditingProfile(false); setProfileForm({ name: "", email: "", timezone: "", locale: "" }); }} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => { setProfileForm({ name: currentUser.name || "", email: currentUser.email || "", timezone: currentUser.timezone || "UTC", locale: currentUser.locale || "en-US" }); setEditingProfile(true); }} className="btn-outline-ember"><Edit size={14} /> Edit Profile</button>
            <button onClick={() => { setShowPasswordChange(true); setPasswordForm({ current_password: "", new_password: "", confirm: "" }); }} className="btn-action-secondary"><Lock size={14} /> Password</button>
            <button onClick={handleSetup2FA} className="btn-action-secondary"><Shield size={14} /> {currentUser.totp_enabled ? "2FA Active" : "Setup 2FA"}</button>
            <button onClick={() => { fetchSessions(); setShowSessions(!showSessions); }} className="btn-action-secondary"><Monitor size={14} /> Sessions</button>
            <button onClick={() => { fetchConnectedAccounts(); setShowConnectedAccounts(!showConnectedAccounts); }} className="btn-action-secondary"><Link size={14} /> Connected Accounts</button>
            <button onClick={handleExportData} className="btn-action-secondary"><Download size={14} /> Export Data</button>
            {currentUser.totp_enabled && <button onClick={handleFetchRecoveryCodes} className="btn-action-secondary"><Key size={14} /> Recovery Codes</button>}
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-destructive-outline"><Trash2 size={14} /> Delete Account</button>
          </div>
        )}
      </div>

      {show2FA && totpData && (
        <div className="card-glass" style={{ padding: "20px", marginBottom: "12px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--sand)", margin: "0 0 12px" }}>Set Up Two-Factor Authentication</h4>
          {totpData.otpauth_url && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "var(--graphite)", marginBottom: "8px" }}>Scan this QR code with your authenticator app:</div>
              <div style={{ padding: "12px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "8px", textAlign: "center", fontFamily: "monospace", fontSize: "11px", color: "var(--sand)", wordBreak: "break-all" }}>
                {totpData.otpauth_url}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input type="text" placeholder="Enter 6-digit code" value={totpCode} onChange={e => setTotpCode(e.target.value)} className="plan-input" style={{ maxWidth: "200px" }} />
            <button onClick={handleVerify2FA} className="btn-ember"><Check size={14} /> Verify</button>
            <button onClick={() => { setShow2FA(false); setTotpData(null); setTotpCode(""); }} className="btn-action-secondary">Cancel</button>
          </div>
        </div>
      )}

      {showRecoveryCodes && (
        <div className="card-glass" style={{ padding: "20px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--sand)", margin: 0 }}>Recovery Codes</h4>
            <button onClick={() => { setShowRecoveryCodes(false); setRecoveryCodes([]); }} className="btn-action-secondary" style={{ padding: "4px" }}><X size={14} /></button>
          </div>
          <p style={{ fontSize: "11px", color: "#ef4444", margin: "0 0 12px", fontWeight: 600 }}>Store these safely — they won't be shown again.</p>
          <div style={{ fontFamily: "monospace", fontSize: "13px", backgroundColor: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", lineHeight: 1.8 }}>
            {recoveryCodes.length === 0 ? (
              <span style={{ color: "var(--graphite)" }}>No codes available.</span>
            ) : recoveryCodes.map((code, i) => (
              <div key={i} style={{ color: "var(--sand)" }}>{code}</div>
            ))}
          </div>
          {recoveryCodes.length > 0 && (
            <button onClick={() => { copyToClipboard(recoveryCodes.join("\n")); toast("Copied!", "success"); }} className="btn-action-secondary" style={{ marginTop: "10px", fontSize: "11px", padding: "6px 12px" }}>
              <Copy size={12} /> Copy All
            </button>
          )}
        </div>
      )}

      {showSessions && (
        <div className="card-glass" style={{ padding: "16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span className="card-label" style={{ margin: 0 }}>Active Sessions</span>
            <button onClick={() => setShowSessions(false)} className="btn-action-secondary" style={{ padding: "4px" }}><X size="12" /></button>
          </div>
          {sessions.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--graphite)" }}>No active sessions found.</div>
          ) : sessions.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(107,107,111,0.06)", fontSize: "12px" }}>
              <Smartphone size={14} style={{ color: "var(--graphite)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "var(--sand)", fontWeight: 600 }}>{s.device || s.user_agent || "Unknown device"}</div>
                <div style={{ color: "var(--graphite)", fontSize: "10px" }}>{s.ip_address || ""} · Last active: {s.last_active_at ? new Date(s.last_active_at).toLocaleDateString() : "now"}</div>
              </div>
              <button onClick={() => handleRevokeSession(s.id)} className="btn-destructive-outline-sm"><LogOut size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {showConnectedAccounts && (
        <div className="card-glass" style={{ padding: "16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span className="card-label" style={{ margin: 0 }}>Connected Accounts</span>
            <button onClick={() => setShowConnectedAccounts(false)} className="btn-action-secondary" style={{ padding: "4px" }}><X size="12" /></button>
          </div>
          {connectedAccounts.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--graphite)" }}>No connected accounts. Link Google, GitHub, or Slack from Connected Apps.</div>
          ) : connectedAccounts.map(a => (
            <div key={a.provider || a.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(107,107,111,0.06)", fontSize: "12px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "rgba(255,90,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-orange)", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                {(a.provider || "?")[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "var(--sand)", fontWeight: 600, textTransform: "capitalize" }}>{a.provider}</div>
                <div style={{ color: "var(--graphite)", fontSize: "10px" }}>{a.email || a.name || ""}</div>
              </div>
              <span className="badge badge-positive">Connected</span>
            </div>
          ))}
        </div>
      )}

      {showPasswordChange && (
        <div style={s.overlay} onClick={() => setShowPasswordChange(false)}>
          <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Change Password</h3>
            <div style={s.field}><label style={s.label}>Current Password</label><input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
            <div style={s.field}><label style={s.label}>New Password</label><input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
            <div style={s.field}><label style={s.label}>Confirm New Password</label><input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={handleChangePassword} className="btn-ember"><Check size={14} /> Update Password</button>
              <button onClick={() => { setShowPasswordChange(false); setPasswordForm({ current_password: "", new_password: "", confirm: "" }); }} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div style={s.overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "#ef4444" }}>Delete Account</h3>
            <p style={{ fontSize: "13px", color: "var(--graphite)", margin: "0 0 16px" }}>This action is irreversible. All your data will be permanently deleted. Are you absolutely sure?</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleDeleteAccount} className="btn-destructive-outline">Delete My Account</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
