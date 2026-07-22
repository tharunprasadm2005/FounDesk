import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, RefreshCw, X, FileText, Download } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { PageContainer, Stack, Inline, Card, Grid } from "../components/layout";
import { Button } from "../components/ui/button";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const PLAN_FEATURES = {
  starter: ["Up to 5 workspaces", "Unlimited integrations", "AI-powered insights", "Calendar defense", "Knowledge transfer"],
  pro: ["Unlimited workspaces", "Unlimited integrations", "Priority AI insights", "Advanced calendar defense", "Knowledge transfer", "Priority support", "Custom branding"],
  enterprise: ["Everything in Pro", "SSO/SAML", "Audit logs", "Dedicated support", "Custom SLA"],
};

export default function Billing() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
    <div className="flex items-center justify-center h-screen bg-washi-white">
      <div className="text-stone-400 font-mono text-[13px] tracking-widest uppercase animate-pulse">Loading billing...</div>
    </div>
  );

  const currentStatus = plan?.subscription_status || "trial";
  const currentPlan = plan?.plan || "starter";
  const plans = config?.plans || [
    { id: "starter", name: "Starter Plan", amount: 999, features: PLAN_FEATURES.starter },
    { id: "pro", name: "Pro Plan", amount: 2999, features: PLAN_FEATURES.pro },
    { id: "enterprise", name: "Enterprise Plan", amount: 9999, features: PLAN_FEATURES.enterprise },
  ];

  return (
    <PageContainer>
      <Stack gap="gap-[32px]" className="mb-[48px] animate-in fade-in">
        <h1 className="font-heading text-[48px] text-sumi-900 leading-tight m-0 tracking-tight">Billing</h1>
      </Stack>

      <Grid columns={3} gap="gap-[24px]" className="mb-[32px] animate-in slide-in-from-bottom-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlan;
          const isHigher = ["starter", "pro", "enterprise"].indexOf(p.id) > ["starter", "pro", "enterprise"].indexOf(currentPlan);
          const isLower = ["starter", "pro", "enterprise"].indexOf(p.id) < ["starter", "pro", "enterprise"].indexOf(currentPlan);
          return (
            <Card key={p.id} padding="p-[32px]" className={`relative bg-washi-white flex flex-col transition-all duration-300 ${isCurrent ? "ring-2 ring-moss-600 shadow-md" : "hover:border-stone-400"}`}>
              {isCurrent && (
                <span className="absolute top-[16px] right-[16px] px-[8px] py-[4px] rounded-[2px] bg-moss-600/10 text-moss-600 border border-moss-600/20 text-[10px] font-bold tracking-widest uppercase">
                  Current
                </span>
              )}
              <h3 className="text-[20px] font-heading text-sumi-900 mb-[12px] m-0">{p.name}</h3>
              <div className="text-[40px] font-medium text-sumi-900 mb-[32px] font-mono tracking-tight leading-none">
                ₹{(p.amount || 999) / 100}<span className="text-[16px] text-stone-400 font-sans tracking-normal font-normal">/mo</span>
              </div>
              <Stack gap="gap-[16px]" className="mb-[32px] flex-1">
                {(p.features || []).map((f) => (
                  <Inline key={f} items="items-start" gap="gap-[12px]" className="text-[14px] text-stone-500">
                    <CheckCircle size={16} className="text-moss-600 mt-[2px] shrink-0" />
                    <span className="leading-snug">{f}</span>
                  </Inline>
                ))}
              </Stack>
              <div className="mt-auto pt-[24px] border-t border-stone-200">
                {isCurrent && currentStatus === "active" && (
                  <Inline items="items-center" gap="gap-[8px]" className="text-[12px] text-moss-600 font-bold tracking-wide uppercase justify-center py-[8px]">
                    <CheckCircle size={14} /> Active Subscription
                  </Inline>
                )}
                {isCurrent && currentStatus !== "active" && (
                  <Button onClick={() => handleUpgrade(p.id)} variant="primary" className="w-full" disabled={!razorpayLoaded || changingPlan}>
                    {razorpayLoaded ? `Subscribe — ₹${(p.amount || 999) / 100}` : "Loading..."}
                  </Button>
                )}
                {!isCurrent && isHigher && currentStatus === "active" && (
                  <Button onClick={() => handleChangePlan(p.id)} variant="primary" className="w-full">
                    Upgrade
                  </Button>
                )}
                {!isCurrent && isLower && currentStatus === "active" && (
                  <Button onClick={() => handleChangePlan(p.id)} variant="secondary" className="w-full">
                    Downgrade
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px] mb-[32px] animate-in slide-in-from-bottom-6">
        <Card padding="p-[32px]" className="bg-washi-white h-full flex flex-col justify-center">
          <Inline justify="justify-between" items="items-center">
            <div>
              <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase m-0 mb-[8px]">Subscription Status</h3>
              <Inline items="items-center" gap="gap-[12px]">
                <span className={`px-[12px] py-[6px] rounded-[2px] border text-[11px] font-bold tracking-widest uppercase ${currentStatus === "active" ? "bg-moss-600/10 text-moss-600 border-moss-600/20" : currentStatus === "trial" ? "bg-amber-600/10 text-amber-600 border-amber-600/20" : "bg-clay-500/10 text-clay-500 border-clay-500/20"}`}>
                  {currentStatus}
                </span>
                {currentStatus === "trial" && plan?.trial_remaining_days !== null && (
                  <span className="text-[13px] text-stone-500 font-mono tracking-wide">
                    Trial ends in <strong className="text-sumi-900">{plan.trial_remaining_days}</strong> days
                  </span>
                )}
              </Inline>
            </div>
            <Inline gap="gap-[12px]">
              {currentStatus === "active" && (
                <Button onClick={handleCancel} variant="secondary" className="text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">
                  <X size={14} className="mr-1" /> Cancel
                </Button>
              )}
              {(currentStatus === "cancelled" || currentStatus === "past_due") && (
                <Button onClick={handleReactivate} variant="primary">
                  <RefreshCw size={14} className="mr-1" /> Reactivate
                </Button>
              )}
            </Inline>
          </Inline>
        </Card>

        {plan?.usage && (
          <Card padding="p-[32px]" className="bg-washi-white h-full">
            <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[24px] m-0">Usage Overview</h3>
            <Stack gap="gap-[16px]">
              {Object.entries(plan.usage).map(([key, val]) => (
                <div key={key}>
                  <Inline justify="justify-between" className="text-[13px] mb-[8px]">
                    <span className="text-stone-500 capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="font-mono font-medium text-sumi-900 flex items-center">
                      {val.used || 0}{val.limit ? <span className="text-stone-400"> / {val.limit}</span> : ""}
                      {val.exceeded && <span className="text-clay-500 ml-[8px]">⚠</span>}
                    </span>
                  </Inline>
                  {val.limit && (
                    <div className="h-[6px] bg-stone-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${val.exceeded ? "bg-clay-500" : ((val.used || 0) / val.limit) > 0.8 ? "bg-amber-600" : "bg-moss-600"}`} style={{ width: `${Math.min(100, ((val.used || 0) / val.limit) * 100)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </Stack>
          </Card>
        )}
      </div>

      <Grid columns={2} gap="gap-[24px]" className="mb-[48px] animate-in slide-in-from-bottom-8">
        <Card padding="p-[32px]" className="bg-washi-white">
          <Inline justify="justify-between" items="items-center" className="mb-[24px]">
            <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase m-0">Invoice History</h3>
            <Button onClick={fetchInvoices} variant="secondary" size="sm">
              <FileText size={14} className="mr-1" /> {showInvoices ? "Hide" : "View"}
            </Button>
          </Inline>
          
          {showInvoices && (
            <div className="animate-in fade-in">
              {invoices.length === 0 ? (
                <div className="text-[13px] text-stone-400 italic text-center py-[24px] border border-dashed border-stone-200 rounded-[8px]">No invoices found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200">
                        {["Date", "Plan", "Amount", "Status"].map(h => (
                          <th key={h} className="py-[12px] px-[12px] text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-linen-100/50 transition-colors">
                          <td className="py-[12px] px-[12px] text-[12px] font-mono text-stone-500 tracking-wide">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : new Date(inv.created_at).toLocaleDateString()}</td>
                          <td className="py-[12px] px-[12px] text-[13px] text-sumi-900 capitalize font-medium">{inv.plan_name || "starter"}</td>
                          <td className="py-[12px] px-[12px] text-[13px] font-mono text-sumi-900">₹{(inv.amount || 0) / 100}</td>
                          <td className="py-[12px] px-[12px]">
                            <span className={`px-[6px] py-[2px] rounded-[2px] border text-[9px] font-bold tracking-widest uppercase ${inv.status === "paid" ? "bg-moss-600/10 text-moss-600 border-moss-600/20" : "bg-clay-500/10 text-clay-500 border-clay-500/20"}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card padding="p-[32px]" className="bg-washi-white">
          <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[24px] m-0">All Plan Features</h3>
          <Grid columns={2} gap="gap-[16px]">
            {[
              { name: "Unlimited Tasks", included: true }, { name: "Unlimited Goals", included: true },
              { name: "AI Pattern Engine", included: true }, { name: "CRM Integrations", included: true },
              { name: "Team Collaboration", included: true }, { name: "API Access", included: true },
              { name: "Priority Support", included: currentPlan !== "starter" }, { name: "Custom Branding", included: currentPlan === "enterprise" },
              { name: "SSO/SAML", included: currentPlan === "enterprise" }, { name: "Audit Logs", included: currentPlan === "enterprise" },
            ].map(f => (
              <Inline key={f.name} items="items-center" gap="gap-[12px]" className={`text-[13px] ${f.included ? "text-sumi-900" : "text-stone-400"}`}>
                {f.included ? <CheckCircle size={14} className="text-moss-600 shrink-0" /> : <XCircle size={14} className="text-stone-300 shrink-0" />}
                <span className={!f.included ? "line-through opacity-70" : ""}>{f.name}</span>
              </Inline>
            ))}
          </Grid>
        </Card>
      </Grid>
    </PageContainer>
  );
}
