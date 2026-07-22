import { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import {
  Plus, Key, Copy, Edit, Zap, Ban, Trash2, FileText, X, Check,
  AlertCircle, Eye, EyeOff
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Inline, Stack } from "../../components/layout";

export default function ApiKeysTab() {
  const { toast } = useToast();

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
    <div className="animate-in fade-in">
      {newlyCreatedKey && (
        <Card padding="p-[24px]" className="mb-[24px] bg-moss-600/5 border-moss-600/20">
          <h3 className="text-[11px] font-bold text-moss-600 tracking-widest uppercase mb-[12px] m-0">Key created — copy it now</h3>
          <Inline gap="gap-[12px]" items="items-center" className="mb-[12px]">
            <code className="flex-1 font-mono text-[13px] bg-washi-white border border-stone-200 p-[12px] rounded-[4px] text-sumi-900 break-all shadow-inner">
              {newlyCreatedKey}
            </code>
            <Button onClick={() => { copyToClipboard(newlyCreatedKey); toast("Copied!", "success"); }} variant="secondary" size="icon" title="Copy">
              <Copy size={16} />
            </Button>
          </Inline>
          <p className="text-[11px] text-clay-500 font-bold uppercase tracking-wide m-0 mb-[16px]">This secret will only be shown once.</p>
          <Button onClick={() => setNewlyCreatedKey(null)} variant="secondary" size="sm">Dismiss</Button>
        </Card>
      )}

      <div className="mb-[24px]">
        <Button onClick={() => { setShowNewKeyForm(!showNewKeyForm); setShowKeyPermissions(false); }} variant={showNewKeyForm ? "secondary" : "primary"}>
          <Plus size={14} className={`mr-1 transition-transform ${showNewKeyForm ? "rotate-45" : ""}`} /> {showNewKeyForm ? "Cancel" : "New API Key"}
        </Button>
      </div>

      {showNewKeyForm && (
        <Card padding="p-[32px]" className="mb-[32px] bg-washi-white animate-in slide-in-from-top-2">
          <h3 className="text-[16px] font-heading text-sumi-900 mb-[24px] m-0">Create API Key</h3>
          <div className="mb-[24px]">
            <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Key Name</label>
            <Input type="text" placeholder="e.g., production, dev" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} autoFocus />
          </div>
          <div className="mb-[32px]">
            <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[12px]">Permissions</label>
            <Inline gap="gap-[24px]" className="flex-wrap">
              {[
                { key: "read", label: "Read" },
                { key: "write", label: "Write" },
                { key: "admin", label: "Admin" },
              ].map(p => (
                <label key={p.key} className="flex items-center gap-[8px] text-[13px] text-sumi-900 cursor-pointer group">
                  <div className={`w-[16px] h-[16px] rounded-[4px] border flex items-center justify-center transition-colors ${keyPermissions[p.key] ? "bg-moss-600 border-moss-600 text-white" : "border-stone-300 bg-washi-white group-hover:border-stone-400"}`}>
                    {keyPermissions[p.key] && <Check size={10} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={keyPermissions[p.key]} onChange={e => setKeyPermissions(k => ({ ...k, [p.key]: e.target.checked }))} />
                  {p.label}
                </label>
              ))}
            </Inline>
          </div>
          <Button onClick={handleCreateApiKey} variant="primary"><Plus size={14} className="mr-1" /> Create Key</Button>
        </Card>
      )}

      {apiKeys.length === 0 ? (
        <div className="text-center py-[64px] px-[24px] text-stone-400 border border-dashed border-stone-200 rounded-[8px] bg-washi-white/50">
          <Key size={32} className="mx-auto mb-[16px] opacity-30" />
          <div className="text-[16px] font-medium text-sumi-900 mb-[8px]">No API keys yet</div>
          <div className="text-[13px]">Create an API key to access FounDesk programmatically.</div>
        </div>
      ) : (
        <Card padding="p-0" className="overflow-x-auto bg-washi-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                {["Name", "Prefix", "Permissions", "Created", "Last Used", "Status", "Actions"].map(h => (
                  <th key={h} className="py-[12px] px-[16px] text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {apiKeys.map(key => (
                <tr key={key.id} className="hover:bg-linen-100/50 transition-colors">
                  <td className="py-[16px] px-[16px] font-medium text-sumi-900 text-[14px]">
                    {editingKeyId === key.id ? (
                      <Input type="text" value={editingKeyName} onChange={e => setEditingKeyName(e.target.value)}
                        onBlur={() => handleKeyRename(key.id)} onKeyDown={e => { if (e.key === "Enter") handleKeyRename(key.id); }}
                        autoFocus className="w-[160px] h-[32px] text-[13px]" />
                    ) : (
                      key.name
                    )}
                  </td>
                  <td className="py-[16px] px-[16px] font-mono text-[13px] text-stone-400 tracking-wide">{key.prefix || (key.key ? key.key.substring(0, 8) + "..." : "—")}</td>
                  <td className="py-[16px] px-[16px]">
                    <Inline gap="gap-[6px]" className="flex-wrap">
                      {(key.permissions ? Object.entries(key.permissions).filter(([, v]) => v).map(([k]) => k) : ["read"]).map(p => (
                        <span key={p} className={`px-[6px] py-[2px] rounded-[2px] border text-[9px] font-bold tracking-widest uppercase ${p === "admin" ? "bg-clay-500/10 text-clay-500 border-clay-500/20" : p === "write" ? "bg-amber-600/10 text-amber-600 border-amber-600/20" : "bg-indigo-ink/10 text-indigo-ink border-indigo-ink/20"}`}>
                          {p}
                        </span>
                      ))}
                    </Inline>
                  </td>
                  <td className="py-[16px] px-[16px] text-[13px] text-stone-500 font-mono tracking-wide">{key.created_at ? new Date(key.created_at).toLocaleDateString() : "—"}</td>
                  <td className="py-[16px] px-[16px] text-[13px] text-stone-500 font-mono tracking-wide">{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}</td>
                  <td className="py-[16px] px-[16px]">
                    <span className={`px-[8px] py-[4px] rounded-[2px] border text-[10px] font-bold tracking-widest uppercase ${key.is_active !== false ? "bg-moss-600/10 text-moss-600 border-moss-600/20" : "bg-stone-100 text-stone-500 border-stone-200"}`}>
                      {key.is_active !== false ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="py-[16px] px-[16px]">
                    <Inline gap="gap-[4px]" className="flex-wrap">
                      <Button onClick={() => { setEditingKeyId(key.id); setEditingKeyName(key.name); }} variant="secondary" size="icon" title="Edit"><Edit size={14} /></Button>
                      {key.is_active !== false && (
                        <>
                          <Button onClick={() => handleTestKey(key.id)} variant="secondary" size="icon" title="Test"><Zap size={14} /></Button>
                          <Button onClick={() => handleRevokeKey(key.id)} variant="secondary" size="icon" title="Revoke" className="text-amber-600 border-amber-600/30 hover:bg-amber-600/10 hover:text-amber-600"><Ban size={14} /></Button>
                        </>
                      )}
                      <Button onClick={() => { setHardDeleteKeyId(key.id); setShowHardDeleteModal(true); }} variant="secondary" size="icon" title="Delete Permanently" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500"><Trash2 size={14} /></Button>
                      <Button onClick={() => { setAuditLogKeyId(auditLogKeyId === key.id ? null : key.id); if (auditLogKeyId !== key.id) handleFetchAuditLog(key.id); else setAuditLogs([]); }} variant={auditLogKeyId === key.id ? "primary" : "secondary"} size="icon" title="Audit Log">
                        <FileText size={14} />
                      </Button>
                    </Inline>
                    {auditLogKeyId === key.id && (
                      <div className="mt-[16px] bg-linen-100 border border-stone-200 rounded-[8px] p-[16px] animate-in slide-in-from-top-1">
                        <h4 className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-[12px] m-0">Audit Log</h4>
                        {auditLogs.length === 0 ? (
                          <div className="text-[12px] text-stone-400 italic">No audit entries.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-stone-200">
                                  {["Action", "Details", "IP", "Date"].map(h => (
                                    <th key={h} className="py-[8px] px-[12px] text-[9px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200">
                                {auditLogs.map((log, i) => (
                                  <tr key={log.id || i}>
                                    <td className="py-[8px] px-[12px] text-[12px] font-medium text-sumi-900">{log.action || "—"}</td>
                                    <td className="py-[8px] px-[12px] text-[12px] text-stone-500">{log.details || "—"}</td>
                                    <td className="py-[8px] px-[12px] text-[12px] font-mono text-stone-400 tracking-wide">{log.ip_address || "—"}</td>
                                    <td className="py-[8px] px-[12px] text-[12px] font-mono text-stone-400 tracking-wide">{log.created_at ? new Date(log.created_at).toLocaleDateString() : log.date ? new Date(log.date).toLocaleDateString() : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showHardDeleteModal && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => { setShowHardDeleteModal(false); setHardDeleteKeyId(null); }}>
          <Card padding="p-[32px]" className="w-full max-w-[480px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[20px] font-heading text-clay-500 mb-[16px] m-0">Delete API Key</h3>
            <p className="text-[14px] text-stone-500 leading-relaxed mb-[32px]">Delete this key permanently? This action cannot be undone and any integrations using it will immediately break.</p>
            <Inline gap="gap-[12px]">
              <Button onClick={handleHardDeleteKey} variant="primary" className="bg-clay-500 hover:bg-clay-600 text-white border-none">Delete Permanently</Button>
              <Button onClick={() => { setShowHardDeleteModal(false); setHardDeleteKeyId(null); }} variant="secondary">Cancel</Button>
            </Inline>
          </Card>
        </div>
      )}
    </div>
  );
}
