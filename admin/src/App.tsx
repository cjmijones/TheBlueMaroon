import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  WalletCards,
} from "lucide-react";

import { ApiError, apiGet } from "./lib/api";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type CapabilityMap = {
  can_transact: boolean;
  can_create_asset: boolean;
  can_fractionalize: boolean;
};

type WalletItem = {
  address: string | null;
  chain_id: number | null;
  ens_name: string | null;
  is_primary: boolean;
  linked_at: string | null;
};

type AdminUser = {
  user_id: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
  roles: string[];
  verification: {
    kyc_status: string;
    id_verified_at: string | null;
    aml_status: string | null;
    aml_score: number | null;
    aml_checked_at: string | null;
    didit_session_id: string | null;
  };
  wallets: {
    linked_count: number;
    has_linked_wallet: boolean;
    items: WalletItem[];
  };
  capabilities: CapabilityMap;
  created_at: string | null;
  last_login: string | null;
};

type AdminMeResponse = {
  admin: AdminUser;
};

type AdminUsersResponse = {
  users: AdminUser[];
  limit: number;
  offset: number;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortAddress(value: string | null) {
  if (!value) {
    return "No address";
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function statusLabel(value: boolean) {
  return value ? "Ready" : "Blocked";
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAdmin(null);
      setUsers([]);
      setAccessDenied(false);
      setApiError(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const accessToken = session?.access_token;

  const loadAdmin = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setApiError(null);
    setAccessDenied(false);
    try {
      const response = await apiGet<AdminMeResponse>("/api/admin/me", accessToken);
      setAdmin(response.admin);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setAccessDenied(true);
        return;
      }
      setApiError(error instanceof Error ? error.message : "Admin check failed");
    }
  }, [accessToken]);

  const loadUsers = useCallback(
    async (searchTerm: string) => {
      if (!accessToken || accessDenied) {
        return;
      }

      setLoadingUsers(true);
      setApiError(null);
      try {
        const params = new URLSearchParams({ limit: "25", offset: "0" });
        if (searchTerm.trim()) {
          params.set("q", searchTerm.trim());
        }
        const response = await apiGet<AdminUsersResponse>(
          `/api/admin/users?${params.toString()}`,
          accessToken,
        );
        setUsers(response.users);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          setAccessDenied(true);
          return;
        }
        setApiError(error instanceof Error ? error.message : "User search failed");
      } finally {
        setLoadingUsers(false);
      }
    },
    [accessDenied, accessToken],
  );

  useEffect(() => {
    if (accessToken) {
      void loadAdmin();
    }
  }, [accessToken, loadAdmin]);

  useEffect(() => {
    if (admin && !accessDenied) {
      void loadUsers("");
    }
  }, [accessDenied, admin, loadUsers]);

  const stats = useMemo(() => {
    return {
      returnedUsers: users.length,
      clearKyc: users.filter((user) => user.verification.kyc_status === "clear").length,
      linkedWallets: users.reduce((count, user) => count + user.wallets.linked_count, 0),
      creators: users.filter((user) => user.roles.includes("creator")).length,
    };
  }, [users]);

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setAuthError(error.message);
    }
  }

  async function signInWithGoogle() {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setAuthError(error.message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (authLoading) {
    return (
      <main className="center-shell">
        <div className="loading-panel">Checking admin session...</div>
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="center-shell">
        <section className="login-panel">
          <div className="brand-mark">
            <ShieldCheck size={28} aria-hidden="true" />
          </div>
          <h1>Admin configuration required</h1>
          <p>
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the
            admin environment before signing in.
          </p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="center-shell">
        <section className="login-panel">
          <div className="brand-mark">
            <ShieldCheck size={28} aria-hidden="true" />
          </div>
          <h1>TheBlueMaroon Admin</h1>
          <p>Sign in with an account that has the local `admin` role.</p>

          <form className="login-form" onSubmit={signInWithPassword}>
            <label>
              Email
              <input
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {authError ? <p className="error-text">{authError}</p> : null}
            <button className="primary-button" type="submit">
              <KeyRound size={18} aria-hidden="true" />
              Sign in
            </button>
          </form>

          <button className="secondary-button" type="button" onClick={signInWithGoogle}>
            <UserCheck size={18} aria-hidden="true" />
            Continue with Google
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Admin Portal</h1>
        </div>
        <div className="admin-actions">
          <button className="icon-button" type="button" onClick={() => void loadUsers(query)}>
            <RefreshCw size={18} aria-hidden="true" />
            Refresh
          </button>
          <button className="icon-button danger" type="button" onClick={() => void signOut()}>
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      {accessDenied ? (
        <section className="notice danger-notice">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <h2>Admin role required</h2>
            <p>
              This Supabase user is authenticated, but the local backend user does not
              have the `admin` role.
            </p>
          </div>
        </section>
      ) : null}

      {apiError ? (
        <section className="notice">
          <RefreshCw size={22} aria-hidden="true" />
          <div>
            <h2>API unavailable</h2>
            <p>{apiError}</p>
          </div>
        </section>
      ) : null}

      <section className="summary-grid" aria-label="Admin summaries">
        <div className="summary-tile">
          <span>Signed in as</span>
          <strong>{admin?.email ?? session.user.email ?? "Unknown admin"}</strong>
        </div>
        <div className="summary-tile">
          <span>Returned users</span>
          <strong>{stats.returnedUsers}</strong>
        </div>
        <div className="summary-tile">
          <span>Clear KYC</span>
          <strong>{stats.clearKyc}</strong>
        </div>
        <div className="summary-tile">
          <span>Linked wallets</span>
          <strong>{stats.linkedWallets}</strong>
        </div>
        <div className="summary-tile">
          <span>Creators</span>
          <strong>{stats.creators}</strong>
        </div>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div>
            <h2>User Operations</h2>
            <p>Read-only status across identity, roles, KYC, wallets, and capabilities.</p>
          </div>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              void loadUsers(query);
            }}
          >
            <label className="search-label">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search email, name, or user id"
              />
            </label>
            <button className="primary-button compact" type="submit">
              Search
            </button>
          </form>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Roles</th>
                <th>KYC</th>
                <th>Wallets</th>
                <th>Capabilities</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id ?? user.email ?? "unknown-user"}>
                  <td>
                    <div className="user-cell">
                      <strong>{user.email ?? "Missing email"}</strong>
                      <span>{user.name ?? user.user_id ?? "Unnamed user"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="pill-row">
                      {user.roles.length ? (
                        user.roles.map((role) => <span className="pill" key={role}>{role}</span>)
                      ) : (
                        <span className="muted">No roles</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.verification.kyc_status}`}>
                      {user.verification.kyc_status}
                    </span>
                    <span className="cell-note">
                      AML {user.verification.aml_status ?? "not started"}
                    </span>
                  </td>
                  <td>
                    <div className="wallet-stack">
                      <span>
                        <WalletCards size={16} aria-hidden="true" />
                        {user.wallets.linked_count} linked
                      </span>
                      <span className="cell-note">
                        {shortAddress(user.wallets.items[0]?.address ?? null)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="capability-grid">
                      <span>{statusLabel(user.capabilities.can_transact)} transact</span>
                      <span>{statusLabel(user.capabilities.can_create_asset)} mint</span>
                      <span>{statusLabel(user.capabilities.can_fractionalize)} fractionalize</span>
                    </div>
                  </td>
                  <td>{formatDate(user.last_login)}</td>
                </tr>
              ))}
              {!loadingUsers && users.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      No users returned for the current admin view.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {loadingUsers ? <div className="table-loading">Loading users...</div> : null}
        </div>
      </section>
    </main>
  );
}

export default App;
