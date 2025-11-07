import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios";

const initialState = {
  connections: [],
  followers: [],
  following: [],
  pendingConnections: [],
}

export const fetchConnections = createAsyncThunk("connections/fetchConnections", async (token) => {
  const { data } = await api.get("/api/users/connections", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.success ? data.data : null;
})

const connectionsSlice = createSlice({
  name: "connections",
  initialState,
  reducers: {
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.connections = action.payload.connections;
        state.followers = action.payload.followers;
        state.following = action.payload.following;
        state.pendingConnections = action.payload.pendingConnections;
      })
  }
});

export const { setConnections } = connectionsSlice.actions;
export default connectionsSlice.reducer;