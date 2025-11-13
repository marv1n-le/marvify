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
        console.warn("⚠️ addMessage được gọi với payload null/undefined");
        return;
      }

      // Normalize message ID để so sánh
      const normalizeId = (id) => {
        if (!id) return null;
        if (typeof id === "string") return id;
        if (typeof id === "object" && id.toString) return id.toString();
        return String(id);
      };

      const messageId = normalizeId(newMessage._id);
      if (!messageId) {
        console.warn("⚠️ Message không có _id:", newMessage);
        // Vẫn thêm vào nếu không có ID (có thể là tin nhắn tạm thời)
        state.messages = [...state.messages, newMessage];
        return;
      }

      // Kiểm tra xem message đã tồn tại chưa (tránh duplicate)
      const exists = state.messages.some((msg) => {
        const msgId = normalizeId(msg._id);
        return msgId && msgId === messageId;
      });

      if (!exists) {
        console.log("➕ Thêm tin nhắn mới vào state:", messageId);
        // Tạo array mới để đảm bảo React detect được thay đổi
        state.messages = [...state.messages, newMessage];
      } else {
        console.log("⚠️ Tin nhắn đã tồn tại, bỏ qua:", messageId);
      }
    },
    resetMessages: (state) => {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      if (action.payload) {
        console.log(
          "📥 Fetch messages thành công, số lượng:",
          action.payload.length
        );
        // Merge messages: ưu tiên server data, nhưng giữ lại messages mới trong state
        const allMessagesMap = new Map();

        // Thêm tất cả messages từ server
        action.payload.forEach((msg) => {
          const id = msg._id?.toString() || msg._id;
          if (id) {
            allMessagesMap.set(id, msg);
          }
        });

        // Thêm messages từ state nếu chưa có trong server response (tin nhắn mới vừa gửi)
        state.messages.forEach((msg) => {
          const id = msg._id?.toString() || msg._id;
          if (id && !allMessagesMap.has(id)) {
            allMessagesMap.set(id, msg);
          }
        });

        state.messages = Array.from(allMessagesMap.values());
        console.log(
          "📥 Sau khi merge, số lượng messages:",
          state.messages.length
        );
      }
    });
  },
});

export default messagesSlice.reducer;
export const { setMessages, addMessage, resetMessages } = messagesSlice.actions;
