import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './pages/Login';
import { Inbox } from './pages/Inbox';
import { Chat } from './pages/Chat';
import { Header } from './components/layout/Header';
import { AuthProvider } from './contexts/AuthContext';
function RoutedApp() {
  const location = useLocation();
  const showHeader =
    location.pathname !== '/login' && !location.pathname.startsWith('/chat');
  return (
    <>
      {showHeader && (
        <Header />
      )}
      <main
        className={
          showHeader
            ? 'pt-16 h-screen box-border overflow-hidden'
            : 'min-h-screen'
        }
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/chat/:id" element={<Chat />} />
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
        <RoutedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
