import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: null,
}

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.value = action.payload;
    },
  },
});

export default messagesSlice.reducer;