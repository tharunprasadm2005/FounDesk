import { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { WORKSPACE_COLORS, WORKSPACE_STAGES, NOTIFICATION_TYPES, NOTIF_ICONS } from "./SettingsConstants";
import {
  Globe, Users, Puzzle, Activity, Plus, Check, Copy, ArrowRight, Archive, RefreshCw,
  Trash2, X, Save, Bell
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Inline, Stack } from "../../components/layout";

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
    <div className="animate-in fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px] mb-[32px]">
        {[
          { label: "Workspaces", value: stats.total, icon: Globe },
          { label: "Members", value: stats.members, icon: Users },
          { label: "Integrations", value: stats.integrations || "—", icon: Puzzle },
          { label: "Health", value: ws?.active_health || "Good", icon: Activity },
        ].map(stat => (
          <Card key={stat.label} padding="p-[20px]" className="text-center bg-washi-white">
            <stat.icon size={16} className="text-stone-400 mx-auto mb-[12px]" />
            <div className="text-[24px] font-heading text-sumi-900 mb-[4px]">{stat.value}</div>
            <div className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">{stat.label}</div>
          </Card>
        ))}
      </div>

      <Inline gap="gap-[12px]" className="mb-[24px] flex-wrap">
        <Button onClick={() => setShowCreateWS(true)} variant="primary">
          <Plus size={14} className="mr-1" /> Create Workspace
        </Button>
        <Button onClick={() => { setSelectMode(!selectMode); setSelectedWorkspaceIds(new Set()); }} variant={selectMode ? "primary" : "secondary"}>
          <Check size={14} className="mr-1" /> {selectMode ? "Exit Select Mode" : "Select Mode"}
        </Button>
      </Inline>

      <Stack gap="gap-[12px]">
        {workspaces.map(ws => (
          <Card 
            key={ws.id} 
            padding="p-[20px]"
            className={`cursor-pointer transition-colors bg-washi-white ${wsDrawer?.id === ws.id ? 'border-moss-600/30' : 'hover:border-stone-400'}`}
            onClick={() => { if (!selectMode) openWsDrawer(ws); }}
          >
            <Inline justify="justify-between" items="items-center" gap="gap-[16px]">
              <Inline items="items-center" gap="gap-[16px]">
                {selectMode && (
                  <input type="checkbox" checked={selectedWorkspaceIds.has(ws.id)}
                    onChange={e => { const s = new Set(selectedWorkspaceIds); if (e.target.checked) s.add(ws.id); else s.delete(ws.id); setSelectedWorkspaceIds(s); }}
                    className="w-[16px] h-[16px] rounded-[2px] border-stone-300 text-sumi-900 focus:ring-sumi-900" onClick={e => e.stopPropagation()} />
                )}
                <div style={{ backgroundColor: ws.color || "#ff751f" }} className="w-[48px] h-[48px] rounded-[4px] flex items-center justify-center text-washi-white font-bold text-[20px] shrink-0 font-heading">
                  {(ws.name || "W")[0].toUpperCase()}
                </div>
                <div>
                  <Inline items="items-center" gap="gap-[12px]" className="mb-[4px]">
                    <span className="text-[16px] font-medium text-sumi-900">{ws.name}</span>
                    <span className="px-[8px] py-[4px] rounded-[2px] bg-stone-100 text-stone-500 text-[10px] font-bold tracking-wide uppercase">
                      {ws.role || "member"}
                    </span>
                    {ws.is_archived && (
                      <span className="px-[8px] py-[4px] rounded-[2px] bg-clay-500/10 text-clay-500 text-[10px] font-bold tracking-wide uppercase">
                        Archived
                      </span>
                    )}
                  </Inline>
                  <Inline items="items-center" gap="gap-[16px]" className="text-[12px] text-stone-400 font-mono tracking-wide flex-wrap">
                    <span>{ws.stage} stage</span>
                    <span>{ws.members?.filter(m => m.status === "active")?.length || 0} members</span>
                    {ws.active_phase && <span>Phase: {ws.active_phase}</span>}
                    {ws.created_at && <span>Created {new Date(ws.created_at).toLocaleDateString()}</span>}
                  </Inline>
                  {(wsTags[ws.id] || []).length > 0 && (
                    <Inline gap="gap-[8px]" className="mt-[8px] flex-wrap">
                      {(wsTags[ws.id] || []).map((tag, i) => (
                        <span key={i} className="px-[8px] py-[4px] rounded-[2px] bg-linen-100 border border-stone-200 text-stone-500 text-[10px] font-bold tracking-wide uppercase">
                          {tag}
                        </span>
                      ))}
                    </Inline>
                  )}
                </div>
              </Inline>
              
              <Inline gap="gap-[8px]" onClick={e => e.stopPropagation()}>
                {ws.is_archived ? (
                  <Button onClick={() => handleRestoreWorkspace(ws.id)} variant="secondary" size="icon" title="Restore"><RefreshCw size={14} /></Button>
                ) : (
                  <>
                    <Button onClick={() => handleUpdateWorkspace(ws.id, { is_archived: !ws.is_archived })} variant="secondary" size="icon" title="Archive"><Archive size={14} /></Button>
                    <Button onClick={() => handleDuplicateWorkspace(ws.id)} variant="secondary" size="icon" title="Duplicate"><Copy size={14} /></Button>
                    <Button onClick={() => { setTransferWs(ws); setShowTransferModal(true); }} variant="secondary" size="icon" title="Transfer"><ArrowRight size={14} /></Button>
                  </>
                )}
                <Button onClick={() => handleDeleteWorkspace(ws.id)} variant="secondary" size="icon" title="Delete" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">
                  <Trash2 size={14} />
                </Button>
              </Inline>
            </Inline>
          </Card>
        ))}
      </Stack>

      {selectMode && selectedWorkspaceIds.size > 0 && (
        <div className="fixed bottom-[32px] left-1/2 -translate-x-1/2 z-[999] p-[16px] rounded-[4px] bg-sumi-900 border border-stone-400/20 shadow-xl flex items-center gap-[24px]">
          <span className="text-[13px] text-washi-white font-medium">{selectedWorkspaceIds.size} selected</span>
          <Inline gap="gap-[12px]">
            <Button onClick={handleBulkArchive} className="bg-clay-500 text-washi-white hover:bg-clay-500/90 border-transparent">
              <Archive size={14} className="mr-1" /> Archive Selected
            </Button>
            <Button onClick={() => setSelectedWorkspaceIds(new Set())} variant="secondary" className="border-stone-400 text-washi-white hover:bg-washi-white/10 hover:text-washi-white">
              Clear
            </Button>
          </Inline>
        </div>
      )}

      {showTransferModal && transferWs && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => { setShowTransferModal(false); setTransferWs(null); }}>
          <Card padding="p-[32px]" className="w-full max-w-[480px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[20px] font-heading text-sumi-900 mb-[8px] m-0">Transfer Workspace</h3>
            <p className="text-[13px] text-stone-500 mb-[24px]">Transfer ownership of <strong>{transferWs.name}</strong> to another member.</p>
            
            <select value={transferNewOwner} onChange={e => setTransferNewOwner(e.target.value)} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
              <option value="">Select new owner...</option>
              {(teamMembers || []).map(m => (
                <option key={m.id} value={m.user_id || m.id}>{m.user_name || m.email}</option>
              ))}
            </select>
            
            <Inline gap="gap-[12px]" className="mt-[24px]">
              <Button onClick={handleTransferWorkspace} variant="primary">
                <ArrowRight size={14} className="mr-1" /> Transfer
              </Button>
              <Button onClick={() => { setShowTransferModal(false); setTransferWs(null); }} variant="secondary">
                Cancel
              </Button>
            </Inline>
          </Card>
        </div>
      )}

      {wsActivity.length > 0 && (
        <Card padding="p-[24px]" className="mt-[32px] bg-washi-white">
          <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px]">Recent Activity</h3>
          <Stack gap="gap-[12px]">
            {wsActivity.map((ev, i) => (
              <Inline key={ev.id || i} items="items-center" gap="gap-[12px]" className="text-[13px] text-stone-500">
                <div className="w-[6px] h-[6px] rounded-full bg-sumi-900 shrink-0" />
                <span className="flex-1 text-sumi-900">{ev.title || ev.event_type || "Event"}</span>
                <span className="text-[11px] font-mono text-stone-400 whitespace-nowrap">{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ""}</span>
              </Inline>
            ))}
          </Stack>
        </Card>
      )}

      {showCreateWS && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setShowCreateWS(false)}>
          <Card padding="p-[32px]" className="w-full max-w-[560px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[24px] font-heading text-sumi-900 mb-[24px] m-0">Create Workspace</h3>
            <form onSubmit={handleCreateWorkspace}>
              <Stack gap="gap-[20px]">
                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Name</label>
                    <Input type="text" value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Stage</label>
                    <select value={wsForm.stage} onChange={e => setWsForm(p => ({ ...p, stage: e.target.value }))} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
                      {WORKSPACE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Description</label>
                  <textarea value={wsForm.description} onChange={e => setWsForm(p => ({ ...p, description: e.target.value }))} className="w-full p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans min-h-[80px] resize-y" />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Color</label>
                  <Inline gap="gap-[12px]" className="flex-wrap">
                    {WORKSPACE_COLORS.map(c => (
                      <div key={c} onClick={() => setWsForm(p => ({ ...p, color: c }))}
                        className="w-[32px] h-[32px] rounded-full cursor-pointer transition-all"
                        style={{ backgroundColor: c, border: wsForm.color === c ? "2px solid var(--sumi-900)" : "2px solid transparent", outline: wsForm.color === c ? "2px solid #fff" : "none" }} />
                    ))}
                  </Inline>
                </div>
                
                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Website</label>
                    <Input type="text" value={wsForm.website} onChange={e => setWsForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Logo URL</label>
                    <Input type="text" value={wsForm.logo_url} onChange={e => setWsForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-[16px]">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Industry</label>
                    <Input type="text" value={wsForm.industry} onChange={e => setWsForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. SaaS" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Size</label>
                    <select value={wsForm.size} onChange={e => setWsForm(p => ({ ...p, size: e.target.value }))} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
                      <option value="">Select size</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-1000">201-1000</option>
                      <option value="1000+">1000+</option>
                    </select>
                  </div>
                </div>
                
                <Inline gap="gap-[12px]" className="mt-[8px]">
                  <Button type="submit" variant="primary">Create</Button>
                  <Button type="button" onClick={() => setShowCreateWS(false)} variant="secondary">Cancel</Button>
                </Inline>
              </Stack>
            </form>
          </Card>
        </div>
      )}

      {wsDrawer && (
        <div className="fixed top-0 right-0 bottom-0 w-[520px] max-w-[100vw] bg-washi-white border-l border-stone-200 z-[999] flex flex-col shadow-2xl animate-in slide-in-from-right">
          <div className="flex items-center gap-[16px] p-[24px] border-b border-stone-200 shrink-0">
            <div style={{ backgroundColor: wsDrawer.color || "#ff751f" }} className="w-[48px] h-[48px] rounded-[4px] flex items-center justify-center text-washi-white font-bold text-[20px] shrink-0 font-heading">
              {(wsDrawer.name || "W")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[20px] font-heading text-sumi-900 mb-[4px]">{wsDrawer.name}</div>
              <div className="text-[12px] font-mono text-stone-400">{wsDrawer.stage} stage · {wsDrawer.members?.filter(m => m.status === "active")?.length || 0} members</div>
            </div>
            <button onClick={() => { setWsDrawer(null); setWsDrawerForm({ name: "", description: "", stage: "Build", color: "#ff751f", logo_url: "", website: "", industry: "", size: "" }); }}
              className="p-[8px] bg-transparent border-none text-stone-400 hover:text-sumi-900 cursor-pointer outline-none"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-[24px]">
            <div className="mb-[32px]">
              <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px]">Details</h3>
              <div className="grid grid-cols-2 gap-[16px] mb-[16px]">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Name</label>
                  <Input type="text" value={wsDrawerForm.name} onChange={e => setWsDrawerForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Stage</label>
                  <select value={wsDrawerForm.stage} onChange={e => setWsDrawerForm(p => ({ ...p, stage: e.target.value }))} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
                    {WORKSPACE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Description</label>
                <textarea value={wsDrawerForm.description} onChange={e => setWsDrawerForm(p => ({ ...p, description: e.target.value }))} className="w-full p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans min-h-[80px] resize-y" />
              </div>
            </div>

            <div className="mb-[32px]">
              <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px]">Color</h3>
              <Inline gap="gap-[12px]" className="flex-wrap">
                {WORKSPACE_COLORS.map(c => (
                  <div key={c} onClick={() => setWsDrawerForm(p => ({ ...p, color: c }))}
                    className="w-[32px] h-[32px] rounded-full cursor-pointer transition-all"
                    style={{ backgroundColor: c, border: wsDrawerForm.color === c ? "2px solid var(--sumi-900)" : "2px solid transparent", outline: wsDrawerForm.color === c ? "2px solid #fff" : "none" }} />
                ))}
              </Inline>
            </div>

            <div className="mb-[32px]">
              <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px]">Extended Info</h3>
              <div className="grid grid-cols-2 gap-[16px] mb-[16px]">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Website</label>
                  <Input type="text" value={wsDrawerForm.website} onChange={e => setWsDrawerForm(p => ({ ...p, website: e.target.value }))} placeholder="https://" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Logo URL</label>
                  <Input type="text" value={wsDrawerForm.logo_url} onChange={e => setWsDrawerForm(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-[16px]">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Industry</label>
                  <Input type="text" value={wsDrawerForm.industry} onChange={e => setWsDrawerForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. SaaS" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Size</label>
                  <select value={wsDrawerForm.size} onChange={e => setWsDrawerForm(p => ({ ...p, size: e.target.value }))} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
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

            <div className="mb-[32px]">
              <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px]">Tags</h3>
              <Inline gap="gap-[8px]" className="flex-wrap mb-[12px]">
                {(wsTags[wsDrawer.id] || []).map((tag, i) => (
                  <span key={i} className="px-[8px] py-[4px] rounded-[2px] bg-linen-100 border border-stone-200 text-stone-500 text-[10px] font-bold tracking-wide uppercase flex items-center gap-[6px]">
                    {tag}
                    <button onClick={() => handleRemoveTag(wsDrawer.id, i)} className="bg-transparent border-none text-stone-400 hover:text-sumi-900 cursor-pointer p-0 leading-none outline-none"><X size={10} /></button>
                  </span>
                ))}
              </Inline>
              <Inline gap="gap-[8px]">
                <Input type="text" placeholder="Add a tag..." value={newTagInput} onChange={e => setNewTagInput(e.target.value)} onKeyDown={e => handleKeyDown(e, wsDrawer.id)} className="flex-1" />
                <Button onClick={() => handleAddTag(wsDrawer.id)} variant="secondary" size="icon"><Plus size={14} /></Button>
              </Inline>
            </div>

            <div className="mb-[32px]">
              <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Integrations</h3>
              <p className="text-[12px] text-stone-400 mb-[16px]">
                {(integrations || []).filter(i => i.connected).length > 0
                  ? `${(integrations || []).filter(i => i.connected).length} integration(s) connected to your account. Scope them to this workspace in Connected Apps.`
                  : "No integrations connected yet."}
              </p>
              <Inline gap="gap-[8px]" className="flex-wrap">
                {(integrations || []).filter(i => i.connected).map(i => (
                  <span key={i.provider} className="px-[8px] py-[4px] rounded-[2px] bg-moss-600/10 text-moss-600 border border-moss-600/20 text-[10px] font-bold tracking-wide uppercase">
                    {i.provider}
                  </span>
                ))}
              </Inline>
              {(integrations || []).filter(i => i.connected).length === 0 && (
                <p className="text-[11px] text-stone-400 italic">
                  Go to <strong>Connected Apps</strong> tab to add integrations.
                </p>
              )}
            </div>

            <div className="mb-[32px]">
              <Inline justify="justify-between" items="items-center" className="mb-[16px]">
                <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase m-0">Notifications</h3>
                <Button onClick={() => handleMarkAllRead(wsDrawer.id)} variant="secondary" size="sm"><Check size={10} className="mr-1" /> Mark All Read</Button>
              </Inline>
              <Stack gap="gap-[0]" className="divide-y divide-stone-200">
                {NOTIFICATION_TYPES.slice(0, 6).map(n => {
                  const pref = wsNotifPrefs[n.key];
                  const enabled = pref ? pref.enabled !== false : true;
                  const NotifIcon = NOTIF_ICONS[n.category === "alerts" ? "alert" : n.category === "reports" ? "clock" : n.category === "team" ? "users" : n.category === "tasks" ? "check-square" : n.category === "ai" ? "cpu" : n.category === "social" ? "message-circle" : n.category === "security" ? "shield" : n.category === "billing" ? "credit-card" : n.category === "system" ? "alert" : "calendar"] || Bell;
                  return (
                    <Inline key={n.key} justify="justify-between" items="items-center" className="py-[12px]">
                      <Inline gap="gap-[12px]" items="items-center" className="text-[13px] text-sumi-900">
                        <NotifIcon size={14} className="text-stone-400" />
                        {n.label}
                      </Inline>
                      <button onClick={() => handleWsNotifToggle(n.key, !enabled)}
                        className={`relative w-[36px] h-[20px] rounded-full transition-colors outline-none cursor-pointer border-none ${enabled ? "bg-moss-600" : "bg-stone-200"}`}>
                        <div className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-washi-white transition-transform ${enabled ? "translate-x-[16px]" : "translate-x-0"}`} />
                      </button>
                    </Inline>
                  );
                })}
              </Stack>
            </div>
          </div>

          <div className="p-[24px] border-t border-stone-200 shrink-0">
            <Inline gap="gap-[12px]">
              <Button onClick={handleWsDrawerSave} variant="primary"><Save size={14} className="mr-1" /> Save Changes</Button>
              <Button onClick={() => { setWsDrawer(null); setWsDrawerForm({ name: "", description: "", stage: "Build", color: "#ff751f", logo_url: "", website: "", industry: "", size: "" }); }} variant="secondary">Cancel</Button>
            </Inline>
          </div>
        </div>
      )}

      {wsDrawer && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm z-[998]"
          onClick={() => { setWsDrawer(null); setWsDrawerForm({ name: "", description: "", stage: "Build", color: "#ff751f", logo_url: "", website: "", industry: "", size: "" }); }} />
      )}
    </div>
  );
}
