import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connections: [],
  followers: [],
  following: [],
  pendingConnections: [],
}

const connectionsSlice = createSlice({
  name: "connections",
  initialState,
  reducers: {
    setConnections: (state, action) => {
      state.connections = action.payload.connections;
      state.followers = action.payload.followers;
      state.following = action.payload.following;
      state.pendingConnections = action.payload.pendingConnections;
    },
  },
});

export const { setConnections } = connectionsSlice.actions;
export default connectionsSlice.reducer;