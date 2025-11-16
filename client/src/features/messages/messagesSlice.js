import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../api/axios";

const initialState = {
  messages: [],
};

export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async ({ token, userId }) => {
    const { data } = await api.post(
      `/api/messages/get`,
      {
        to_user_id: userId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return data.success ? data.data : null;
  }
);

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      const newMessage = action.payload;
      if (!newMessage) {
        return;
      }

      const normalizeId = (id) => {
        if (!id) return null;
        if (typeof id === "string") return id;
        if (typeof id === "object" && id.toString) return id.toString();
        return String(id);
      };

      const messageId = normalizeId(newMessage._id);
      if (!messageId) {
        state.messages = [...state.messages, newMessage];
        return;
      }

      const exists = state.messages.some((msg) => {
        const msgId = normalizeId(msg._id);
        return msgId && msgId === messageId;
      });

      if (!exists) {
        state.messages = [...state.messages, newMessage];
      }
    },
    resetMessages: (state) => {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      if (action.payload && Array.isArray(action.payload)) {
        const messagesMap = new Map();

        action.payload.forEach((msg) => {
          const id = msg._id?.toString() || msg._id;
          if (id) {
            messagesMap.set(id, msg);
          }
        });

        state.messages.forEach((msg) => {
          const id = msg._id?.toString() || msg._id;
          if (id && !messagesMap.has(id)) {
            messagesMap.set(id, msg);
          }
        });

        const mergedMessages = Array.from(messagesMap.values());
        state.messages = mergedMessages;
      }
    });
  },
});

export default messagesSlice.reducer;
export const { setMessages, addMessage, resetMessages } = messagesSlice.actions;
