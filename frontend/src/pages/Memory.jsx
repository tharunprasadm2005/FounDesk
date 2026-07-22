import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, HelpCircle, Clock } from "lucide-react";
import api from "../utils/api";
import { track } from "../utils/track";
import { Section, Grid, Stack, Inline } from "../components/layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const ICON_MAP = {
  search: Search,
  notes: FileText,
  decision: HelpCircle,
  chronicle: Clock,
};

function Icon({ name, size = 18, stroke: strokeWidth = 1.5, className = "" }) {
  const LucideIcon = ICON_MAP[name] || Search;
  return <LucideIcon size={size} strokeWidth={strokeWidth} className={className} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

function renderMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gm, "<strong class='block mt-2 mb-1 text-[13px] text-sumi-900'>$1</strong>")
    .replace(/^## (.*$)/gm, "<strong class='block mt-3 mb-1.5 text-[14px] text-sumi-900'>$1</strong>")
    .replace(/^# (.*$)/gm, "<strong class='block mt-3.5 mb-2 text-[16px] text-sumi-900 pb-1'>$1</strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code class='bg-linen-100 px-1 py-0.5 rounded-[2px] text-[11px] text-indigo-ink'>$1</code>")
    .replace(/^- (.*$)/gm, "<span class='block pl-3.5 relative my-0.5'>• $1</span>")
    .replace(/\n/g, "<br/>");
  return html;
}

const TYPE_ICONS = {
  product: { emoji: "△", color: "text-indigo-ink" },
  hiring: { emoji: "○", color: "text-clay-500" },
  sales: { emoji: "◇", color: "text-moss-600" },
  financial: { emoji: "☆", color: "text-amber-600" },
  technical: { emoji: "□", color: "text-indigo-ink" },
  strategic: { emoji: "⊙", color: "text-clay-500" },
};

const STATUS_ORDER = ["pending_confirmation", "confirmed", "dismissed", "reversed", "superseded"];

function Memory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("decisions");
  const [decisions, setDecisions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelineInfo, setPipelineInfo] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [notesSearchQuery, setNotesSearchQuery] = useState("");
  const [notesTypeFilter, setNotesTypeFilter] = useState("");
  const [notesStatusFilter, setNotesStatusFilter] = useState("");

  const [chronicleEvents, setChronicleEvents] = useState([]);
  const [chronicleLoading, setChronicleLoading] = useState(false);
  const [chronicleSearch, setChronicleSearch] = useState("");
  const [chronicleTypeFilter, setChronicleTypeFilter] = useState("");
  const [chronicleStageFilter, setChronicleStageFilter] = useState("");
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMoreChronicle, setHasMoreChronicle] = useState(false);
  const [chronicleTotalCount, setChronicleTotalCount] = useState(0);
  const limit = 30;

  const [pastPackets, setPastPackets] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState("");
  const [knowledgeCategoryFilter, setKnowledgeCategoryFilter] = useState("");
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [syncingKnowledge, setSyncingKnowledge] = useState(false);
  const [addKnowledgeForm, setAddKnowledgeForm] = useState({ title: "", knowledge_type: "documentation", summary: "", key_points: "", applicable_to: "" });

  const [editingDecisionId, setEditingDecisionId] = useState(null);
  const [editForm, setEditForm] = useState({ decision: "", context: "" });

  const [showAddDecision, setShowAddDecision] = useState(false);
  const [addDecisionForm, setAddDecisionForm] = useState({ decision: "", context: "", decision_type: "product" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new-decision") {
      setActiveTab("decisions");
      setShowAddDecision(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchMemoryData = async () => {
    try {
      setLoading(true);
      const decisionsParams = new URLSearchParams();
      if (searchQuery.trim()) decisionsParams.set("search", searchQuery);
      if (statusFilter) decisionsParams.set("status", statusFilter);
      if (typeFilter) decisionsParams.set("decision_type", typeFilter);
      const decisionsQs = decisionsParams.toString() ? `?${decisionsParams.toString()}` : "";

      const notesParams = new URLSearchParams();
      if (notesSearchQuery.trim()) notesParams.set("search", notesSearchQuery);
      if (notesTypeFilter) notesParams.set("meeting_type", notesTypeFilter);
      if (notesStatusFilter) notesParams.set("status", notesStatusFilter);
      const notesQs = notesParams.toString() ? `?${notesParams.toString()}` : "";

      const [decisionsRes, notesRes, infoRes] = await Promise.all([
        api.get(`/api/decisions${decisionsQs}`),
        api.get(`/api/notes${notesQs}`),
        api.get("/api/pipeline/status").catch(() => ({ data: null }))
      ]);
      setDecisions(decisionsRes.data);
      setNotes(notesRes.data);
      if (infoRes?.data) setPipelineInfo(infoRes.data);
    } catch (err) {
      console.error("Failed to fetch memory data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChronicleData = async (reset = false) => {
    try {
      setChronicleLoading(true);
      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams();
      params.set("limit", limit);
      params.set("offset", currentOffset);
      if (chronicleSearch.trim()) params.set("search", chronicleSearch);
      if (chronicleTypeFilter) params.set("event_type", chronicleTypeFilter);
      if (chronicleStageFilter) params.set("stage", chronicleStageFilter);
      const res = await api.get(`/api/chronicle?${params.toString()}`);
      if (reset) {
        setChronicleEvents(res.data.events);
        setOffset(limit);
      } else {
        setChronicleEvents(prev => [...prev, ...res.data.events]);
        setOffset(prev => prev + limit);
      }
      setHasMoreChronicle(res.data.has_more);
      setChronicleTotalCount(res.data.total_count || 0);
    } catch (err) {
      console.error("Failed to fetch chronicle timeline:", err);
    } finally {
      setChronicleLoading(false);
    }
  };

  const fetchKnowledgeData = async () => {
    try {
      const params = new URLSearchParams();
      if (knowledgeSearchQuery.trim()) params.set("search", knowledgeSearchQuery);
      if (knowledgeCategoryFilter) params.set("knowledge_type", knowledgeCategoryFilter);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const [knowledgeRes, packetsRes] = await Promise.all([
        api.get(`/api/knowledge${qs}`),
        api.get("/api/handoff/packets"),
      ]);
      setKnowledgeItems(knowledgeRes.data);
      setPastPackets(packetsRes.data);
    } catch (err) {
      console.error("Failed to fetch handoff/knowledge data:", err);
    }
  };

  useEffect(() => {
    track("page_viewed", { page: "memory" });
    fetchMemoryData();
    api.post("/api/notes/auto-process").catch(err => console.error("[Memory] Auto-process notes failed:", err));
    api.post("/api/pattern-engine/run-all").catch(err => console.error("[Memory] Pattern engine run-all failed:", err));
  }, []);

  useEffect(() => {
    const d = setTimeout(() => fetchMemoryData(), 300);
    return () => clearTimeout(d);
  }, [searchQuery, statusFilter, typeFilter, notesSearchQuery, notesTypeFilter, notesStatusFilter]);

  useEffect(() => {
    if (activeTab === "chronicle") {
      setOffset(0);
      fetchChronicleData(true);
    }
    if (activeTab === "handoff") {
      fetchKnowledgeData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "chronicle") {
      const d = setTimeout(() => { setOffset(0); fetchChronicleData(true); }, 300);
      return () => clearTimeout(d);
    }
  }, [activeTab, chronicleSearch, chronicleTypeFilter, chronicleStageFilter]);

  useEffect(() => {
    if (activeTab === "handoff") {
      const d = setTimeout(() => fetchKnowledgeData(), 300);
      return () => clearTimeout(d);
    }
  }, [activeTab, knowledgeSearchQuery, knowledgeCategoryFilter]);

  const handleNoteStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/api/notes/${id}`, { status: newStatus });
      track("note_status_updated", { noteId: id, newStatus });
      fetchMemoryData();
    } catch (err) {
      console.error("Note status update failed:", err);
    }
  };

  const handleConfirmDecision = async (id) => {
    const decision = decisions.find(d => d.id === id);
    if (!decision) return;
    try {
      await api.put(`/api/decisions/${id}`, { status: "Confirmed" });
      track("decision_confirmed", { decisionId: id });
      fetchMemoryData();
    } catch (err) {
      console.error("Failed to confirm decision:", err);
    }
  };

  const handleDeleteDecision = async (id) => {
    try {
      await api.delete(`/api/decisions/${id}`);
      track("decision_deleted", { decisionId: id });
      fetchMemoryData();
    } catch (err) {
      console.error("Failed to delete decision:", err);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await api.delete(`/api/notes/${id}`);
      track("note_deleted", { noteId: id });
      fetchMemoryData();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const handleDeleteKnowledge = async (id) => {
    try {
      await api.delete(`/api/knowledge/${id}`);
      track("knowledge_deleted", { knowledgeId: id });
      fetchKnowledgeData();
    } catch (err) {
      console.error("Failed to delete knowledge item:", err);
    }
  };

  const handleVerifyKnowledge = async (id) => {
    try {
      await api.put(`/api/knowledge/${id}`, { status: "verified" });
      track("knowledge_verified", { knowledgeId: id });
      fetchKnowledgeData();
    } catch (err) {
      console.error("Failed to verify knowledge:", err);
    }
  };

  const handleSyncKnowledge = async () => {
    setSyncingKnowledge(true);
    try {
      await api.post("/api/pattern-engine/run-all");
      track("knowledge_synced");
      setTimeout(() => fetchKnowledgeData(), 2000);
    } catch (err) {
      console.error("Failed to sync knowledge:", err);
    } finally {
      setSyncingKnowledge(false);
    }
  };

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/knowledge", {
        ...addKnowledgeForm,
        key_points: addKnowledgeForm.key_points.split("\n").filter(Boolean),
      });
      setShowAddKnowledge(false);
      setAddKnowledgeForm({ title: "", knowledge_type: "documentation", summary: "", key_points: "", applicable_to: "" });
      track("knowledge_created");
      fetchKnowledgeData();
    } catch (err) {
      console.error("Failed to add knowledge:", err);
    }
  };

  const handleAddDecision = async (e) => {
    e.preventDefault();
    if (!addDecisionForm.decision.trim()) return;
    try {
      await api.post("/api/decisions", {
        decision: addDecisionForm.decision,
        context: addDecisionForm.context,
        decision_type: addDecisionForm.decision_type,
        status: "Confirmed"
      });
      setShowAddDecision(false);
      setAddDecisionForm({ decision: "", context: "", decision_type: "product" });
      track("decision_created_manually");
      fetchMemoryData();
    } catch (err) {
      console.error("Failed to add decision manually:", err);
    }
  };

  const startEditing = (decision) => {
    setEditingDecisionId(decision.id);
    setEditForm({ decision: decision.decision, context: decision.context || "" });
  };

  const cancelEditing = () => {
    setEditingDecisionId(null);
    setEditForm({ decision: "", context: "" });
  };

  const saveEditing = async (id) => {
    try {
      await api.put(`/api/decisions/${id}`, editForm);
      track("decision_updated", { decisionId: id });
      setEditingDecisionId(null);
      fetchMemoryData();
    } catch (err) {
      console.error("Failed to update decision:", err);
    }
  };

  const tabs = [
    { id: "decisions", label: "Decision Log", icon: "decision" },
    { id: "notes", label: "Meeting Notes", icon: "notes" },
    { id: "handoff", label: "Knowledge Transfer", icon: "search" },
    { id: "chronicle", label: "Chronicle Timeline", icon: "chronicle" },
  ];

  const decisionTypeColor = (type) => TYPE_ICONS[type] || { emoji: "●", color: "text-stone-400" };
  const statusLabel = (s) => (s || "proposed").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const subtitleMap = {
    decisions: `Logging ${decisions.length} ${decisions.length === 1 ? 'decision' : 'decisions'}`,
    notes: `${notes.length} meeting ${notes.length === 1 ? 'note' : 'notes'} archived`,
    handoff: `${knowledgeItems.length} knowledge ${knowledgeItems.length === 1 ? 'item' : 'items'}`,
    chronicle: `${chronicleTotalCount} timeline ${chronicleTotalCount === 1 ? 'event' : 'events'}`,
  };

  return (
    <Section padding="p-0" className="max-w-7xl mx-auto w-full font-ui flex flex-col h-full">
      <header className="mb-[64px] shrink-0">
        <Inline justify="justify-between" items="items-start">
          <Stack gap="gap-[8px]">
            <h1 className="text-[32px] md:text-[40px] font-heading text-sumi-900 m-0">Memory Vault</h1>
            <p className="text-[12px] font-mono text-stone-400 m-0 uppercase tracking-widest">{subtitleMap[activeTab]}</p>
          </Stack>
        </Inline>
      </header>

      <div className="mb-[32px] shrink-0">
        <Inline gap="gap-[8px]" className="p-[4px] bg-linen-100 rounded-[4px] border border-stone-200 w-fit flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-[8px] px-[16px] py-[8px] rounded-[2px] text-[13px] font-medium transition-colors cursor-pointer outline-none ${
                activeTab === tab.id 
                  ? "bg-washi-white text-sumi-900 shadow-sm border border-stone-200" 
                  : "text-stone-400 hover:text-sumi-900 border border-transparent bg-transparent"
              }`}
            >
              <Icon name={tab.icon} size={14} /> {tab.label}
            </button>
          ))}
        </Inline>
      </div>

      <div className="flex-1 overflow-hidden min-h-[500px]">
        {activeTab === "decisions" && (
          <div className="animate-in fade-in h-full overflow-y-auto pr-2 pb-8">
            <Inline gap="gap-[16px]" className="mb-[24px] flex-wrap items-center">
              <Input 
                type="text" 
                placeholder="Search decisions..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="w-[280px]" 
                icon={<Search size={14} />}
              />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                <option value="">All Statuses</option>
                <option value="pending_confirmation">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="dismissed">Dismissed</option>
                <option value="reversed">Reversed</option>
                <option value="superseded">Superseded</option>
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                <option value="">All Types</option>
                <option value="product">Product</option>
                <option value="hiring">Hiring</option>
                <option value="sales">Sales</option>
                <option value="financial">Financial</option>
                <option value="technical">Technical</option>
                <option value="strategic">Strategic</option>
              </select>
              <Button variant="primary" onClick={() => setShowAddDecision(!showAddDecision)}>+ Log Decision</Button>
            </Inline>

            {showAddDecision && (
              <Card padding="p-[24px]" className="mb-[24px] bg-washi-white shadow-sm">
                <form onSubmit={handleAddDecision}>
                  <Stack gap="gap-[16px]">
                    <Input placeholder="Decision text..." value={addDecisionForm.decision} onChange={e => setAddDecisionForm(f => ({ ...f, decision: e.target.value }))} required />
                    <textarea placeholder="Context / details..." value={addDecisionForm.context} onChange={e => setAddDecisionForm(f => ({ ...f, context: e.target.value }))} rows={3}
                      className="w-full min-h-[80px] p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans resize-y" />
                    <select value={addDecisionForm.decision_type} onChange={e => setAddDecisionForm(f => ({ ...f, decision_type: e.target.value }))}
                      className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                      <option value="product">Product</option>
                      <option value="hiring">Hiring</option>
                      <option value="sales">Sales</option>
                      <option value="financial">Financial</option>
                      <option value="technical">Technical</option>
                      <option value="strategic">Strategic</option>
                    </select>
                    <Inline gap="gap-[12px]">
                      <Button type="submit" variant="primary">Save</Button>
                      <Button type="button" variant="secondary" onClick={() => setShowAddDecision(false)}>Cancel</Button>
                    </Inline>
                  </Stack>
                </form>
              </Card>
            )}

            {loading ? (
              <div className="py-[64px] text-center text-stone-400 text-[13px]">Loading...</div>
            ) : decisions.length === 0 ? (
              <Card padding="p-[48px]" className="text-center bg-linen-100/50 border-dashed border-stone-200">
                <p className="text-stone-400 text-[14px] font-medium m-0">No decisions yet</p>
                {pipelineInfo && (
                  <div className="mt-4 text-[12px] text-stone-400 leading-relaxed font-mono">
                    <div>Integrations: {(pipelineInfo.integrations_connected || 0)} connected</div>
                    <div>Events fetched: {pipelineInfo.raw_events_count || 0}</div>
                  </div>
                )}
              </Card>
            ) : (
              <Grid cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" gap="gap-[24px]">
                {decisions.map(d => {
                  const tc = decisionTypeColor(d.decision_type);
                  const isEditing = editingDecisionId === d.id;
                  const needsConfirm = d.ai_status === "pending_confirmation" || (!d.ai_status && d.status === "Proposed");
                  const isPending = d.ai_status === "pending_confirmation" || (!d.ai_status && d.status === "Proposed");
                  const isConfirmed = d.status === "Confirmed" || d.ai_status === "confirmed";

                  return (
                    <Card key={d.id} padding="p-[24px]" className="flex flex-col h-full bg-washi-white hover:border-stone-400 transition-colors">
                      <Inline justify="justify-between" items="items-start" className="mb-[16px]">
                        <Inline gap="gap-[8px]" items="items-center" className="flex-wrap">
                          {isPending ? (
                            <span className="px-[8px] py-[4px] rounded-[2px] bg-clay-500/10 text-clay-500 text-[11px] font-bold tracking-wide uppercase">
                              {statusLabel(d.ai_status || d.status || "proposed")}
                            </span>
                          ) : isConfirmed ? (
                            <span className="px-[8px] py-[4px] rounded-[2px] bg-moss-600/10 text-moss-600 text-[11px] font-bold tracking-wide uppercase">
                              {statusLabel(d.ai_status || d.status || "proposed")}
                            </span>
                          ) : (
                            <span className="px-[8px] py-[4px] rounded-[2px] bg-stone-200 text-stone-500 text-[11px] font-bold tracking-wide uppercase">
                              {statusLabel(d.ai_status || d.status || "proposed")}
                            </span>
                          )}
                          {d.decision_type && (
                            <span className={`px-[8px] py-[4px] rounded-[2px] bg-linen-100 ${tc.color} text-[11px] font-bold tracking-wide uppercase border border-stone-200`}>
                              {tc.emoji} {d.decision_type}
                            </span>
                          )}
                        </Inline>
                      </Inline>

                      {isEditing ? (
                        <Stack gap="gap-[12px]" className="flex-1">
                          <Input value={editForm.decision} onChange={e => setEditForm(f => ({ ...f, decision: e.target.value }))} className="font-bold text-[14px]" />
                          <textarea value={editForm.context} onChange={e => setEditForm(f => ({ ...f, context: e.target.value }))} rows={4}
                            className="w-full p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans resize-y" />
                          <Inline gap="gap-[12px]">
                            <Button onClick={() => saveEditing(d.id)} variant="primary" size="sm">Save</Button>
                            <Button onClick={cancelEditing} variant="secondary" size="sm">Cancel</Button>
                          </Inline>
                        </Stack>
                      ) : (
                        <Stack gap="gap-[12px]" className="flex-1">
                          <div className="text-[16px] font-medium text-sumi-900 leading-snug">{d.decision}</div>
                          <div className="text-[13px] text-stone-400 leading-relaxed line-clamp-3">{d.context}</div>
                        </Stack>
                      )}

                      {!isEditing && (
                        <Inline gap="gap-[12px]" items="items-center" className="mt-6 pt-4 border-t border-stone-200 w-full">
                          {needsConfirm && (
                            <Button onClick={() => handleConfirmDecision(d.id)} variant="secondary" size="sm" className="text-moss-600 border-moss-600/30 hover:bg-moss-600/10">
                              ✓ Confirm
                            </Button>
                          )}
                          <Button onClick={() => startEditing(d)} variant="secondary" size="sm">Edit</Button>
                          <Button onClick={() => handleDeleteDecision(d.id)} variant="secondary" size="sm" className="ml-auto text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">Delete</Button>
                        </Inline>
                      )}
                    </Card>
                  );
                })}
              </Grid>
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="animate-in fade-in h-full overflow-y-auto pr-2 pb-8">
            <Inline gap="gap-[16px]" className="mb-[24px] flex-wrap items-center">
              <Input 
                type="text" 
                placeholder="Search notes..." 
                value={notesSearchQuery} 
                onChange={e => setNotesSearchQuery(e.target.value)} 
                className="w-[280px]" 
                icon={<Search size={14} />}
              />
              <select value={notesTypeFilter} onChange={e => setNotesTypeFilter(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                <option value="">All Types</option>
                <option value="Sprint Planning">Sprint Planning</option>
                <option value="Standup">Standup</option>
                <option value="Investor Sync">Investor Sync</option>
                <option value="Client Call">Client Call</option>
                <option value="Retro">Retro</option>
                <option value="1:1">1:1</option>
                <option value="All Hands">All Hands</option>
                <option value="Brainstorm">Brainstorm</option>
                <option value="Review">Review</option>
                <option value="Other">Other</option>
              </select>
              <select value={notesStatusFilter} onChange={e => setNotesStatusFilter(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Finalized">Finalized</option>
                <option value="Archived">Archived</option>
              </select>
            </Inline>

            {loading ? (
              <div className="py-[64px] text-center text-stone-400 text-[13px]">Loading...</div>
            ) : notes.length === 0 ? (
              <Card padding="p-[48px]" className="text-center bg-linen-100/50 border-dashed border-stone-200">
                <p className="text-stone-400 text-[14px] font-medium m-0">No meeting notes yet</p>
              </Card>
            ) : (
              <Grid cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" gap="gap-[24px]">
                {notes.map(n => {
                  const getMeetingTypeTagClass = (type) => {
                    const t = type || "";
                    if (t === "Investor Sync") return "bg-clay-500/10 text-clay-500";
                    if (t === "Review") return "bg-amber-600/10 text-amber-600";
                    return "bg-linen-100 text-stone-500 border border-stone-200";
                  };

                  const isFinalized = n.status === "Finalized";

                  return (
                    <Card key={n.id} padding="p-[24px]" className="flex flex-col h-full bg-washi-white hover:border-stone-400 transition-colors">
                      <Inline justify="justify-between" items="items-start" className="mb-[16px] flex-wrap">
                        <span className={`px-[8px] py-[4px] rounded-[2px] text-[11px] font-bold tracking-wide uppercase ${getMeetingTypeTagClass(n.meeting_type)}`}>{n.meeting_type}</span>
                        <span className="text-[11px] text-stone-400 font-mono tracking-wide">{n.meeting_date || n.created_at?.split("T")[0] || ""}</span>
                      </Inline>
                      <div className="text-[16px] font-medium text-sumi-900 mb-[8px] leading-snug">{n.title}</div>
                      <div className="text-[12px] text-stone-400 mb-[16px] italic">{n.attendees}</div>
                      <div className="text-[13px] text-stone-500 leading-relaxed line-clamp-4 flex-1 mb-[24px]">{n.summary}</div>
                      <Inline gap="gap-[12px]" items="items-center" className="mt-auto pt-4 border-t border-stone-200 w-full">
                        <select value={n.status || "Draft"} onChange={e => handleNoteStatusChange(n.id, e.target.value)}
                          className="h-[32px] px-2 rounded-[4px] border border-stone-200 bg-transparent text-[12px] font-medium outline-none cursor-pointer" style={{ color: isFinalized ? "var(--moss-600)" : "var(--sumi-900)" }}>
                          <option value="Draft">Draft</option>
                          <option value="Finalized">Finalized</option>
                          <option value="Archived">Archived</option>
                        </select>
                        <Button onClick={() => handleDeleteNote(n.id)} variant="secondary" size="sm" className="ml-auto text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">
                          Delete
                        </Button>
                      </Inline>
                    </Card>
                  );
                })}
              </Grid>
            )}
          </div>
        )}

        {activeTab === "handoff" && (
          <div className="animate-in fade-in h-full overflow-y-auto pr-2 pb-8">
            <Inline gap="gap-[16px]" className="mb-[24px] flex-wrap items-center">
              <Input 
                type="text" 
                placeholder="Search knowledge..." 
                value={knowledgeSearchQuery} 
                onChange={e => setKnowledgeSearchQuery(e.target.value)} 
                className="w-[280px]" 
                icon={<Search size={14} />}
              />
              <select value={knowledgeCategoryFilter} onChange={e => setKnowledgeCategoryFilter(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                <option value="">All Types</option>
                <option value="lesson_learned">Lessons Learned</option>
                <option value="architecture">Architecture</option>
                <option value="playbook">Playbooks</option>
                <option value="insight">Insights</option>
                <option value="best_practice">Best Practices</option>
                <option value="documentation">Documentation</option>
                <option value="retrospective">Retrospectives</option>
                <option value="tip">Tips</option>
              </select>
              <Button onClick={handleSyncKnowledge} disabled={syncingKnowledge} variant="secondary">
                {syncingKnowledge ? "Syncing..." : "Sync Knowledge"}
              </Button>
              <Button onClick={() => setShowAddKnowledge(!showAddKnowledge)} variant="primary">
                + Add Knowledge
              </Button>
            </Inline>

            {showAddKnowledge && (
              <Card padding="p-[24px]" className="mb-[24px] bg-washi-white shadow-sm">
                <form onSubmit={handleAddKnowledge}>
                  <Stack gap="gap-[16px]">
                    <Input placeholder="Title" value={addKnowledgeForm.title} onChange={e => setAddKnowledgeForm(f => ({ ...f, title: e.target.value }))} required />
                    <select value={addKnowledgeForm.knowledge_type} onChange={e => setAddKnowledgeForm(f => ({ ...f, knowledge_type: e.target.value }))} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                      <option value="documentation">Documentation</option>
                      <option value="lesson_learned">Lessons Learned</option>
                      <option value="architecture">Architecture</option>
                      <option value="playbook">Playbook</option>
                      <option value="insight">Insight</option>
                      <option value="best_practice">Best Practice</option>
                      <option value="retrospective">Retrospective</option>
                      <option value="tip">Tip</option>
                    </select>
                    <textarea placeholder="Summary" value={addKnowledgeForm.summary} onChange={e => setAddKnowledgeForm(f => ({ ...f, summary: e.target.value }))} rows={3} className="w-full p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans resize-y" />
                    <textarea placeholder="Key points (one per line)" value={addKnowledgeForm.key_points} onChange={e => setAddKnowledgeForm(f => ({ ...f, key_points: e.target.value }))} rows={3} className="w-full p-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 font-sans resize-y" />
                    <Input placeholder="Applies to" value={addKnowledgeForm.applicable_to} onChange={e => setAddKnowledgeForm(f => ({ ...f, applicable_to: e.target.value }))} />
                    <Inline gap="gap-[12px]">
                      <Button type="submit" variant="primary">Save</Button>
                      <Button type="button" variant="secondary" onClick={() => setShowAddKnowledge(false)}>Cancel</Button>
                    </Inline>
                  </Stack>
                </form>
              </Card>
            )}

            {knowledgeItems.length === 0 ? (
              <Card padding="p-[48px]" className="text-center bg-linen-100/50 border-dashed border-stone-200 mb-[48px]">
                <p className="text-stone-400 text-[14px] font-medium m-0">No knowledge items yet</p>
              </Card>
            ) : (
              <Grid cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" gap="gap-[24px]" className="mb-[48px]">
                {knowledgeItems.map(k => {
                  const getKnowledgeTagClass = (type) => {
                    const t = type || "";
                    if (t === "best_practice" || t === "insight" || t === "tip") {
                      return "bg-moss-600/10 text-moss-600 border border-moss-600/20";
                    }
                    return "bg-linen-100 text-stone-500 border border-stone-200";
                  };

                  return (
                    <Card key={k.id} padding="p-[24px]" className="flex flex-col h-full bg-washi-white hover:border-stone-400 transition-colors">
                      <Inline justify="justify-between" items="items-start" className="mb-[16px] flex-wrap">
                        <span className={`px-[8px] py-[4px] rounded-[2px] text-[11px] font-bold tracking-wide uppercase ${getKnowledgeTagClass(k.knowledge_type)}`}>
                          {k.knowledge_type?.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono tracking-wide">{k.created_at?.split("T")[0] || ""}</span>
                      </Inline>
                      <div className="text-[16px] font-medium text-sumi-900 mb-[12px] leading-snug">{k.title}</div>
                      <div className="text-[13px] text-stone-500 leading-relaxed mb-[16px]">{k.summary}</div>
                      {k.key_points?.length > 0 && (
                        <Stack gap="gap-[8px]" className="mb-[24px]">
                          {k.key_points.map((kp, i) => (
                            <div key={i} className="text-[12px] text-stone-400 pl-3 relative">
                              <span className="absolute left-0 text-stone-300">•</span>
                              {kp}
                            </div>
                          ))}
                        </Stack>
                      )}
                      <Inline align="center" gap="gap-[12px]" className="mt-auto pt-4 border-t border-stone-200 w-full">
                        {k.status === "auto_inferred" && (
                          <Button onClick={() => handleVerifyKnowledge(k.id)} variant="secondary" size="sm" className="text-moss-600 border-moss-600/30 hover:bg-moss-600/10 hover:text-moss-600">Verify</Button>
                        )}
                        <Button onClick={() => handleDeleteKnowledge(k.id)} variant="secondary" size="sm" className="ml-auto text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">Delete</Button>
                      </Inline>
                    </Card>
                  );
                })}
              </Grid>
            )}

            <Inline align="center" gap="gap-[24px]" className="mb-[32px]">
              <div className="flex-1 h-[1px] bg-stone-200" />
              <span className="text-[12px] font-bold text-stone-400 tracking-widest uppercase">Handoff Packets</span>
              <div className="flex-1 h-[1px] bg-stone-200" />
            </Inline>

            {pastPackets.length === 0 ? (
              <Card padding="p-[48px]" className="text-center bg-linen-100/50 border-dashed border-stone-200">
                <p className="text-stone-400 text-[14px] font-medium m-0">No handoff packets yet — generated automatically when team members join or leave</p>
              </Card>
            ) : (
              <Stack gap="gap-[16px]">
                {pastPackets.map(p => (
                  <Card key={p.id} padding="p-[16px]" onClick={() => setSelectedPacket(p)} className="flex items-center gap-[16px] cursor-pointer bg-washi-white hover:border-stone-400 transition-colors w-full group">
                    <div className={`w-[40px] h-[40px] rounded-[4px] flex items-center justify-center text-[16px] font-bold ${p.packet_type === "onboarding" ? "bg-moss-600/10 text-moss-600" : "bg-clay-500/10 text-clay-500"}`}>
                      {p.packet_type === "onboarding" ? "→" : "←"}
                    </div>
                    <div className="flex-1">
                      <div className="text-[15px] font-medium text-sumi-900 mb-[4px]">
                        {p.packet_type === "onboarding" ? "Onboarding" : "Offboarding"}: {p.user_name || "Unknown"}
                      </div>
                      <div className="text-[12px] text-stone-400 flex items-center gap-2">
                        <span className="font-mono">{p.created_at?.split("T")[0] || ""}</span>
                        {p.reassign_to_name && <span>• Reassigned to {p.reassign_to_name}</span>}
                        {p.reassigned_count > 0 && <span>• {p.reassigned_count} tasks reassigned</span>}
                      </div>
                    </div>
                    <span className="text-stone-300 group-hover:text-stone-400 transition-colors">
                      <Icon name="right" size={20} />
                    </span>
                  </Card>
                ))}
              </Stack>
            )}

            {selectedPacket && (
              <div onClick={() => setSelectedPacket(null)} className="fixed inset-0 bg-[#2B2A27]/20 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
                <Card onClick={e => e.stopPropagation()} padding="p-[32px]" className="w-full max-w-[720px] max-h-[85vh] overflow-y-auto bg-washi-white shadow-xl">
                  <Inline justify="justify-between" items="items-start" className="mb-[24px]">
                    <div>
                      <span className={`px-[8px] py-[4px] rounded-[2px] text-[11px] font-bold tracking-wide uppercase ${selectedPacket.packet_type === "onboarding" ? "bg-moss-600/10 text-moss-600" : "bg-clay-500/10 text-clay-500"}`}>
                        {selectedPacket.packet_type}
                      </span>
                      <div className="text-[24px] font-heading text-sumi-900 mt-[12px] mb-[4px]">
                        {selectedPacket.user_name}
                      </div>
                      <div className="text-[13px] text-stone-400 font-mono tracking-wide">{selectedPacket.created_at?.split("T")[0] || ""}</div>
                    </div>
                    <button onClick={() => setSelectedPacket(null)} className="bg-transparent border-none cursor-pointer text-stone-400 hover:text-sumi-900 outline-none p-1"><Icon name="x" size={24} /></button>
                  </Inline>
                  <div className="text-[14px] text-stone-500 leading-relaxed whitespace-pre-wrap font-sans bg-linen-100 p-6 rounded-[4px] border border-stone-200">
                    {selectedPacket.markdown_content}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {activeTab === "chronicle" && (
          <div className="animate-in fade-in h-full overflow-y-auto pr-2 pb-8">
            <Inline gap="gap-[16px]" className="mb-[24px] flex-wrap items-center">
              <Input 
                type="text" 
                placeholder="Search timeline..." 
                value={chronicleSearch} 
                onChange={e => setChronicleSearch(e.target.value)} 
                className="w-[280px]" 
                icon={<Search size={14} />}
              />
              <select value={chronicleTypeFilter} onChange={e => setChronicleTypeFilter(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                <option value="">All Types</option>
                <option value="decision">Decision</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="integration">Integration</option>
                <option value="milestone">Milestone</option>
              </select>
              <select value={chronicleStageFilter} onChange={e => setChronicleStageFilter(e.target.value)} className="h-[40px] px-3 rounded-[4px] border border-stone-200 bg-washi-white text-sumi-900 text-[13px] outline-none focus:border-sumi-900 transition-colors">
                <option value="">All Stages</option>
                <option value="Ideate">Ideate</option>
                <option value="Build">Build</option>
                <option value="Launch">Launch</option>
                <option value="Grow">Grow</option>
              </select>
            </Inline>

            {chronicleLoading && chronicleEvents.length === 0 ? (
              <div className="py-[64px] text-center text-stone-400 text-[13px]">Loading...</div>
            ) : chronicleEvents.length === 0 ? (
              <Card padding="p-[48px]" className="text-center bg-linen-100/50 border-dashed border-stone-200">
                <p className="text-stone-400 text-[14px] font-medium m-0">No timeline events yet</p>
              </Card>
            ) : (
              <Stack gap="gap-[16px]">
                <Card padding="p-0" className="flex flex-col overflow-hidden bg-washi-white">
                  {chronicleEvents.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      className="p-[20px] cursor-pointer border-b border-stone-200 last:border-b-0 hover:bg-linen-100/50 transition-colors"
                      onClick={() => {
                        if (ev.source_url) {
                          navigate(ev.source_url);
                        } else {
                          setExpandedEventId(expandedEventId === ev.id ? null : ev.id);
                        }
                      }}
                    >
                      <Inline justify="space-between" items="center" gap="gap-[12px]" className={`mb-${expandedEventId === ev.id ? '3' : '2'}`}>
                        <Inline items="center" gap="gap-[12px]">
                          <span className="text-[12px] text-stone-400 font-mono tracking-wide whitespace-nowrap">
                            {ev.date || ""}
                          </span>
                          <span className="px-[8px] py-[4px] rounded-[2px] bg-stone-200 text-stone-500 text-[10px] font-bold tracking-wide uppercase">
                            {ev.type || "event"}
                          </span>
                        </Inline>
                        {ev.stage && (
                          <span className="px-[8px] py-[4px] rounded-[2px] bg-linen-100 text-stone-500 border border-stone-200 text-[10px] font-bold tracking-wide uppercase">
                            {ev.stage}
                          </span>
                        )}
                      </Inline>
                      <div className="text-[15px] font-medium text-sumi-900 leading-snug">{ev.title}</div>
                      {expandedEventId === ev.id && ev.description && (
                        <div className="mt-[12px] text-[13px] text-stone-500 leading-relaxed p-[16px] bg-linen-100 rounded-[4px]"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(ev.description) }} />
                      )}
                    </div>
                  ))}
                </Card>
                {hasMoreChronicle && (
                  <div className="text-center pt-[16px]">
                    <Button onClick={() => fetchChronicleData(false)} disabled={chronicleLoading} variant="secondary">
                      {chronicleLoading ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </Stack>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

export default Memory;
