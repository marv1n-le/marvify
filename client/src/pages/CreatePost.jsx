import React, { useState } from "react";
import { dummyUserData } from "../assets/assets";
import { Image, X } from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const { getToken } = useAuth();
  const handleSubmit = async () => {
    if (!images.length && !content) {
      return toast.error("Please add content or images to your post.");
    }

    setLoading(true);
    const postType = images.length && content ? "text_with_image" : images.length ? "image" : "text";

    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("post_type", postType);
      images.map((image) => {
        formData.append("images", image);
      })
      const token = await getToken();
      const { data } = await api.post("/api/posts/add", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        navigate("/");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      throw new Error(error.message);
    }
    setLoading(false);
  }

  const user = useSelector((state) => state.user.value);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Create Post
          </h1>
          <p className="text-slate-600">
            Share your thoughts and ideas with the world.
          </p>
        </div>

        {/* Post Form */}
        <div className="max-w-xl bg-white p-4 sm:p-8 sm:pb-3 rounded xl shadow-md space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <img
              src={user.profile_picture}
              className="w-12 h-12 rounded-full shadow"
              alt=""
            />
            <div>
              <h2 className="font-semibold">{user.full_name}</h2>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            className="w-full resize-none max-h-20 mt-4 text-sm outline-none placeholder-gray-400"
            placeholder="What's happening ?"
            onChange={(e) => setContent(e.target.value)}
            value={content}
          />

          {/* Images */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((image, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt=""
                    className="h-20 rounded-md"
                  />
                  <div
                    onClick={() =>
                      setImages(images.filter((_, index) => index !== i))
                    }
                    className="absolute hidden group-hover:flex justify-center items-center top-0 right-0 bottom-0 left-0 bg-black/40 rounded-md cursor-pointer"
                  >
                    <X className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-300">
            <label htmlFor="images" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition cursor-pointer">
              <Image className="size-6" />
            </label>
            <input type="file" id="images" accept="image/*" hidden multiple onChange={(e) => setImages([...images, ...e.target.files])} />
            <button 
            onClick={() => toast.promise(handleSubmit(), {
              loading: "Publishing post...",
              success: <p>Post published successfully!</p>,
              error: <p>Failed to publish post.</p>,
            })}
            className="text-sm bg-linear-to-r from-indigo-500 to-purple-600 text-white font-medium px-8 py-2 rounded-md cursor-pointer hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition" disabled={loading || (!content && images.length === 0)}>
              Publish Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
