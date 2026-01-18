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
import { InboxEmpty } from "./pages/InboxEmpty";
import { Tags } from "./pages/Tags";
import { ReactNode } from "react";
import { ClinicProvider } from "./contexts/ClinicContext";

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
          <Route
            path="/inbox"
            element={
              <RequireAuth>
                <Inbox />
              </RequireAuth>
            }
          >
            <Route index element={<InboxEmpty />} />
            <Route path="chat/:id" element={<Chat />} />
            <Route path="tags" element={<Tags />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClinicProvider>
          <RoutedApp />
        </ClinicProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
