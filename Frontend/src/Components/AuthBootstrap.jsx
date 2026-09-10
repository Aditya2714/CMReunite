import { useEffect } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { login, logout, sessionChecked } from "../features/authSlice";

function AuthBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const response = await api.get("/auth/me");
        if (active) dispatch(login(response.data.data.user));
      } catch {
        if (active) dispatch(logout());
      } finally {
        if (active) dispatch(sessionChecked());
      }
    };
    restoreSession();
    return () => {
      active = false;
    };
  }, [dispatch]);

  return null;
}

export default AuthBootstrap;
