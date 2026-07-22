import Sidebar from "./Sidebar";
import { NotificationProvider } from "../context/NotificationContext";
import { ToastProvider } from "../context/ToastContext";
import CommandBar from "./CommandBar";
import { AppContainer, PageContainer } from "./layout";

function Layout({ children }) {
  return (
    <NotificationProvider>
      <ToastProvider>
        <AppContainer className="md:grid md:grid-cols-[var(--shell-sidebar)_1fr]">
          <Sidebar />
          <PageContainer>{children}</PageContainer>
        </AppContainer>
        <CommandBar />
      </ToastProvider>
    </NotificationProvider>
  );
}

export default Layout;
