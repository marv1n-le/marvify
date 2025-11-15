import React, { useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import ChatBox from "./pages/ChatBox";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import { useUser, useAuth } from "@clerk/clerk-react";
import Layout from "./pages/Layout";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUser } from "./features/user/userSlice";
import { addMessage } from "./features/messages/messagesSlice";

const App = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const userData = useSelector((state) => state.user.value);
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Fetch user data từ backend
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken();
        dispatch(fetchUser(token));
      }
    };
    fetchData();
  }, [user, getToken, dispatch]);

  // SSE lắng nghe tin nhắn realtime
  useEffect(() => {
    if (userData?._id) {
      console.log("🔌 Kết nối SSE với userId:", userData._id);

      let eventSource = null;
      let reconnectTimeout = null;

      const connectSSE = async () => {
        try {
          const token = await getToken();
          // EventSource không hỗ trợ headers, nên dùng query parameter
          eventSource = new EventSource(
            `${import.meta.env.VITE_BASEURL}/api/messages/sse?token=${token}`
          );

          eventSource.onmessage = (event) => {
            try {
              // Skip initial connection message
              if (event.data.startsWith("log:")) {
                console.log("✅ SSE Connected:", event.data);
                return;
              }

              const message = JSON.parse(event.data);
              console.log("📩 SSE nhận tin nhắn:", message);

              // Check if we're in the chat with the sender or receiver
              const senderId =
                message.from_user_id?._id || message.from_user_id;
              const receiverId = message.to_user_id?._id || message.to_user_id;
              const currentChatUserId = pathnameRef.current?.replace(
                "/messages/",
                ""
              );
              const currentUserId = userData?._id;

              // Thêm tin nhắn nếu đang ở trong chat với sender hoặc receiver
              // (tức là tin nhắn liên quan đến cuộc trò chuyện hiện tại)
              const isRelevantToCurrentChat =
                currentChatUserId === senderId ||
                currentChatUserId === receiverId;

              if (isRelevantToCurrentChat) {
                dispatch(addMessage(message));
              } else {
                // bạn có thể thêm notification ở đây
                console.log(
                  "📬 Tin nhắn từ người khác, có thể hiển thị notification"
                );
              }
            } catch (error) {
              console.error("❌ Lỗi parse message:", error);
            }
          };

          eventSource.onerror = (e) => {
            console.error("❌ Lỗi SSE:", e);
            if (eventSource.readyState === EventSource.CLOSED) {
              // Reconnect after 3 seconds
              reconnectTimeout = setTimeout(() => {
                if (eventSource) {
                  eventSource.close();
                }
                connectSSE();
              }, 3000);
            }
          };
        } catch (error) {
          console.error("❌ Lỗi khi kết nối SSE:", error);
        }
      };

      connectSSE();

      return () => {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        if (eventSource) {
          eventSource.close();
        }
      };
    }
  }, [userData, dispatch, getToken]);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={!user ? <Login /> : <Layout />}>
          <Route index element={<Feed />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:userId" element={<ChatBox />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:userId" element={<Profile />} />
          <Route path="create-post" element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
