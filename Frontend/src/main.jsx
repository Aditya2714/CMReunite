import ReactDOM from "react-dom/client";
import { lazy, StrictMode, Suspense } from "react";
import "./index.css";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from "react-router-dom";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor } from "./store/store";
import store from "./store/store";
import Layout from "./Layout.jsx";
import AuthBootstrap from "./Components/AuthBootstrap.jsx";
import Loader from "./Components/Loader.jsx";
import ErrorBoundary from "./Components/ErrorBoundary.jsx";
import {
  useLoggedIn,
  useCurrentUser,
  useSessionChecked,
} from "./services/authService.js";

const SuperAdmin = lazy(() => import("./Components/SuperAdmin.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./Components/Dashboard.jsx"));
const Home = lazy(() => import("./Components/Home.jsx"));
const Event = lazy(() => import("./Components/Event.jsx"));
const CommunityPosts = lazy(() => import("./Components/CommunityPosts.jsx"));
const LegacyPostsRedirect = lazy(() => import("./Components/LegacyPostsRedirect.jsx"));
const Newsletter = lazy(() => import("./Components/NewsLetter.jsx"));
const Announcements = lazy(() => import("./Components/SendMail.jsx"));
const BulkUpload = lazy(() => import("./Components/BulkUpload.jsx"));
const AdminApprovals = lazy(() => import("./Components/AdminApprovals.jsx"));
const AdminReports = lazy(() => import("./Components/AdminReports.jsx"));
const AdminMentorship = lazy(() => import("./Components/AdminMentorship.jsx"));
const ManageAlumni = lazy(() => import("./Components/ManageAlumni.jsx"));
const SearchPeople = lazy(() => import("./Components/SearchPeople.jsx"));
const Mentorship = lazy(() => import("./Components/Meeting.jsx"));
const Feedback = lazy(() => import("./Components/Feedback.jsx"));
const Profile = lazy(() => import("./Components/Profile.jsx"));
const Recommendations = lazy(() => import("./Components/Recommendations.jsx"));
const Notifications = lazy(() => import("./Components/Notifications.jsx"));
const Messages = lazy(() => import("./Components/Messages.jsx"));
const AlumniAssistant = lazy(() => import("./Components/AlumniAssistant.jsx"));
const NetworkGraph = lazy(() => import("./Components/NetworkGraph.jsx"));
const ModelEvaluation = lazy(() => import("./Components/ModelEvaluation.jsx"));
const PrivacyCenter = lazy(() => import("./Components/PrivacyCenter.jsx"));
const PresentationMode = lazy(() => import("./Components/PresentationMode.jsx"));
const AccountSecurity = lazy(() => import("./Components/AccountSecurity.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const lazyFeature = (name) =>
  lazy(() =>
    import("./Components/AlumniFeatures.jsx").then((module) => ({
      default: module[name],
    }))
  );

const CareerReferrals = lazyFeature("CareerReferrals");
const Connections = lazyFeature("Connections");
const Contributions = lazyFeature("Contributions");
const DiscussionForum = lazyFeature("DiscussionForum");
const RecognitionWall = lazyFeature("RecognitionWall");
const ResourceLibrary = lazyFeature("ResourceLibrary");

function RequireAuth({ children }) {
  const loggedIn = useLoggedIn();
  const checked = useSessionChecked();
  const user = useCurrentUser();
  const location = useLocation();
  if (user?.mustChangePassword && location.pathname !== "/account-security") return <Navigate to="/account-security" replace />;
  if (!checked) return <Loader text="Checking session..." />;
  return loggedIn ? children : <Navigate to="/login" replace />;
}

function RequireAdminTool({ children }) {
  const loggedIn = useLoggedIn();
  const user = useCurrentUser();
  const checked = useSessionChecked();

  if (!checked) return <Loader text="Checking session..." />;
  if (!loggedIn) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/account-security" replace />;
  if (user?.role === "admin" && !user.department) return <Navigate to="/dashboard" replace />;
  return ["admin", "super_admin"].includes(user?.role) ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

function RequireSuperAdmin({ children }) {
  const loggedIn = useLoggedIn();
  const user = useCurrentUser();
  const checked = useSessionChecked();

  if (!checked) return <Loader text="Checking session..." />;
  if (!loggedIn) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) return <Navigate to="/account-security" replace />;
  return user?.role === "super_admin" ? children : <Navigate to="/dashboard" replace />;
}

function SuperAdminAccess() {
  const user = useCurrentUser();
  return user?.role === "super_admin" ? <SuperAdmin /> : <Navigate to="/dashboard" replace />;
}
function DashboardEntry() {
  const user = useCurrentUser();
  if (user?.role === "super_admin") return <Navigate to="/super-admin" replace />;
  if (user?.role === "admin" && !user.department) return <main className="p-8"><h1 className="text-2xl font-bold">Department assignment required</h1><p>Ask Super Admin to assign your department before using administrative tools.</p></main>;
  return <Dashboard />;
}
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/super-admin", element: <RequireAuth><SuperAdminAccess /></RequireAuth> },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "",
        element: <Home />,
      },
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "login",
        element: <Login />,
      },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      {
        path: "demo",
        element: <RequireSuperAdmin><PresentationMode /></RequireSuperAdmin>,
      },
      {
        path: "dashboard",
        element: (
          <RequireAuth>
            <DashboardEntry />
          </RequireAuth>
        ),
      },
      {
        path: "profile",
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },

      {
        path: "events",
        element: (
          <RequireAuth>
            <Event />
          </RequireAuth>
        ),
      },
      {
        path: "/community-posts",
        element: <RequireAuth><CommunityPosts /></RequireAuth>,
      },
      {
        path: "/jobs",
        element: (
          <RequireAuth>
            <LegacyPostsRedirect postType="job" />
          </RequireAuth>
        ),
      },
      {
        path: "/newsletter",
        element: (
          <RequireAuth>
            <Newsletter />
          </RequireAuth>
        ),
      },
      {
        path: "/announcements",
        element: (
          <RequireAuth>
            <Announcements />
          </RequireAuth>
        ),
      },
      {
        path: "/send-mail",
        element: <Navigate to="/announcements" replace />,
      },
      {
        path: "/bulk-upload",
        element: (
          <RequireAdminTool>
            <BulkUpload />
          </RequireAdminTool>
        ),
      },
      {
        path: "/approvals",
        element: (
          <RequireAdminTool>
            <AdminApprovals />
          </RequireAdminTool>
        ),
      },
      {
        path: "/reports",
        element: (
          <RequireAdminTool>
            <AdminReports />
          </RequireAdminTool>
        ),
      },
      {
        path: "/admin-mentorship",
        element: (
          <RequireAdminTool>
            <AdminMentorship />
          </RequireAdminTool>
        ),
      },
      {
        path: "/manage-alumni",
        element: (
          <RequireAdminTool>
            <ManageAlumni />
          </RequireAdminTool>
        ),
      },
      {
        path: "/search-people",
        element: (
          <RequireAuth>
            <SearchPeople />
          </RequireAuth>
        ),
      },
      {
        path: "/alumni-directory",
        element: (
          <RequireAuth>
            <SearchPeople />
          </RequireAuth>
        ),
      },
      {
        path: "/connections",
        element: (
          <RequireAuth>
            <Connections />
          </RequireAuth>
        ),
      },
      {
        path: "/career-referrals",
        element: (
          <RequireAuth>
            <CareerReferrals />
          </RequireAuth>
        ),
      },
      {
        path: "/alumni-stories",
        element: (
          <RequireAuth>
            <LegacyPostsRedirect postType="story" />
          </RequireAuth>
        ),
      },
      {
        path: "/forum",
        element: (
          <RequireAuth>
            <DiscussionForum />
          </RequireAuth>
        ),
      },
      {
        path: "/resources",
        element: (
          <RequireAuth>
            <ResourceLibrary />
          </RequireAuth>
        ),
      },
      {
        path: "/contributions",
        element: (
          <RequireAuth>
            <Contributions />
          </RequireAuth>
        ),
      },
      {
        path: "/recognition",
        element: (
          <RequireAuth>
            <RecognitionWall />
          </RequireAuth>
        ),
      },
      {
        path: "/mentorship",
        element: (
          <RequireAuth>
            <Mentorship />
          </RequireAuth>
        ),
      },
      {
        path: "/meeting",
        element: <Navigate to="/mentorship" replace />,
      },
      {
        path: "/feedback",
        element: (
          <RequireAuth>
            <Feedback />
          </RequireAuth>
        ),
      },
      {
        path: "/notifications",
        element: (
          <RequireAuth>
            <Notifications />
          </RequireAuth>
        ),
      },
      {
        path: "/messages",
        element: (
          <RequireAuth>
            <Messages />
          </RequireAuth>
        ),
      },
      {
        path: "/recommendations",
        element: (
          <RequireAuth>
            <Recommendations />
          </RequireAuth>
        ),
      },
      {
        path: "/assistant",
        element: (
          <RequireAuth>
            <AlumniAssistant />
          </RequireAuth>
        ),
      },
      {
        path: "/network-graph",
        element: (
          <RequireAuth>
            <NetworkGraph />
          </RequireAuth>
        ),
      },
      {
        path: "/model-evaluation",
        element: (
          <RequireSuperAdmin>
            <ModelEvaluation />
          </RequireSuperAdmin>
        ),
      },
      {
        path: "/privacy",
        element: (
          <RequireAuth>
            <PrivacyCenter />
          </RequireAuth>
        ),
      },
      {
        path: "/account-security",
        element: (
          <RequireAuth>
            <AccountSecurity />
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: "/*",
    element: <Navigate to="/login" />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <AuthBootstrap />
        <ErrorBoundary>
          <Suspense fallback={<Loader text="Loading page..." />}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </PersistGate>
    </Provider>
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}
