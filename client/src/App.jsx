import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileText,
  HeartPulse,
  History,
  Home,
  Info,
  LogOut,
  Menu,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";

import { api } from "./api";

const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

/* =========================================================
   AUTH PROVIDER
========================================================= */

function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("healthlens_user") || "null"),
  );

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("healthlens_token")) {
      setChecking(false);
      return;
    }

    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => {
        localStorage.removeItem("healthlens_token");
        localStorage.removeItem("healthlens_user");
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const login = (data) => {
    localStorage.setItem("healthlens_token", data.token);
    localStorage.setItem("healthlens_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("healthlens_token");
    localStorage.removeItem("healthlens_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, checking }}>
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />

        <Route
          path="/register"
          element={<AuthPage mode="register" />}
        />

        <Route
          path="/app/*"
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </AuthProvider>
  );
}

/* =========================================================
   PROTECTED ROUTE
========================================================= */

function Protected({ children }) {
  const { user, checking } = useAuth();

  if (checking) {
    return <Splash />;
  }

  return user ? (
    children
  ) : (
    <Navigate
      to="/login"
      replace
    />
  );
}

function Splash() {
  return (
    <div className="splash">
      <div className="brand-mark">
        <HeartPulse size={28} />
      </div>

      <span>HealthLens</span>
    </div>
  );
}

/* =========================================================
   LOGO
========================================================= */

function Logo({ light = false }) {
  return (
    <Link
      to="/"
      className={`brand ${light ? "brand-light" : ""}`}
    >
      <span className="brand-icon">
        <HeartPulse size={19} />
      </span>

      <span>HealthLens</span>
    </Link>
  );
}

/* =========================================================
   LANDING PAGE
========================================================= */

function Landing() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/") return;

    const hash = location.hash.replace(/^#/, "");

    if (!hash) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (!target) return;

      const navOffset = 88;
      const top = target.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({ top, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  const scrollToSection = (event, id) => {
    event.preventDefault();
    navigate(
      { pathname: "/", hash: `#${id}` },
      { replace: true },
    );
  };

  return (
    <div className="site">
      <header className="landing-nav">
        <Logo />

        <nav>
          <a href="#how" onClick={(event) => scrollToSection(event, "how")}>How it works</a>
          <a href="#features" onClick={(event) => scrollToSection(event, "features")}>Features</a>
          <a href="#privacy" onClick={(event) => scrollToSection(event, "privacy")}>Privacy</a>
        </nav>

        <div className="nav-actions">
          <Link
            className="text-btn"
            to="/login"
          >
            Log in
          </Link>

          <Link
            className="btn btn-primary btn-small landing-get-started"
            to="/register"
          >
            Get started <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main>
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={15} />
              HEALTH INFORMATION, SIMPLIFIED
            </div>

            <h1>
              Understand your health reports <span>with clarity.</span>
            </h1>

            <p className="hero-lead">
              Upload a report, organize the numbers, and understand medical
              terms in plain language — without the information overload.
            </p>

            <div className="hero-actions">
              <Link
                className="btn btn-primary btn-large"
                to="/register"
              >
                Analyze a report <ArrowRight size={18} />
              </Link>

              <a
                className="btn btn-ghost btn-large"
                href="#how"
                onClick={(event) => scrollToSection(event, "how")}
              >
                <CircleHelp size={18} /> See how it works
              </a>
            </div>

            <div className="trust-row">
              <ShieldCheck size={17} />
              Educational information · Not a diagnosis · Your results stay in
              your account
            </div>
          </div>

          <div className="hero-visual">
            <div className="orb orb-one"></div>
            <div className="orb orb-two"></div>

            <div className="mock-dashboard">
              <div className="mock-top">
                <span>Report overview</span>

                <span className="status-dot">
                  <i /> Processed
                </span>
              </div>

              <div className="mock-stats">
                <div>
                  <small>RESULTS</small>
                  <strong>18</strong>
                </div>

                <div>
                  <small>WITHIN RANGE</small>
                  <strong className="green">14</strong>
                </div>

                <div>
                  <small>ATTENTION</small>
                  <strong className="amber">4</strong>
                </div>
              </div>

              <div className="mock-row">
                <div className="test-icon">
                  <Activity size={17} />
                </div>

                <div>
                  <b>Hemoglobin</b>
                  <small>13.2 g/dL · 12–16</small>
                </div>

                <span className="badge badge-green">Within range</span>
              </div>

              <div className="mock-row">
                <div className="test-icon warn">
                  <Activity size={17} />
                </div>

                <div>
                  <b>Vitamin D</b>
                  <small>18 ng/mL · 30–100</small>
                </div>

                <span className="badge badge-amber">Below range</span>
              </div>

              <div className="mock-row">
                <div className="test-icon">
                  <Activity size={17} />
                </div>

                <div>
                  <b>Fasting glucose</b>
                  <small>94 mg/dL · 70–99</small>
                </div>

                <span className="badge badge-green">Within range</span>
              </div>

              <div className="mock-chart">
                <div className="chart-lines">
                  <span />
                  <span />
                  <span />
                </div>

                <svg
                  viewBox="0 0 400 90"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points="0,65 45,52 90,57 135,30 180,42 225,22 270,35 315,18 360,27 400,12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section
          className="section container"
          id="how"
        >
          <div className="section-head center">
            <div className="eyebrow">HOW IT WORKS</div>

            <h2>From confusing report to clear overview.</h2>

            <p>
              HealthLens turns a dense report into a structured, readable
              experience.
            </p>
          </div>

          <div className="steps">
            <Step
              n="01"
              icon={<Upload />}
              title="Upload"
              text="Add a PDF or image of your laboratory report."
            />

            <Step
              n="02"
              icon={<FileCheck2 />}
              title="Organize"
              text="HealthLens extracts available test information and reference ranges."
            />

            <Step
              n="03"
              icon={<Stethoscope />}
              title="Understand"
              text="Read plain-language explanations and identify results outside the provided range."
            />
          </div>
        </section>

        <section
          className="section feature-section"
          id="features"
        >
          <div className="container">
            <div className="section-head">
              <div className="eyebrow">DESIGNED FOR CLARITY</div>

              <h2>Everything important, without the noise.</h2>

              <p>
                A focused interface built around the way people actually read
                health information.
              </p>
            </div>

            <div className="feature-grid">
              <Feature
                icon={<FileText />}
                title="Report overview"
                text="See results, units, reference ranges and status in one structured view."
              />

              <Feature
                icon={<Zap />}
                title="Plain language"
                text="Understand what common laboratory terms mean without searching each one separately."
              />

              <Feature
                icon={<TrendingUp />}
                title="Track changes"
                text="Compare reported values over time with simple visual trends."
              />

              <Feature
                icon={<ShieldCheck />}
                title="Privacy-minded"
                text="Protected accounts and a clear explanation of the application's educational purpose."
              />
            </div>
          </div>
        </section>

        <section
          className="section container"
          id="privacy"
        >
          <div className="privacy-card">
            <div className="privacy-icon">
              <ShieldCheck />
            </div>

            <div>
              <div className="eyebrow">A RESPONSIBLE APPROACH</div>

              <h3>Information, not diagnosis.</h3>

              <p>
                HealthLens highlights values against the reference ranges
                supplied by a report. It does not diagnose conditions or
                prescribe treatment. When a result deserves attention, the
                interface encourages discussion with a healthcare professional.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer container">
        <Logo />

        <span>© 2026 HealthLens · Educational health information</span>
      </footer>
    </div>
  );
}

function Step({ n, icon, title, text }) {
  return (
    <div className="step">
      <div className="step-no">{n}</div>
      <div className="step-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="feature-line" />
    </div>
  );
}

/* =========================================================
   LOGIN / REGISTER
========================================================= */

function AuthPage({ mode }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const isLogin = mode === "login";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <Navigate
        to="/app/dashboard"
        replace
      />
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password || (!isLogin && !form.name)) {
      return setError("Please complete all required fields.");
    }

    if (!isLogin && form.password !== form.confirm) {
      return setError("Passwords do not match.");
    }

    setBusy(true);

    try {
      const data = isLogin
        ? await api.login({
            email: form.email,
            password: form.password,
          })
        : await api.register({
            name: form.name,
            email: form.email,
            password: form.password,
          });

      login(data);
      navigate("/app/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function demo() {
    setBusy(true);
    setError("");

    try {
      login(await api.demoLogin());
      navigate("/app/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-side">
        <Logo />

        <div className="auth-side-copy">
          <div className="eyebrow">
            <HeartPulse size={15} /> HEALTHLENS
          </div>

          <h1>Make the numbers easier to understand.</h1>

          <p>
            A calm, structured way to explore your reports without drowning in
            medical terminology.
          </p>

          <div className="mini-proof">
            <CheckCircle2 /> Plain-language explanations
          </div>

          <div className="mini-proof">
            <CheckCircle2 /> Reference-range context
          </div>

          <div className="mini-proof">
            <CheckCircle2 /> History and trends
          </div>
        </div>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-form">
          <Link
            to="/"
            className="mobile-brand"
          >
            <Logo />
          </Link>

          <div className="eyebrow">
            {isLogin ? "WELCOME BACK" : "GET STARTED"}
          </div>

          <h2>{isLogin ? "Sign in to HealthLens" : "Create your account"}</h2>

          <p className="muted">
            {isLogin
              ? "Continue exploring your report history."
              : "Start building a clearer view of your health information."}
          </p>

          {error && (
            <div className="form-error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            {!isLogin && (
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="Your name"
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                placeholder="At least 8 characters"
              />
            </label>

            {!isLogin && (
              <label>
                Confirm password
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      confirm: e.target.value,
                    })
                  }
                  placeholder="Repeat your password"
                />
              </label>
            )}

            <button
              className="btn btn-primary btn-full"
              disabled={busy}
            >
              {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}{" "}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="or">
            <span>or</span>
          </div>

          <button
            className="btn btn-ghost btn-full"
            onClick={demo}
            disabled={busy}
          >
            Use demo account
          </button>

          <p className="auth-switch">
            {isLogin ? "New to HealthLens?" : "Already have an account?"}{" "}
            <Link to={isLogin ? "/register" : "/login"}>
              {isLogin ? "Create account" : "Sign in"}
            </Link>
          </p>

          <div className="tiny-disclaimer">
            <Info size={14} />
            HealthLens provides educational information and does not replace
            professional medical advice.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   APP SHELL
   TOP RIGHT PROFILE DROPDOWN ADDED HERE
========================================================= */

function AppShell() {
  const { logout, user } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const profileRef = useRef(null);

  /* Close profile dropdown when clicking outside */
  useEffect(() => {
    function handleOutsideClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function closeProfile() {
    setProfileOpen(false);
  }

  function handleLogout() {
    closeProfile();
    logout();
  }

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />

          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>

        <nav className="side-nav">
          <SideLink
            to="/app/dashboard"
            icon={<Home />}
            label="Dashboard"
            onClick={() => setMobileOpen(false)}
          />

          <SideLink
            to="/app/upload"
            icon={<Upload />}
            label="Upload report"
            onClick={() => setMobileOpen(false)}
          />

          <SideLink
            to="/app/history"
            icon={<History />}
            label="Report history"
            onClick={() => setMobileOpen(false)}
          />

          <SideLink
            to="/app/trends"
            icon={<TrendingUp />}
            label="Trends"
            onClick={() => setMobileOpen(false)}
          />

          <SideLink
            to="/app/profile"
            icon={<Settings />}
            label="Profile & settings"
            onClick={() => setMobileOpen(false)}
          />
        </nav>

        <div className="sidebar-bottom">
          <button
            className="logout-btn"
            onClick={logout}
          >
            <LogOut size={17} />
            Log out
          </button>

          <div className="side-safety">
            <ShieldCheck size={17} />

            <span>Your reports are linked to your account.</span>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`app-main ${location.pathname.includes("/report/") ? (location.pathname.includes("/status/") ? "app-main-report app-main-status" : "app-main-report") : ""}`}>
        <header className="app-header">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>

          <div className="header-title">
            <PageTitle />
          </div>

          <div className="header-actions">
            <button
              className="icon-btn"
              title="Notifications"
            >
              <Bell size={19} />
            </button>

            {/* =================================================
                PROFILE BUTTON + DROPDOWN
            ================================================= */}
            <div
              className="profile-menu-container"
              ref={profileRef}
            >
              <button
                type="button"
                className={`user-chip ${profileOpen ? "open" : ""}`}
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="user-avatar-small">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </span>

                {/* IMPORTANT: this is plain text, not another avatar */}
                <span className="header-profile-name">
                  {user?.name || "User"}
                </span>

                <ChevronDown
                  size={16}
                  className={`profile-chevron ${profileOpen ? "rotate" : ""}`}
                />
              </button>

              {profileOpen && (
                <div
                  className="profile-dropdown"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-avatar">
                      {(user?.name || "U").charAt(0).toUpperCase()}
                    </div>

                    <div className="profile-dropdown-user">
                      <strong>{user?.name || "Your Name"}</strong>

                      <span>{user?.email || "your@email.com"}</span>
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <div className="profile-dropdown-links">
                    <Link
                      to="/app/dashboard"
                      onClick={closeProfile}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">
                        <Home size={17} />
                      </span>

                      <span className="dropdown-link-text">
                        <b>Dashboard</b>
                        <small>View your health overview</small>
                      </span>

                      <ChevronRight size={16} />
                    </Link>

                    <Link
                      to="/app/upload"
                      onClick={closeProfile}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">
                        <Upload size={17} />
                      </span>

                      <span className="dropdown-link-text">
                        <b>Upload report</b>
                        <small>Analyze a new report</small>
                      </span>

                      <ChevronRight size={16} />
                    </Link>

                    <Link
                      to="/app/history"
                      onClick={closeProfile}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">
                        <History size={17} />
                      </span>

                      <span className="dropdown-link-text">
                        <b>Report history</b>
                        <small>View your previous reports</small>
                      </span>

                      <ChevronRight size={16} />
                    </Link>

                    <Link
                      to="/app/trends"
                      onClick={closeProfile}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">
                        <TrendingUp size={17} />
                      </span>

                      <span className="dropdown-link-text">
                        <b>Trends</b>
                        <small>Track reported values over time</small>
                      </span>

                      <ChevronRight size={16} />
                    </Link>

                    <Link
                      to="/app/profile"
                      onClick={closeProfile}
                      role="menuitem"
                    >
                      <span className="dropdown-icon">
                        <Settings size={17} />
                      </span>

                      <span className="dropdown-link-text">
                        <b>Profile & settings</b>
                        <small>Manage your account</small>
                      </span>

                      <ChevronRight size={16} />
                    </Link>
                  </div>

                  <div className="profile-dropdown-footer">
                    <button
                      type="button"
                      className="profile-dropdown-logout"
                      onClick={handleLogout}
                    >
                      <span className="dropdown-icon logout-icon">
                        <LogOut size={17} />
                      </span>

                      <span className="dropdown-link-text">
                        <b>Log out</b>
                        <small>Sign out of HealthLens</small>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Routes>
            <Route
              path="dashboard"
              element={<Dashboard />}
            />

            <Route
              path="upload"
              element={<UploadPage />}
            />

            <Route
              path="history"
              element={<HistoryPage />}
            />

            <Route
              path="report/:id/status/:status"
              element={<StatusResultsPage />}
            />

            <Route
              path="report/:id"
              element={<ReportPage />}
            />

            <Route
              path="trends"
              element={<TrendsPage />}
            />

            <Route
              path="profile"
              element={<ProfilePage />}
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR LINK
========================================================= */

function SideLink({ to, icon, label, onClick }) {
  return (
    <NavLink
      onClick={onClick}
      to={to}
      className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/* =========================================================
   PAGE TITLE
========================================================= */

function PageTitle() {
  const location = useLocation();

  const titles = {
    "/app/dashboard": "Dashboard",
    "/app/upload": "Analyze a report",
    "/app/history": "Report history",
    "/app/trends": "Trends",
    "/app/profile": "Profile & settings",
  };

  if (location.pathname.includes("/report/")) {
    return "Report analysis";
  }

  return titles[location.pathname] || "HealthLens";
}

/* =========================================================
   REPORT HOOK
========================================================= */

function useReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);

    api
      .reports()
      .then((d) => setReports(d.reports))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return {
    reports,
    setReports,
    loading,
    reload: load,
  };
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const { user } = useAuth();

  const { reports, loading, reload } = useReports();

  const navigate = useNavigate();

  const stats = reports.reduce(
    (a, r) => {
      r.results.forEach((x) => {
        if (a[x.status] !== undefined) {
          a[x.status]++;
        }
      });

      return a;
    },
    {
      within: 0,
      below: 0,
      above: 0,
    },
  );

  const attention = stats.below + stats.above;

  const recent = reports.slice(0, 3);

  async function demo() {
    await api.demoReport();
    reload();
  }

  return (
    <div className="content-wrap">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR HEALTH INFORMATION</div>

          <h1>Good to see you, {user?.name?.split(" ")[0]}.</h1>

          <p className="muted">
            Here’s a clearer overview of the reports you’ve added.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/app/upload")}
        >
          <Upload size={17} />
          Upload report
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          icon={<FileText />}
          label="Reports analyzed"
          value={reports.length}
          note="In your account"
        />

        <StatCard
          icon={<CheckCircle2 />}
          label="Within range"
          value={stats.within}
          note="Across saved reports"
          tone="green"
        />

        <StatCard
          icon={<AlertCircle />}
          label="Need attention"
          value={attention}
          note="Outside provided ranges"
          tone="amber"
        />

        <StatCard
          icon={<Activity />}
          label="Results tracked"
          value={stats.within + attention}
          note="Across all reports"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel large">
          <div className="panel-head">
            <div>
              <h2>Recent reports</h2>

              <p>Open a report to explore individual results.</p>
            </div>

            <Link
              className="subtle-link"
              to="/app/history"
            >
              View all <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <SkeletonRows />
          ) : recent.length ? (
            recent.map((r) => (
              <ReportRow
                key={r._id}
                report={r}
              />
            ))
          ) : (
            <EmptyState
              icon={<FileText />}
              title="No reports yet"
              text="Upload your first report to start organizing your results."
              action={
                <Link
                  className="btn btn-primary btn-small"
                  to="/app/upload"
                >
                  Upload report
                </Link>
              }
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Result overview</h2>
              <p>Across your saved reports.</p>
            </div>
          </div>

          <Distribution
            within={stats.within}
            below={stats.below}
            above={stats.above}
          />

          <div className="legend">
            <span>
              <i className="dot green-dot" />
              Within range <b>{stats.within}</b>
            </span>

            <span>
              <i className="dot amber-dot" />
              Attention <b>{attention}</b>
            </span>
          </div>
        </section>
      </div>

      <section className="insight-banner">
        <div className="insight-icon">
          <Sparkles />
        </div>

        <div>
          <b>A clearer way to read a report</b>

          <p>
            HealthLens shows the reference range from the report alongside each
            value. Reference ranges can vary between laboratories and individual
            circumstances.
          </p>
        </div>
      </section>

      {reports.length === 0 && (
        <button
          className="demo-link"
          onClick={demo}
        >
          Load a sample report for your presentation →
        </button>
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, label, value, note, tone = "", onClick }) {
  return (
    <div
      className={`stat-card ${tone}${onClick ? " stat-card-clickable" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stat-icon">{icon}</div>

      <div className="stat-value">{value}</div>

      <div className="stat-label">{label}</div>

      <div className="stat-note">{note}</div>
    </div>
  );
}

/* =========================================================
   DISTRIBUTION
========================================================= */

function Distribution({ within, below, above }) {
  const total = within + below + above;

  const w = total ? within / total : 0;

  const b = total ? below / total : 0;

  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={{
          "--w": `${w * 360}deg`,
          "--b": `${b * 360}deg`,
        }}
      >
        <div>
          <strong>{total}</strong>
          <small>results</small>
        </div>
      </div>

      <div className="donut-caption">
        {total
          ? `${Math.round((within / total) * 100)}% within the provided ranges`
          : "Upload a report to see an overview"}
      </div>
    </div>
  );
}

/* =========================================================
   REPORT ROW
========================================================= */

function ReportRow({ report }) {
  const attention = report.results.filter((r) => r.status !== "within").length;

  return (
    <Link
      to={`/app/report/${report._id}`}
      className="report-row"
    >
      <div className="report-file">
        <div className="file-icon">
          <FileText />
        </div>

        <div>
          <b>{report.fileName}</b>

          <span>
            {new Date(report.reportDate).toLocaleDateString()} ·{" "}
            {report.results.length} results
          </span>
        </div>
      </div>

      <span className={`badge ${attention ? "badge-amber" : "badge-green"}`}>
        {attention ? `${attention} need attention` : "All within range"}
      </span>

      <ChevronRight
        size={18}
        className="row-arrow"
      />
    </Link>
  );
}

/* =========================================================
   SKELETON
========================================================= */

function SkeletonRows() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <div
          className="skeleton-row"
          key={i}
        >
          <span />

          <div>
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>

      {action}
    </div>
  );
}

/* =========================================================
   UPLOAD
========================================================= */

function UploadPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);

  const [drag, setDrag] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  function choose(f) {
    if (!f) return;

    setError("");

    const isPdf =
      f.type === "application/pdf" ||
      /\.pdf$/i.test(String(f.name || ""));

    if (!isPdf) {
      return setError("Please choose a PDF medical report.");
    }

    if (f.size > 25 * 1024 * 1024) {
      return setError("The PDF must be smaller than 25 MB.");
    }

    setFile(f);
  }

  async function analyze() {
    if (!file) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const d = await api.upload(file);

      setNotice(d.notice);

      setTimeout(() => navigate(`/app/report/${d.report._id}`), 900);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content-wrap narrow">
      <div className="eyebrow">REPORT ANALYSIS</div>

      <h1>Analyze a medical report</h1>

      <p className="page-lead">
        Upload a medical report PDF and HealthLens will extract its laboratory
        results, reference ranges and methods into an easier-to-understand format.
      </p>

      <div
        className={`upload-zone ${drag ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          choose(e.dataTransfer.files[0]);
        }}
      >
        <div className="upload-icon">
          <Upload />
        </div>

        <h2>{file ? "Ready to analyze" : "Drop your report here"}</h2>

        <p>{file ? file.name : "or choose a file from your device"}</p>

        <label className="btn btn-ghost">
          Browse files
          <input
            type="file"
            hidden
            accept=".pdf,application/pdf"
            onChange={(e) => choose(e.target.files[0])}
          />
        </label>

        <small>PDF medical report · Maximum 25 MB</small>
      </div>

      {file && (
        <div className="selected-file">
          <div className="file-icon">
            <FileText />
          </div>

          <div>
            <b>{file.name}</b>

            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>

          <button
            className="icon-btn"
            onClick={() => setFile(null)}
          >
            <X />
          </button>
        </div>
      )}

      {error && (
        <div className="form-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {notice && (
        <div className="success-box">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      <div className="upload-actions">
        <button
          className="btn btn-primary btn-large"
          disabled={!file || busy}
          onClick={analyze}
        >
          {busy ? "Analyzing report…" : "Analyze report"}{" "}
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="privacy-note">
        <ShieldCheck size={18} />

        <div>
          <b>Before you upload</b>

          <p>
            Only upload reports you are comfortable using in this project.
            HealthLens is an educational interface and does not diagnose
            conditions.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REPORT PAGE
========================================================= */

function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .report(id)
      .then((d) => setReport(d.report))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="content-wrap">
        <SkeletonRows />
        <SkeletonRows />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="content-wrap">
        <EmptyState
          icon={<FileText />}
          title="Report not found"
          text="This report may have been deleted or is not available."
        />
      </div>
    );
  }

  const within = report.results.filter((r) => r.status === "within").length;
  const below = report.results.filter((r) => r.status === "below").length;
  const above = report.results.filter((r) => r.status === "above").length;
  const attention = below + above;
  const attentionResults = report.results.filter((r) => r.status !== "within");
  const wellnessResults = report.results.filter((r) => r.wellness);

  function printSummary() {
    document.body.classList.add("printing-summary");

    const cleanup = () => {
      document.body.classList.remove("printing-summary");
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => window.print(), 60);
  }

  return (
    <div className="content-wrap report-experience">
      <Link className="back-link" to="/app/history">
        ← Report history
      </Link>

      <div className="report-hero">
        <div>
          <div className="eyebrow">REPORT ANALYSIS</div>
          <h1>{report.fileName}</h1>
          <p className="muted">
            {new Date(report.reportDate).toLocaleDateString()} · {report.results.length} reported results
          </p>
        </div>

        <div className="report-summary-pills">
          <span>
            <b>{within}</b> within range
          </span>
          <span className={attention ? "attention" : ""}>
            <b>{attention}</b> attention
          </span>
        </div>
      </div>

      <div className="understanding-banner">
        <div className="understanding-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <b>Start with the meaning, then read the number.</b>
          <p>
            HealthLens explains each medical term using information retrieved from MedlinePlus,
            then shows your reported value, the reference range and practical wellness guidance.
          </p>
        </div>
      </div>

      <div className="stat-grid compact">
        <StatCard
          icon={<CheckCircle2 />}
          label="Within range"
          value={within}
          note="Inside the provided range"
          tone="green"
          onClick={() => navigate(`/app/report/${id}/status/within`)}
        />
        <StatCard
          icon={<ArrowRight />}
          label="Below range"
          value={below}
          note="Below the provided range"
          tone="amber"
          onClick={() => navigate(`/app/report/${id}/status/below`)}
        />
        <StatCard
          icon={<AlertCircle />}
          label="Above range"
          value={above}
          note="Above the provided range"
          tone="amber"
          onClick={() => navigate(`/app/report/${id}/status/above`)}
        />
      </div>

      <section className="panel results-panel-pro">
        <div className="panel-head">
          <div>
            <div className="eyebrow">UNDERSTAND YOUR RESULTS</div>
            <h2>What does each term mean?</h2>
            <p>Choose a result to open its full explanation, source and wellness guidance.</p>
          </div>
          <span className="results-count">{report.results.length} terms</span>
        </div>

        <div className="result-cards">
          {report.results.map((r) => (
            <ResultCard
              key={r._id || r.testName}
              result={r}
              onClick={() => setSelected(r)}
            />
          ))}
        </div>
      </section>

      <section className="report-summary-section" id="healthlens-summary">
        <div className="summary-header">
          <div>
            <div className="eyebrow">ONE-PAGE OVERVIEW</div>
            <h2>HealthLens report summary</h2>
            <p>
              A compact overview of the uploaded report for quick review or printing.
            </p>
          </div>

          <button className="btn btn-primary summary-print-button" onClick={printSummary}>
            <Printer size={17} />
            Print / Save PDF
          </button>
        </div>

        <div className="summary-print-page">
          <div className="summary-print-top">
            <div className="summary-print-heading">
              <div className="summary-brand">
                <span className="summary-brand-mark" aria-hidden="true">
                  <HeartPulse size={17} strokeWidth={2.35} />
                </span>
                <span>HEALTHLENS</span>
              </div>
              <h2>Laboratory Report Summary</h2>
              <div className="summary-meta">
                <div><span>USERNAME</span><b>{user?.name || "User"}</b></div>
                <div><span>SUMMARY REPORT DATE</span><b>{new Date(report.reportDate).toLocaleDateString()}</b></div>
                <div><span>TIME</span><b>{new Date(report.reportDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b></div>
                <div><span>REPORT NAME</span><b>{report.fileName}</b></div>
              </div>
            </div>
          </div>

          <div className="summary-stat-row">
            <SummaryStat label="Total tests" value={report.results.length} />
            <SummaryStat label="Within range" value={within} tone="green" />
            <SummaryStat label="Below range" value={below} tone="amber" />
            <SummaryStat label="Above range" value={above} tone="amber" />
          </div>

          <section className="summary-block">
            <div className="summary-block-heading">
              <h3>Results needing attention</h3>
              <span>{attention} result{attention === 1 ? "" : "s"}</span>
            </div>

            {attentionResults.length ? (
              <div className="summary-table-wrap">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Result</th>
                      <th>Reference range</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionResults.slice(0, 8).map((r) => (
                      <tr key={r._id || r.testName}>
                        <td>{r.testName}</td>
                        <td>{r.value} {r.unit}</td>
                        <td>{r.referenceText} {r.unit}</td>
                        <td>
                          <span className={`summary-status ${r.status}`}>
                            {r.status === "below" ? "Below" : "Above"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="summary-empty">No results are outside the reference ranges provided by this report.</p>
            )}

            {attentionResults.length > 8 && (
              <p className="summary-more">
                + {attentionResults.length - 8} additional result{attentionResults.length - 8 === 1 ? "" : "s"} outside the provided range. Open the full report for details.
              </p>
            )}
          </section>

          <section className="summary-block summary-wellness-block">
            <div className="summary-block-heading">
              <h3>General wellness notes</h3>
            </div>
            <ul className="summary-wellness-list">
              {wellnessResults.slice(0, 3).map((r) => (
                <li key={r._id || r.testName}>
                  <b>{r.testName}:</b> {r.wellness}
                </li>
              ))}
              {!wellnessResults.length && (
                <li>
                  Maintain a varied, balanced diet, appropriate hydration, regular activity and good sleep.
                </li>
              )}
            </ul>
          </section>

          <div className="summary-disclaimer">
            <ShieldCheck size={16} />
            <span>
              Educational information only — not a diagnosis. Results outside a reference range do not by themselves establish a medical condition. Use the reference range printed on this report and discuss persistent or concerning findings with a healthcare professional.
            </span>
          </div>
        </div>
      </section>

      <div className="disclaimer">
        <ShieldCheck size={18} />
        <div>
          <b>HealthLens is an educational guide.</b>
          <p>
            It compares the reported value with the reference range supplied by the report.
            It does not diagnose conditions or prescribe treatment. Reference ranges can differ
            between laboratories and individual circumstances.
          </p>
        </div>
      </div>

      {selected && (
        <ResultDetail
          result={selected}
          close={() => setSelected(null)}
        />
      )}

    </div>
  );
}

function SummaryStat({ label, value, tone = "" }) {
  return (
    <div className={`summary-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   RESULT CARD
========================================================= */

function ResultCard({ result, onClick }) {
  const status = result.status;

  const label =
    status === "within"
      ? "Within range"
      : status === "below"
        ? "Below range"
        : "Above range";

  return (
    <button
      className="result-card-pro"
      onClick={onClick}
    >
      <div className={`result-card-accent ${status}`} />

      <div className="result-card-top">
        <span
          className={`badge ${
            status === "within" ? "badge-green" : "badge-amber"
          }`}
        >
          {label}
        </span>
      </div>

      <div className="result-card-title-row">
        <div>
          <h3>{result.testName}</h3>
        </div>

        <ChevronRight size={20} />
      </div>

      <p className="plain-explanation">{result.explanation}</p>

      <div className="result-card-bottom">
        <div>
          <small>YOUR RESULT</small>

          <strong>
            {result.value} <em>{result.unit}</em>
          </strong>
        </div>

        <div>
          <small>REFERENCE RANGE</small>

          <strong>
            {result.referenceText} <em>{result.unit}</em>
          </strong>
        </div>
      </div>

      {result.method && (
        <div className="result-method">
          <small>METHOD</small>
          <span>{result.method}</span>
        </div>
      )}

      <div className="learn-more">
        Open full explanation <ArrowRight size={14} />
      </div>
    </button>
  );
}

/* =========================================================
   RESULT DETAIL
========================================================= */

function localWellnessFallback(term, status) {
  const text = String(term || "").toLowerCase();
  const state = status === "below" ? "below" : status === "above" ? "above" : "within";

  if (/eosinophil/.test(text)) {
    if (state === "above") return "• Maintain a varied diet with vegetables, fruits, whole grains and adequate protein. • No specific food is proven to directly lower an eosinophil count. • If allergies or another trigger is suspected, focus on identifying and managing the cause with a healthcare professional rather than restrictive diets or supplements.";
    if (state === "below") return "• Maintain balanced nutrition and regular meals. • Do not try to raise an eosinophil count with supplements or special foods. • Interpret the result with the rest of the blood differential and any symptoms.";
    return "• Maintain varied nutrition, adequate sleep and regular activity. • No special food is needed to change a normal eosinophil count. • Avoid unnecessary restrictive diets or supplements.";
  }
  if (/lymphocyte/.test(text)) {
    if (state === "above") return "• Maintain balanced meals, adequate sleep and regular activity. • No specific food is proven to directly lower a high lymphocyte count. • Persistent changes should be interpreted with the rest of the blood differential and health history.";
    if (state === "below") return "• Maintain nutrient-rich meals and adequate protein. • Food alone does not directly correct a low lymphocyte count. • Follow infection-prevention or treatment advice from your healthcare team.";
    return "• Maintain balanced nutrition, adequate sleep and regular activity. • No special food is needed to change a normal lymphocyte count.";
  }
  if (/hemoglobin|haemoglobin/.test(text)) {
    if (state === "below") return "• Include iron-, vitamin B12- and folate-containing foods when appropriate, such as beans, lentils, leafy greens, eggs and fortified foods. • Pair plant sources of iron with vitamin-C-rich foods. • Do not start iron supplements from the number alone; the cause should be assessed.";
    if (state === "above") return "• Do not try to lower a high hemoglobin result through food or supplements alone. • Stay appropriately hydrated unless you have fluid restrictions and avoid smoking. • Discuss a persistent high result with a healthcare professional.";
    return "• Maintain a balanced diet containing adequate iron, vitamin B12, folate and protein. • Stay appropriately hydrated and active. • Avoid supplements unless they are needed and recommended.";
  }
  if (/platelet|thrombocyte/.test(text)) {
    if (state === "above") return "• No reliable food directly lowers a high platelet count. • Maintain balanced meals, regular activity and avoid tobacco. • Do not self-start aspirin or blood-thinning medicines; discuss the result with a healthcare professional.";
    if (state === "below") return "• Maintain balanced nutrition with appropriate protein, vitamin B12 and folate sources. • Avoid excessive alcohol. • Food alone may not correct a low platelet count, so discuss the cause with a healthcare professional.";
    return "• Eat a varied diet with vegetables, fruits, whole grains and adequate protein. • Stay active and avoid tobacco. • No specific food is needed to change a normal platelet count.";
  }
  if (/glucose|blood sugar|hba1c|a1c/.test(text)) {
    if (state === "above") return "• Build meals around vegetables, high-fiber foods and protein. • Limit sugary drinks and highly refined foods. • Regular physical activity and consistent sleep support metabolic health.";
    if (state === "below") return "• Eat regular balanced meals rather than trying to correct the number with sugary foods on your own. • Discuss an unexpected low result with a healthcare professional. • Seek prompt advice if low-glucose symptoms occur.";
    return "• Choose balanced meals with vegetables, high-fiber foods and protein. • Stay physically active and maintain consistent sleep. • Avoid using food or supplements specifically to change a normal value.";
  }
  if (/cholesterol|ldl|hdl|triglyceride|lipoprotein/.test(text)) {
    if (state === "above") return "• Choose more vegetables, fruits, whole grains, beans and soluble-fiber foods such as oats and lentils. • Replace some saturated fats with unsaturated fats from nuts, fish and suitable plant oils. • Stay active and avoid tobacco.";
    return "• Choose vegetables, fruits, whole grains, beans, nuts, fish and unsaturated fats regularly. • Limit frequent fried and highly processed foods. • Stay active and avoid tobacco.";
  }
  if (/vitamin|folate|b12|calcium|magnesium|phosphate|phosphorus|zinc/.test(text)) {
    if (state === "below") return "• Include suitable food sources of the nutrient as part of a varied diet. • Ask a healthcare professional whether absorption, medicines or supplementation should be considered. • Do not start high-dose supplements without guidance.";
    if (state === "above") return "• Avoid high-dose supplements or heavily fortified products unless specifically recommended. • Keep your diet balanced rather than trying to rapidly lower the result. • Discuss a persistent high result and any supplement use with a healthcare professional.";
    return "• Get the nutrient mainly through a varied diet with appropriate whole-food sources. • Avoid unnecessary high-dose supplements. • Keep regular meals, hydration and activity habits.";
  }
  if (/creatinine|urea|bun|egfr|kidney|renal/.test(text)) {
    return "• Maintain balanced nutrition and appropriate hydration unless you have been given fluid restrictions. • Do not start a high-protein or restrictive kidney diet on your own. • Discuss persistent abnormal results with a healthcare professional.";
  }
  if (/ast|alt|bilirubin|ggt|liver|hepatic|alkaline phosphatase/.test(text)) {
    return "• Choose a balanced diet with vegetables, fruits, whole grains and appropriate protein. • Avoid excessive alcohol and unnecessary supplements or herbal products. • Maintain regular physical activity and discuss persistent abnormal results with a healthcare professional.";
  }
  if (/tsh|thyroid|t3|t4|thyroxine|triiodothyronine/.test(text)) {
    return "• Maintain varied, balanced nutrition and regular activity. • Do not take thyroid-support or high-dose iodine supplements without professional advice. • Discuss abnormal or persistent results with a healthcare professional.";
  }
  if (state === "above") return "• Maintain a varied, balanced diet and regular activity. • Avoid self-treating the result with supplements or restrictive diets because the cause can vary by test. • Discuss a persistent or clearly abnormal value with a healthcare professional.";
  if (state === "below") return "• Maintain a varied, balanced diet with adequate protein and nutrient-rich foods. • Avoid self-treating with high-dose supplements or restrictive diets. • Discuss a persistent or clearly abnormal value with a healthcare professional.";
  return "• Maintain a varied, balanced diet with vegetables, fruits, whole grains and adequate protein. • Stay appropriately hydrated, physically active and well rested. • Avoid using food or supplements specifically to change a normal laboratory value.";
}

function ResultDetail({ result, close, embedded = false }) {
  const label =
    result.status === "within"
      ? "Within range"
      : result.status === "below"
        ? "Below range"
        : "Above range";

  const context =
    result.status === "within"
      ? "Your reported value is within the reference range shown on this report."
      : result.statusContext || (result.status === "above"
        ? "Your reported value is above the reference range shown on this report. Several factors can cause an elevated result, so the rest of the report and your health history are important for understanding it."
        : "Your reported value is below the reference range shown on this report. Several factors can cause a lower result, so the rest of the report and your health history are important for understanding it.");

  const [medicalInfo, setMedicalInfo] = useState(
    result.medicalSource
      ? {
          title: result.medicalTitle || result.testName,
          explanation: result.explanation,
          source: result.medicalSource,
          sourceUrl: result.medicalSourceUrl,
          why: result.why,
          wellness: result.wellness,
          wellnessSourceUrl: result.wellnessSourceUrl,
          wellnessSourceTitle: result.wellnessSourceTitle,
          professional: result.professional,
          statusContext: result.statusContext,
        }
      : null,
  );

  const [medicalLoading, setMedicalLoading] = useState(false);

  useEffect(() => {
    if (embedded) return undefined;

    let active = true;

    setMedicalLoading(true);

    api
      .medicalTerm(result.testName, result.status)
      .then((data) => {
        if (!active) return;
        if (data?.found && data.explanation) {
          setMedicalInfo(data.explanation);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setMedicalLoading(false);
      });

    return () => {
      active = false;
    };
  }, [embedded, result.testName, result.status]);

  const explanation =
    medicalInfo?.explanation ||
    result.explanation ||
    "Medical information for this laboratory term could not be retrieved right now.";

  const medicalTitle =
    medicalInfo?.title ||
    result.medicalTitle ||
    result.testName;

  const why =
    medicalInfo?.why ||
    result.why ||
    "This test is measured to assess a specific health marker and help your healthcare professional evaluate it with the rest of your results.";

  const storedWellness = String(medicalInfo?.wellness || result.wellness || "").trim();
  const staleGenericWellness =
    !storedWellness ||
    /^For context about this result/i.test(storedWellness) ||
    /^This result is within the sample report/i.test(storedWellness) ||
    /^Maintain a varied, balanced diet, appropriate hydration/i.test(storedWellness);
  const wellness = (staleGenericWellness
    ? localWellnessFallback(result.testName, result.status)
    : storedWellness)
    .replace(/\s*•\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const professional =
    medicalInfo?.professional ||
    result.professional ||
    "If you have symptoms related to this test, discuss them with a healthcare professional.";

  const sourceUrl =
    medicalInfo?.sourceUrl ||
    result.medicalSourceUrl;

  const detailArticle = (
    <article
      className="result-detail-sheet"
      onClick={(e) => e.stopPropagation()}
    >
      {!embedded && (
        <button className="modal-close icon-btn" onClick={close}>
          <X />
        </button>
      )}

      <div className="detail-kicker">
        <span className={`detail-status-dot ${result.status}`} />
        {label}
      </div>

      <div className="detail-title-block">
        <h2>{result.testName}</h2>
        <p>
          Understand the medical term first. Then use the reported value and reference range as context.
        </p>
      </div>

      <section className="detail-feature-card">
        <div className="detail-feature-icon">
          <Info size={20} />
        </div>
        <div>
          <span>WHAT IS {result.testName.toUpperCase()}?</span>
          <h3>{medicalTitle}</h3>
          <p>{explanation}</p>

          {medicalLoading && (
            <small className="medical-loading">Checking MedlinePlus…</small>
          )}

          {sourceUrl && (
            <a
              className="medical-source-link"
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              Source: MedlinePlus ↗
            </a>
          )}
        </div>
      </section>

      <section className="detail-result-card">
        <div className="detail-section-label">YOUR REPORTED RESULT</div>

        <div className="detail-number-row">
          <strong>{result.value}</strong>
          <span>{result.unit}</span>
          <span
            className={`badge ${
              result.status === "within" ? "badge-green" : "badge-amber"
            }`}
          >
            {label}
          </span>
        </div>

        <div className="detail-range">
          <span>Reference range</span>
          <b>{result.referenceText} {result.unit}</b>
        </div>

        <p className="detail-context">{context}</p>

        {result.method && (
          <div className="detail-method">
            <span>Method</span>
            <b>{result.method}</b>
          </div>
        )}
      </section>

      <div className="detail-two-col">
        <section className="detail-info-card">
          <div className="info-card-icon">
            <Activity size={18} />
          </div>
          <div>
            <h3>Why is it measured?</h3>
            <p>{why}</p>
          </div>
        </section>

        <section className="detail-info-card wellness">
          <div className="info-card-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <h3>General nutrition & wellness</h3>
            <p>{wellness}</p>
          </div>
        </section>
      </div>

      <section className="professional-card">
        <div className="professional-icon">
          <Stethoscope size={20} />
        </div>
        <div>
          <span>WHEN TO DISCUSS IT</span>
          <h3>Consider speaking with a healthcare professional</h3>
          <p>{professional}</p>
        </div>
      </section>

      <div className="detail-footer-note">
        <ShieldCheck size={15} />
        Educational information only · Not a diagnosis · Use the reference range provided by your report.
      </div>
    </article>
  );

  if (embedded) return detailArticle;

  return <div className="modal-backdrop" onClick={close}>{detailArticle}</div>;
}

function StatusResultsPage() {
  const { id, status } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .report(id)
      .then((d) => setReport(d.report))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  const validStatus = ["within", "below", "above"].includes(status);
  const label = status === "within" ? "Within range" : status === "below" ? "Below range" : "Above range";
  const description = status === "within"
    ? "Results from this report that fall within their provided reference ranges."
    : status === "below"
      ? "Results from this report that are below their provided reference ranges."
      : "Results from this report that are above their provided reference ranges.";

  if (loading) {
    return (
      <div className="content-wrap">
        <SkeletonRows />
        <SkeletonRows />
      </div>
    );
  }

  if (!report || !validStatus) {
    return (
      <div className="content-wrap">
        <EmptyState
          icon={<FileText />}
          title="Results not found"
          text="This result group is not available for this report."
        />
        <button
          className="btn btn-ghost status-page-back-fallback"
          onClick={() => navigate(`/app/report/${id}`)}
        >
          <ArrowLeft size={16} />
          Back to report
        </button>
      </div>
    );
  }

  const results = report.results.filter((result) => result.status === status);

  return (
    <div className="content-wrap status-page">
      <div className="status-page-topbar">
        <button
          type="button"
          className="status-page-back"
          onClick={() => navigate(`/app/report/${id}`)}
        >
          <ArrowLeft size={17} />
          Back to report
        </button>
      </div>

      <section className="status-page-hero">
        <div>
          <div className="detail-kicker">
            <span className={`detail-status-dot ${status}`} />
            {label}
          </div>
          <h1>{label} results</h1>
          <p>
            {results.length} result{results.length === 1 ? "" : "s"} · {description}
          </p>
        </div>

        <div className="status-page-count">
          <strong>{results.length}</strong>
          <span>results</span>
        </div>
      </section>

      {results.length ? (
        <div className="status-page-results">
          {results.map((result, index) => (
            <section
              className="status-page-result"
              key={result._id || `${result.testName}-${index}`}
            >
              <ResultDetail result={result} close={() => {}} embedded />
            </section>
          ))}
        </div>
      ) : (
        <div className="panel status-page-empty">
          <CheckCircle2 size={24} />
          <h2>No {label.toLowerCase()} results</h2>
          <p>This report does not contain any results in this group.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/app/report/${id}`)}
          >
            Back to report
          </button>
        </div>
      )}

      <div className="disclaimer status-page-disclaimer">
        <ShieldCheck size={18} />
        <div>
          <b>HealthLens is an educational guide.</b>
          <p>
            Results are interpreted using the reference range supplied by the report.
            They do not diagnose conditions or prescribe treatment.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HISTORY
========================================================= */

function HistoryPage() {
  const { reports, loading, reload } = useReports();

  const [query, setQuery] = useState("");

  const [filter, setFilter] = useState("all");

  async function remove(id) {
    if (!confirm("Delete this report from your history?")) {
      return;
    }

    await api.deleteReport(id);
    reload();
  }

  const shown = reports
    .filter((r) => r.fileName.toLowerCase().includes(query.toLowerCase()))
    .filter(
      (r) =>
        filter === "all" ||
        (filter === "attention"
          ? r.results.some((x) => x.status !== "within")
          : !r.results.some((x) => x.status !== "within")),
    );

  return (
    <div className="content-wrap">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR REPORTS</div>

          <h1>Report history</h1>

          <p className="muted">
            Review and revisit reports you’ve already analyzed.
          </p>
        </div>

        <Link
          className="btn btn-primary"
          to="/app/upload"
        >
          <Upload size={17} />
          Upload report
        </Link>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={17} />

          <input
            placeholder="Search reports…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All reports</option>

          <option value="attention">Needs attention</option>

          <option value="clear">All within range</option>
        </select>
      </div>

      <section className="panel">
        {loading ? (
          <SkeletonRows />
        ) : shown.length ? (
          shown.map((r) => (
            <HistoryRow
              key={r._id}
              report={r}
              remove={() => remove(r._id)}
            />
          ))
        ) : (
          <EmptyState
            icon={<History />}
            title={
              reports.length ? "No matching reports" : "Your history is empty"
            }
            text={
              reports.length
                ? "Try a different search or filter."
                : "Upload a report to build your health information history."
            }
            action={
              !reports.length && (
                <Link
                  className="btn btn-primary btn-small"
                  to="/app/upload"
                >
                  Upload report
                </Link>
              )
            }
          />
        )}
      </section>
    </div>
  );
}

function HistoryRow({ report, remove }) {
  const attention = report.results.filter((r) => r.status !== "within").length;

  return (
    <div className="history-row">
      <Link
        to={`/app/report/${report._id}`}
        className="history-main"
      >
        <div className="file-icon">
          <FileText />
        </div>

        <div>
          <b>{report.fileName}</b>

          <span>
            {new Date(report.reportDate).toLocaleDateString()} ·{" "}
            {report.results.length} results
          </span>
        </div>
      </Link>

      <div className="history-meta">
        <span className={`badge ${attention ? "badge-amber" : "badge-green"}`}>
          {attention ? `${attention} need attention` : "All within range"}
        </span>

        <button
          className="icon-btn danger"
          title="Delete report"
          onClick={remove}
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   TRENDS
========================================================= */

function TrendsPage() {
  const { reports, loading } = useReports();

  const all = [...reports].flatMap((r) =>
    r.results.map((x) => ({
      ...x,
      date: new Date(r.reportDate),
      report: r.fileName,
    })),
  );

  const names = [...new Set(all.map((x) => x.testName))];

  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!selected && names[0]) {
      setSelected(names[0]);
    }
  }, [names.join("|")]);

  const data = all
    .filter((x) => x.testName === selected)
    .sort((a, b) => a.date - b.date)
    .map((x) => ({
      date: x.date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      }),
      value: x.value,
      min: x.referenceMin,
      max: x.referenceMax,
    }));

  return (
    <div className="content-wrap trends-page">
      <div className="eyebrow">TRACK OVER TIME</div>

      <h1>Trends</h1>

      <p className="page-lead">
        See how a reported measurement changes across the reports you’ve saved.
      </p>

      {!loading && names.length > 0 ? (
        <>
          <div className="trend-controls">
            <label>
              Choose a result
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {names.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>

            <div className="trend-note">
              <Info size={15} />
              Trends show reported values; they are not a diagnosis.
            </div>
          </div>

          <section className="panel chart-panel">
            <div className="panel-head">
              <div>
                <h2>{selected}</h2>

                <p>Reported values across saved reports</p>
              </div>
            </div>

            <div className="big-chart">
              <Chart data={data} />
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          icon={<TrendingUp />}
          title="Not enough history yet"
          text="Add at least one report to begin exploring reported values over time."
          action={
            <Link
              className="btn btn-primary btn-small"
              to="/app/upload"
            >
              Upload report
            </Link>
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   CHART
========================================================= */

function Chart({ data }) {
  if (!data.length) {
    return <div className="chart-empty">No values available.</div>;
  }

  const W = 800;
  const H = 280;
  const p = 35;

  const min = Math.min(...data.map((d) => d.value));

  const max = Math.max(...data.map((d) => d.value));

  const range = max - min || 1;

  const pts = data
    .map(
      (d, i) =>
        `${p + (i * (W - 2 * p)) / Math.max(data.length - 1, 1)},${
          H - p - ((d.value - min) / range) * (H - 2 * p)
        }`,
    )
    .join(" ");

  return (
    <div className="svg-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <line
          x1={p}
          y1={H - p}
          x2={W - p}
          y2={H - p}
          stroke="currentColor"
          opacity=".15"
        />

        <polyline
          points={pts}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />

        {data.map((d, i) => {
          const [x, y] = `${
            p + (i * (W - 2 * p)) / Math.max(data.length - 1, 1)
          },${H - p - ((d.value - min) / range) * (H - 2 * p)}`.split(",");

          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="6"
                fill="currentColor"
              />

              <text
                x={x}
                y={H - 10}
                textAnchor="middle"
              >
                {d.date}
              </text>

              <text
                x={x}
                y={Number(y) - 12}
                textAnchor="middle"
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* =========================================================
   PROFILE & SETTINGS
   REPORT HISTORY + LOGOUT ADDED AT BOTTOM
========================================================= */

function ProfilePage() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  return (
    <div className="content-wrap narrow profile-page">
      <div className="eyebrow">ACCOUNT</div>

      <h1>Profile & settings</h1>

      <p className="page-lead">
        Manage your account and understand how HealthLens handles information.
      </p>

      {/* SINGLE PROFILE CARD */}
      <section className="panel settings-panel profile-account-card">
        <div className="profile-avatar">
          {(user?.name || "U").charAt(0).toUpperCase()}
        </div>

        <div className="profile-details">
          <h2>{user?.name || "User"}</h2>

          <p>{user?.email || "No email available"}</p>

          <span className="badge badge-green">Account active</span>
        </div>
      </section>

      {/* REPORT HISTORY ONLY */}
      <section className="panel profile-history-panel">
        <div className="profile-history-icon">
          <History size={18} />
        </div>

        <div className="profile-history-content">
          <h3>Report history</h3>
          <p>Review and revisit the reports you have already analyzed.</p>
        </div>

        <button
          type="button"
          className="profile-history-button"
          onClick={() => navigate("/app/history")}
        >
          View history
          <ChevronRight size={17} />
        </button>
      </section>

      {/* PRIVACY & SECURITY — CLICK TO EXPAND */}
      <section className="panel settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${privacyOpen ? "open" : ""}`}
          onClick={() => setPrivacyOpen((value) => !value)}
          aria-expanded={privacyOpen}
        >
          <span className="settings-accordion-title">
            <span className="settings-icon">
              <ShieldCheck size={18} />
            </span>

            <span>
              <h3>Privacy & security</h3>
              <p>Learn how your account and report information are handled.</p>
            </span>
          </span>

          <ChevronDown
            size={18}
            className={`accordion-chevron ${privacyOpen ? "open" : ""}`}
          />
        </button>

        {privacyOpen && (
          <div className="settings-accordion-content">
            <p>Your reports are associated with your authenticated account.</p>
            <p>
              Passwords are stored as hashes on the server, not as plaintext.
            </p>
          </div>
        )}
      </section>

      {/* HEALTH INFORMATION DISCLAIMER — CLICK TO EXPAND */}
      <section className="panel settings-accordion">
        <button
          type="button"
          className={`settings-accordion-header ${
            disclaimerOpen ? "open" : ""
          }`}
          onClick={() => setDisclaimerOpen((value) => !value)}
          aria-expanded={disclaimerOpen}
        >
          <span className="settings-accordion-title">
            <span className="settings-icon">
              <Info size={18} />
            </span>

            <span>
              <h3>Health information disclaimer</h3>
              <p>
                Important information about the educational purpose of
                HealthLens.
              </p>
            </span>
          </span>

          <ChevronDown
            size={18}
            className={`accordion-chevron ${disclaimerOpen ? "open" : ""}`}
          />
        </button>

        {disclaimerOpen && (
          <div className="settings-accordion-content">
            <p>
              HealthLens is an educational project. It organizes reported values
              and provides general explanations.
            </p>
            <p>
              It does not diagnose conditions, prescribe medicines, or replace
              professional medical advice.
            </p>
          </div>
        )}
      </section>

      {/* DELETE ACCOUNT — ABOVE LOG OUT */}
      <section className="panel profile-delete-section">
        <div className="profile-delete-content">
          <div className="profile-delete-icon">
            <AlertCircle size={19} />
          </div>

          <div>
            <h3>Delete account</h3>
            <p>Delete your HealthLens account and permanently remove your saved reports.</p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-danger profile-delete-button"
          disabled={deletingAccount}
          onClick={async () => {
            const confirmed = window.confirm(
              "Delete your HealthLens account and all saved reports? This action cannot be undone."
            );
            if (!confirmed) return;

            setDeletingAccount(true);
            try {
              await api.deleteAccount();
              logout();
            } catch (error) {
              window.alert(error.message || "Unable to delete the account.");
            } finally {
              setDeletingAccount(false);
            }
          }}
        >
          <AlertCircle size={17} />
          {deletingAccount ? "Deleting…" : "Delete account"}
        </button>
      </section>

      {/* LOGOUT AT THE EXTREME BOTTOM */}
      <section className="panel profile-logout-section">
        <div className="profile-logout-content">
          <div className="profile-logout-icon">
            <LogOut size={19} />
          </div>

          <div>
            <h3>Log out</h3>
            <p>Sign out of your HealthLens account on this device.</p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-danger"
          onClick={logout}
        >
          <LogOut size={17} />
          Log out
        </button>
      </section>
    </div>
  );
}

export default App;
