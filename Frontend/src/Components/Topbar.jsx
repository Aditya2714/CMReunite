import { useState } from "react";
import {
  FaBars,
  FaBell,
  FaChevronDown,
  FaComments,
  FaCompass,
  FaHome,
  FaKey,
  FaShieldAlt,
  FaSignOutAlt,
  FaTimes,
  FaUserCircle,
} from "react-icons/fa";
import { Link, NavLink } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useLoggedIn, useCurrentUser } from "../services/authService";
import { logout } from "../features/authSlice";
import logo from "../assets/img/logo.png";
import api from "../services/api";

function Topbar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const loggedIn = useLoggedIn();
  const user = useCurrentUser() || {};
  const dispatch = useDispatch();
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.adminName ||
    user.name ||
    "CMRunite Member";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const profilePhoto =
    user.fileType !== "application/pdf"
      ? user.imageUrl || user.profileImage || user.avatar || user.image || user.photoUrl
      : "";

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setShowProfileMenu(false);
  };
  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      dispatch(logout());
    }
    setShowLogoutConfirm(false);
    closeMenus();
  };
  const navClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-extrabold transition ${
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="app-container flex min-h-[76px] items-center justify-between gap-5">
        <Link
          to={loggedIn ? "/dashboard" : "/home"}
          className="group flex items-center gap-3"
          onClick={closeMenus}
        >
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 transition group-hover:-rotate-3">
            <img src={logo} alt="CMRunite Logo" className="h-full w-full object-cover" />
          </span>
          <span>
            <strong className="block text-lg font-black tracking-tight text-slate-950">
              CMRunite
            </strong>
            <span className="hidden text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-slate-400 sm:block">
              Alumni network
            </span>
          </span>
        </Link>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <nav
          className={`absolute left-4 right-4 top-[68px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl lg:static lg:flex lg:items-center lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
            isMobileMenuOpen ? "grid gap-1" : "hidden"
          }`}
        >
          {loggedIn ? (
            <>
              <NavLink to="/dashboard" className={navClass} onClick={closeMenus}>
                <FaHome /> Dashboard
              </NavLink>
              <NavLink to="/alumni-directory" className={navClass} onClick={closeMenus}>
                <FaCompass /> Discover
              </NavLink>
              <NavLink to="/messages" className={navClass} onClick={closeMenus}>
                <FaComments /> Messages
              </NavLink>
              <NavLink to="/notifications" className={navClass} onClick={closeMenus}>
                <FaBell /> Updates
              </NavLink>
              <div className="relative mt-2 border-t border-slate-100 pt-2 lg:ml-2 lg:mt-0 lg:border-0 lg:pt-0">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((open) => !open)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 text-left shadow-sm transition hover:border-indigo-200 lg:w-auto"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-xs font-black text-white">
                      {initials}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 lg:hidden xl:block">
                    <strong className="block max-w-[130px] truncate text-xs text-slate-900">
                      {displayName}
                    </strong>
                    <span className="block text-[0.65rem] font-bold capitalize text-slate-400">
                      {user.role || "member"}
                    </span>
                  </span>
                  <FaChevronDown className="text-[0.65rem] text-slate-400" />
                </button>
                {showProfileMenu && (
                  <div className="mt-2 grid gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl lg:absolute lg:right-0 lg:w-52">
                    <Link to="/profile" onClick={closeMenus} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
                      <FaUserCircle /> My profile
                    </Link>
                    <Link to="/privacy" onClick={closeMenus} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
                      <FaShieldAlt /> Privacy &amp; Trust
                    </Link>
                    <Link to="/account-security" onClick={closeMenus} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
                      <FaKey /> Account Security
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      <FaSignOutAlt /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/home" className={navClass} onClick={closeMenus}>
                <FaHome /> Home
              </NavLink>
              <Link to="/register" onClick={closeMenus} className="secondary-button min-h-[42px] px-4">
                Join network
              </Link>
              <Link to="/login" onClick={closeMenus} className="primary-button min-h-[42px] px-5">
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <section className="surface-card w-full max-w-sm p-7">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-xl text-red-600">
              <FaSignOutAlt />
            </div>
            <h2 className="mt-5 text-center text-2xl font-black text-slate-950">Sign out?</h2>
            <p className="mt-2 text-center text-sm font-semibold leading-6 text-slate-500">
              You can sign back in any time to continue from where you left.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowLogoutConfirm(false)} className="secondary-button">
                Cancel
              </button>
              <button type="button" onClick={handleLogout} className="primary-button bg-red-600 hover:bg-red-700">
                Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </header>
  );
}

export default Topbar;
