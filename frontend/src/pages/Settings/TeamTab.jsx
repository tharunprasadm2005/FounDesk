import { useState } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { ROLE_BADGE_COLORS } from "./SettingsConstants";
import {
  UserPlus, Users, Folder, Network, BarChart3, Search, ChevronRight, UserX, UserMinus,
  Send, Plus, X
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Inline, Stack } from "../../components/layout";

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
      <div className="animate-in fade-in">
        <Button onClick={() => { setSelectedMember(null); setMemberActivity([]); }} variant="secondary" className="mb-[16px]">
          <ChevronRight size={14} className="rotate-180 mr-1" /> Back to Team
        </Button>
        <Card padding="p-[24px]" className="mb-[24px] bg-washi-white">
          <Inline justify="justify-between" items="items-center" className="mb-[24px]">
            <Inline gap="gap-[16px]" items="items-center">
              <div className="w-[48px] h-[48px] rounded-[4px] bg-clay-500/10 flex items-center justify-center text-clay-500 font-bold text-[18px] font-heading">
                {(selectedMember.user_name || selectedMember.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="text-[16px] font-medium text-sumi-900 leading-none mb-[6px]">{selectedMember.user_name || selectedMember.email || "Unnamed"}</div>
                <div className="text-[12px] text-stone-400 font-mono tracking-wide">{selectedMember.email} · {selectedMember.title || "No title"}</div>
              </div>
            </Inline>
            <span className="px-[12px] py-[6px] rounded-[2px] bg-linen-100 text-stone-500 border border-stone-200 text-[10px] font-bold tracking-widest uppercase">
              {selectedMember.role || "member"}
            </span>
          </Inline>
          <Inline gap="gap-[12px]" className="flex-wrap">
            {!isFounder && (
              <>
                <select onChange={e => handleChangeRole(wsId, selectedMember.id, e.target.value)} className="h-[36px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors" value={selectedMember.role}>
                  {["member", "admin", "manager", "developer", "designer", "viewer"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
                <Button onClick={() => handleRemoveMember(wsId, selectedMember.id)} variant="secondary" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">
                  <UserMinus size={14} className="mr-1" /> Remove
                </Button>
              </>
            )}
          </Inline>
        </Card>
        {memberActivity.length > 0 && (
          <Card padding="p-[24px]" className="bg-washi-white">
            <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px]">Recent Activity</h3>
            <Stack gap="gap-[12px]">
              {memberActivity.map((ev, i) => (
                <Inline key={ev.id || i} items="items-center" gap="gap-[12px]" className="text-[13px] text-stone-500 border-b border-stone-200 pb-[12px] last:border-b-0 last:pb-0">
                  <div className="w-[6px] h-[6px] rounded-full bg-sumi-900 shrink-0" />
                  <span className="flex-1 text-sumi-900">{ev.title || ev.event_type || "Activity"}</span>
                  <span className="text-[11px] font-mono text-stone-400">{ev.created_at ? new Date(ev.created_at).toLocaleDateString() : ""}</span>
                </Inline>
              ))}
            </Stack>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-[12px] mb-[32px]">
        <Card padding="p-[20px]" className="text-center bg-washi-white">
          <div className="text-[24px] font-heading text-sumi-900 mb-[4px]">{teamMembers.length}</div>
          <div className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">Members</div>
        </Card>
        {Object.entries(roles).map(([role, count]) => (
          <Card key={role} padding="p-[20px]" className="text-center bg-washi-white">
            <div className="text-[24px] font-heading text-sumi-900 mb-[4px]">{count}</div>
            <div className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">{role}</div>
          </Card>
        ))}
      </div>

      <Inline gap="gap-[12px]" className="mb-[24px] flex-wrap">
        <Button onClick={() => setShowInviteMember(true)} variant="primary">
          <UserPlus size={14} className="mr-1" /> Invite Member
        </Button>
        <Button onClick={() => setShowBulkInvite(true)} variant="secondary">
          <Users size={14} className="mr-1" /> Bulk Invite
        </Button>
        <Button onClick={() => { setShowSubTeams(!showSubTeams); if (!showSubTeams && wsId) fetchSubTeams(wsId); }} variant={showSubTeams ? "primary" : "secondary"}>
          <Folder size={14} className="mr-1" /> Manage Teams
        </Button>
        <Button onClick={() => { if (wsId) fetchOrgChart(wsId); }} variant="secondary">
          <Network size={14} className="mr-1" /> View Org Chart
        </Button>
        <Button onClick={() => { if (wsId) fetchWorkload(wsId); }} variant="secondary">
          <BarChart3 size={14} className="mr-1" /> View Workload
        </Button>
      </Inline>

      <Inline gap="gap-[12px]" items="items-center" className="mb-[16px] flex-wrap">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="h-[36px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[12px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors w-[140px]">
          <option value="All">All Roles</option>
          {["founder", "admin", "manager", "developer", "designer", "viewer", "member"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-[36px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[12px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors w-[140px]">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
        </select>
        <div className="flex-1 min-w-[200px]">
          <Input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchFilter} 
            onChange={e => setSearchFilter(e.target.value)} 
            icon={<Search size={14} />}
          />
        </div>
      </Inline>

      <Card padding="p-0" className="overflow-x-auto bg-washi-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-stone-200">
              {["Member", "Role", "Status", "Email", "Actions"].map(h => (
                <th key={h} className="py-[12px] px-[16px] text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filteredMembers.length === 0 ? (
              <tr><td colSpan={5} className="p-[24px] text-center text-stone-400 text-[13px]">No matching team members found.</td></tr>
            ) : filteredMembers.map(m => (
              <tr key={m.id} className="cursor-pointer hover:bg-linen-100/50 transition-colors"
                onClick={() => { setSelectedMember(m); fetchMemberActivity(wsId, m.user_id); }}>
                <td className="py-[12px] px-[16px]">
                  <Inline items="items-center" gap="gap-[12px]">
                    <div className="w-[32px] h-[32px] rounded-[4px] bg-stone-100 flex items-center justify-center text-stone-400 font-bold text-[14px] font-heading shrink-0">
                      {(m.user_name || m.email || "?")[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-sumi-900 text-[14px]">{m.user_name || m.email || "Unnamed"}</span>
                  </Inline>
                </td>
                <td className="py-[12px] px-[16px]">
                  <span className="px-[8px] py-[4px] rounded-[2px] bg-linen-100 text-stone-500 border border-stone-200 text-[10px] font-bold tracking-wide uppercase">
                    {m.role || "member"}
                  </span>
                </td>
                <td className="py-[12px] px-[16px]">
                  <span className={`text-[12px] ${m.status === "active" ? "text-moss-600" : "text-stone-400"}`}>
                    {m.status === "active" ? "Active" : m.status || "pending"}
                  </span>
                </td>
                <td className="py-[12px] px-[16px] text-[13px] text-stone-400 font-mono tracking-wide">{m.email}</td>
                <td className="py-[12px] px-[16px]">
                  <Button onClick={e => { e.stopPropagation(); handleRemoveMember(wsId, m.id); }} variant="secondary" size="icon" disabled={m.role === "founder"} className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">
                    <UserX size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showInviteMember && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setShowInviteMember(false)}>
          <Card padding="p-[32px]" className="w-full max-w-[480px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[20px] font-heading text-sumi-900 mb-[8px] m-0">Invite Member</h3>
            <p className="text-[13px] text-stone-500 mb-[24px]">Send an invitation email to join <strong>{currentWorkspace?.name || "this workspace"}</strong>.</p>
            <Input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} autoFocus />
            <Inline gap="gap-[12px]" className="mt-[24px]">
              <Button onClick={handleInviteMember} variant="primary"><Send size={14} className="mr-1" /> Send Invite</Button>
              <Button onClick={() => setShowInviteMember(false)} variant="secondary">Cancel</Button>
            </Inline>
          </Card>
        </div>
      )}

      {showBulkInvite && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setShowBulkInvite(false)}>
          <Card padding="p-[32px]" className="w-full max-w-[520px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[20px] font-heading text-sumi-900 mb-[8px] m-0">Bulk Invite</h3>
            <p className="text-[13px] text-stone-500 mb-[24px]">Enter email addresses separated by commas or new lines.</p>
            <textarea placeholder="alice@company.com, bob@company.com" value={bulkEmails} onChange={e => setBulkEmails(e.target.value)} className="w-full p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans min-h-[120px] resize-y mb-[16px]" />
            <div>
              <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Role</label>
              <select value={bulkRole} onChange={e => setBulkRole(e.target.value)} className="w-full h-[40px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors">
                {["member", "admin", "manager", "developer", "designer", "viewer"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <Inline gap="gap-[12px]" className="mt-[24px]">
              <Button onClick={() => handleBulkInvite(wsId)} variant="primary"><Send size={14} className="mr-1" /> Send Invites</Button>
              <Button onClick={() => setShowBulkInvite(false)} variant="secondary">Cancel</Button>
            </Inline>
          </Card>
        </div>
      )}
      
      {showSubTeams && (
        <Card padding="p-[24px]" className="mt-[32px] bg-washi-white">
          <Inline justify="justify-between" items="items-center" className="mb-[24px]">
            <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase m-0">Sub-Teams</h3>
            <Button onClick={() => setShowCreateTeam(true)} variant="primary" size="sm"><Plus size={12} className="mr-1" /> Create Team</Button>
          </Inline>
          {subTeams.length === 0 ? (
            <p className="text-[12px] text-stone-400 italic m-0">No sub-teams yet.</p>
          ) : selectedTeam ? (
            <div className="animate-in slide-in-from-right-4">
              <Button onClick={() => setSelectedTeam(null)} variant="secondary" size="sm" className="mb-[16px]"><ChevronRight size={14} className="rotate-180 mr-1" /> Back to Teams</Button>
              <h4 className="text-[16px] font-medium text-sumi-900 mb-[4px] m-0">{selectedTeam.name}</h4>
              <p className="text-[13px] text-stone-500 mb-[24px]">{selectedTeam.description || "No description"}</p>
              
              <div className="mb-[16px]">
                <Button onClick={() => setShowAddMember(true)} variant="secondary" size="sm"><UserPlus size={14} className="mr-1" /> Add Member</Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200">
                      {["Name", "Email", "Actions"].map(h => <th key={h} className="py-[12px] px-[16px] text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {teamMembersList.map(tm => (
                      <tr key={tm.id || tm.user_id}>
                        <td className="py-[12px] px-[16px] text-[13px] font-medium text-sumi-900">{tm.user_name || tm.name || tm.email}</td>
                        <td className="py-[12px] px-[16px] text-[12px] font-mono text-stone-400 tracking-wide">{tm.email}</td>
                        <td className="py-[12px] px-[16px]">
                          <Button onClick={() => handleRemoveTeamMember(wsId, selectedTeam.id, tm.id || tm.user_id)} variant="secondary" size="icon" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500"><UserX size={14} /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {showAddMember && (
                <Inline gap="gap-[8px]" items="items-center" className="mt-[16px] p-[16px] bg-linen-100 rounded-[4px] border border-stone-200">
                  <select value={addMemberUserId} onChange={e => setAddMemberUserId(e.target.value)} className="h-[36px] px-[12px] rounded-[4px] border border-stone-200 bg-washi-white text-[13px] text-sumi-900 outline-none focus:border-sumi-900 transition-colors flex-1">
                    <option value="">Select member...</option>
                    {teamMembers.map(m => <option key={m.user_id || m.id} value={m.user_id || m.id}>{m.user_name || m.email}</option>)}
                  </select>
                  <Button onClick={() => handleAddTeamMember(wsId, selectedTeam.id)} variant="primary">Add</Button>
                  <Button onClick={() => { setShowAddMember(false); setAddMemberUserId(""); }} variant="secondary">Cancel</Button>
                </Inline>
              )}
            </div>
          ) : (
            <Stack gap="gap-[12px]">
              {subTeams.map(team => (
                <Card key={team.id} padding="p-[16px]" className="cursor-pointer bg-washi-white hover:border-stone-400 transition-colors"
                  onClick={() => { setSelectedTeam(team); fetchTeamMembers(wsId, team.id); }}>
                  <Inline items="items-center" gap="gap-[16px]">
                    <Folder size={18} className="text-stone-400 shrink-0" />
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-sumi-900 mb-[4px]">{team.name}</div>
                      <div className="text-[12px] text-stone-400 line-clamp-1">{team.description || "No description"} · {team.member_count || team.members_count || 0} members</div>
                    </div>
                    <ChevronRight size={16} className="text-stone-400" />
                  </Inline>
                </Card>
              ))}
            </Stack>
          )}

          {showCreateTeam && (
            <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setShowCreateTeam(false)}>
              <Card padding="p-[32px]" className="w-full max-w-[480px] bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-[20px] font-heading text-sumi-900 mb-[24px] m-0">Create Team</h3>
                <Stack gap="gap-[16px]">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Name</label>
                    <Input type="text" value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[8px]">Description</label>
                    <textarea value={teamForm.description} onChange={e => setTeamForm(p => ({ ...p, description: e.target.value }))} className="w-full p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans min-h-[80px] resize-y" />
                  </div>
                  <Inline gap="gap-[12px]" className="mt-[8px]">
                    <Button onClick={() => handleCreateTeam(wsId)} variant="primary"><Plus size={14} className="mr-1" /> Create Team</Button>
                    <Button onClick={() => { setShowCreateTeam(false); setTeamForm({ name: "", description: "" }); }} variant="secondary">Cancel</Button>
                  </Inline>
                </Stack>
              </Card>
            </div>
          )}
        </Card>
      )}

      {showOrgChart && orgChartData && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => { setShowOrgChart(false); setOrgChartData(null); }}>
          <Card padding="p-[32px]" className="w-full max-w-[640px] max-h-[80vh] overflow-y-auto bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <Inline justify="justify-between" items="items-center" className="mb-[32px]">
              <h3 className="text-[20px] font-heading text-sumi-900 m-0">Org Chart</h3>
              <button onClick={() => { setShowOrgChart(false); setOrgChartData(null); }} className="bg-transparent border-none text-stone-400 hover:text-sumi-900 cursor-pointer p-0 outline-none"><X size={20} /></button>
            </Inline>
            
            <div className="text-center">
              <div className="mb-[32px]">
                <h4 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[12px] m-0">Founder</h4>
                <span className="inline-block px-[16px] py-[8px] rounded-[4px] bg-clay-500/10 text-clay-500 border border-clay-500/20 text-[13px] font-bold">
                  {orgChartData.founder?.name || orgChartData.founder?.email || "—"}
                </span>
              </div>
              
              <div className="mb-[32px]">
                <h4 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[12px] m-0">Admins</h4>
                <Inline gap="gap-[8px]" className="flex-wrap justify-center">
                  {(orgChartData.admins || []).map((a, i) => (
                    <span key={i} className="px-[12px] py-[6px] rounded-[2px] bg-stone-200 text-stone-500 border border-stone-300 text-[11px] font-bold tracking-wide">
                      {a.name || a.email || a}
                    </span>
                  ))}
                  {(!orgChartData.admins || orgChartData.admins.length === 0) && <span className="text-[12px] text-stone-400 italic">None</span>}
                </Inline>
              </div>
              
              <div className="mb-[32px]">
                <h4 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[12px] m-0">Members</h4>
                <Inline gap="gap-[8px]" className="flex-wrap justify-center">
                  {(orgChartData.members || []).map((m, i) => (
                    <span key={i} className="px-[12px] py-[6px] rounded-[2px] bg-linen-100 text-stone-500 border border-stone-200 text-[11px] font-bold tracking-wide">
                      {m.name || m.email || m}
                    </span>
                  ))}
                  {(!orgChartData.members || orgChartData.members.length === 0) && <span className="text-[12px] text-stone-400 italic">None</span>}
                </Inline>
              </div>
              
              {(orgChartData.teams || []).length > 0 && (
                <div>
                  <h4 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[16px] m-0">Teams</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] text-left">
                    {orgChartData.teams.map((team, i) => (
                      <Card key={i} padding="p-[16px]" className="bg-linen-100 border-dashed">
                        <div className="text-[14px] font-medium text-sumi-900 mb-[12px]">{team.name}</div>
                        <Inline gap="gap-[6px]" className="flex-wrap">
                          {(team.members || []).map((m, j) => (
                             <span key={j} className="px-[8px] py-[2px] rounded-[2px] bg-washi-white border border-stone-200 text-stone-500 text-[10px] font-bold tracking-wide">{m.name || m.email || m}</span>
                          ))}
                        </Inline>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {showWorkload && (
        <div className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => { setShowWorkload(false); setWorkloadData([]); }}>
          <Card padding="p-[32px]" className="w-full max-w-[860px] max-h-[85vh] overflow-y-auto bg-washi-white shadow-xl" onClick={e => e.stopPropagation()}>
            <Inline justify="justify-between" items="items-center" className="mb-[24px]">
              <h3 className="text-[20px] font-heading text-sumi-900 m-0">Workload</h3>
              <button onClick={() => { setShowWorkload(false); setWorkloadData([]); }} className="bg-transparent border-none text-stone-400 hover:text-sumi-900 cursor-pointer p-0 outline-none"><X size={20} /></button>
            </Inline>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200">
                    {["Name", "Role", "Total Tasks", "Open Tasks", "Completed", "Goals", "Open Blockers", "Load Score"].map(h => (
                      <th key={h} className="py-[12px] px-[16px] text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {workloadData.length === 0 ? (
                    <tr><td colSpan={8} className="p-[24px] text-center text-stone-400 text-[13px]">No workload data available.</td></tr>
                  ) : workloadData.map((wl, i) => {
                    const loadScore = wl.load_score ?? wl.total_tasks ?? 0;
                    const loadColor = loadScore > 15 ? "text-clay-500 bg-clay-500/10 border-clay-500/20" : loadScore > 5 ? "text-amber-600 bg-amber-600/10 border-amber-600/20" : "text-moss-600 bg-moss-600/10 border-moss-600/20";
                    return (
                      <tr key={wl.user_id || i}>
                        <td className="py-[12px] px-[16px] text-[13px] font-medium text-sumi-900">{wl.name || wl.user_name || wl.email || "—"}</td>
                        <td className="py-[12px] px-[16px]"><span className="px-[6px] py-[2px] rounded-[2px] bg-linen-100 text-stone-500 border border-stone-200 text-[10px] font-bold tracking-wide uppercase">{wl.role || "—"}</span></td>
                        <td className="py-[12px] px-[16px] text-[13px] text-sumi-900 font-mono">{wl.total_tasks ?? "—"}</td>
                        <td className="py-[12px] px-[16px] text-[13px] text-sumi-900 font-mono">{wl.open_tasks ?? "—"}</td>
                        <td className="py-[12px] px-[16px] text-[13px] text-sumi-900 font-mono">{wl.completed_tasks ?? "—"}</td>
                        <td className="py-[12px] px-[16px] text-[13px] text-sumi-900 font-mono">{wl.goals ?? "—"}</td>
                        <td className="py-[12px] px-[16px] text-[13px] text-clay-500 font-mono">{wl.open_blockers ?? "—"}</td>
                        <td className="py-[12px] px-[16px]">
                          <span className={`px-[8px] py-[4px] rounded-[2px] border text-[11px] font-bold font-mono ${loadColor}`}>
                            {loadScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
