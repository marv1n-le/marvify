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

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken();
        dispatch(fetchUser(token));
      }
    };
    fetchData();
  }, [user, getToken, dispatch]);

  useEffect(() => {
    if (userData?._id) {
      let eventSource = null;
      let reconnectTimeout = null;

      const connectSSE = async () => {
        try {
          const token = await getToken();
          eventSource = new EventSource(
            `${import.meta.env.VITE_BASEURL}/api/messages/sse?token=${token}`
          );

          eventSource.onmessage = (event) => {
            try {
              if (event.data === "" || event.data.startsWith(":")) {
                return;
              }

              if (
                event.data.startsWith("log:") ||
                event.data === "Connected to SSE endpoint"
              ) {
                return;
              }

              const message = JSON.parse(event.data);

              const senderId =
                message.from_user_id?._id || message.from_user_id;
              const receiverId = message.to_user_id?._id || message.to_user_id;
              const currentChatUserId = pathnameRef.current?.replace(
                "/messages/",
                ""
              );
              const currentUserId = userData?._id;

              const isInChatWithSender = currentChatUserId === senderId;
              const isInChatWithReceiver = currentChatUserId === receiverId;
              const isMessageFromMe = senderId === currentUserId;
              const isMessageToCurrentChat = receiverId === currentChatUserId;

              const shouldAddMessage =
                (isInChatWithSender && !isMessageFromMe) ||
                (isInChatWithReceiver && isMessageFromMe) ||
                (isMessageToCurrentChat && isMessageFromMe);

              if (shouldAddMessage) {
                dispatch(addMessage(message));
              }
            } catch (error) {
              // Error handled silently
            }
          };

          eventSource.onerror = (e) => {
            if (eventSource.readyState === EventSource.CLOSED) {
              reconnectTimeout = setTimeout(() => {
                if (eventSource) {
                  eventSource.close();
                }
                connectSSE();
              }, 3000);
            }
          };
        } catch (error) {
          // Error handled silently
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
