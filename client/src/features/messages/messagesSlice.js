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
        console.log(
          "➕ Số lượng messages trước khi thêm:",
          state.messages.length
        );
        // Tạo array mới để đảm bảo React detect được thay đổi
        state.messages = [...state.messages, newMessage];
        console.log(
          "➕ Số lượng messages sau khi thêm:",
          state.messages.length
        );
        console.log("➕ Message được thêm:", {
          _id: newMessage._id,
          text: newMessage.text,
          from_user_id: newMessage.from_user_id,
        });
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
      if (action.payload && Array.isArray(action.payload)) {
        console.log(
          "📥 Fetch messages thành công, số lượng từ server:",
          action.payload.length
        );
        console.log(
          "📥 Số lượng messages hiện tại trong state:",
          state.messages.length
        );

        // Tạo map để merge messages
        const messagesMap = new Map();

        // Thêm tất cả messages từ server trước
        action.payload.forEach((msg) => {
          const id = msg._id?.toString() || msg._id;
          if (id) {
            messagesMap.set(id, msg);
          }
        });

        // Sau đó thêm messages từ state nếu chưa có trong server (tin nhắn mới vừa gửi)
        state.messages.forEach((msg) => {
          const id = msg._id?.toString() || msg._id;
          if (id && !messagesMap.has(id)) {
            messagesMap.set(id, msg);
            console.log("➕ Giữ lại tin nhắn mới từ state:", id);
          }
        });

        // Convert map thành array và set vào state
        const mergedMessages = Array.from(messagesMap.values());
        state.messages = mergedMessages;

        console.log(
          "📥 Sau khi merge, tổng số messages:",
          state.messages.length
        );
      } else if (action.payload === null) {
        // Nếu server trả về null, không làm gì cả (giữ nguyên state)
        console.log("📥 Server trả về null, giữ nguyên messages trong state");
      } else {
        // Nếu payload không hợp lệ, log warning
        console.warn(
          "⚠️ fetchMessages.fulfilled với payload không hợp lệ:",
          action.payload
        );
      }
    });
  },
});

export default messagesSlice.reducer;
export const { setMessages, addMessage, resetMessages } = messagesSlice.actions;
