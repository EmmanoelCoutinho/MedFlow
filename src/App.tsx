import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './pages/Login';
import { Inbox } from './pages/Inbox';
import { Chat } from './pages/Chat';
import { Header } from './components/layout/Header';
import { AuthProvider } from './contexts/AuthContext';
function RoutedApp() {
  const location = useLocation();
  const showHeader = location.pathname !== '/login';
  return (
    <>
      {showHeader && <Header userName="Julia Andrade" userRole="Atendente" />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
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
