import { Button, Result, Spin } from 'antd';
import { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AuthRedirect } from './auth/AuthModal';
import { AppHeader } from './components/AppHeader';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';

function Layout() {
  return (
    <div className="app">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div className="container">© {new Date().getFullYear()} Tip &amp; Bill Splitter · Amounts in USD</div>
      </footer>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="centered" style={{ padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="Page not found"
      subTitle="The page you're looking for doesn't exist."
      extra={<Button type="primary" onClick={() => navigate('/')}>Go home</Button>}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {/* Login and Sign Up are modals; these paths just open them over Home. */}
        <Route path="login" element={<AuthRedirect mode="login" />} />
        <Route path="signup" element={<AuthRedirect mode="signup" />} />
        <Route
          path="history"
          element={
            <RequireAuth>
              <HistoryPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
