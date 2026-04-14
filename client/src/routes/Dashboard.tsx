import { useAuth } from "../auth/AuthProvider";
import "./Dashboard.css";

export function Dashboard(): JSX.Element {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <section className="dashboard__hero">
        <h1>Hi {user?.username} 👋</h1>
        <p>
          Projects and boards will live here. In the meantime, you're logged in, the theme toggle
          in the top bar works, and your session is persisted.
        </p>
      </section>

      <section className="dashboard__placeholder">
        <div className="dashboard__placeholder-card">
          <h2>Coming up in Phase 6</h2>
          <ul>
            <li>Create, rename, reorder projects</li>
            <li>Create boards inside each project</li>
            <li>Fully responsive grid views</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
