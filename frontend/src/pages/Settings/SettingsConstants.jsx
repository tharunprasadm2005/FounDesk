import { AlertCircle, Sun, Clock, CheckCircle, Users, RefreshCw, AtSign, MessageCircle, Shield, CreditCard, Calendar, UserCheck } from "lucide-react";

export const FONT_SANS = "'Clash Display', system-ui, sans-serif";
export const FONT_BODY = "'Satoshi', system-ui, sans-serif";

export const TABS = [
  { key: "apps", label: "Connected Apps", icon: "puzzle" },
  { key: "workspaces", label: "Workspaces", icon: "globe" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "team", label: "Team Space", icon: "users" },
  { key: "account", label: "Account", icon: "user" },
  { key: "billing", label: "Billing", icon: "credit-card" },
  { key: "apikeys", label: "API Keys", icon: "key" },
];

export const SUBTITLE_MAP = {
  apps: "Connect your tools and services to sync data with FounDesk.",
  workspaces: "Manage workspaces, stages, and team structure.",
  notifications: "Control what alerts and updates you receive.",
  team: "Team members, roles, and permissions.",
  account: "Your profile, security, and account settings.",
  billing: "Manage your subscription and payment methods.",
  apikeys: "API keys for programmatic access to FounDesk.",
};

export const INTEGRATION_CATEGORIES = [
  { name: "Communication", key: "communication", services: [
    { name: "Gmail", key: "gmail", supported: true }, { name: "Outlook Email", key: "outlook" },
    { name: "Slack", key: "slack", supported: true }, { name: "Microsoft Teams", key: "teams" },
    { name: "WhatsApp Business", key: "whatsapp" },
  ]},
  { name: "Calendar & Meetings", key: "calendar", services: [
    { name: "Google Calendar", key: "google_calendar", supported: true },
    { name: "Outlook Calendar", key: "outlook_calendar" }, { name: "Calendly", key: "calendly", supported: true },
    { name: "Zoom", key: "zoom" }, { name: "Google Meet", key: "google_meet", supported: true },
  ]},
  { name: "Docs, Tasks & Wikis", key: "docs", services: [
    { name: "Linear", key: "linear", supported: true }, { name: "Jira", key: "jira" },
    { name: "Trello", key: "trello", supported: true }, { name: "Asana", key: "asana", supported: true },
    { name: "Monday.com", key: "monday", supported: true }, { name: "GitHub", key: "github", supported: true },
    { name: "GitLab", key: "gitlab" }, { name: "Notion", key: "notion", supported: true },
    { name: "Google Docs", key: "google_docs", supported: true },
  ]},
  { name: "Sales & CRM", key: "crm", services: [
    { name: "HubSpot", key: "hubspot", supported: true }, { name: "Salesforce", key: "salesforce" },
    { name: "Zoho CRM", key: "zoho_crm", supported: true }, { name: "Pipedrive", key: "pipedrive", supported: true },
  ]},
  { name: "Finance", key: "finance", services: [
    { name: "Razorpay", key: "razorpay", supported: true }, { name: "Stripe", key: "stripe", supported: true },
    { name: "PayU", key: "payu" }, { name: "Zoho Books", key: "zoho_books" },
  ]},
  { name: "Analytics & Growth", key: "analytics", services: [
    { name: "Google Analytics", key: "google_analytics", supported: true },
    { name: "Mixpanel", key: "mixpanel", supported: true }, { name: "Amplitude", key: "amplitude", supported: true },
    { name: "Metabase", key: "metabase" }, { name: "Looker", key: "looker" },
    { name: "PostHog", key: "posthog", supported: true },
  ]},
];

