import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import toast from "react-hot-toast";

const initialState = {
  value: null,
};

export const fetchUser = createAsyncThunk("user/fetchUser", async (token) => {
  const { data } = await api.get("/api/users/data", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
});

export const updateUser = createAsyncThunk(
  "user/update",
  async ({ userData, token }) => {
    const { data } = await api.post("/api/users/update", userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.success) {
      toast.success(data.message);
      return data.data;
    } else {
      toast.error(data.message);
      return null;
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.value = action.payload.data;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.value = { ...state.value, ...action.payload };
        }
      });
  },
});

export default userSlice.reducer;
