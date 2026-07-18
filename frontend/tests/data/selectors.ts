export const SELECTORS = {
  // Landing page
  LANDING_NAVBAR: "nav",
  LANDING_HERO: "[class*='hero']",
  LANDING_GET_STARTED: "button, a",
  AUTH_MODAL: "[role='dialog'], [class*='modal'], [class*='dialog']",
  AUTH_MODAL_GOOGLE_BTN: "button:has-text('Google'), button:has-text('google')",

  // Login page
  LOGIN_EMAIL_INPUT: 'input[type="email"], input[name="email"]',
  LOGIN_PASSWORD_INPUT: 'input[type="password"], input[name="password"]',
  LOGIN_SUBMIT_BTN: 'button[type="submit"]',
  LOGIN_SIGNUP_TAB: "button:has-text('Create Account'), button:has-text('Sign Up')",
  LOGIN_SIGNIN_TAB: "button:has-text('Sign In'), button:has-text('Sign in')",
  LOGIN_FORGOT_LINK: "a:has-text('Forgot'), button:has-text('Forgot')",
  LOGIN_NAME_INPUT: 'input[name="name"], input[placeholder*="Name"]',

  // Sidebar
  SIDEBAR: "nav, aside",
  SIDEBAR_LINK: (label: string) => `a:has-text("${label}"), button:has-text("${label}")`,
  WORKSPACE_SWITCHER: "[class*='workspace'], [class*='switcher']",
  USER_MENU: "[class*='user'], [class*='profile']",
  LOGOUT_BTN: "button:has-text('Logout'), button:has-text('Sign Out')",

  // Notification bell
  NOTIFICATION_BELL: "[class*='bell'], [class*='notification']",
  NOTIFICATION_DROPDOWN: "[class*='dropdown'], [class*='popover']",

  // Dashboard
  DASHBOARD_METRICS: "[class*='metric'], [class*='stat'], [class*='card']",
  DASHBOARD_RECENT_ACTIVITY: "[class*='activity'], [class*='feed']",

  // Goals
  GOAL_CARD: "[class*='goal'], [class*='okr']",

  // Execute (Kanban)
  KANBAN_COLUMN: "[class*='column'], [class*='lane']",
  KANBAN_CARD: "[class*='card'], [class*='task']",

  // Memory
  DECISION_CARD: "[class*='decision'], [class*='log']",

  // Settings
  SETTINGS_TAB: (name: string) => `button:has-text("${name}"), a:has-text("${name}")`,

  // Generic
  LOADING_SPINNER: "[class*='spinner'], [class*='loading'], [class*='skeleton']",
  ERROR_MESSAGE: "[class*='error'], [role='alert']",
  EMPTY_STATE: "[class*='empty'], [class*='no-data']",
  MODAL: "[role='dialog'], [class*='modal'], [class*='overlay']",
  DROPDOWN: "[class*='dropdown'], [class*='select']",
  TABLE: "table, [role='table'], [class*='table']",
  FORM: "form",
  INPUT: "input",
  BUTTON: "button",
  LINK: "a",
  IMAGE: "img",
  HEADING: "h1, h2, h3, h4, h5, h6",
};
