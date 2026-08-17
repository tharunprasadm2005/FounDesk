import { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { CheckCircle, AlertCircle, FileText } from "lucide-react";
import { PLAN_TIERS, FONT_SANS, getPlanDisplayName, getPlanBadgeLabel, SETTINGS_STYLE as s } from "./SettingsConstants";

export default function BillingTab() {
  const toast = useToast();

  const [billing, setBilling] = useState(null);
  const [billingConfig, setBillingConfig] = useState(null);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [invoices, setInvoices] = useState([]);

  const fetchBilling = async () => {
    try {
      const res = await api.get("/api/billing/plan");
      setBilling(res.data);
    } catch (err) {
      console.error("[Settings] Failed to fetch billing plan:", err);
      try { const r = await api.get("/api/billing/config"); setBillingConfig(r.data); } catch (err2) { console.error("[Settings] Failed to fetch billing config:", err2); }
    }
  };

  const handleChangePlan = async (plan) => {
    try { await api.post("/api/billing/change-plan", { plan }); fetchBilling(); toast(`Plan changed to ${plan}.`, "success"); } catch { toast("Failed to change plan.", "error"); }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Cancel your subscription?")) return;
    try { await api.post("/api/billing/cancel"); fetchBilling(); toast("Subscription cancelled.", "success"); } catch { toast("Failed to cancel subscription.", "error"); }
  };

  const handleReactivateSubscription = async () => {
    try { await api.post("/api/billing/reactivate"); fetchBilling(); toast("Subscription reactivated.", "success"); } catch { toast("Failed to reactivate.", "error"); }
  };

  const fetchInvoices = async () => {
    try { const res = await api.get("/api/billing/invoices"); setInvoices(Array.isArray(res.data) ? res.data : []); } catch { console.error("Failed to fetch invoices"); }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const rawPlan = billing?.plan || "starter";
  const status = billing?.subscription_status || "trial";
  const trialDays = billing?.trial_remaining_days;
  const usage = billing?.usage;
  const activePlanKey = rawPlan.toString().toLowerCase();

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {PLAN_TIERS.map(tier => {
          const isCurrent = tier.key === activePlanKey;
          const tierIndex = PLAN_TIERS.findIndex(t => t.key === activePlanKey);
          const thisIndex = PLAN_TIERS.findIndex(t => t.key === tier.key);
          const isUpgrade = thisIndex > tierIndex;
          const isDowngrade = activePlanKey !== "enterprise" && thisIndex < tierIndex && !isCurrent;
          const showCancel = isCurrent && (status === "active" || status === "trial");
          const showReactivate = isCurrent && (status === "cancelled" || status === "past_due");

          return (
            <div key={tier.key} className="card-glass" style={{ padding: "24px", border: isCurrent ? `1px solid ${tier.color}44` : "1px solid transparent", position: "relative" }}>
              {isCurrent && (
                <span className="badge" style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: tier.color + "22", color: tier.color, border: `1px solid ${tier.color}33` }}>
                  Current
                </span>
              )}
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--japandi-text)", marginBottom: "8px", fontFamily: FONT_SANS }}>{tier.name}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--japandi-text)", marginBottom: "12px" }}>
                {tier.currency === "INR" ? "\u20B9" : "$"}{tier.price}<span style={{ fontSize: "12px", fontWeight: 400, color: "var(--japandi-muted)" }}>/mo</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                {tier.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--japandi-text)" }}>
                    <CheckCircle size={10} style={{ color: tier.color }} />
                    {f}
                  </div>
                ))}
              </div>
              {isCurrent && showCancel && (
                <button onClick={handleCancelSubscription} className="btn-destructive-outline-sm" style={{ width: "100%", fontSize: "11px" }}>Cancel Subscription</button>
              )}
              {isCurrent && showReactivate && (
                <button onClick={handleReactivateSubscription} className="btn-ember" style={{ width: "100%", fontSize: "11px" }}>Reactivate</button>
              )}
              {isUpgrade && (
                <button onClick={() => handleChangePlan(tier.key)} className="btn-ember" style={{ width: "100%", fontSize: "11px" }}>Upgrade</button>
              )}
              {isDowngrade && (
                <button onClick={() => handleChangePlan(tier.key)} className="btn-action-secondary" style={{ width: "100%", fontSize: "11px" }}>Downgrade</button>
              )}
            </div>
          );
        })}
      </div>

      {trialDays !== null && trialDays !== undefined && (
        <div className="card-glass" style={{ padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: "var(--japandi-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Trial {trialDays > 0 ? `${trialDays} days remaining` : "expired"}
          </div>
          <div style={{ height: "4px", backgroundColor: "rgba(107,107,111,0.15)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, (trialDays / 30) * 100))}%`, backgroundColor: trialDays > 7 ? "var(--japandi-accent)" : "#ef4444", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {billing?.subscription_status && (
        <div className="card-glass" style={{ padding: "16px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="card-label" style={{ margin: 0 }}>Subscription Status</div>
              <div style={{ fontSize: "12px", color: "var(--japandi-text)", marginTop: "4px" }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {billing?.current_period_end && ` \u00B7 Renews ${new Date(billing.current_period_end).toLocaleDateString()}`}
              </div>
            </div>
            <span className="badge" style={{ backgroundColor: status === "active" ? "rgba(62,207,142,0.15)" : "rgba(214,130,79,0.15)", color: status === "active" ? "#4ade80" : "var(--japandi-accent)", border: "1px solid " + (status === "active" ? "rgba(62,207,142,0.2)" : "rgba(214,130,79,0.2)") }}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      )}

      <div className="card-glass" style={{ padding: "20px", marginBottom: "12px" }}>
        <div className="card-label" style={{ marginBottom: "12px" }}>Usage</div>
        {usage ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(usage).map(([key, val]) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                  <span style={{ color: "var(--japandi-muted)", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                  <span style={{ color: "var(--japandi-text)", fontWeight: 600 }}>
                    {val.used || 0}{val.limit ? ` / ${val.limit}` : ""}
                    {val.limits_exceeded && <AlertCircle size={12} style={{ color: "#ef4444", marginLeft: "4px", verticalAlign: "middle" }} />}
                  </span>
                </div>
                {val.limit && (
                  <div style={{ height: "3px", backgroundColor: "rgba(107,107,111,0.1)", borderRadius: "2px", overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, ((val.used || 0) / val.limit) * 100)}%`, backgroundColor: ((val.used || 0) / val.limit) > 0.8 || val.limits_exceeded ? "#ef4444" : "var(--japandi-accent)", borderRadius: "2px" }} />
                  </div>
                )}
                {val.limits_exceeded && (
                  <div style={{ fontSize: "10px", color: "#ef4444", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={10} /> Limit exceeded
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "var(--japandi-muted)" }}>No usage data available.</div>
        )}
      </div>

      <button onClick={() => { setShowInvoiceHistory(!showInvoiceHistory); if (!showInvoiceHistory && !invoices.length) fetchInvoices(); }} className="btn-action-secondary" style={{ marginBottom: "12px" }}>
        <FileText size={14} /> Invoice History
      </button>

      {showInvoiceHistory && (
        <div className="card-glass" style={{ padding: "16px", marginBottom: "12px" }}>
          <div className="card-label" style={{ marginBottom: "8px" }}>Invoice History</div>
          {invoices.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--japandi-muted)" }}>No invoices found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                  {["Date", "Amount", "Status", "Plan", "Payment ID"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--japandi-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "9px", letterSpacing: "1px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id || i} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>{inv.date ? new Date(inv.date).toLocaleDateString() : inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "\u2014"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--japandi-text)", fontWeight: 600 }}>{inv.amount ? `${inv.currency || "$"}${(inv.amount / 100).toFixed(2)}` : "\u2014"}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <span className="badge" style={{ backgroundColor: inv.status === "paid" ? "rgba(62,207,142,0.12)" : "rgba(107,107,111,0.12)", color: inv.status === "paid" ? "#4ade80" : "var(--japandi-muted)", fontSize: "9px" }}>
                        {inv.status || "\u2014"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--japandi-muted)" }}>{inv.plan || inv.plan_id || "\u2014"}</td>
                    <td style={{ padding: "8px 10px", color: "var(--japandi-muted)", fontFamily: "monospace", fontSize: "10px" }}>{inv.payment_id || inv.id || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
