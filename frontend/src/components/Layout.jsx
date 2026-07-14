import React, { useEffect, useRef } from "react";
import Lenis from "lenis";
import Sidebar from "./Sidebar";
import { NotificationProvider } from "../context/NotificationContext";
import CommandBar from "./CommandBar";

function Layout({ children }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    // Check prefers-reduced-motion media query
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches || !scrollRef.current) {
      return; // Do not initialize Lenis
    }

    const lenis = new Lenis({
      wrapper: scrollRef.current,
      content: scrollRef.current.firstElementChild || scrollRef.current,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  const styles = {
    layout: {
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "transparent",
      color: "var(--white)",
      overflow: "hidden",
    },
    container: {
      display: "flex",
      flex: 1,
      height: "100vh",
      overflow: "hidden",
      width: "100%",
    },
    mainContent: {
      flex: 1,
      padding: "24px", // Layout bezel
      background: "transparent",
      overflowY: "auto",
      boxSizing: "border-box",
      position: "relative",
    },
  };

  return (
    <NotificationProvider>
      <div style={styles.layout}>
        <div style={styles.container}>
          <Sidebar />
          <main ref={scrollRef} style={styles.mainContent} className="main-scroll-zone">
            <div>
              {children}
            </div>
          </main>
        </div>
      </div>
      <CommandBar />
    </NotificationProvider>
  );
}

export default Layout;
