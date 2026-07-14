import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, HelpCircle, Clock } from "lucide-react";
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
    .replace(/^### (.*$)/gm, "<strong style='font-size:13px;display:block;margin:10px 0 4px;color:var(--white)'>$1</strong>")
    .replace(/^## (.*$)/gm, "<strong style='font-size:14px;display:block;margin:12px 0 6px;color:var(--white)'>$1</strong>")
    .replace(/^# (.*$)/gm, "<strong style='font-size:16px;display:block;margin:14px 0 8px;color:var(--white);border-bottom: none;padding-bottom:4px'>$1</strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code style='background:rgba(232,80,2,0.1);padding:1px 5px;border-radius:3px;font-size:11px'>$1</code>")
    .replace(/^- (.*$)/gm, "<span style='display:block;padding-left:14px;position:relative;margin:2px 0'>• $1</span>")
    .replace(/\n/g, "<br/>");
  return html;
}

const TYPE_ICONS = {
  product: { emoji: "△", color: "#6366f1" },
  hiring: { emoji: "○", color: "#ec4899" },
  sales: { emoji: "◇", color: "#14b8a6" },
  financial: { emoji: "☆", color: "#eab308" },
  technical: { emoji: "□", color: "#a855f7" },
  strategic: { emoji: "⊙", color: "#f97316" },
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
    api.post("/api/notes/auto-process").catch(() => { });
    api.post("/api/pattern-engine/run-all").catch(() => { });
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

  const decisionTypeColor = (type) => TYPE_ICONS[type] || { emoji: "●", color: "#8a8a85" };
  const statusLabel = (s) => (s || "proposed").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const subtitleMap = {
    decisions: `Logging ${decisions.length} ${decisions.length === 1 ? 'decision' : 'decisions'}`,
    notes: `${notes.length} meeting ${notes.length === 1 ? 'note' : 'notes'} archived`,
    handoff: `${knowledgeItems.length} knowledge ${knowledgeItems.length === 1 ? 'item' : 'items'}`,
    chronicle: `${chronicleTotalCount} timeline ${chronicleTotalCount === 1 ? 'event' : 'events'}`,
  };

  return (
    <div className="memory-page" style={{ padding: "24px 32px", fontFamily: "'Satoshi', sans-serif" }}>
      <style>{`
        .memory-page input, .memory-page select, .memory-page textarea, .memory-page button {
          font-family: 'Satoshi', sans-serif;
        }
        .memory-page input:focus, .memory-page select:focus, .memory-page textarea:focus {
          outline: none;
          border-color: var(--brand-orange) !important;
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeSlide 0.3s ease-out; }
        .select-custom {
          outline: none;
          font-family: inherit;
          cursor: pointer;
        }
        .select-custom:hover {
          border-color: transparent !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--white)", fontFamily: "'Clash Display', sans-serif" }}>
          Memory Vault
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--gray)", fontWeight: 500 }}>
          {subtitleMap[activeTab]}
        </p>
      </div>

      <div className="view-tabs" style={{ marginBottom: 24 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`view-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              cursor: "pointer",
              border: "none",
              background: "transparent",
            }}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "decisions" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray)" }} />
              <input
                placeholder="Search decisions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="plan-input"
                style={{
                  width: "100%",
                  paddingLeft: "32px",
                  fontSize: "12.5px",
                }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="plan-select" style={{ fontSize: "12.5px" }}>
              <option value="">All Statuses</option>
              <option value="pending_confirmation">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="dismissed">Dismissed</option>
              <option value="reversed">Reversed</option>
              <option value="superseded">Superseded</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="plan-select" style={{ fontSize: "12.5px" }}>
              <option value="">All Types</option>
              <option value="product">Product</option>
              <option value="hiring">Hiring</option>
              <option value="sales">Sales</option>
              <option value="financial">Financial</option>
              <option value="technical">Technical</option>
              <option value="strategic">Strategic</option>
            </select>
            <button onClick={() => setShowAddDecision(!showAddDecision)} className="btn-ember">
              + Log Decision
            </button>
            <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600 }}>{decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'}</span>
          </div>

          {showAddDecision && (
            <form onSubmit={handleAddDecision} className="card-glass" style={{ padding: "20px !important", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Decision text..." value={addDecisionForm.decision} onChange={e => setAddDecisionForm(f => ({ ...f, decision: e.target.value }))} required
                className="plan-input" style={{ width: "100%", fontSize: "12.5px" }} />
              <textarea placeholder="Context / details..." value={addDecisionForm.context} onChange={e => setAddDecisionForm(f => ({ ...f, context: e.target.value }))} rows={3}
                className="plan-input" style={{ width: "100%", fontSize: "12px", fontFamily: "inherit" }} />
              <select value={addDecisionForm.decision_type} onChange={e => setAddDecisionForm(f => ({ ...f, decision_type: e.target.value }))}
                className="plan-select" style={{ fontSize: "12px" }}>
                <option value="product">Product</option>
                <option value="hiring">Hiring</option>
                <option value="sales">Sales</option>
                <option value="financial">Financial</option>
                <option value="technical">Technical</option>
                <option value="strategic">Strategic</option>
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn-ember">Save</button>
                <button type="button" onClick={() => setShowAddDecision(false)} className="btn-action-secondary">Cancel</button>
              </div>
            </form>
          )}

          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--gray)", fontSize: 13 }}>Loading...</div>
          ) : decisions.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", borderRadius: 12, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ color: "var(--gray)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>No decisions yet</p>
              {pipelineInfo && (
                <div style={{ fontSize: 11, color: "var(--gray)", lineHeight: 1.8 }}>
                  <div>Integrations: {(pipelineInfo.integrations_connected || 0)} connected</div>
                  <div>Events fetched: {pipelineInfo.raw_events_count || 0}</div>
                  <div>Last LLM call: {pipelineInfo.last_llm_call || "Never"}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {decisions.map(d => {
                const tc = decisionTypeColor(d.decision_type);
                const isEditing = editingDecisionId === d.id;
                const needsConfirm = d.ai_status === "pending_confirmation" || (!d.ai_status && d.status === "Proposed");
                const isStrategic = d.decision_type && d.decision_type.toLowerCase() === "strategic";
                const isPending = d.ai_status === "pending_confirmation" || (!d.ai_status && d.status === "Proposed");
                const isConfirmed = d.status === "Confirmed" || d.ai_status === "confirmed";

                return (
                  <div key={d.id} className="card-glass" style={{
                    padding: "16px !important",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {isPending ? (
                          <span className="tag tag-ember">
                            {statusLabel(d.ai_status || d.status || "proposed")}
                          </span>
                        ) : isConfirmed ? (
                          <span className="badge badge-positive">
                            {statusLabel(d.ai_status || d.status || "proposed")}
                          </span>
                        ) : (
                          <span className="tag tag-graphite">
                            {statusLabel(d.ai_status || d.status || "proposed")}
                          </span>
                        )}
                        {d.decision_type && (
                          <span className={`tag ${isStrategic ? "tag-ember" : "tag-graphite"}`}>
                            {tc.emoji} {d.decision_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input
                          value={editForm.decision}
                          onChange={e => setEditForm(f => ({ ...f, decision: e.target.value }))}
                          className="plan-input"
                          style={{ width: "100%", fontSize: "13px", fontWeight: 700 }}
                        />
                        <textarea
                          value={editForm.context}
                          onChange={e => setEditForm(f => ({ ...f, context: e.target.value }))}
                          rows={3}
                          className="plan-input"
                          style={{ width: "100%", fontSize: "12px", fontFamily: "inherit" }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => saveEditing(d.id)} className="btn-ember" style={{ padding: "6px 14px", fontSize: "11.5px" }}>Save</button>
                          <button onClick={cancelEditing} className="btn-action-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--white)", fontFamily: "'Clash Display', sans-serif", lineHeight: 1.3 }}>{d.decision}</div>
                        <div style={{ fontSize: 11.5, color: "var(--gray)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.context}</div>
                      </>
                    )}

                    {!isEditing && (
                      <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border-soft)", width: "100%" }}>
                        {needsConfirm && (
                          <button onClick={() => handleConfirmDecision(d.id)} className="btn-action-success">
                            ✓ Confirm
                          </button>
                        )}
                        <button onClick={() => startEditing(d)} className="btn-action-secondary">
                          ✎ Edit
                        </button>
                        <button onClick={() => handleDeleteDecision(d.id)} className="btn-action-danger" style={{ marginLeft: "auto" }}>
                          ✕ Delete
                        </button>
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
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray)" }} />
              <input
                placeholder="Search notes..."
                value={notesSearchQuery}
                onChange={e => setNotesSearchQuery(e.target.value)}
                className="plan-input"
                style={{ width: "100%", paddingLeft: "32px", fontSize: "12.5px" }}
              />
            </div>
            <select value={notesTypeFilter} onChange={e => setNotesTypeFilter(e.target.value)}
              className="plan-select" style={{ fontSize: "12.5px" }}>
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
            <select value={notesStatusFilter} onChange={e => setNotesStatusFilter(e.target.value)}
              className="plan-select" style={{ fontSize: "12.5px" }}>
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Finalized">Finalized</option>
              <option value="Archived">Archived</option>
            </select>
            <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600 }}>{notes.length} notes</span>
          </div>

          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--gray)", fontSize: 13 }}>Loading...</div>
          ) : notes.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", borderRadius: 12, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ color: "var(--gray)", fontSize: 13, fontWeight: 600 }}>No meeting notes yet</p>
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
                  <div key={n.id} className="card-glass" style={{ padding: "16px !important", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                      <span className={getMeetingTypeTagClass(n.meeting_type)}>{n.meeting_type}</span>
                      <span style={{ fontSize: 10, color: "var(--gray)", fontFamily: "'JetBrains Mono', monospace" }}>{n.meeting_date || n.created_at?.split("T")[0] || ""}</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--white)", fontFamily: "'Clash Display', sans-serif" }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "var(--gray)" }}>{n.attendees}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gray)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.summary}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border-soft)", alignItems: "center" }}>
                      <select value={n.status || "Draft"} onChange={e => handleNoteStatusChange(n.id, e.target.value)}
                        className="neu-control select-custom" style={{ cursor: "pointer", fontSize: "11px", padding: "6px 12px", border: "none", color: isFinalized ? "var(--positive)" : "var(--sand)", outline: "none" }}>
                        <option value="Draft" style={{ background: "var(--dark-gray)", color: "var(--graphite)" }}>Draft</option>
                        <option value="Finalized" style={{ background: "var(--dark-gray)", color: "var(--positive)" }}>Finalized</option>
                        <option value="Archived" style={{ background: "var(--dark-gray)", color: "var(--graphite)" }}>Archived</option>
                      </select>
                      <button onClick={() => handleDeleteNote(n.id)} className="btn-action-danger" style={{ marginLeft: "auto" }}>
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
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray)" }} />
              <input
                placeholder="Search knowledge..."
                value={knowledgeSearchQuery}
                onChange={e => setKnowledgeSearchQuery(e.target.value)}
                className="plan-input"
                style={{ width: "100%", paddingLeft: "32px", fontSize: "12.5px" }}
              />
            </div>
            <select value={knowledgeCategoryFilter} onChange={e => setKnowledgeCategoryFilter(e.target.value)}
              className="plan-select" style={{ fontSize: "12.5px" }}>
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
            <button onClick={handleSyncKnowledge} disabled={syncingKnowledge} className="btn-ember"
              style={{ cursor: syncingKnowledge ? "not-allowed" : "pointer", opacity: syncingKnowledge ? 0.6 : 1 }}>
              {syncingKnowledge ? "Syncing..." : "Sync Knowledge"}
            </button>
            <button onClick={() => setShowAddKnowledge(!showAddKnowledge)} className="btn-ember">
              + Add Knowledge
            </button>
          </div>

          {showAddKnowledge && (
            <form onSubmit={handleAddKnowledge} className="card-glass" style={{ padding: "20px !important", marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
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
            <div style={{ padding: 40, textAlign: "center", borderRadius: 12, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ color: "var(--gray)", fontSize: 13, fontWeight: 600 }}>No knowledge items yet</p>
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
                  <div key={k.id} className="card-glass" style={{ padding: "16px !important", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                      <span className={getKnowledgeTagClass(k.knowledge_type)}>
                        {k.knowledge_type?.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--gray)", fontFamily: "'JetBrains Mono', monospace" }}>{k.created_at?.split("T")[0] || ""}</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--white)", fontFamily: "'Clash Display', sans-serif" }}>{k.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gray)", lineHeight: 1.5 }}>{k.summary}</div>
                    {k.key_points?.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--light-gray)", lineHeight: 1.6, paddingLeft: 12 }}>
                        {k.key_points.map((kp, i) => (
                          <div key={i} style={{ position: "relative", paddingLeft: 10 }}>• {kp}</div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border-soft)", fontSize: 11 }}>
                      {k.status === "auto_inferred" && (
                        <button onClick={() => handleVerifyKnowledge(k.id)} className="btn-action-success">Verify</button>
                      )}
                      <button onClick={() => handleDeleteKnowledge(k.id)} className="btn-action-danger" style={{ marginLeft: "auto" }}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Handoff Packets ── */}
          <div style={{ marginTop: 48, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--edge)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gray)", letterSpacing: 1, textTransform: "uppercase" }}>Handoff Packets</span>
            <div style={{ flex: 1, height: 1, background: "var(--edge)" }} />
          </div>

          {pastPackets.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", borderRadius: 12, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ color: "var(--gray)", fontSize: 12, fontWeight: 600 }}>No handoff packets yet — generated automatically when team members join or leave</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pastPackets.map(p => (
                <div key={p.id} className="card-glass" onClick={() => setSelectedPacket(p)}
                  style={{ padding: "12px 16px !important", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", width: "100%" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: p.packet_type === "onboarding" ? "rgba(62, 207, 142, 0.15)" : "rgba(232, 67, 79, 0.12)", color: p.packet_type === "onboarding" ? "var(--positive)" : "var(--warning)" }}>
                    {p.packet_type === "onboarding" ? "→" : "←"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--white)", fontFamily: "'Clash Display', sans-serif" }}>
                      {p.packet_type === "onboarding" ? "Onboarding" : "Offboarding"}: {p.user_name || "Unknown"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--gray)" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.created_at?.split("T")[0] || ""}</span>
                      {p.reassign_to_name ? ` · Reassigned to ${p.reassign_to_name}` : ""}
                      {p.reassigned_count ? ` · ${p.reassigned_count} tasks reassigned` : ""}
                    </div>
                  </div>
                  <span style={{ color: "var(--gray)", fontSize: 16, fontWeight: 600 }}>›</span>
                </div>
              ))}
            </div>
          )}

          {/* Packet detail modal */}
          {selectedPacket && (
            <div onClick={() => setSelectedPacket(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
              <div onClick={e => e.stopPropagation()} className="card-glass" style={{ maxWidth: 680, width: "100%", maxHeight: "80vh", overflow: "auto", padding: "28px !important" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", background: selectedPacket.packet_type === "onboarding" ? "rgba(62, 207, 142, 0.15)" : "rgba(232, 67, 79, 0.12)", color: selectedPacket.packet_type === "onboarding" ? "var(--positive)" : "var(--warning)" }}>
                      {selectedPacket.packet_type}
                    </span>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", fontFamily: "'Clash Display', sans-serif", marginTop: 8 }}>
                      {selectedPacket.user_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--gray)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{selectedPacket.created_at?.split("T")[0] || ""}</div>
                  </div>
                  <button onClick={() => setSelectedPacket(null)} className="btn-action-secondary" style={{ fontSize: 14, padding: "6px 12px" }}>✕</button>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--light-gray)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {selectedPacket.markdown_content}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "chronicle" && (
        <div className="fade-in">
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray)" }} />
              <input placeholder="Search timeline..." value={chronicleSearch} onChange={e => setChronicleSearch(e.target.value)}
                className="plan-input" style={{ width: "100%", paddingLeft: "32px", fontSize: "12.5px" }} />
            </div>
            <select value={chronicleTypeFilter} onChange={e => setChronicleTypeFilter(e.target.value)}
              className="plan-select" style={{ fontSize: "12.5px" }}>
              <option value="">All Types</option>
              <option value="decision">Decision</option>
              <option value="meeting">Meeting</option>
              <option value="task">Task</option>
              <option value="integration">Integration</option>
              <option value="milestone">Milestone</option>
            </select>
            <select value={chronicleStageFilter} onChange={e => setChronicleStageFilter(e.target.value)}
              className="plan-select" style={{ fontSize: "12.5px" }}>
              <option value="">All Stages</option>
              <option value="Ideate">Ideate</option>
              <option value="Build">Build</option>
              <option value="Launch">Launch</option>
              <option value="Grow">Grow</option>
            </select>
            <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 600 }}>{chronicleTotalCount} {chronicleTotalCount === 1 ? 'event' : 'events'}</span>
          </div>

          {chronicleLoading && chronicleEvents.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--gray)", fontSize: 13 }}>Loading...</div>
          ) : chronicleEvents.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", borderRadius: 12, border: "1px dashed var(--edge)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ color: "var(--gray)", fontSize: 13, fontWeight: 600 }}>No timeline events yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card-glass" style={{ padding: "0 !important", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {chronicleEvents.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="timeline-row-hover"
                    style={{
                      padding: "16px 20px",
                      cursor: "pointer",
                      borderBottom: i === chronicleEvents.length - 1 ? "none" : "1px solid var(--border-soft)",
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
                        <span style={{ fontSize: 10, color: "var(--gray)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
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
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--white)", fontFamily: "'Clash Display', sans-serif" }}>{ev.title}</div>
                    {expandedEventId === ev.id && ev.description && (
                      <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--gray)", lineHeight: 1.6 }}
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
