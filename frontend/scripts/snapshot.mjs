import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://localhost:5173";
const OUT = "C:/Users/tharu/AppData/Local/Temp/opencode/shots";
mkdirSync(OUT, { recursive: true });

const API = "http://127.0.0.1:5000";
const AUTH = { email: "local3@foundesk.test", password: "LocalPass123!" };

const routes = [
  { path: "/", name: "landing" },
  { path: "/login", name: "login" },
  { path: "/dashboard", name: "dashboard", auth: true },
  { path: "/settings", name: "settings", auth: true },
];
const viewports = [
  { w: 1440, h: 900, name: "desk" },
  { w: 390, h: 844, name: "mob" },
];

const report = [];

const browser = await chromium.launch();

for (const r of routes) {
  for (const v of viewports) {
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (/fonts\.(googleapis|gstatic)\.com/ .test(url) || /fonts\.googleusercontent\.com/.test(url)) route.abort();
      else route.continue();
    });
    const consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    if (r.auth) {
      const loginRes = await fetch(API + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(AUTH),
      }).catch(() => null);
      if (loginRes && loginRes.ok) {
        const body = await loginRes.json();
        const token = body.token;
        const meRes = await fetch(API + "/api/me", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        const user = meRes && meRes.ok ? (await meRes.json()).user : null;
        const wsRes = await fetch(API + "/api/workspaces", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        const ws = wsRes && wsRes.ok ? (await wsRes.json()) : [];
        const active = Array.isArray(ws) ? ws.find((w) => w.member_status === "active") : null;
        await page.addInitScript(({ token, user, wsId }) => {
          localStorage.setItem("token", token || "");
          if (user) localStorage.setItem("user", JSON.stringify(user));
          if (wsId) localStorage.setItem("workspaceId", wsId);
        }, { token, user, wsId: active ? String(active.id) : null });
      } else {
        consoleErrors.push("AUTH: login failed for dashboard route");
      }
    }

    await page.goto(BASE + r.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    if (r.auth && r.path === "/dashboard") {
      try {
        await page.waitForSelector(".fd-dash:has-text('Good morning')", { timeout: 15000 });
      } catch {
        consoleErrors.push("AUTH: dashboard did not render (still compiling)");
      }
    }
    if (r.auth && r.path === "/settings") {
      try {
        await page.waitForSelector(".settings-page .view-tabs .view-tab", { timeout: 15000 });
      } catch {
        consoleErrors.push("AUTH: settings did not render (still compiling)");
      }
    }
    await page.evaluate(async () => {
      const scroller = document.querySelector(".fd-app-scroll") || document.documentElement;
      const H = scroller.scrollHeight;
      for (let y = 0; y <= H; y += 400) {
        scroller.scrollTop = y;
        await new Promise((res) => setTimeout(res, 60));
      }
      scroller.scrollTop = 0;
    });
    await page.waitForTimeout(900);

    const metrics = await page.evaluate(() => {
      const scroller = document.querySelector(".fd-app-scroll") || document.documentElement;
      const docW = document.documentElement.scrollWidth;
      const docC = document.documentElement.clientWidth;
      const bodyH = scroller.scrollHeight;
      const headings = [...document.querySelectorAll("h1, h2, h3")].slice(0, 14).map((el) => ({
        tag: el.tagName,
        txt: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
        fs: getComputedStyle(el).fontSize,
        visibleHeight: Math.round(el.getBoundingClientRect().height),
      }));
      const svgCount = document.querySelectorAll("svg").length;
      const outliers = [...document.querySelectorAll("h1, h2, h3, p")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.right > docC + 1 || r.left < -1;
      }).map((el) => `${el.tagName}: "${(el.textContent || "").trim().slice(0, 40)}"`);
      return {
        docW,
        docC,
        bodyH,
        headings,
        svgCount,
        overflowOutliers: outliers.slice(0, 8),
      };
    });

    try {
      await page.screenshot({ path: `${OUT}/${r.name}-${v.name}.png`, fullPage: true, timeout: 20000 });
      report.push({ route: r.path, viewport: v.name, ...metrics, consoleErrors: consoleErrors.slice(0, 8) });
    } catch (e) {
      report.push({ route: r.path, viewport: v.name, shotError: String(e.message || e).slice(0, 120), ...metrics, consoleErrors: consoleErrors.slice(0, 8) });
    }
    await page.close();
  }
}

await browser.close();
console.log(JSON.stringify(report, null, 2));