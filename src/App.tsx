import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Login } from "./pages/Login";
import { Inbox } from "./pages/Inbox";
import { Chat } from "./pages/Chat";
import { Header } from "./components/layout/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { InboxAnalyticsDashboard } from "./pages/InboxAnalyticsDashboard";
import { Tags } from "./pages/Tags";
import { ReactNode } from "react";
import { ClinicProvider } from "./contexts/ClinicContext";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { AttendantsPage } from "./pages/AttendantsPage";
import { AuthCallback } from "./pages/Callback";
import { SetPassword } from "./pages/SetPassword";
import { MetaIntegrationsPage } from "./pages/IntegrationsMetaPage";
import { MetaCallbackPage } from "./pages/IntegrationCallbackPage";
import { ConversationAutomationSettingsPage } from "./pages/ConversationAutomationSettingsPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type RequireAuthProps = {
  children: ReactNode;
};

const AuthLoadingScreen = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3 text-gray-600">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      <span className="text-sm">Carregando sessão...</span>
    </div>
  </div>
);

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { authUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!authUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

function RoutedApp() {
  const location = useLocation();
  const showHeader = location.pathname !== "/login";
  const { loading } = useAuth();

  if (loading && location.pathname !== "/login") {
    return <AuthLoadingScreen />;
  }

  return (
    <>
      {showHeader && <Header />}
      <main
        className={
          showHeader
            ? "pt-16 h-screen box-border overflow-hidden"
            : "min-h-screen"
        }
      >
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/set-password" element={<SetPassword />} />
          <Route
            path="/inbox"
            element={
              <RequireAuth>
                <Inbox />
              </RequireAuth>
            }
          >
            <Route index element={<InboxAnalyticsDashboard />} />
            <Route path="chat/:id" element={<Chat />} />
            <Route path="tags" element={<Tags />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="attendants" element={<AttendantsPage />} />
            <Route
              path="settings/integrations/meta"
              element={<MetaIntegrationsPage />}
            />
            <Route
              path="settings/integrations/meta/callback"
              element={<MetaCallbackPage />}
            />
            <Route
              path="settings/automations/conversations"
              element={<ConversationAutomationSettingsPage />}
            />
            <Route
              path="settings"
              element={
                <Navigate
                  to="/inbox/settings/automations/conversations"
                  replace
                />
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ClinicProvider>
          <ToastContainer position="top-right" autoClose={3000} />
          <RoutedApp />
        </ClinicProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
