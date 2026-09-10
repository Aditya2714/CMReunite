// slices = reducers ka bahut bada collection
// reducers = functions jo state ko manipulate karte hai
// unique id ke lie uuid ya nanoid use karna
import { createSlice } from "@reduxjs/toolkit";
const initialState = {
  currentUser: null,
  loggedIn: false,
  role: "",
  sessionChecked: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // isme properties aur function define karenge
    login: (state, action) => {
      // state hota hai current state | jo ki ek object hai aur usme status aur userData hai
      // action hota hai jo ki ek object hai aur usme type aur payload hai
      state.loggedIn = true;
      state.role = action.payload.role;
      state.currentUser = action.payload;
      state.sessionChecked = true;
      // state.role = action.payload.role;
    },
    // reducers
    // reducers are functions that manipulate the state
    // reducers are called by dispatching actions
    // actions are objects that contain the type of action and the payload
    // actions are dispatched by calling
    logout: (state) => {
      state.loggedIn = false;
      state.currentUser = null;
      state.role = null;
      state.sessionChecked = true;
      // state.role = "";
    },
    sessionChecked: (state) => {
      state.sessionChecked = true;
    },
  },
});

export const { login, logout, sessionChecked } = authSlice.actions;
// export actions
export default authSlice.reducer;
