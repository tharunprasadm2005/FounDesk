import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import {
  Camera, ShieldCheck, Edit, Lock, Shield, Monitor, Link, Download, Key,
  Trash2, Check, X, Smartphone, LogOut, Save, Copy
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Inline, Stack } from "../../components/layout";

export default function AccountTab() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
    <div className="animate-in fade-in">
      <Card padding="p-[32px]" className="mb-[24px] bg-washi-white">
        <Inline items="items-center" justify="justify-between" className="mb-[32px] flex-wrap gap-[24px]">
          <Inline items="items-center" gap="gap-[24px]">
            <div className="relative">
              <div className="w-[64px] h-[64px] rounded-[16px] bg-clay-500/10 flex items-center justify-center text-clay-500 font-bold text-[24px] font-heading border border-clay-500/20">
                {(currentUser.name || currentUser.email || "U")[0].toUpperCase()}
              </div>
              <input type="file" accept="image/*" ref={avatarFileRef} onChange={handleAvatarUpload} className="hidden" />
              <button onClick={() => avatarFileRef.current?.click()} className="absolute -bottom-1 -right-1 w-[24px] h-[24px] rounded-full bg-clay-500 border-[2px] border-washi-white flex items-center justify-center cursor-pointer hover:bg-clay-600 transition-colors" title="Upload photo">
                <Camera size={12} className="text-white" />
              </button>
            </div>
            <div>
              <Inline items="items-center" gap="gap-[8px]">
                <span className="text-[20px] font-heading text-sumi-900 leading-none">{currentUser.name || "User"}</span>
                {currentUser.totp_enabled && <ShieldCheck size={16} className="text-moss-600" />}
              </Inline>
              <div className="text-[13px] text-stone-500 mt-[4px] font-mono tracking-wide">{currentUser.email}</div>
            </div>
          </Inline>
          
          <div className="text-right">
            <div className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Profile Completion</div>
            <Inline items="items-center" gap="gap-[12px]">
              <div className="w-[80px] h-[4px] bg-stone-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${score === 100 ? "bg-moss-600" : "bg-clay-500"}`} style={{ width: `${score}%` }} />
              </div>
              <span className="text-[11px] font-bold font-mono text-stone-500">{score}%</span>
            </Inline>
          </div>
        </Inline>

        {editingProfile ? (
          <Stack gap="gap-[24px]" className="animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Name</label>
                <Input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Email</label>
                <Input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Timezone</label>
                <select value={profileForm.timezone} onChange={e => setProfileForm(p => ({ ...p, timezone: e.target.value }))} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
                  {["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Locale</label>
                <select value={profileForm.locale} onChange={e => setProfileForm(p => ({ ...p, locale: e.target.value }))} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
                  {["en-US", "en-GB", "de-DE", "fr-FR", "es-ES", "ja-JP", "zh-CN", "hi-IN"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <Inline gap="gap-[12px]" className="pt-[8px]">
              <Button onClick={handleSaveProfile} variant="primary"><Save size={14} className="mr-1" /> Save Changes</Button>
              <Button onClick={() => { setEditingProfile(false); setProfileForm({ name: "", email: "", timezone: "", locale: "" }); }} variant="secondary">Cancel</Button>
            </Inline>
          </Stack>
        ) : (
          <Inline gap="gap-[12px]" className="flex-wrap pt-[24px] border-t border-stone-200">
            <Button onClick={() => { setProfileForm({ name: currentUser.name || "", email: currentUser.email || "", timezone: currentUser.timezone || "UTC", locale: currentUser.locale || "en-US" }); setEditingProfile(true); }} variant="primary">
              <Edit size={14} className="mr-1" /> Edit Profile
            </Button>
            <Button onClick={() => { setShowPasswordChange(true); setPasswordForm({ current_password: "", new_password: "", confirm: "" }); }} variant="secondary">
              <Lock size={14} className="mr-1" /> Password
            </Button>
            <Button onClick={currentUser.totp_enabled ? handleDisable2FA : handleSetup2FA} variant="secondary">
              <Shield size={14} className="mr-1" /> {currentUser.totp_enabled ? "Disable 2FA" : "Setup 2FA"}
            </Button>
            <Button onClick={() => { fetchSessions(); setShowSessions(!showSessions); }} variant={showSessions ? "primary" : "secondary"}>
              <Monitor size={14} className="mr-1" /> Sessions
            </Button>
            <Button onClick={() => { fetchConnectedAccounts(); setShowConnectedAccounts(!showConnectedAccounts); }} variant={showConnectedAccounts ? "primary" : "secondary"}>
              <Link size={14} className="mr-1" /> Connected Accounts
            </Button>
            <Button onClick={handleExportData} variant="secondary">
              <Download size={14} className="mr-1" /> Export Data
            </Button>
            {currentUser.totp_enabled && (
              <Button onClick={handleFetchRecoveryCodes} variant="secondary">
                <Key size={14} className="mr-1" /> Recovery Codes
              </Button>
            )}
            <Button onClick={() => setShowDeleteConfirm(true)} variant="secondary" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500 ml-auto">
              <Trash2 size={14} className="mr-1" /> Delete Account
            </Button>
          </Inline>
        )}
      </Card>

      {show2FA && totpData && (
        <Card padding="p-[32px]" className="mb-[24px] bg-washi-white animate-in slide-in-from-top-2">
          <h4 className="text-[16px] font-heading text-sumi-900 mb-[24px] m-0">Set Up Two-Factor Authentication</h4>
          {totpData.otpauth_url && (
            <div className="mb-[24px]">
              <div className="text-[13px] text-stone-500 mb-[16px]">Scan this QR code with your authenticator app:</div>
              <div className="p-[24px] bg-linen-100 border border-stone-200 rounded-[8px] text-center font-mono text-[12px] text-stone-500 break-all leading-relaxed shadow-inner">
                {totpData.otpauth_url}
              </div>
            </div>
          )}
          <Inline gap="gap-[12px]" items="items-center">
            <Input type="text" placeholder="Enter 6-digit code" value={totpCode} onChange={e => setTotpCode(e.target.value)} />
            <Button onClick={handleVerify2FA} variant="primary"><Check size={14} className="mr-1" /> Verify</Button>
            <Button onClick={() => { setShow2FA(false); setTotpData(null); setTotpCode(""); }} variant="secondary">Cancel</Button>
          </Inline>
        </Card>
      )}

      {showRecoveryCodes && (
        <Card padding="p-[32px]" className="mb-[24px] bg-washi-white animate-in slide-in-from-top-2">
          <Inline justify="justify-between" items="items-center" className="mb-[24px]">
            <h4 className="text-[16px] font-heading text-sumi-900 m-0">Recovery Codes</h4>
            <button onClick={() => { setShowRecoveryCodes(false); setRecoveryCodes([]); }} className="bg-transparent border-none text-stone-400 hover:text-sumi-900 cursor-pointer p-0 outline-none"><X size={16} /></button>
          </Inline>
          <p className="text-[12px] text-clay-500 mb-[24px] font-bold uppercase tracking-wide">Store these safely — they won't be shown again.</p>
          <div className="font-mono text-[14px] bg-linen-100 border border-stone-200 p-[24px] rounded-[8px] leading-loose text-sumi-900 shadow-inner">
            {recoveryCodes.length === 0 ? (
              <span className="text-stone-400 italic">No codes available.</span>
            ) : recoveryCodes.map((code, i) => (
              <div key={i}>{code}</div>
            ))}
          </div>
          {recoveryCodes.length > 0 && (
            <div className="mt-[24px]">
              <Button onClick={() => { copyToClipboard(recoveryCodes.join("\n")); toast("Copied!", "success"); }} variant="secondary">
                <Copy size={14} className="mr-1" /> Copy All
              </Button>
            </div>
          )}
        </Card>
      )}

      {showSessions && (
        <Card padding="p-[32px]" className="mb-[24px] bg-washi-white animate-in slide-in-from-top-2">
          <Inline justify="justify-between" items="items-center" className="mb-[24px]">
            <h4 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase m-0">Active Sessions</h4>
            <button onClick={() => setShowSessions(false)} className="bg-transparent border-none text-stone-400 hover:text-sumi-900 cursor-pointer p-0 outline-none"><X size={16} /></button>
          </Inline>
          <Stack gap="gap-[0]">
            {sessions.length === 0 ? (
              <p className="text-[13px] text-stone-400 italic m-0">No active sessions found.</p>
            ) : sessions.map((s, i) => (
              <Inline key={s.id} items="items-center" gap="gap-[16px]" className={`py-[16px] ${i !== sessions.length - 1 ? "border-b border-stone-200" : ""}`}>
                <div className="w-[32px] h-[32px] rounded-[4px] bg-stone-100 flex items-center justify-center shrink-0">
                  <Smartphone size={16} className="text-stone-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-sumi-900 mb-[4px]">{s.device || s.user_agent || "Unknown device"}</div>
                  <div className="text-[12px] text-stone-400 font-mono tracking-wide">{s.ip_address || ""} · Last active: {s.last_active_at ? new Date(s.last_active_at).toLocaleDateString() : "now"}</div>
                </div>
                <Button onClick={() => handleRevokeSession(s.id)} variant="secondary" size="icon" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500"><LogOut size={14} /></Button>
              </Inline>
            ))}
          </Stack>
        </Card>
      )}

      {showConnectedAccounts && (
        <Card padding="p-[32px]" className="mb-[24px] bg-washi-white animate-in slide-in-from-top-2">
          <Inline justify="justify-between" items="items-center" className="mb-[24px]">
            <h4 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase m-0">Connected Accounts</h4>
            <button onClick={() => setShowConnectedAccounts(false)} className="bg-transparent border-none text-stone-400 hover:text-sumi-900 cursor-pointer p-0 outline-none"><X size={16} /></button>
          </Inline>
          <Stack gap="gap-[0]">
            {connectedAccounts.length === 0 ? (
              <p className="text-[13px] text-stone-400 italic m-0">No connected accounts. Link Google, GitHub, or Slack from Connected Apps.</p>
            ) : connectedAccounts.map((a, i) => (
              <Inline key={a.provider || a.id} items="items-center" gap="gap-[16px]" className={`py-[16px] ${i !== connectedAccounts.length - 1 ? "border-b border-stone-200" : ""}`}>
                <div className="w-[32px] h-[32px] rounded-[4px] bg-stone-100 flex items-center justify-center font-heading font-bold text-[14px] text-stone-500 shrink-0 uppercase">
                  {(a.provider || "?")[0]}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-sumi-900 mb-[4px] capitalize">{a.provider}</div>
                  <div className="text-[12px] text-stone-400 font-mono tracking-wide">{a.email || a.name || ""}</div>
                </div>
                <span className="px-[8px] py-[4px] rounded-[2px] bg-moss-600/10 text-moss-600 border border-moss-600/20 text-[10px] font-bold tracking-wide uppercase">Connected</span>
              </Inline>
            ))}
          </Stack>
        </Card>
      )}

      {showPasswordChange && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setShowPasswordChange(false)}>
          <Card padding="p-[32px]" className="w-full max-w-[480px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[20px] font-heading text-sumi-900 mb-[24px] m-0">Change Password</h3>
            <Stack gap="gap-[16px]">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Current Password</label>
                <Input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">New Password</label>
                <Input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Confirm New Password</label>
                <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <Inline gap="gap-[12px]" className="mt-[8px]">
                <Button onClick={handleChangePassword} variant="primary"><Check size={14} className="mr-1" /> Update Password</Button>
                <Button onClick={() => { setShowPasswordChange(false); setPasswordForm({ current_password: "", new_password: "", confirm: "" }); }} variant="secondary">Cancel</Button>
              </Inline>
            </Stack>
          </Card>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setShowDeleteConfirm(false)}>
          <Card padding="p-[32px]" className="w-full max-w-[480px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[20px] font-heading text-clay-500 mb-[16px] m-0">Delete Account</h3>
            <p className="text-[14px] text-stone-500 leading-relaxed mb-[32px]">This action is irreversible. All your data will be permanently deleted. Are you absolutely sure?</p>
            <Inline gap="gap-[12px]">
              <Button onClick={handleDeleteAccount} variant="primary" className="bg-clay-500 hover:bg-clay-600 text-white">Delete My Account</Button>
              <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary">Cancel</Button>
            </Inline>
          </Card>
        </div>
      )}
    </div>
  );
}
