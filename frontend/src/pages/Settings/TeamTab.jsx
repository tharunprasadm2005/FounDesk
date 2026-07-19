import { useState } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { ROLE_BADGE_COLORS, SETTINGS_STYLE as s } from "./SettingsConstants";
import {
  UserPlus, Users, Folder, Network, BarChart3, Search, ChevronRight, UserX, UserMinus,
  Send, Plus, X
} from "lucide-react";

export default function TeamTab({ teamMembers, currentWorkspace, onTeamChange }) {
  const toast = useToast();
  const wsId = localStorage.getItem("workspaceId");

  const [showInviteMember, setShowInviteMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberActivity, setMemberActivity] = useState([]);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState("member");
  const [showSubTeams, setShowSubTeams] = useState(false);
  const [subTeams, setSubTeams] = useState([]);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", description: "" });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembersList, setTeamMembersList] = useState([]);
  const [showOrgChart, setShowOrgChart] = useState(false);
  const [orgChartData, setOrgChartData] = useState(null);
  const [showWorkload, setShowWorkload] = useState(false);
  const [workloadData, setWorkloadData] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchFilter, setSearchFilter] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState("");

  const fetchMemberActivity = async (wsId, userId) => {
    try { const res = await api.get(`/api/workspaces/${wsId}/activity`); setMemberActivity(Array.isArray(res.data) ? res.data.slice(0, 5) : []); } catch (err) { console.error("[Settings] Failed to fetch member activity:", err); }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    const wsId = localStorage.getItem("workspaceId");
    if (!wsId) { toast("No workspace selected.", "error"); return; }
    try {
      await api.post(`/api/workspaces/${wsId}/invite`, { email: inviteEmail.trim() });
      setShowInviteMember(false);
      setInviteEmail("");
      toast("Invitation sent.", "success");
    } catch (err) { toast(err.response?.data?.error || "Failed to send invitation.", "error"); }
  };

  const handleRemoveMember = async (wsId, memberId) => {
    if (!confirm("Remove this member from the workspace?")) return;
    try { await api.delete(`/api/workspaces/${wsId}/members/${memberId}`); onTeamChange(); } catch { toast("Failed to remove member.", "error"); }
  };

  const handleChangeRole = async (wsId, memberId, role) => {
    try { await api.put(`/api/workspaces/${wsId}/members/${memberId}/role`, { role }); onTeamChange(); } catch { toast("Failed to change role.", "error"); }
  };

  const fetchSubTeams = async (wsId) => {
    try { const res = await api.get(`/api/workspaces/${wsId}/teams`); setSubTeams(Array.isArray(res.data) ? res.data : []); } catch { console.error("Failed to fetch teams"); }
  };

  const handleCreateTeam = async (wsId) => {
    if (!teamForm.name.trim()) return;
    try {
      await api.post(`/api/workspaces/${wsId}/teams`, teamForm);
      setShowCreateTeam(false);
      setTeamForm({ name: "", description: "" });
      fetchSubTeams(wsId);
    } catch { toast("Failed to create team.", "error"); }
  };

  const fetchTeamMembers = async (wsId, teamId) => {
    try { const res = await api.get(`/api/workspaces/${wsId}/teams/${teamId}/members`); setTeamMembersList(Array.isArray(res.data) ? res.data : []); } catch { console.error("Failed to fetch team members"); }
  };

  const handleRemoveTeamMember = async (wsId, teamId, memberId) => {
    try { await api.delete(`/api/workspaces/${wsId}/teams/${teamId}/members/${memberId}`); fetchTeamMembers(wsId, teamId); } catch { toast("Failed to remove member.", "error"); }
  };

  const handleAddTeamMember = async (wsId, teamId) => {
    if (!addMemberUserId) return;
    try {
      await api.post(`/api/workspaces/${wsId}/teams/${teamId}/members`, { user_id: addMemberUserId });
      setShowAddMember(false);
      setAddMemberUserId("");
      fetchTeamMembers(wsId, teamId);
    } catch { toast("Failed to add member.", "error"); }
  };

  const fetchOrgChart = async (wsId) => {
    try { const res = await api.get(`/api/workspaces/${wsId}/org-chart`); setOrgChartData(res.data); setShowOrgChart(true); } catch { toast("Failed to fetch org chart.", "error"); }
  };

  const fetchWorkload = async (wsId) => {
    try { const res = await api.get(`/api/workspaces/${wsId}/workload`); setWorkloadData(Array.isArray(res.data) ? res.data : []); setShowWorkload(true); } catch { toast("Failed to fetch workload.", "error"); }
  };

  const handleBulkInvite = async (wsId) => {
    if (!bulkEmails.trim()) return;
    try {
      await api.post(`/api/workspaces/${wsId}/invite-bulk`, { emails: bulkEmails.trim(), role: bulkRole });
      setShowBulkInvite(false);
      setBulkEmails("");
      setBulkRole("member");
      toast("Bulk invitations sent.", "success");
    } catch { toast("Failed to send bulk invitations.", "error"); }
  };

  const roles = {};
  teamMembers.forEach(m => { const r = m.role || "member"; roles[r] = (roles[r] || 0) + 1; });

  const filteredMembers = teamMembers.filter(m => {
    if (roleFilter !== "All" && m.role !== roleFilter) return false;
    if (statusFilter !== "All" && m.status !== statusFilter) return false;
    if (searchFilter && !(m.user_name || "").toLowerCase().includes(searchFilter.toLowerCase()) && !(m.email || "").toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  if (selectedMember) {
    const isFounder = selectedMember.role === "founder";
    return (
      <div>
        <button onClick={() => { setSelectedMember(null); setMemberActivity([]); }} className="btn-action-secondary" style={{ marginBottom: "16px" }}><ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Back to Team</button>
        <div className="card-glass" style={{ padding: "20px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "rgba(255,90,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--japandi-accent)", fontWeight: 700, fontSize: "18px" }}>
              {(selectedMember.user_name || selectedMember.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--japandi-text)" }}>{selectedMember.user_name || selectedMember.email || "Unnamed"}</div>
              <div style={{ fontSize: "12px", color: "var(--japandi-muted)" }}>{selectedMember.email} · {selectedMember.title || "No title"}</div>
            </div>
            <span className="tag tag-ember" style={{ marginLeft: "auto", backgroundColor: (ROLE_BADGE_COLORS[selectedMember.role] || "#6b6b6f") + "22", color: ROLE_BADGE_COLORS[selectedMember.role] || "#6b6b6f", borderColor: (ROLE_BADGE_COLORS[selectedMember.role] || "#6b6b6f") + "33" }}>
              {selectedMember.role || "member"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {!isFounder && (
              <>
                <select onChange={e => handleChangeRole(wsId, selectedMember.id, e.target.value)} className="plan-select" style={{ height: "32px", fontSize: "11px" }} value={selectedMember.role}>
                  {["member", "admin", "manager", "developer", "designer", "viewer"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
                <button onClick={() => handleRemoveMember(wsId, selectedMember.id)} className="btn-destructive-outline-sm"><UserMinus size={14} /> Remove</button>
              </>
            )}
          </div>
        </div>
        {memberActivity.length > 0 && (
          <div className="card-glass" style={{ padding: "16px" }}>
            <div className="card-label" style={{ marginBottom: "12px" }}>Recent Activity</div>
            {memberActivity.map((ev, i) => (
              <div key={ev.id || i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--japandi-muted)", padding: "6px 0", borderBottom: i < memberActivity.length - 1 ? "1px solid rgba(107,107,111,0.06)" : "none" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--japandi-accent)", flexShrink: 0 }} />
                <span style={{ flex: 1, color: "var(--japandi-text)" }}>{ev.title || ev.event_type || "Activity"}</span>
                <span style={{ fontSize: "10px" }}>{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <div className="card-glass" style={{ padding: "16px", textAlign: "center" }}>
          <div className="card-hero-value" style={{ color: "var(--japandi-text)", marginTop: 0, fontSize: "20px" }}>{teamMembers.length}</div>
          <div className="card-hero-support" style={{ textTransform: "uppercase", fontSize: "9px", letterSpacing: "1.5px" }}>Members</div>
        </div>
        {Object.entries(roles).map(([role, count]) => (
          <div key={role} className="card-glass" style={{ padding: "16px", textAlign: "center" }}>
            <div className="card-hero-value" style={{ color: ROLE_BADGE_COLORS[role] || "var(--japandi-text)", marginTop: 0, fontSize: "20px" }}>{count}</div>
            <div className="card-hero-support" style={{ textTransform: "capitalize", fontSize: "9px", letterSpacing: "1.5px" }}>{role}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button onClick={() => setShowInviteMember(true)} className="btn-ember"><UserPlus size={14} /> Invite Member</button>
        <button onClick={() => setShowBulkInvite(true)} className="btn-action-secondary"><Users size={14} /> Bulk Invite</button>
        <button onClick={() => { setShowSubTeams(!showSubTeams); if (!showSubTeams && wsId) fetchSubTeams(wsId); }} className="btn-action-secondary"><Folder size={14} /> Manage Teams</button>
        <button onClick={() => { if (wsId) fetchOrgChart(wsId); }} className="btn-action-secondary"><Network size={14} /> View Org Chart</button>
        <button onClick={() => { if (wsId) fetchWorkload(wsId); }} className="btn-action-secondary"><BarChart3 size={14} /> View Workload</button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="plan-select" style={{ height: "32px", fontSize: "11px", width: "120px" }}>
          <option value="All">All Roles</option>
          {["founder", "admin", "manager", "developer", "designer", "viewer", "member"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="plan-select" style={{ height: "32px", fontSize: "11px", width: "120px" }}>
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
        <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
          <Search size={12} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--japandi-muted)" }} />
          <input type="text" placeholder="Search by name or email..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
            className="plan-input" style={{ width: "100%", paddingLeft: "28px", fontSize: "11px" }} />
        </div>
      </div>

      <div className="card-glass" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
              {["Member", "Role", "Status", "Email", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "var(--japandi-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--japandi-muted)" }}>No matching team members found.</td></tr>
            ) : filteredMembers.map(m => (
              <tr key={m.id} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)", cursor: "pointer", transition: "background 0.1s" }}
                onClick={() => { setSelectedMember(m); fetchMemberActivity(wsId, m.user_id); }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,90,0,0.03)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "rgba(255,90,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--japandi-accent)", fontWeight: 700, fontSize: "12px" }}>
                      {(m.user_name || m.email || "?")[0].toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--japandi-text)" }}>{m.user_name || m.email || "Unnamed"}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span className="tag" style={{ backgroundColor: (ROLE_BADGE_COLORS[m.role] || "#6b6b6f") + "22", color: ROLE_BADGE_COLORS[m.role] || "#6b6b6f", border: "1px solid " + (ROLE_BADGE_COLORS[m.role] || "#6b6b6f") + "33" }}>
                    {m.role || "member"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: m.status === "active" ? "#4ade80" : "var(--japandi-muted)", fontSize: "11px" }}>
                    {m.status === "active" ? "Active" : m.status || "pending"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", color: "var(--japandi-muted)" }}>{m.email}</td>
                <td style={{ padding: "10px 14px" }}>
                  <button onClick={e => { e.stopPropagation(); handleRemoveMember(wsId, m.id); }} className="btn-destructive-outline-sm" disabled={m.role === "founder"}><UserX size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInviteMember && (
        <div style={s.overlay} onClick={() => setShowInviteMember(false)}>
          <div className="card-glass" style={{ border: "1px solid var(--japandi-border)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Invite Member</h3>
            <p style={{ fontSize: "13px", color: "var(--japandi-muted)", margin: "0 0 16px" }}>Send an invitation email to join <strong>{currentWorkspace?.name || "this workspace"}</strong>.</p>
            <input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} autoFocus />
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={handleInviteMember} className="btn-ember"><Send size={14} /> Send Invite</button>
              <button onClick={() => setShowInviteMember(false)} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showBulkInvite && (
        <div style={s.overlay} onClick={() => setShowBulkInvite(false)}>
          <div className="card-glass" style={{ border: "1px solid var(--japandi-border)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "520px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Bulk Invite</h3>
            <p style={{ fontSize: "13px", color: "var(--japandi-muted)", margin: "0 0 12px" }}>Enter email addresses separated by commas or new lines.</p>
            <textarea placeholder="alice@company.com, bob@company.com" value={bulkEmails} onChange={e => setBulkEmails(e.target.value)} className="plan-input" style={{ width: "100%", boxSizing: "border-box", minHeight: "80px", resize: "vertical" }} />
            <div style={{ marginTop: "10px" }}>
              <label style={s.label}>Role</label>
              <select value={bulkRole} onChange={e => setBulkRole(e.target.value)} className="plan-select" style={{ width: "100%", height: "40px" }}>
                {["member", "admin", "manager", "developer", "designer", "viewer"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => handleBulkInvite(wsId)} className="btn-ember"><Send size={14} /> Send Invites</button>
              <button onClick={() => setShowBulkInvite(false)} className="btn-action-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSubTeams && (
        <div className="card-glass" style={{ padding: "16px", marginTop: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div className="card-label" style={{ margin: 0 }}>Sub-Teams</div>
            <button onClick={() => setShowCreateTeam(true)} className="btn-ember" style={{ fontSize: "11px", padding: "6px 12px" }}><Plus size={12} /> Create Team</button>
          </div>
          {subTeams.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--japandi-muted)" }}>No sub-teams yet.</div>
          ) : selectedTeam ? (
            <div>
              <button onClick={() => setSelectedTeam(null)} className="btn-action-secondary" style={{ marginBottom: "12px", fontSize: "10px", padding: "4px 10px" }}><ChevronRight size={12} style={{ transform: "rotate(180deg)" }} /> Back to Teams</button>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--japandi-text)", margin: "0 0 8px" }}>{selectedTeam.name}</h4>
              <p style={{ fontSize: "11px", color: "var(--japandi-muted)", marginBottom: "12px" }}>{selectedTeam.description || "No description"}</p>
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <button onClick={() => setShowAddMember(true)} className="btn-action-secondary" style={{ fontSize: "10px", padding: "4px 10px" }}><UserPlus size={10} /> Add Member</button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                    {["Name", "Email", "Actions"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "var(--japandi-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {teamMembersList.map(tm => (
                    <tr key={tm.id || tm.user_id} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                      <td style={{ padding: "6px 10px", color: "var(--japandi-text)" }}>{tm.user_name || tm.name || tm.email}</td>
                      <td style={{ padding: "6px 10px", color: "var(--japandi-muted)" }}>{tm.email}</td>
                      <td style={{ padding: "6px 10px" }}>
                        <button onClick={() => handleRemoveTeamMember(wsId, selectedTeam.id, tm.id || tm.user_id)} className="btn-destructive-outline-sm"><UserX size={10} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {showAddMember && (
                <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <select value={addMemberUserId} onChange={e => setAddMemberUserId(e.target.value)} className="plan-select" style={{ flex: 1, height: "32px", fontSize: "11px" }}>
                    <option value="">Select member...</option>
                    {teamMembers.map(m => <option key={m.user_id || m.id} value={m.user_id || m.id}>{m.user_name || m.email}</option>)}
                  </select>
                  <button onClick={() => handleAddTeamMember(wsId, selectedTeam.id)} className="btn-ember" style={{ fontSize: "10px", padding: "6px 12px" }}>Add</button>
                  <button onClick={() => { setShowAddMember(false); setAddMemberUserId(""); }} className="btn-action-secondary" style={{ fontSize: "10px", padding: "6px 12px" }}>Cancel</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {subTeams.map(team => (
                <div key={team.id} className="card-glass" style={{ padding: "12px", cursor: "pointer", border: "1px solid transparent" }}
                  onClick={() => { setSelectedTeam(team); fetchTeamMembers(wsId, team.id); }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,90,0,0.2)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Folder size={16} style={{ color: "var(--japandi-muted)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--japandi-text)" }}>{team.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--japandi-muted)" }}>{team.description || "No description"} · {team.member_count || team.members_count || 0} members</div>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--japandi-muted)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCreateTeam && (
            <div style={s.overlay} onClick={() => setShowCreateTeam(false)}>
              <div className="card-glass" style={{ border: "1px solid var(--japandi-border)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "460px", width: "100%" }} onClick={e => e.stopPropagation()}>
                <h3 style={s.modalTitle}>Create Team</h3>
                <div style={s.field}><label style={s.label}>Name</label><input type="text" value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box" }} /></div>
                <div style={s.field}><label style={s.label}>Description</label><textarea value={teamForm.description} onChange={e => setTeamForm(p => ({ ...p, description: e.target.value }))} className="plan-input" style={{ width: "100%", boxSizing: "border-box", minHeight: "60px", resize: "vertical" }} /></div>
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button onClick={() => handleCreateTeam(wsId)} className="btn-ember"><Plus size={14} /> Create Team</button>
                  <button onClick={() => { setShowCreateTeam(false); setTeamForm({ name: "", description: "" }); }} className="btn-action-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showOrgChart && orgChartData && (
        <div style={s.overlay} onClick={() => { setShowOrgChart(false); setOrgChartData(null); }}>
          <div className="card-glass" style={{ border: "1px solid var(--japandi-border)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "640px", width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ ...s.modalTitle, margin: 0 }}>Org Chart</h3>
              <button onClick={() => { setShowOrgChart(false); setOrgChartData(null); }} className="btn-action-secondary" style={{ padding: "4px" }}><X size={14} /></button>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: "16px" }}>
                <div className="card-label" style={{ marginBottom: "8px" }}>Founder</div>
                <span className="tag" style={{ backgroundColor: "#ff751f22", color: "#ff751f", border: "1px solid #ff751f33" }}>
                  {orgChartData.founder?.name || orgChartData.founder?.email || "—"}
                </span>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div className="card-label" style={{ marginBottom: "8px" }}>Admins</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                  {(orgChartData.admins || []).map((a, i) => (
                    <span key={i} className="tag" style={{ backgroundColor: "#3b82f622", color: "#3b82f6", border: "1px solid #3b82f633" }}>
                      {a.name || a.email || a}
                    </span>
                  ))}
                  {(!orgChartData.admins || orgChartData.admins.length === 0) && <span style={{ fontSize: "11px", color: "var(--japandi-muted)" }}>None</span>}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div className="card-label" style={{ marginBottom: "8px" }}>Members</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                  {(orgChartData.members || []).map((m, i) => (
                    <span key={i} className="tag" style={{ backgroundColor: "#6b6b6f22", color: "var(--japandi-text)", border: "1px solid #6b6b6f33" }}>
                      {m.name || m.email || m}
                    </span>
                  ))}
                  {(!orgChartData.members || orgChartData.members.length === 0) && <span style={{ fontSize: "11px", color: "var(--japandi-muted)" }}>None</span>}
                </div>
              </div>
              {(orgChartData.teams || []).length > 0 && (
                <div>
                  <div className="card-label" style={{ marginBottom: "8px" }}>Teams</div>
                  {orgChartData.teams.map((team, i) => (
                    <div key={i} style={{ marginBottom: "8px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--japandi-text)", marginBottom: "4px" }}>{team.name}</div>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
                        {(team.members || []).map((m, j) => (
                          <span key={j} className="tag" style={{ fontSize: "10px", backgroundColor: "rgba(107,107,111,0.1)" }}>{m.name || m.email || m}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showWorkload && (
        <div style={s.overlay} onClick={() => { setShowWorkload(false); setWorkloadData([]); }}>
          <div className="card-glass" style={{ border: "1px solid var(--japandi-border)", background: "rgba(20,20,23,0.95)", backdropFilter: "blur(22px)", padding: "28px", maxWidth: "800px", width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ ...s.modalTitle, margin: 0 }}>Workload</h3>
              <button onClick={() => { setShowWorkload(false); setWorkloadData([]); }} className="btn-action-secondary" style={{ padding: "4px" }}><X size={14} /></button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                  {["Name", "Role", "Total Tasks", "Open Tasks", "Completed", "Goals", "Open Blockers", "Load Score"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--japandi-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workloadData.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--japandi-muted)" }}>No workload data available.</td></tr>
                ) : workloadData.map((wl, i) => {
                  const loadScore = wl.load_score ?? wl.total_tasks ?? 0;
                  const loadColor = loadScore > 15 ? "#ef4444" : loadScore > 5 ? "#f59e0b" : "#4ade80";
                  return (
                    <tr key={wl.user_id || i} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)", fontWeight: 600 }}>{wl.name || wl.user_name || wl.email || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-muted)" }}>{wl.role || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>{wl.total_tasks ?? "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>{wl.open_tasks ?? "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>{wl.completed_tasks ?? "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>{wl.goals ?? "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>{wl.open_blockers ?? "—"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span className="badge" style={{ backgroundColor: loadColor + "22", color: loadColor, border: "1px solid " + loadColor + "33" }}>
                          {loadScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
