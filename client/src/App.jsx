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

          eventSource.addEventListener("connected", (event) => {
            console.log("✅ SSE Connected:", event.data);
          });

          eventSource.addEventListener("error", (event) => {
            console.error("❌ SSE Error event:", event.data);
          });

          eventSource.onopen = () => {
            console.log("✅ SSE Connection opened");
          };

          eventSource.onmessage = (event) => {
            try {
              // Skip heartbeat
              if (event.data === "" || event.data.startsWith(":")) {
                return;
              }

              // Skip initial connection message
              if (
                event.data.startsWith("log:") ||
                event.data === "Connected to SSE endpoint"
              ) {
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

              console.log("🔍 SSE Debug:", {
                senderId,
                receiverId,
                currentChatUserId,
                currentUserId,
                pathname: pathnameRef.current,
              });

              // Thêm tin nhắn nếu:
              // 1. Đang ở trong chat với sender (nhận tin nhắn từ người khác)
              // 2. Đang ở trong chat với receiver và mình là sender (gửi tin nhắn)
              const isInChatWithSender = currentChatUserId === senderId;
              const isInChatWithReceiver = currentChatUserId === receiverId;
              const isMessageFromMe = senderId === currentUserId;
              const isMessageToCurrentChat = receiverId === currentChatUserId;

              const shouldAddMessage =
                (isInChatWithSender && !isMessageFromMe) ||
                (isInChatWithReceiver && isMessageFromMe) ||
                (isMessageToCurrentChat && isMessageFromMe);

              if (shouldAddMessage) {
                console.log("✅ Thêm tin nhắn vào state qua SSE");
                dispatch(addMessage(message));
              } else {
                console.log(
                  "📬 Tin nhắn không liên quan đến chat hiện tại, bỏ qua"
                );
              }
            } catch (error) {
              console.error("❌ Lỗi parse message:", error);
            }
          };

          eventSource.onerror = (e) => {
            console.error("❌ Lỗi SSE:", e);
            console.error("❌ SSE readyState:", eventSource.readyState);
            console.error("❌ SSE URL:", eventSource.url);

            if (eventSource.readyState === EventSource.CLOSED) {
              console.log(
                "🔄 SSE connection closed, sẽ reconnect sau 3 giây..."
              );
              // Reconnect after 3 seconds
              reconnectTimeout = setTimeout(() => {
                if (eventSource) {
                  eventSource.close();
                }
                connectSSE();
              }, 3000);
            } else if (eventSource.readyState === EventSource.CONNECTING) {
              console.log("🔄 SSE đang kết nối...");
            } else if (eventSource.readyState === EventSource.OPEN) {
              console.log("✅ SSE connection is open");
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
