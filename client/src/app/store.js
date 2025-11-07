import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/user/userSlice.js";
import messagesReducer from "../features/messages/messagesSlice.js";
import connectionsReducer from "../features/connections/connectionsSlice.js";

export const store = configureStore({
  reducer: {
    user: userReducer,
    messages: messagesReducer,
    connections: connectionsReducer,
  },
});

export default store;