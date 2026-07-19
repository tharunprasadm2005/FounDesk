import { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { SETTINGS_STYLE as s } from "./SettingsConstants";
import {
  Plus, Key, Copy, Edit, Zap, Ban, Trash2, FileText, X, Check,
  AlertCircle, Eye, EyeOff
} from "lucide-react";

export default function ApiKeysTab() {
  const toast = useToast();

  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [keyPermissions, setKeyPermissions] = useState({ read: true, write: false, admin: false });
  const [showKeyPermissions, setShowKeyPermissions] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState(null);
  const [editingKeyName, setEditingKeyName] = useState("");
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [hardDeleteKeyId, setHardDeleteKeyId] = useState(null);
  const [auditLogKeyId, setAuditLogKeyId] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const copyToClipboard = (text) => { navigator.clipboard?.writeText(text); };

  const fetchApiKeys = async () => {
    try {
      const res = await api.get("/api/developer/api-keys");
      setApiKeys(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("[Settings] Failed to fetch API keys:", err); }
  };

  useEffect(() => { fetchApiKeys(); }, []);

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await api.post("/api/developer/api-keys", { name: newKeyName.trim(), permissions: keyPermissions });
      setNewlyCreatedKey(res.data?.key || res.data?.api_key || "Key created");
      setNewKeyName("");
      setShowNewKeyForm(false);
      setKeyPermissions({ read: true, write: false, admin: false });
      fetchApiKeys();
    } catch { toast("Failed to create API key.", "error"); }
  };

  const handleRevokeKey = async (id) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try { await api.delete(`/api/developer/api-keys/${id}`); fetchApiKeys(); } catch { toast("Failed to revoke key.", "error"); }
  };

  const handleKeyRename = async (id) => {
    if (!editingKeyName.trim()) return;
    try { await api.put(`/api/developer/api-keys/${id}`, { name: editingKeyName }); setEditingKeyId(null); setEditingKeyName(""); fetchApiKeys(); } catch { toast("Failed to rename key.", "error"); }
  };

  const handleHardDeleteKey = async () => {
    try { await api.delete(`/api/developer/api-keys/${hardDeleteKeyId}/hard`, { data: { confirm: true } }); setShowHardDeleteModal(false); setHardDeleteKeyId(null); fetchApiKeys(); } catch { toast("Failed to permanently delete key.", "error"); }
  };

  const handleFetchAuditLog = async (id) => {
    try { const res = await api.get(`/api/developer/api-keys/${id}/audit`); setAuditLogs(Array.isArray(res.data) ? res.data : []); setAuditLogKeyId(id); } catch { toast("Failed to fetch audit log.", "error"); }
  };

  const handleTestKey = async (id) => {
    try { await api.post(`/api/developer/api-keys/${id}/test`); toast("Key test successful.", "success"); } catch { toast("Key test failed.", "error"); }
  };

  return (
    <div>
      {newlyCreatedKey && (
        <div className="card-glass" style={{ padding: "16px", border: "1px solid rgba(62,207,142,0.2)", backgroundColor: "rgba(62,207,142,0.05)", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "#4ade80", marginBottom: "4px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Key created — copy it now</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <code style={{ flex: 1, fontSize: "11px", color: "var(--sand)", backgroundColor: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "4px", wordBreak: "break-all" }}>{newlyCreatedKey}</code>
            <button onClick={() => { copyToClipboard(newlyCreatedKey); toast("Copied!", "success"); }} className="btn-action-secondary" title="Copy"><Copy size={14} /></button>
          </div>
          <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "6px" }}>This secret will only be shown once.</div>
          <button onClick={() => setNewlyCreatedKey(null)} className="btn-action-secondary" style={{ marginTop: "8px", fontSize: "10px", padding: "4px 10px" }}>Dismiss</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => { setShowNewKeyForm(!showNewKeyForm); setShowKeyPermissions(false); }} className="btn-ember">
          <Plus size={14} /> {showNewKeyForm ? "Cancel" : "New API Key"}
        </button>
      </div>

      {showNewKeyForm && (
        <div className="card-glass" style={{ padding: "20px", marginBottom: "16px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--sand)", margin: "0 0 12px" }}>Create API Key</h4>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
            <input type="text" placeholder="Key name (e.g., production, dev)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="plan-input" style={{ flex: 1 }} autoFocus />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--graphite)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Permissions</div>
            <div style={{ display: "flex", gap: "16px" }}>
              {[
                { key: "read", label: "Read" },
                { key: "write", label: "Write" },
                { key: "admin", label: "Admin" },
              ].map(p => (
                <label key={p.key} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--sand)", cursor: "pointer" }}>
                  <input type="checkbox" checked={keyPermissions[p.key]} onChange={e => setKeyPermissions(k => ({ ...k, [p.key]: e.target.checked }))} style={{ accentColor: "var(--brand-orange)" }} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleCreateApiKey} className="btn-ember"><Plus size={14} /> Create Key</button>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--graphite)" }}>
          <Key size={32} style={{ marginBottom: "12px", opacity: 0.3 }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--sand)", marginBottom: "4px" }}>No API keys yet</div>
          <div style={{ fontSize: "12px" }}>Create an API key to access FounDesk programmatically.</div>
        </div>
      ) : (
        <div className="card-glass" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                {["Name", "Prefix", "Permissions", "Created", "Last Used", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "var(--graphite)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiKeys.map(key => (
                <tr key={key.id} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--sand)" }}>
                    {editingKeyId === key.id ? (
                      <input type="text" value={editingKeyName} onChange={e => setEditingKeyName(e.target.value)}
                        onBlur={() => handleKeyRename(key.id)} onKeyDown={e => { if (e.key === "Enter") handleKeyRename(key.id); }}
                        className="plan-input" style={{ width: "120px", fontSize: "11px", padding: "4px 6px" }} autoFocus />
                    ) : (
                      key.name
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "11px", color: "var(--graphite)" }}>{key.prefix || (key.key ? key.key.substring(0, 8) + "..." : "—")}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                      {(key.permissions ? Object.entries(key.permissions).filter(([, v]) => v).map(([k]) => k) : ["read"]).map(p => (
                        <span key={p} className="tag" style={{ fontSize: "9px", padding: "1px 5px", backgroundColor: p === "admin" ? "#ef444422" : p === "write" ? "#f59e0b22" : "#3b82f622", color: p === "admin" ? "#ef4444" : p === "write" ? "#f59e0b" : "#3b82f6", border: "1px solid " + (p === "admin" ? "#ef444433" : p === "write" ? "#f59e0b33" : "#3b82f633") }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--graphite)" }}>{key.created_at ? new Date(key.created_at).toLocaleDateString() : "—"}</td>
                  <td style={{ padding: "10px 14px", color: "var(--graphite)" }}>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className="badge" style={{ backgroundColor: key.is_active !== false ? "rgba(62,207,142,0.12)" : "rgba(107,107,111,0.12)", color: key.is_active !== false ? "#4ade80" : "var(--graphite)" }}>
                      {key.is_active !== false ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <button onClick={() => { setEditingKeyId(key.id); setEditingKeyName(key.name); }} className="btn-action-secondary" title="Edit"><Edit size={12} /></button>
                      {key.is_active !== false && (
                        <>
                          <button onClick={() => handleTestKey(key.id)} className="btn-action-secondary" title="Test"><Zap size={12} /></button>
                          <button onClick={() => handleRevokeKey(key.id)} className="btn-destructive-outline-sm" title="Revoke"><Ban size={12} /></button>
                        </>
                      )}
                      <button onClick={() => { setHardDeleteKeyId(key.id); setShowHardDeleteModal(true); }} className="btn-destructive-outline-sm" title="Delete Permanently"><Trash2 size={12} /></button>
                      <button onClick={() => { setAuditLogKeyId(auditLogKeyId === key.id ? null : key.id); if (auditLogKeyId !== key.id) handleFetchAuditLog(key.id); else setAuditLogs([]); }} className="btn-action-secondary" title="Audit Log">
                        <FileText size={12} />
                      </button>
                    </div>
                    {auditLogKeyId === key.id && (
                      <div style={{ marginTop: "8px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "8px" }}>
                        <div style={{ fontSize: "10px", color: "var(--graphite)", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>Audit Log</div>
                        {auditLogs.length === 0 ? (
                          <div style={{ fontSize: "10px", color: "var(--graphite)" }}>No audit entries.</div>
                        ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                                {["Action", "Details", "IP", "Date"].map(h => (
                                  <th key={h} style={{ textAlign: "left", padding: "4px 6px", color: "var(--graphite)", fontWeight: 600, fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {auditLogs.map((log, i) => (
                                <tr key={log.id || i} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                                  <td style={{ padding: "4px 6px", color: "var(--sand)" }}>{log.action || "—"}</td>
                                  <td style={{ padding: "4px 6px", color: "var(--graphite)" }}>{log.details || "—"}</td>
                                  <td style={{ padding: "4px 6px", color: "var(--graphite)" }}>{log.ip_address || "—"}</td>
                                  <td style={{ padding: "4px 6px", color: "var(--graphite)" }}>{log.created_at ? new Date(log.created_at).toLocaleDateString() : log.date ? new Date(log.date).toLocaleDateString() : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHardDeleteModal && (
        <div style={s.overlay} onClick={() => { setShowHardDeleteModal(false); setHardDeleteKeyId(null); }}>
          <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "460px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: "#ef4444" }}>Delete API Key Permanently</h3>
            <p style={{ fontSize: "13px", color: "var(--graphite)", margin: "0 0 16px" }}>Delete this key permanently? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleHardDeleteKey} className="btn-destructive-outline">Delete Permanently</button>
              <button onClick={() => { setShowHardDeleteModal(false); setHardDeleteKeyId(null); }} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
