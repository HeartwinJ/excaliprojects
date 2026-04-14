import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { Login } from "./routes/Login";
import { Dashboard } from "./routes/Dashboard";
import { TopBar } from "./components/TopBar";

function FullscreenSpinner(): JSX.Element {
  return (
    <div className="boot">
      <span className="boot__spinner" aria-hidden />
      <span>Loading…</span>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { user, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App(): JSX.Element {
  const { user, loading } = useAuth();

  return (
    <>
      {user && <TopBar />}
      <Routes>
        <Route
          path="/login"
          element={loading ? <FullscreenSpinner /> : user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
