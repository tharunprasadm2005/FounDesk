import { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { WORKSPACE_COLORS, WORKSPACE_STAGES, NOTIFICATION_TYPES, NOTIF_ICONS, SETTINGS_STYLE as s } from "./SettingsConstants";
import {
  Globe, Users, Puzzle, Activity, Plus, Check, Copy, ArrowRight, Archive, RefreshCw,
  Trash2, X, Save, Bell, ChevronRight, Search, FileText, Mail, Moon, Send, Tag
} from "lucide-react";

export default function WorkspacesTab({ workspaces, currentWorkspace, onWorkspacesChange, integrations }) {
  const toast = useToast();

  const [showCreateWS, setShowCreateWS] = useState(false);
  const [wsForm, setWsForm] = useState({ name: "", description: "", stage: "Think", color: "#ff751f", logo_url: "", website: "", industry: "", size: "" });
  const [wsActivity, setWsActivity] = useState([]);
  const [wsTags, setWsTags] = useState({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferWs, setTransferWs] = useState(null);
  const [transferNewOwner, setTransferNewOwner] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState(new Set());
  const [newTagInput, setNewTagInput] = useState("");
  const [wsDrawer, setWsDrawer] = useState(null);
  const [wsDrawerForm, setWsDrawerForm] = useState({
    name: "", description: "", stage: "Build", color: "#ff751f",
    logo_url: "", website: "", industry: "", size: ""
  });
  const [wsNotifPrefs, setWsNotifPrefs] = useState({});

  const teamMembers = currentWorkspace?.members?.filter(m => m.status === "active") || [];

  const fetchWorkspaceActivity = async (wsId) => {
    try {
      const res = await api.get(`/api/workspaces/${wsId}/activity`);
      setWsActivity(Array.isArray(res.data) ? res.data.slice(0, 10) : []);
    } catch (err) { console.error("[Settings] Failed to fetch workspace activity:", err); }
  };

  useEffect(() => {
    if (currentWorkspace?.id) fetchWorkspaceActivity(currentWorkspace.id);
    else setWsActivity([]);
  }, [currentWorkspace?.id]);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!wsForm.name.trim()) return;
    try {
      const res = await api.post("/api/workspaces", wsForm);
      setShowCreateWS(false);
      setWsForm({ name: "", description: "", stage: "Build" });
      onWorkspacesChange();
      if (res.data?.id) localStorage.setItem("workspaceId", res.data.id.toString());
    } catch { toast("Failed to create workspace.", "error"); }
  };

  const handleUpdateWorkspace = async (wsId, data) => {
    try {
      await api.put(`/api/workspaces/${wsId}`, data);
      onWorkspacesChange();
    } catch { toast("Failed to update workspace.", "error"); }
  };

  const handleDeleteWorkspace = async (wsId) => {
    if (!confirm("Delete this workspace permanently? This cannot be undone.")) return;
    try { await api.delete(`/api/workspaces/${wsId}`); onWorkspacesChange(); } catch { toast("Failed to delete workspace.", "error"); }
  };

  const handleDuplicateWorkspace = async (wsId) => {
    try { await api.post(`/api/workspaces/${wsId}/duplicate`); onWorkspacesChange(); } catch { toast("Failed to duplicate workspace.", "error"); }
  };

  const handleTransferWorkspace = async () => {
    if (!transferWs || !transferNewOwner) return;
    try {
      await api.post(`/api/workspaces/${transferWs.id}/transfer`, { new_owner_id: transferNewOwner });
      setShowTransferModal(false);
      setTransferWs(null);
      setTransferNewOwner("");
      onWorkspacesChange();
    } catch { toast("Failed to transfer workspace.", "error"); }
  };

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedWorkspaceIds);
    if (!ids.length) return;
    try {
      await api.post("/api/workspaces/bulk-archive", { workspace_ids: ids });
      setSelectedWorkspaceIds(new Set());
      setSelectMode(false);
      onWorkspacesChange();
    } catch { toast("Failed to archive workspaces.", "error"); }
  };

  const handleRestoreWorkspace = async (wsId) => {
    try { await api.post(`/api/workspaces/${wsId}/restore`); onWorkspacesChange(); } catch { toast("Failed to restore workspace.", "error"); }
  };

  const handleAddTag = async (wsId) => {
    if (!newTagInput.trim()) return;
    const current = wsTags[wsId] || [];
    const updated = [...current, newTagInput.trim()];
    setWsTags(p => ({ ...p, [wsId]: updated }));
    setNewTagInput("");
  };

  const handleRemoveTag = (wsId, tagIndex) => {
    const current = wsTags[wsId] || [];
    const updated = current.filter((_, i) => i !== tagIndex);
    setWsTags(p => ({ ...p, [wsId]: updated }));
  };

  const handleKeyDown = async (e, wsId) => {
    if (e.key === "Enter") { e.preventDefault(); await handleAddTag(wsId); }
  };

  const openWsDrawer = async (ws) => {
    setWsDrawer(ws);
    setWsDrawerForm({
      name: ws.name || "",
      description: ws.description || "",
      stage: ws.stage || "Build",
      color: ws.color || "#ff751f",
      logo_url: ws.logo_url || "",
      website: ws.website || "",
      industry: ws.industry || "",
      size: ws.size || "",
    });
    try {
      const res = await api.get(`/api/workspaces/${ws.id}/notifications`);
      const arr = Array.isArray(res.data) ? res.data : [];
      const map = {};
      arr.forEach(n => { map[n.notification_type] = n; });
      setWsNotifPrefs(map);
    } catch { setWsNotifPrefs({}); }
  };

  const handleWsDrawerSave = async () => {
    if (!wsDrawer) return;
    try {
      await api.put(`/api/workspaces/${wsDrawer.id}`, wsDrawerForm);
      onWorkspacesChange();
      setWsDrawer(null);
    } catch { toast("Failed to update workspace.", "error"); }
  };

  const handleWsNotifToggle = async (ntype, enabled) => {
    try {
      await api.put(`/api/workspaces/${wsDrawer.id}/notifications`, { [ntype]: { enabled } });
      setWsNotifPrefs(p => ({ ...p, [ntype]: { ...(p[ntype] || {}), enabled } }));
    } catch { toast("Failed to update notification preference.", "error"); }
  };

  const handleMarkAllRead = async (wsId) => {
    try { await api.post(`/api/workspaces/${wsId}/notifications/mark-all-read`); toast("Marked all as read.", "success"); } catch { toast("Failed to mark all as read.", "error"); }
  };

  const stats = {
    total: workspaces.length,
    members: workspaces.reduce((s, w) => s + (w.members?.filter(m => m.status === "active")?.length || 0), 0),
    integrations: workspaces.reduce((s, w) => s + (w.integration_count || 0), 0),
  };
  const ws = currentWorkspace;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Workspaces", value: stats.total, icon: Globe },
          { label: "Members", value: stats.members, icon: Users },
          { label: "Integrations", value: stats.integrations || "—", icon: Puzzle },
          { label: "Health", value: ws?.active_health || "Good", icon: Activity },
        ].map(stat => (
          <div key={stat.label} className="card-glass" style={{ padding: "16px", textAlign: "center" }}>
            <stat.icon size={16} style={{ color: "var(--graphite)", marginBottom: "6px" }} />
            <div className="card-hero-value" style={{ color: "var(--sand)", marginTop: 0, fontSize: "20px" }}>{stat.value}</div>
            <div className="card-hero-support" style={{ textTransform: "uppercase", fontSize: "9px", letterSpacing: "1.5px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => setShowCreateWS(true)} className="btn-ember"><Plus size={14} /> Create Workspace</button>
        <button onClick={() => { setSelectMode(!selectMode); setSelectedWorkspaceIds(new Set()); }} className={`btn-action-secondary ${selectMode ? "active" : ""}`}>
          <Check size={14} /> {selectMode ? "Exit Select Mode" : "Select Mode"}
        </button>
      </div>

      {workspaces.map(ws => (
        <div key={ws.id} className="card-glass"
          style={{ padding: "16px", marginBottom: "8px", cursor: "pointer", transition: "border-color 0.15s", border: "1px solid transparent" }}
          onClick={() => { if (!selectMode) openWsDrawer(ws); }}
          onMouseEnter={e => { if (wsDrawer?.id !== ws.id) e.currentTarget.style.borderColor = "rgba(255,90,0,0.2)"; }}
          onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {selectMode && (
              <input type="checkbox" checked={selectedWorkspaceIds.has(ws.id)}
                onChange={e => { const s = new Set(selectedWorkspaceIds); if (e.target.checked) s.add(ws.id); else s.delete(ws.id); setSelectedWorkspaceIds(s); }}
                style={{ accentColor: "var(--brand-orange)", width: "16px", height: "16px" }} onClick={e => e.stopPropagation()} />
            )}
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: ws.color || "#ff751f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "16px", flexShrink: 0 }}>
              {(ws.name || "W")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--sand)" }}>{ws.name}</span>
                <span className="tag tag-ember" style={{ fontSize: "9px" }}>{ws.role || "member"}</span>
                {ws.is_archived && <span className="badge badge-neutral">ARCHIVED</span>}
              </div>
              <div style={{ fontSize: "11px", color: "var(--graphite)", marginTop: "2px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <span>{ws.stage} stage</span>
                <span>{ws.members?.filter(m => m.status === "active")?.length || 0} members</span>
                {ws.active_phase && <span>Phase: {ws.active_phase}</span>}
                {ws.created_at && <span>Created {new Date(ws.created_at).toLocaleDateString()}</span>}
              </div>
              {(wsTags[ws.id] || []).length > 0 && (
                <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                  {(wsTags[ws.id] || []).map((tag, i) => (
                    <span key={i} className="tag" style={{ fontSize: "9px", padding: "1px 6px" }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "4px" }} onClick={e => e.stopPropagation()}>
              {ws.is_archived ? (
                <button onClick={() => handleRestoreWorkspace(ws.id)} className="btn-action-secondary" title="Restore"><RefreshCw size={14} /></button>
              ) : (
                <>
                  <button onClick={() => handleUpdateWorkspace(ws.id, { is_archived: !ws.is_archived })} className="btn-action-secondary" title="Archive"><Archive size={14} /></button>
                  <button onClick={() => { handleDuplicateWorkspace(ws.id); }} className="btn-action-secondary" title="Duplicate"><Copy size={14} /></button>
                  <button onClick={() => { setTransferWs(ws); setShowTransferModal(true); }} className="btn-action-secondary" title="Transfer"><ArrowRight size={14} /></button>
                </>
              )}
              <button onClick={() => handleDeleteWorkspace(ws.id)} className="btn-destructive-outline-sm" title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      ))}

      {selectMode && selectedWorkspaceIds.size > 0 && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 999, padding: "12px 20px", borderRadius: "12px", backgroundColor: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", border: "1px solid rgba(107,107,111,0.12)", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
          <span style={{ fontSize: "12px", color: "var(--sand)", fontWeight: 600 }}>{selectedWorkspaceIds.size} selected</span>
          <button onClick={handleBulkArchive} className="btn-destructive-outline-sm"><Archive size={14} /> Archive Selected ({selectedWorkspaceIds.size})</button>
          <button onClick={() => setSelectedWorkspaceIds(new Set())} className="btn-action-secondary">Clear</button>
        </div>
      )}

      {showTransferModal && transferWs && (
        <div style={s.overlay} onClick={() => { setShowTransferModal(false); setTransferWs(null); }}>
          <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "460px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Transfer Workspace</h3>
            <p style={{ fontSize: "13px", color: "var(--graphite)", margin: "0 0 16px" }}>Transfer ownership of <strong>{transferWs.name}</strong> to another member.</p>
            <select value={transferNewOwner} onChange={e => setTransferNewOwner(e.target.value)} className="plan-select" style={{ width: "100%", height: "40px" }}>
              <option value="">Select new owner...</option>
              {(teamMembers || []).map(m => (
                <option key={m.id} value={m.user_id || m.id}>{m.user_name || m.email}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={handleTransferWorkspace} className="btn-ember"><ArrowRight size={14} /> Transfer</button>
              <button onClick={() => { setShowTransferModal(false); setTransferWs(null); }} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {wsActivity.length > 0 && (
        <div className="card-glass" style={{ padding: "16px", marginTop: "16px" }}>
          <div className="card-label" style={{ marginBottom: "12px" }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {wsActivity.map((ev, i) => (
              <div key={ev.id || i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--graphite)" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--brand-orange)", flexShrink: 0 }} />
                <span style={{ flex: 1, color: "var(--sand)" }}>{ev.title || ev.event_type || "Event"}</span>
                <span style={{ fontSize: "10px", whiteSpace: "nowrap" }}>{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateWS && (
        <div style={s.overlay} onClick={() => setShowCreateWS(false)}>
          <div className="card-glass" style={{ border: "1px solid var(--border-glass)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "520px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Create Workspace</h3>
            <form onSubmit={handleCreateWorkspace}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={s.field}><label style={s.label}>Name</label><input type="text" value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))} className="plan-input" required /></div>
                <div style={s.field}><label style={s.label}>Stage</label>
                  <select value={wsForm.stage} onChange={e => setWsForm(p => ({ ...p, stage: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                    {WORKSPACE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.field}><label style={s.label}>Description</label><textarea value={wsForm.description} onChange={e => setWsForm(p => ({ ...p, description: e.target.value }))} className="plan-input" style={{ minHeight: "60px", resize: "vertical" }} /></div>
              <div style={s.field}>
                <label style={s.label}>Color</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {WORKSPACE_COLORS.map(c => (
                    <div key={c} onClick={() => setWsForm(p => ({ ...p, color: c }))}
                      style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: c, cursor: "pointer", border: wsForm.color === c ? "2px solid #fff" : "2px solid transparent", transition: "border 0.15s" }} />
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={s.field}><label style={s.label}>Website</label><input type="text" value={wsForm.website} onChange={e => setWsForm(p => ({ ...p, website: e.target.value }))} className="plan-input" placeholder="https://" /></div>
                <div style={s.field}><label style={s.label}>Logo URL</label><input type="text" value={wsForm.logo_url} onChange={e => setWsForm(p => ({ ...p, logo_url: e.target.value }))} className="plan-input" placeholder="https://" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={s.field}><label style={s.label}>Industry</label><input type="text" value={wsForm.industry} onChange={e => setWsForm(p => ({ ...p, industry: e.target.value }))} className="plan-input" placeholder="e.g. SaaS" /></div>
                <div style={s.field}><label style={s.label}>Size</label>
                  <select value={wsForm.size} onChange={e => setWsForm(p => ({ ...p, size: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                    <option value="">Select size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-1000">201-1000</option>
                    <option value="1000+">1000+</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                <button type="submit" className="btn-ember">Create</button>
                <button type="button" onClick={() => setShowCreateWS(false)} className="btn-action-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {wsDrawer && (
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "100vw",
          backgroundColor: "rgba(20,20,23,0.98)", backdropFilter: "blur(22px)",
          borderLeft: "1px solid rgba(107,107,111,0.12)", zIndex: 999,
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.4)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px", borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: wsDrawer.color || "#ff751f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
              {(wsDrawer.name || "W")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--sand)" }}>{wsDrawer.name}</div>
              <div style={{ fontSize: "11px", color: "var(--graphite)" }}>{wsDrawer.stage} stage · {wsDrawer.members?.filter(m => m.status === "active")?.length || 0} members</div>
            </div>
            <button onClick={() => { setWsDrawer(null); setWsDrawerForm({ name: "", description: "", stage: "Build", color: "#ff751f", logo_url: "", website: "", industry: "", size: "" }); }}
              className="btn-action-secondary" style={{ padding: "6px" }}><X size={14} /></button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ marginBottom: "20px" }}>
              <div className="card-label" style={{ marginBottom: "12px" }}>Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={s.label}>Name</label><input type="text" value={wsDrawerForm.name} onChange={e => setWsDrawerForm(p => ({ ...p, name: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
                <div><label style={s.label}>Stage</label>
                  <select value={wsDrawerForm.stage} onChange={e => setWsDrawerForm(p => ({ ...p, stage: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                    {WORKSPACE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: "10px" }}><label style={s.label}>Description</label><textarea value={wsDrawerForm.description} onChange={e => setWsDrawerForm(p => ({ ...p, description: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box", minHeight: "60px", resize: "vertical" }} /></div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div className="card-label" style={{ marginBottom: "8px" }}>Color</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {WORKSPACE_COLORS.map(c => (
                  <div key={c} onClick={() => setWsDrawerForm(p => ({ ...p, color: c }))}
                    style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: c, cursor: "pointer", border: wsDrawerForm.color === c ? "2px solid #fff" : "2px solid transparent", transition: "border 0.15s" }} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div className="card-label" style={{ marginBottom: "8px" }}>Extended Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={s.label}>Website</label><input type="text" value={wsDrawerForm.website} onChange={e => setWsDrawerForm(p => ({ ...p, website: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} placeholder="https://" /></div>
                <div><label style={s.label}>Logo URL</label><input type="text" value={wsDrawerForm.logo_url} onChange={e => setWsDrawerForm(p => ({ ...p, logo_url: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} placeholder="https://" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                <div><label style={s.label}>Industry</label><input type="text" value={wsDrawerForm.industry} onChange={e => setWsDrawerForm(p => ({ ...p, industry: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} placeholder="e.g. SaaS" /></div>
                <div><label style={s.label}>Size</label>
                  <select value={wsDrawerForm.size} onChange={e => setWsDrawerForm(p => ({ ...p, size: e.target.value }))} className="plan-select" style={{ width: "100%", height: "40px" }}>
                    <option value="">Select</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-1000">201-1000</option>
                    <option value="1000+">1000+</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div className="card-label" style={{ marginBottom: "8px" }}>Tags</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                {(wsTags[wsDrawer.id] || []).map((tag, i) => (
                  <span key={i} className="tag" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                    {tag}
                    <button onClick={() => handleRemoveTag(wsDrawer.id, i)} style={{ background: "none", border: "none", color: "var(--graphite)", cursor: "pointer", padding: 0, fontSize: "12px", lineHeight: 1 }}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <input type="text" placeholder="Add a tag..." value={newTagInput} onChange={e => setNewTagInput(e.target.value)} onKeyDown={e => handleKeyDown(e, wsDrawer.id)}
                  className="plan-input" style={{ flex: 1, fontSize: "11px" }} />
                <button onClick={() => handleAddTag(wsDrawer.id)} className="btn-action-secondary" style={{ padding: "6px 10px" }}><Plus size={12} /></button>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div className="card-label" style={{ marginBottom: "8px" }}>Integrations</div>
              <div style={{ fontSize: "12px", color: "var(--graphite)", marginBottom: "8px" }}>
                {(integrations || []).filter(i => i.connected).length > 0
                  ? `${(integrations || []).filter(i => i.connected).length} integration(s) connected to your account. Scope them to this workspace in Connected Apps.`
                  : "No integrations connected yet."}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {(integrations || []).filter(i => i.connected).map(i => (
                  <span key={i.provider} className="tag" style={{ backgroundColor: "rgba(62,207,142,0.1)", color: "#4ade80", border: "1px solid rgba(62,207,142,0.2)", fontSize: "10px" }}>
                    {i.provider}
                  </span>
                ))}
              </div>
              {(integrations || []).filter(i => i.connected).length === 0 && (
                <div style={{ fontSize: "11px", color: "var(--graphite)", fontStyle: "italic" }}>
                  Go to <strong>Connected Apps</strong> tab to add integrations.
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div className="card-label" style={{ margin: 0 }}>Notifications</div>
                <button onClick={() => handleMarkAllRead(wsDrawer.id)} className="btn-action-secondary" style={{ fontSize: "10px", padding: "4px 8px" }}><Check size={10} /> Mark All Read</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {NOTIFICATION_TYPES.slice(0, 6).map(n => {
                  const pref = wsNotifPrefs[n.key];
                  const enabled = pref ? pref.enabled !== false : true;
                  const NotifIcon = NOTIF_ICONS[n.category === "alerts" ? "alert" : n.category === "reports" ? "clock" : n.category === "team" ? "users" : n.category === "tasks" ? "check-square" : n.category === "ai" ? "cpu" : n.category === "social" ? "message-circle" : n.category === "security" ? "shield" : n.category === "billing" ? "credit-card" : n.category === "system" ? "alert" : "calendar"] || Bell;
                  return (
                    <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--sand)" }}>
                        <NotifIcon size={12} style={{ color: "var(--graphite)" }} />
                        {n.label}
                      </div>
                      <button onClick={() => handleWsNotifToggle(n.key, !enabled)}
                        className={`neu-toggle ${enabled ? "on" : ""}`}><div className="thumb" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(107,107,111,0.08)", display: "flex", gap: "8px" }}>
            <button onClick={handleWsDrawerSave} className="btn-ember"><Save size={14} /> Save Changes</button>
            <button onClick={() => { setWsDrawer(null); setWsDrawerForm({ name: "", description: "", stage: "Build", color: "#ff751f", logo_url: "", website: "", industry: "", size: "" }); }}
              className="btn-action-secondary">Cancel</button>
          </div>
        </div>
      )}

      {wsDrawer && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 998 }}
          onClick={() => { setWsDrawer(null); setWsDrawerForm({ name: "", description: "", stage: "Build", color: "#ff751f", logo_url: "", website: "", industry: "", size: "" }); }} />
      )}
    </div>
  );
}
