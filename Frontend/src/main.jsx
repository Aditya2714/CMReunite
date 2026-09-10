import ReactDOM from "react-dom/client";
import { lazy, StrictMode, Suspense } from "react";
import "./index.css";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
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

const Register = lazy(() => import("./pages/Register.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./Components/Dashboard.jsx"));
const Home = lazy(() => import("./Components/Home.jsx"));
const Event = lazy(() => import("./Components/Event.jsx"));
const Jobs = lazy(() => import("./Components/Jobs.jsx"));
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
const AlumniStories = lazyFeature("AlumniStories");
const CareerReferrals = lazyFeature("CareerReferrals");
const Connections = lazyFeature("Connections");
const Contributions = lazyFeature("Contributions");
const DiscussionForum = lazyFeature("DiscussionForum");
const RecognitionWall = lazyFeature("RecognitionWall");
const ResourceLibrary = lazyFeature("ResourceLibrary");

function RequireAuth({ children }) {
  const loggedIn = useLoggedIn();
  const checked = useSessionChecked();
  if (!checked) return <Loader text="Checking session..." />;
  return loggedIn ? children : <Navigate to="/login" replace />;
}

function RequireAdminTool({ children }) {
  const loggedIn = useLoggedIn();
  const user = useCurrentUser();
  const checked = useSessionChecked();

  if (!checked) return <Loader text="Checking session..." />;
  if (!loggedIn) return <Navigate to="/login" replace />;
  return ["admin", "college"].includes(user?.role) ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
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
        element: <PresentationMode />,
      },
      {
        path: "dashboard",
        element: (
          <RequireAuth>
            <Dashboard />
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
        path: "/jobs",
        element: (
          <RequireAuth>
            <Jobs />
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
            <AlumniStories />
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
          <RequireAuth>
            <ModelEvaluation />
          </RequireAuth>
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
