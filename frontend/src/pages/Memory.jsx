import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, HelpCircle, Clock, Plus, RefreshCw, Gauge } from "lucide-react";
import api from "../utils/api";
import { track } from "../utils/track";

const ICON_MAP = {
  search: Search,
  notes: FileText,
  decision: HelpCircle,
  chronicle: Clock,
};

function Icon({ name, size = 18, stroke: strokeWidth = 1.5 }) {
  const LucideIcon = ICON_MAP[name] || Search;
  return <LucideIcon size={size} strokeWidth={strokeWidth} style={{ flexShrink: 0, verticalAlign: "middle" }} />;
}

function renderMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gm, "<strong style='font-size:13px;display:block;margin:10px 0 4px;color:var(--japandi-text)'>$1</strong>")
    .replace(/^## (.*$)/gm, "<strong style='font-size:14px;display:block;margin:12px 0 6px;color:var(--japandi-text)'>$1</strong>")
    .replace(/^# (.*$)/gm, "<strong style='font-size:16px;display:block;margin:14px 0 8px;color:var(--japandi-text);border-bottom: none;padding-bottom:4px'>$1</strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code style='background:rgba(214,130,79,0.15);padding:1px 5px;border-radius:3px;font-size:11px'>$1</code>")
    .replace(/^- (.*$)/gm, "<span style='display:block;padding-left:14px;position:relative;margin:2px 0'>• $1</span>")
    .replace(/\n/g, "<br/>");
  return html;
}

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
  const [showAddHandoff, setShowAddHandoff] = useState(false);
  const [handoffForm, setHandoffForm] = useState({ packet_type: "onboarding", user_name: "", role: "", note: "" });

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

  const fetchPastPackets = async () => {
    try {
      const [packetsRes, knowledgeRes] = await Promise.all([
        api.get("/api/handoff/packets"),
        api.get("/api/knowledge"),
      ]);
      setPastPackets(packetsRes.data);
      setKnowledgeItems(knowledgeRes.data);
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

  const handleCreateHandoff = async (e) => {
    e.preventDefault();
    if (!handoffForm.user_name.trim()) return;
    try {
      await api.post("/api/handoff/manual", handoffForm);
      setShowAddHandoff(false);
      setHandoffForm({ packet_type: "onboarding", user_name: "", role: "", note: "" });
      track("handoff_packet_created", { packetType: handoffForm.packet_type });
      fetchKnowledgeData();
    } catch (err) {
      console.error("Failed to create handoff packet:", err);
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

  const statusLabel = (s) => (s || "proposed").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const isPendingDecision = (d) => d.ai_status === "pending_confirmation" || (!d.ai_status && d.status === "Proposed");
  const isConfirmedDecision = (d) => d.status === "Confirmed" || d.ai_status === "confirmed";
  const isDismissedDecision = (d) => d.status === "Dismissed" || d.ai_status === "dismissed" || d.ai_status === "reversed" || d.ai_status === "superseded";

  const subtitleMap = {
    decisions: `Logging ${decisions.length} ${decisions.length === 1 ? 'decision' : 'decisions'}`,
    notes: `${notes.length} meeting ${notes.length === 1 ? 'note' : 'notes'} archived`,
    handoff: `${knowledgeItems.length} knowledge ${knowledgeItems.length === 1 ? 'item' : 'items'}`,
    chronicle: `${chronicleTotalCount} timeline ${chronicleTotalCount === 1 ? 'event' : 'events'}`,
  };

  return (
    <div className="fd-page">
      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeSlide 0.3s ease-out; }
        @keyframes fdspin { to { transform: rotate(360deg); } }
        .spin { animation: fdspin 0.8s linear infinite; }
      `}</style>

      <div className="fd-hero hero-memory" data-anchor="M">
        <div className="fd-hero-main">
          <div className="fd-hero-kicker">The vault</div>
          <h1 className="fd-hero-title">Memory Vault</h1>
          <p className="fd-hero-sub">{subtitleMap[activeTab]}</p>
        </div>
        <div className="fd-hero-side">
          <div className="fd-hero-chip">
            <span className="fd-hero-chip-num">{decisions.length}</span>
            <span className="fd-hero-chip-label">Decisions</span>
          </div>
          <div className="fd-hero-chip">
            <span className="fd-hero-chip-num">{notes.length}</span>
            <span className="fd-hero-chip-label">Notes</span>
          </div>
          <div className="fd-hero-chip">
            <span className="fd-hero-chip-num">{knowledgeItems.length}</span>
            <span className="fd-hero-chip-label">Knowledge</span>
          </div>
        </div>
      </div>

      <div className="view-tabs" style={{ marginBottom: 24, alignItems: "center" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`view-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              cursor: "pointer",
              border: "none",
              background: activeTab === tab.id ? undefined : "transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon name={tab.icon} size={14} />
            <span style={{ lineHeight: 1 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "decisions" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Search</span>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--japandi-muted)", pointerEvents: "none" }} />
                <input
                  placeholder="Search decisions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="plan-input"
                  style={{ width: "100%", paddingLeft: "34px", fontSize: "12.5px", height: 40 }}
                />
              </div>
            </div>
            <div style={{ minWidth: 150 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Status</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="plan-select" style={{ fontSize: "12.5px", height: 40, width: "100%" }}>
                <option value="">All Statuses</option>
                <option value="pending_confirmation">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="dismissed">Dismissed</option>
                <option value="reversed">Reversed</option>
                <option value="superseded">Superseded</option>
              </select>
            </div>
            <div style={{ minWidth: 150 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Type</span>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="plan-select" style={{ fontSize: "12.5px", height: 40, width: "100%" }}>
                <option value="">All Types</option>
                <option value="product">Product</option>
                <option value="hiring">Hiring</option>
                <option value="sales">Sales</option>
                <option value="financial">Financial</option>
                <option value="technical">Technical</option>
                <option value="strategic">Strategic</option>
              </select>
            </div>
            <span style={{ fontSize: 11, color: "var(--japandi-muted)", fontWeight: 600, paddingBottom: 12 }}>{decisions.length} {decisions.length === 1 ? "decision" : "decisions"}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <button onClick={() => setShowAddDecision(!showAddDecision)} className="btn-ember" style={{ height: 40, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} strokeWidth={2.5} />
                <span>Log Decision</span>
              </button>
            </div>
          </div>

          {showAddDecision && (
            <form onSubmit={handleAddDecision} className="card-glass" style={{ padding: "24px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="What did you decide?" value={addDecisionForm.decision} onChange={e => setAddDecisionForm(f => ({ ...f, decision: e.target.value }))} required
                className="plan-input" style={{ width: "100%", fontSize: "12.5px" }} />
              <textarea placeholder="Why, and what led to this call..." value={addDecisionForm.context} onChange={e => setAddDecisionForm(f => ({ ...f, context: e.target.value }))} rows={3}
                className="plan-input" style={{ width: "100%", fontSize: "12px", fontFamily: "inherit" }} />
              <select value={addDecisionForm.decision_type} onChange={e => setAddDecisionForm(f => ({ ...f, decision_type: e.target.value }))} className="plan-select" style={{ fontSize: "12px" }}>
                <option value="product">Product</option>
                <option value="hiring">Hiring</option>
                <option value="sales">Sales</option>
                <option value="financial">Financial</option>
                <option value="technical">Technical</option>
                <option value="strategic">Strategic</option>
              </select>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="submit" className="btn-ember">Save</button>
                <button type="button" onClick={() => setShowAddDecision(false)} className="btn-action-secondary">Cancel</button>
              </div>
            </form>
          )}

          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--japandi-muted)", fontSize: 13 }}>Loading...</div>
          ) : decisions.length === 0 ? (
            <div style={{ padding: "56px 32px", textAlign: "center", borderRadius: 18, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(214, 130, 79, 0.14)", color: "var(--japandi-accent)" }}>
                <Gauge size={20} strokeWidth={1.6} />
              </div>
              <p style={{ color: "var(--japandi-text)", fontSize: 14, fontWeight: 700, margin: 0 }}>No decisions yet</p>
              <p style={{ color: "var(--japandi-muted)", fontSize: 12.5, margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
                Decisions worth keeping will appear here once they're logged.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {decisions.map(d => {
                const getStatusTagClass = (dd) => isPendingDecision(dd) ? "tag tag-ember" : isConfirmedDecision(dd) ? "tag tag-positive" : "tag tag-graphite";
                const isEditing = editingDecisionId === d.id;
                const needsConfirm = isPendingDecision(d);

                return (
                  <div key={d.id} className="card-glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className={getStatusTagClass(d)}>{statusLabel(d.ai_status || d.status || "proposed")}</span>
                        {d.decision_type && <span className="tag tag-graphite">{d.decision_type}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--japandi-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{d.created_at?.split("T")[0] || ""}</span>
                    </div>

                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        <input value={editForm.decision} onChange={e => setEditForm(f => ({ ...f, decision: e.target.value }))}
                          className="plan-input" style={{ width: "100%", fontSize: "12.5px", fontWeight: 700 }} />
                        <textarea value={editForm.context} onChange={e => setEditForm(f => ({ ...f, context: e.target.value }))} rows={3}
                          className="plan-input" style={{ width: "100%", fontSize: "12px", fontFamily: "inherit" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => saveEditing(d.id)} className="btn-ember" style={{ height: 32, padding: "0 14px", fontSize: "11px" }}>Save</button>
                          <button onClick={cancelEditing} className="btn-action-secondary" style={{ height: 32, padding: "0 14px", fontSize: "11px" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--japandi-text)", fontFamily: "'Clash Display', sans-serif", lineHeight: 1.3 }}>{d.decision}</div>
                        {d.context && <div style={{ fontSize: 12, color: "var(--japandi-muted)", lineHeight: 1.6 }}>{d.context}</div>}
                      </>
                    )}

                    {!isEditing && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(45, 45, 45, 0.08)", fontSize: 11, minHeight: 32 }}>
                        {needsConfirm && (
                          <button onClick={() => handleConfirmDecision(d.id)} className="btn-action-success" style={{ height: 32, padding: "0 12px", fontSize: "11px", display: "inline-flex", alignItems: "center" }}>Confirm</button>
                        )}
                        <button onClick={() => startEditing(d)} className="btn-action-secondary" style={{ height: 32, padding: "0 12px", fontSize: "11px", display: "inline-flex", alignItems: "center" }}>Edit</button>
                        <button onClick={() => handleDeleteDecision(d.id)} className="btn-action-danger" style={{ marginLeft: "auto", height: 32, padding: "0 12px", fontSize: "11px", display: "inline-flex", alignItems: "center" }}>Delete</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Search</span>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--japandi-muted)", pointerEvents: "none" }} />
                <input
                  placeholder="Search notes..."
                  value={notesSearchQuery}
                  onChange={e => setNotesSearchQuery(e.target.value)}
                  className="plan-input"
                  style={{ width: "100%", paddingLeft: "34px", fontSize: "12.5px", height: 40 }}
                />
              </div>
            </div>
            <div style={{ minWidth: 150 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Type</span>
              <select value={notesTypeFilter} onChange={e => setNotesTypeFilter(e.target.value)}
                className="plan-select" style={{ fontSize: "12.5px", height: 40, width: "100%" }}>
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
            </div>
            <div style={{ minWidth: 150 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Status</span>
              <select value={notesStatusFilter} onChange={e => setNotesStatusFilter(e.target.value)}
                className="plan-select" style={{ fontSize: "12.5px", height: 40, width: "100%" }}>
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Finalized">Finalized</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <span style={{ fontSize: 11, color: "var(--japandi-muted)", fontWeight: 600, paddingBottom: 12 }}>{notes.length} notes</span>
          </div>

          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--japandi-muted)", fontSize: 13 }}>Loading...</div>
          ) : notes.length === 0 ? (
            <div style={{ padding: "56px 32px", textAlign: "center", borderRadius: 18, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(126, 142, 123, 0.14)", color: "#5F7264" }}>
                <FileText size={20} strokeWidth={1.6} />
              </div>
              <p style={{ color: "var(--japandi-text)", fontSize: 14, fontWeight: 700, margin: 0 }}>No meeting notes yet</p>
              <p style={{ color: "var(--japandi-muted)", fontSize: 12.5, margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
                Notes from calls and meetings will appear here once your calendar is connected.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {notes.map(n => {
                const getMeetingTypeTagClass = (type) => {
                  const t = type || "";
                  if (t === "Investor Sync") return "tag tag-ember";
                  if (t === "Review") return "tag tag-warning";
                  return "tag tag-graphite";
                };

                const isFinalized = n.status === "Finalized";

                return (
                  <div key={n.id} className="card-glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span className={getMeetingTypeTagClass(n.meeting_type)}>{n.meeting_type}</span>
                      <span style={{ fontSize: 10, color: "var(--japandi-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{n.meeting_date || n.created_at?.split("T")[0] || ""}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--japandi-text)", fontFamily: "'Clash Display', sans-serif", lineHeight: 1.3 }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--japandi-muted)" }}>{n.attendees}</div>
                    <div style={{ fontSize: 12, color: "var(--japandi-muted)", lineHeight: 1.6 }}>{n.summary}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(45, 45, 45, 0.08)", alignItems: "center", minHeight: 32 }}>
                      <select value={n.status || "Draft"} onChange={e => handleNoteStatusChange(n.id, e.target.value)}
                        className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: isFinalized ? "var(--japandi-green)" : "var(--japandi-text)", outline: "none", height: 32 }}>
                        <option value="Draft" style={{ background: "var(--dark-gray)", color: "var(--japandi-muted)" }}>Draft</option>
                        <option value="Finalized" style={{ background: "var(--dark-gray)", color: "var(--japandi-green)" }}>Finalized</option>
                        <option value="Archived" style={{ background: "var(--dark-gray)", color: "var(--japandi-muted)" }}>Archived</option>
                      </select>
                      <button onClick={() => handleDeleteNote(n.id)} className="btn-action-danger" style={{ marginLeft: "auto", height: 32, padding: "0 12px", fontSize: "11px", display: "inline-flex", alignItems: "center" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "handoff" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Search</span>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--japandi-muted)", pointerEvents: "none" }} />
                <input
                  placeholder="Search knowledge..."
                  value={knowledgeSearchQuery}
                  onChange={e => setKnowledgeSearchQuery(e.target.value)}
                  className="plan-input"
                  style={{ width: "100%", paddingLeft: "34px", fontSize: "12.5px", height: 40 }}
                />
              </div>
            </div>
            <div style={{ minWidth: 160 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Type</span>
              <select value={knowledgeCategoryFilter} onChange={e => setKnowledgeCategoryFilter(e.target.value)}
                className="plan-select" style={{ fontSize: "12.5px", height: 40, width: "100%" }}>
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
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <button onClick={handleSyncKnowledge} disabled={syncingKnowledge} className="btn-ember"
                style={{ cursor: syncingKnowledge ? "not-allowed" : "pointer", opacity: syncingKnowledge ? 0.6 : 1, height: 40, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <RefreshCw size={13} strokeWidth={2} className={syncingKnowledge ? "spin" : ""} />
                <span>{syncingKnowledge ? "Syncing..." : "Sync"}</span>
              </button>
              <button onClick={() => setShowAddKnowledge(!showAddKnowledge)} className="btn-ember" style={{ height: 40, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Knowledge</span>
              </button>
            </div>
          </div>

          {showAddKnowledge && (
            <form onSubmit={handleAddKnowledge} className="card-glass" style={{ padding: "24px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Title" value={addKnowledgeForm.title} onChange={e => setAddKnowledgeForm(f => ({ ...f, title: e.target.value }))} required
                className="plan-input" style={{ width: "100%", fontSize: "12.5px" }} />
              <select value={addKnowledgeForm.knowledge_type} onChange={e => setAddKnowledgeForm(f => ({ ...f, knowledge_type: e.target.value }))}
                className="plan-select" style={{ fontSize: "12px" }}>
                <option value="documentation">Documentation</option>
                <option value="lesson_learned">Lessons Learned</option>
                <option value="architecture">Architecture</option>
                <option value="playbook">Playbook</option>
                <option value="insight">Insight</option>
                <option value="best_practice">Best Practice</option>
                <option value="retrospective">Retrospective</option>
                <option value="tip">Tip</option>
              </select>
              <textarea placeholder="Summary" value={addKnowledgeForm.summary} onChange={e => setAddKnowledgeForm(f => ({ ...f, summary: e.target.value }))} rows={3}
                className="plan-input" style={{ width: "100%", fontSize: "12px", fontFamily: "inherit" }} />
              <textarea placeholder="Key points (one per line)" value={addKnowledgeForm.key_points} onChange={e => setAddKnowledgeForm(f => ({ ...f, key_points: e.target.value }))} rows={3}
                className="plan-input" style={{ width: "100%", fontSize: "12px", fontFamily: "inherit" }} />
              <input placeholder="Applies to" value={addKnowledgeForm.applicable_to} onChange={e => setAddKnowledgeForm(f => ({ ...f, applicable_to: e.target.value }))}
                className="plan-input" style={{ width: "100%", fontSize: "12.5px" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <button type="submit" className="btn-ember">Save</button>
                <button type="button" onClick={() => setShowAddKnowledge(false)} className="btn-action-secondary">Cancel</button>
              </div>
            </form>
          )}

          {knowledgeItems.length === 0 ? (
            <div style={{ padding: "56px 32px", textAlign: "center", borderRadius: 18, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201, 168, 118, 0.16)", color: "#9A7B4F" }}>
                <Search size={20} strokeWidth={1.6} />
              </div>
              <p style={{ color: "var(--japandi-text)", fontSize: 14, fontWeight: 700, margin: 0 }}>No knowledge items yet</p>
              <p style={{ color: "var(--japandi-muted)", fontSize: 12.5, margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
                Lessons, playbooks and insights accumulate here as the pipeline runs.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {knowledgeItems.map(k => {
                const getKnowledgeTagClass = (type) => {
                  const t = type || "";
                  if (t === "best_practice" || t === "insight" || t === "tip") {
                    return "tag tag-positive";
                  }
                  return "tag tag-graphite";
                };

                return (
                  <div key={k.id} className="card-glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span className={getKnowledgeTagClass(k.knowledge_type)}>
                        {k.knowledge_type?.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--japandi-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{k.created_at?.split("T")[0] || ""}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--japandi-text)", fontFamily: "'Clash Display', sans-serif", lineHeight: 1.3 }}>{k.title}</div>
                    <div style={{ fontSize: 12, color: "var(--japandi-muted)", lineHeight: 1.6 }}>{k.summary}</div>
                    {k.key_points?.length > 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--japandi-muted)", lineHeight: 1.6, paddingLeft: 12 }}>
                        {k.key_points.map((kp, i) => (
                          <div key={i} style={{ position: "relative", paddingLeft: 10 }}>• {kp}</div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(45, 45, 45, 0.08)", fontSize: 11, minHeight: 32 }}>
                      {k.status === "auto_inferred" && (
                        <button onClick={() => handleVerifyKnowledge(k.id)} className="btn-action-success" style={{ height: 32, padding: "0 12px", fontSize: "11px", display: "inline-flex", alignItems: "center" }}>Verify</button>
                      )}
                      <button onClick={() => handleDeleteKnowledge(k.id)} className="btn-action-danger" style={{ marginLeft: "auto", height: 32, padding: "0 12px", fontSize: "11px", display: "inline-flex", alignItems: "center" }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Handoff Packets ── */}
          <div style={{ marginTop: 48, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--edge)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--japandi-muted)", letterSpacing: 1, textTransform: "uppercase" }}>Handoff Packets</span>
            <button onClick={() => setShowAddHandoff(!showAddHandoff)} className="btn-ember" style={{ height: 34, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "11.5px" }}>
              <Plus size={13} strokeWidth={2.5} />
              <span>Record Join / Leave</span>
            </button>
            <div style={{ flex: 1, height: 1, background: "var(--edge)" }} />
          </div>

          {showAddHandoff && (
            <form onSubmit={handleCreateHandoff} className="card-glass" style={{ padding: "24px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Type</span>
                  <select value={handoffForm.packet_type} onChange={e => setHandoffForm(f => ({ ...f, packet_type: e.target.value }))}
                    className="plan-select" style={{ fontSize: "12.5px", width: "100%" }}>
                    <option value="onboarding">Onboarding (joined)</option>
                    <option value="offboarding">Offboarding (left)</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Member name</span>
                  <input placeholder="e.g. Arjun Mehta" value={handoffForm.user_name} onChange={e => setHandoffForm(f => ({ ...f, user_name: e.target.value }))} required
                    className="plan-input" style={{ width: "100%", fontSize: "12.5px" }} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Role</span>
                  <input placeholder="e.g. Backend Engineer (optional)" value={handoffForm.role} onChange={e => setHandoffForm(f => ({ ...f, role: e.target.value }))}
                    className="plan-input" style={{ width: "100%", fontSize: "12.5px" }} />
                </div>
              </div>
              <div>
                <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Notes</span>
                <textarea placeholder="What needs to be handed over? Access, responsibilities, context..." value={handoffForm.note} onChange={e => setHandoffForm(f => ({ ...f, note: e.target.value }))} rows={3}
                  className="plan-input" style={{ width: "100%", fontSize: "12px", fontFamily: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="submit" className="btn-ember" style={{ height: 36, padding: "0 16px", fontSize: "11.5px" }}>Create Packet</button>
                <button type="button" onClick={() => setShowAddHandoff(false)} className="btn-action-secondary" style={{ height: 36, padding: "0 16px", fontSize: "11.5px" }}>Cancel</button>
              </div>
            </form>
          )}

          {pastPackets.length === 0 ? (
            <div style={{ padding: "48px 32px", textAlign: "center", borderRadius: 18, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <p style={{ color: "var(--japandi-muted)", fontSize: 12.5, fontWeight: 600, margin: 0 }}>No handoff packets yet</p>
              <p style={{ color: "var(--japandi-muted)", fontSize: 11.5, margin: 0, maxWidth: 300, lineHeight: 1.6 }}>Record when a team member joins or leaves to generate an onboarding or offboarding packet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pastPackets.map(p => (
                <div key={p.id} className="card-glass" onClick={() => setSelectedPacket(p)}
                  style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", width: "100%" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: p.packet_type === "onboarding" ? "rgba(62, 207, 142, 0.15)" : "rgba(232, 67, 79, 0.12)", color: p.packet_type === "onboarding" ? "var(--japandi-green)" : "var(--japandi-red)" }}>
                    {p.packet_type === "onboarding" ? "→" : "←"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--japandi-text)", fontFamily: "'Clash Display', sans-serif" }}>
                      {p.packet_type === "onboarding" ? "Onboarding" : "Offboarding"}: {p.user_name || "Unknown"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--japandi-muted)" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.created_at?.split("T")[0] || ""}</span>
                      {p.reassign_to_name ? ` · Reassigned to ${p.reassign_to_name}` : ""}
                      {p.reassigned_count ? ` · ${p.reassigned_count} tasks reassigned` : ""}
                    </div>
                  </div>
                  <span style={{ color: "var(--japandi-muted)", fontSize: 16, fontWeight: 600 }}>›</span>
                </div>
              ))}
            </div>
          )}

          {/* Packet detail modal */}
          {selectedPacket && (
            <div onClick={() => setSelectedPacket(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
              <div onClick={e => e.stopPropagation()} className="card-glass" style={{ maxWidth: 680, width: "100%", maxHeight: "80vh", overflow: "auto", padding: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", background: selectedPacket.packet_type === "onboarding" ? "rgba(62, 207, 142, 0.15)" : "rgba(232, 67, 79, 0.12)", color: selectedPacket.packet_type === "onboarding" ? "var(--japandi-green)" : "var(--japandi-red)" }}>
                      {selectedPacket.packet_type}
                    </span>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--japandi-text)", fontFamily: "'Clash Display', sans-serif", marginTop: 8 }}>
                      {selectedPacket.user_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--japandi-muted)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{selectedPacket.created_at?.split("T")[0] || ""}</div>
                  </div>
                  <button onClick={() => setSelectedPacket(null)} className="btn-action-secondary" style={{ fontSize: 14, padding: "6px 12px" }}>✕</button>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--japandi-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {selectedPacket.markdown_content}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "chronicle" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Search</span>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--japandi-muted)", pointerEvents: "none" }} />
                <input placeholder="Search timeline..." value={chronicleSearch} onChange={e => setChronicleSearch(e.target.value)}
                  className="plan-input" style={{ width: "100%", paddingLeft: "34px", fontSize: "12.5px", height: 40 }} />
              </div>
            </div>
            <div style={{ minWidth: 150 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Type</span>
              <select value={chronicleTypeFilter} onChange={e => setChronicleTypeFilter(e.target.value)}
                className="plan-select" style={{ fontSize: "12.5px", height: 40, width: "100%" }}>
                <option value="">All Types</option>
                <option value="decision">Decision</option>
                <option value="meeting">Meeting</option>
                <option value="knowledge">Knowledge</option>
                <option value="task">Task</option>
                <option value="integration">Integration</option>
                <option value="milestone">Milestone</option>
                <option value="team_joined">Team Joined</option>
                <option value="team_left">Team Left</option>
              </select>
            </div>
            <div style={{ minWidth: 150 }}>
              <span className="card-label" style={{ display: "block", marginBottom: 6 }}>Stage</span>
              <select value={chronicleStageFilter} onChange={e => setChronicleStageFilter(e.target.value)}
                className="plan-select" style={{ fontSize: "12.5px", height: 40, width: "100%" }}>
                <option value="">All Stages</option>
                <option value="Ideate">Ideate</option>
                <option value="Build">Build</option>
                <option value="Launch">Launch</option>
                <option value="Grow">Grow</option>
              </select>
            </div>
            <span style={{ fontSize: 11, color: "var(--japandi-muted)", fontWeight: 600, paddingBottom: 12 }}>{chronicleTotalCount} {chronicleTotalCount === 1 ? 'event' : 'events'}</span>
          </div>

          {chronicleLoading && chronicleEvents.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--japandi-muted)", fontSize: 13 }}>Loading...</div>
          ) : chronicleEvents.length === 0 ? (
            <div style={{ padding: "56px 32px", textAlign: "center", borderRadius: 18, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(45, 45, 45, 0.06)", color: "#8F897F" }}>
                <Clock size={20} strokeWidth={1.6} />
              </div>
              <p style={{ color: "var(--japandi-text)", fontSize: 14, fontWeight: 700, margin: 0 }}>No timeline events yet</p>
              <p style={{ color: "var(--japandi-muted)", fontSize: 12.5, margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
                Milestones and key moments will be chronicled here over time.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card-glass" style={{ padding: "0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {chronicleEvents.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="timeline-row-hover"
                    style={{
                      padding: "16px 20px",
                      cursor: "pointer",
                      borderBottom: i === chronicleEvents.length - 1 ? "none" : "1px solid var(--japandi-border)",
                    }}
                    onClick={() => {
                      if (ev.source_url) {
                        navigate(ev.source_url);
                      } else {
                        setExpandedEventId(expandedEventId === ev.id ? null : ev.id);
                      }
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: expandedEventId === ev.id ? 8 : 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: "var(--japandi-muted)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                          {ev.date || ""}
                        </span>
                        <span className="tag tag-graphite">
                          {ev.type || "event"}
                        </span>
                      </div>
                      {ev.stage && (
                        <span className="tag tag-graphite">{ev.stage}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--japandi-text)", fontFamily: "'Clash Display', sans-serif" }}>{ev.title}</div>
                    {expandedEventId === ev.id && ev.description && (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--japandi-muted)", lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(ev.description) }} />
                    )}
                  </div>
                ))}
              </div>
              {hasMoreChronicle && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <button onClick={() => fetchChronicleData(false)} disabled={chronicleLoading} className="btn-action-secondary"
                    style={{ padding: "8px 24px", cursor: chronicleLoading ? "not-allowed" : "pointer", opacity: chronicleLoading ? 0.6 : 1 }}>
                    {chronicleLoading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Memory;
