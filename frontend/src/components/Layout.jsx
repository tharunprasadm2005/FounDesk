import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import { NotificationProvider } from "../context/NotificationContext";
import { ToastProvider } from "../context/ToastContext";
import CommandBar from "./CommandBar";

function Layout({ children }) {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <NotificationProvider>
      <ToastProvider>
        <div className="fd-app">
          {/* Mobile topbar */}
          <header className="fd-app-top">
            <button
              className="fd-app-burger"
              onClick={() => setNavOpen((open) => !open)}
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={navOpen}
            >
              {navOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
            <span className="fd-app-topword">
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 600, marginRight: 4 }}>f</span>
              FounDesk
            </span>
          </header>

          <div
            className={`fd-app-overlay ${navOpen ? "is-open" : ""}`}
            onClick={() => setNavOpen(false)}
          />

          <Sidebar mobileOpen={navOpen} onNavigate={() => setNavOpen(false)} />

          <div className="fd-app-main">
            <main className="fd-app-scroll">
              <div className="fd-app-canvas">{children}</div>
            </main>
          </div>
        </div>
        <CommandBar />
      </ToastProvider>
    </NotificationProvider>
  );
}

export default Layout;