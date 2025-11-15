import React, { useEffect, useRef, useState, useMemo } from "react";
import { ImageIcon, SendHorizonal } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import {
  addMessage,
  fetchMessages,
  resetMessages,
} from "../features/messages/messagesSlice";
import toast from "react-hot-toast";

const ChatBox = () => {
  const messages = useSelector((state) => state.messages.messages);
  const currentUser = useSelector((state) => state.user.value);
  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  const connections = useSelector((state) => state.connections.connections);

  const fetchUserMessages = async () => {
    try {
      const token = await getToken();
      dispatch(fetchMessages({ token, userId }));
    } catch (error) {
      console.log(error.message);
      toast.error(error.message);
    }
  };
  const sendMessage = async () => {
    try {
      if (!text && !image) {
        return toast.error("Please add text or image to your message.");
      }

      const token = await getToken();
      const formData = new FormData();
      formData.append("to_user_id", userId);
      formData.append("text", text);
      if (image) {
        formData.append("image", image);
      }
      const { data } = await api.post("/api/messages/send", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        console.log("✅ Tin nhắn gửi thành công:", data.data);
        console.log("📤 Message ID:", data.data._id);
        console.log("📤 Current messages count:", messages.length);

        setText("");
        setImage(null);

        // Thêm tin nhắn vào state ngay lập tức
        // Đảm bảo message có đầy đủ thông tin
        const messageToAdd = {
          ...data.data,
          createdAt: data.data.createdAt || new Date().toISOString(),
        };

        dispatch(addMessage(messageToAdd));
        console.log("📤 Đã dispatch addMessage với:", messageToAdd);

        // Force scroll to bottom sau khi thêm tin nhắn
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.log(error.message);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (connections.length > 0) {
      const user = connections.find((connection) => connection._id === userId);
      setUser(user);
    }
  }, [connections, userId]);

  useEffect(() => {
    fetchUserMessages();

    return () => {
      dispatch(resetMessages());
    };
  }, [userId]);

  // Memoize sorted messages để tránh re-sort không cần thiết
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA - dateB;
    });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages]);

  return (
    user && (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-2 p-2 md:px-10 xl:pl-42 bg-linear-to-r from-indigo-50 to-purple-50 border-b border-gray-300">
          <img
            src={user.profile_picture}
            className="size-8 rounded-full"
            alt=""
          />
          <div>
            <p className="font-medium">{user.full_name}</p>
            <p className="text-sm text-gray-500 -mt-1 5">@{user.username}</p>
          </div>
        </div>

        <div className="p-5 md:px-10 h-full overflow-y-scroll">
          <div className="space-y-4 max-w-4xl mx-auto">
            {sortedMessages.map((message, index) => {
              // Lấy from_user_id - có thể là string hoặc object
              const fromUserId =
                message.from_user_id?._id || message.from_user_id;
              const isCurrentUserMessage = fromUserId === currentUser?._id;

              return (
                <div
                  key={message._id || index}
                  className={`flex flex-col ${
                    isCurrentUserMessage ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`p-2 text-sm max-w-sm bg-white text-slate-700 rounded-lg shadow ${
                      isCurrentUserMessage
                        ? "rounded-br-none"
                        : "rounded-bl-none"
                    }`}
                  >
                    {message.message_type === "image" && (
                      <img
                        src={message.media_url}
                        className="w-full max-w-sm rounded-lg mb-1"
                        alt=""
                      />
                    )}
                    <p>{message.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="px-4">
          <div className="flex items-center gap-3 pl-5 p-1.5 bg-white w-full max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5">
            <input
              type="text"
              className="flex-1 outline-none text-slate-700"
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              onChange={(e) => setText(e.target.value)}
              value={text}
            />
            <label htmlFor="image">
              {image ? (
                <img src={URL.createObjectURL(image)} />
              ) : (
                <ImageIcon className="size-7 text-gray-400 cursor-pointer" />
              )}
              <input
                type="file"
                id="image"
                accept="image/*"
                hidden
                onChange={(e) => setImage(e.target.files[0])}
              />
            </label>

            <button
              onClick={sendMessage}
              className="bg-linear-to-br from-indigo-500 to-purple-600 p-2 rounded-full hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition cursor-pointer text-white"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default ChatBox;
