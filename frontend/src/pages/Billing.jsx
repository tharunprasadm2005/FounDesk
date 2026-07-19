import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, RefreshCw, X, FileText, Download } from "lucide-react";
import { useToast } from "../context/ToastContext";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const FONT_SANS = "'Clash Display', system-ui, sans-serif";
const FONT_BODY = "'Satoshi', system-ui, sans-serif";

const PLAN_FEATURES = {
  starter: ["Up to 5 workspaces", "Unlimited integrations", "AI-powered insights", "Calendar defense", "Knowledge transfer"],
  pro: ["Unlimited workspaces", "Unlimited integrations", "Priority AI insights", "Advanced calendar defense", "Knowledge transfer", "Priority support", "Custom branding"],
  enterprise: ["Everything in Pro", "SSO/SAML", "Audit logs", "Dedicated support", "Custom SLA"],
};

export default function Billing() {
  const navigate = useNavigate();
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [showInvoices, setShowInvoices] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  const token = () => localStorage.getItem("token") || "";
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token() };

  useEffect(() => {
    fetch("/api/billing/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch((err) => console.error("[Billing] Failed to fetch billing config:", err));
    fetchPlan();

    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT;
    s.onload = () => setRazorpayLoaded(true);
    s.onerror = () => console.error("[Billing] Failed to load Razorpay script");
    document.body.appendChild(s);
    return () => { if (s.parentNode) s.parentNode.removeChild(s); };
  }, []);

  const fetchPlan = async () => {
    try {
      const res = await fetch("/api/billing/plan", { headers });
      const d = await res.json();
      setPlan(d);
      setLoading(false);
    } catch (err) {
      console.error("[Billing] Failed to fetch plan:", err);
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/billing/invoices", { headers });
      const d = await res.json();
      setInvoices(Array.isArray(d) ? d : d?.invoices || []);
      setShowInvoices(!showInvoices);
    } catch (err) { console.error("[Billing] Failed to fetch invoices:", err); }
  };

  const handleUpgrade = async (planId) => {
    if (!razorpayLoaded || !config) return toast("Razorpay not loaded yet", "error");
    setChangingPlan(true);
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST", headers,
        body: JSON.stringify({ plan: planId || "starter" }),
      });
      const order = await res.json();
      if (order.error) { toast(order.error, "error"); setChangingPlan(false); return; }

      const options = {
        key: order.key_id, amount: order.amount, currency: order.currency,
        name: "FounDesk", description: (planId || "starter").charAt(0).toUpperCase() + (planId || "starter").slice(1) + " Plan",
        order_id: order.order_id,
        handler: async function (response) {
          const verify = await fetch("/api/billing/verify", {
            method: "POST", headers,
            body: JSON.stringify(response),
          });
          const result = await verify.json();
          if (result.status === "active") {
            setPlan((p) => ({ ...p, subscription_status: "active" }));
            toast("Subscription activated!", "success");
          } else {
            toast("Payment verification failed", "error");
          }
          setChangingPlan(false);
        },
        modal: { ondismiss: () => setChangingPlan(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast("Failed to create order: " + e.message, "error");
      setChangingPlan(false);
    }
  };

  const handleChangePlan = async (newPlan) => {
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST", headers,
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await res.json();
      if (data.error) return toast(data.error, "error");
      toast(data.message || `Plan changed to ${newPlan}`, "success");
      fetchPlan();
    } catch (err) { toast("Failed to change plan", "error"); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You will lose access at the end of the billing period.")) return;
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST", headers });
      const data = await res.json();
      toast(data.message || "Subscription cancelled", "success");
      fetchPlan();
    } catch (err) { toast("Failed to cancel", "error"); }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch("/api/billing/reactivate", { method: "POST", headers });
      const data = await res.json();
      toast(data.message || "Subscription reactivated", "success");
      fetchPlan();
    } catch (err) { toast("Failed to reactivate", "error"); }
  };

  if (loading) return (
    <div style={{ padding: "80px 0", textAlign: "center", color: "var(--japandi-muted)", fontFamily: FONT_BODY }}>
      <p>Loading billing info...</p>
    </div>
  );

  const currentStatus = plan?.subscription_status || "trial";
  const currentPlan = plan?.plan || "starter";
  const plans = config?.plans || [
    { id: "starter", name: "Starter Plan", amount: 999, features: PLAN_FEATURES.starter },
    { id: "pro", name: "Pro Plan", amount: 2999, features: PLAN_FEATURES.pro },
    { id: "enterprise", name: "Enterprise Plan", amount: 9999, features: PLAN_FEATURES.enterprise },
  ];

  const badgeStyle = (status) => ({
    display: "inline-block", padding: "4px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600,
    background: status === "active" ? "rgba(62,142,90,0.15)" : status === "trial" ? "rgba(241,96,1,0.15)" : "rgba(193,8,1,0.15)",
    color: status === "active" ? "#4ade80" : status === "trial" ? "#f59e0b" : "#ef4444",
  });

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto", fontFamily: FONT_BODY }} className="fade-in">
      <h1 style={{ fontSize: 24, marginBottom: 24, color: "var(--japandi-text)", fontFamily: FONT_SANS, fontWeight: 800 }}>Billing</h1>

      {/* Plan Tiers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 24 }}>
        {plans.map((p) => {
          const isCurrent = p.id === currentPlan;
          const isHigher = ["starter", "pro", "enterprise"].indexOf(p.id) > ["starter", "pro", "enterprise"].indexOf(currentPlan);
          const isLower = ["starter", "pro", "enterprise"].indexOf(p.id) < ["starter", "pro", "enterprise"].indexOf(currentPlan);
          return (
            <div key={p.id} className="card-glass" style={{
              padding: 20, border: isCurrent ? "1px solid rgba(255,90,0,0.3)" : "1px solid rgba(107,107,111,0.12)",
              position: "relative",
            }}>
              {isCurrent && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--japandi-accent)", background: "rgba(255,90,0,0.1)", padding: "2px 8px", borderRadius: 4 }}>Current</span>}
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--japandi-text)", fontFamily: FONT_SANS }}>{p.name}</h3>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--japandi-text)", marginBottom: 12 }}>
                ₹{(p.amount || 999) / 100}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--japandi-muted)" }}>/mo</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                {(p.features || []).map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12, color: "var(--japandi-text)" }}>
                    <CheckCircle size={12} style={{ color: "#4ade80", flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
              {isCurrent && currentStatus === "active" && (
                <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>✓ Active</span>
              )}
              {isCurrent && currentStatus !== "active" && isCurrent && (
                <button onClick={() => handleUpgrade(p.id)} className="btn-ember" style={{ width: "100%", fontSize: 12 }}
                  disabled={!razorpayLoaded || changingPlan}>
                  {razorpayLoaded ? `Subscribe — ₹${(p.amount || 999) / 100}` : "Loading..."}
                </button>
              )}
              {!isCurrent && isHigher && currentStatus === "active" && (
                <button onClick={() => handleChangePlan(p.id)} className="btn-ember" style={{ width: "100%", fontSize: 12 }}>
                  Upgrade
                </button>
              )}
              {!isCurrent && isLower && currentStatus === "active" && (
                <button onClick={() => handleChangePlan(p.id)} className="btn-outline-ember" style={{ width: "100%", fontSize: 12 }}>
                  Downgrade
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Banner */}
      <div className="card-glass" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={badgeStyle(currentStatus)}>{currentStatus.toUpperCase()}</span>
            {currentStatus === "trial" && plan?.trial_remaining_days !== null && (
              <span style={{ marginLeft: 12, fontSize: 12, color: "var(--japandi-muted)" }}>
                Trial ends in <strong>{plan.trial_remaining_days}</strong> days
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {currentStatus === "active" && (
              <button onClick={handleCancel} className="btn-destructive-outline-sm" style={{ fontSize: 11 }}>
                <X size={12} /> Cancel
              </button>
            )}
            {(currentStatus === "cancelled" || currentStatus === "past_due") && (
              <button onClick={handleReactivate} className="btn-ember" style={{ fontSize: 11 }}>
                <RefreshCw size={12} /> Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Usage */}
      {plan?.usage && (
        <div className="card-glass" style={{ padding: 16, marginBottom: 12 }}>
          <div className="card-label" style={{ marginBottom: 12 }}>Usage</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(plan.usage).map(([key, val]) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "var(--japandi-muted)", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                  <span style={{ color: "var(--japandi-text)", fontWeight: 600 }}>
                    {val.used || 0}{val.limit ? ` / ${val.limit}` : ""}
                    {val.exceeded && <span style={{ color: "#ef4444", marginLeft: 4 }}>⚠</span>}
                  </span>
                </div>
                {val.limit && (
                  <div style={{ height: 3, backgroundColor: "rgba(107,107,111,0.1)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, ((val.used || 0) / val.limit) * 100)}%`,
                      backgroundColor: val.exceeded ? "#ef4444" : ((val.used || 0) / val.limit) > 0.8 ? "#f59e0b" : "var(--japandi-accent)", borderRadius: 2 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className="card-glass" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showInvoices ? 12 : 0 }}>
          <span className="card-label" style={{ margin: 0 }}>Invoice History</span>
          <button onClick={fetchInvoices} className="btn-action-secondary" style={{ fontSize: 11 }}>
            <FileText size={12} /> {showInvoices ? "Hide" : "View"}
          </button>
        </div>
        {showInvoices && (
          <div>
            {invoices.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--japandi-muted)", padding: "12px 0" }}>No invoices found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(107,107,111,0.08)" }}>
                    {["Date", "Plan", "Amount", "Status", "Payment ID"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--japandi-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: 9, letterSpacing: "1px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid rgba(107,107,111,0.06)" }}>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : new Date(inv.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)", textTransform: "capitalize" }}>{inv.plan_name || "starter"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--japandi-text)" }}>₹{(inv.amount || 0) / 100}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span className="badge" style={{
                          backgroundColor: inv.status === "paid" ? "rgba(62,207,142,0.12)" : "rgba(239,68,68,0.12)",
                          color: inv.status === "paid" ? "#4ade80" : "#ef4444",
                        }}>{inv.status}</span>
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 10, color: "var(--japandi-muted)" }}>{(inv.razorpay_payment_id || "").slice(0, 12)}...</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Plan Features */}
      <div className="card-glass" style={{ padding: 16 }}>
        <div className="card-label" style={{ marginBottom: 12 }}>All Plan Features</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {[
            { name: "Unlimited Tasks", included: true }, { name: "Unlimited Goals", included: true },
            { name: "AI Pattern Engine", included: true }, { name: "CRM Integrations", included: true },
            { name: "Team Collaboration", included: true }, { name: "API Access", included: true },
            { name: "Priority Support", included: currentPlan !== "starter" }, { name: "Custom Branding", included: currentPlan === "enterprise" },
            { name: "SSO/SAML", included: currentPlan === "enterprise" }, { name: "Audit Logs", included: currentPlan === "enterprise" },
          ].map(f => (
            <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: f.included ? "var(--japandi-text)" : "var(--japandi-muted)" }}>
              {f.included ? <CheckCircle size={12} style={{ color: "#4ade80" }} /> : <XCircle size={12} style={{ color: "#6b6b6f" }} />}
              {f.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
