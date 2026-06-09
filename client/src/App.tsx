import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import VaultPage from './pages/VaultPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { currentUser, loading, isAdmin } = useAuth();
  
  if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />} />
      <Route path="/auth" element={!currentUser ? <AuthPage /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={currentUser ? <DashboardPage /> : <Navigate to="/auth" />} />
      <Route path="/vault" element={currentUser ? <VaultPage /> : <Navigate to="/auth" />} />
      <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