export const NOTIFICATION_TYPES = [
  { key: "blocker_detected", label: "Blocker Detected", icon: "alert", category: "alerts" },
  { key: "daily_briefing", label: "Daily Briefing", icon: "sun", category: "reports" },
  { key: "follow_up_due", label: "Follow-up Due", icon: "clock", category: "tasks" },
  { key: "decision_confirmation", label: "Decision Confirmation", icon: "check", category: "alerts" },
  { key: "member_joined", label: "Member Joined", icon: "users", category: "team" },
  { key: "phase_change", label: "Phase Change", icon: "refresh", category: "workspace" },
  { key: "weekly_digest", label: "Weekly Digest", icon: "file-text", category: "reports" },
  { key: "ai_insights", label: "AI Insights", icon: "cpu", category: "ai" },
  { key: "task_updates", label: "Task Updates", icon: "check-square", category: "tasks" },
  { key: "mentions", label: "Mentions", icon: "at-sign", category: "social" },
  { key: "comments", label: "Comments", icon: "message-circle", category: "social" },
  { key: "security_alert", label: "Security Alerts", icon: "shield", category: "security" },
  { key: "billing_alert", label: "Billing Alerts", icon: "credit-card", category: "billing" },
  { key: "sync_errors", label: "Sync Errors", icon: "alert", category: "system" },
  { key: "meeting_reminders", label: "Meeting Reminders", icon: "calendar", category: "calendar" },
  { key: "role_changes", label: "Role Changes", icon: "user-check", category: "team" },
  { key: "email_digest", label: "Email Digest", icon: "mail", category: "reports" },
];

export function Cpu(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>; }
export function CheckSquare(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>; }

export const NOTIF_ICONS = {
  alert: AlertCircle, sun: Sun, clock: Clock, check: CheckCircle, users: Users,
  refresh: RefreshCw, cpu: Cpu, "check-square": CheckSquare, "at-sign": AtSign,
  "message-circle": MessageCircle, shield: Shield, "credit-card": CreditCard,
  calendar: Calendar, "user-check": UserCheck,
};

export const TOKEN_PROVIDERS = new Set(["trello", "notion", "hubspot", "mixpanel", "amplitude", "posthog", "razorpay", "stripe"]);

export const WORKSPACE_COLORS = ["#ff751f", "#3acaa5", "#53a1f5", "#f59e0b", "#a855f7", "#ef4444", "#ec4899", "#14b8a6"];
export const WORKSPACE_STAGES = ["Think", "Build", "Launch", "Scale"];

export const ROLE_BADGE_COLORS = { founder: "#ff751f", admin: "#3b82f6", manager: "#8b5cf6", developer: "#3acaa5", designer: "#ec4899", viewer: "#6b6b6f", member: "#6b6b6f" };

export const PLAN_TIERS = [
  {
    key: "starter", name: "Starter", price: "9.99", currency: "USD",
    features: ["Up to 3 workspaces", "Unlimited tasks", "Basic integrations", "Email support"],
    color: "#6b6b6f",
  },
  {
    key: "pro", name: "Pro", price: "29.99", currency: "USD",
    features: ["Unlimited workspaces", "Unlimited tasks & goals", "AI Pattern Engine", "CRM Integrations", "Team collaboration", "API Access", "Priority support"],
    color: "#3b82f6",
  },
  {
    key: "enterprise", name: "Enterprise", price: "99.99", currency: "USD",
    features: ["Everything in Pro", "Custom branding", "SSO/SAML", "Audit logs", "Dedicated support", "SLA guarantee", "Custom integrations"],
    color: "#8b5cf6",
  },
];

export const getPlanDisplayName = (plan) => {
  if (!plan) return "Starter Plan";
  const p = plan.toString().toLowerCase();
  if (p === "starter") return "Starter Plan";
  return plan.toString().charAt(0).toUpperCase() + plan.toString().slice(1) + " Plan";
};

export const getPlanBadgeLabel = (plan) => {
  if (!plan) return "Starter";
  return plan.toString().charAt(0).toUpperCase() + plan.toString().slice(1);
};

export const SETTINGS_STYLE = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalTitle: { margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "var(--sand)", fontFamily: "'Clash Display', sans-serif" },
  field: { marginBottom: "12px" },
  label: { display: "block", fontSize: "11px", fontWeight: 700, color: "var(--graphite)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" },
};
