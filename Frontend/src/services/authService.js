import { useSelector } from "react-redux";

function useCurrentUser() {
  return useSelector((state) => state.currentUser);
}

function useLoggedIn() {
  return useSelector((state) => state.loggedIn);
}

function useUserRole() {
  return useSelector((state) => state.role);
}

function useSessionChecked() {
  return useSelector((state) => state.sessionChecked);
}

export { useCurrentUser, useLoggedIn, useSessionChecked, useUserRole };
