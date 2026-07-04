// src/components/classroom/discussion-board/DiscussionFeed.jsx
import React, { useState, useEffect } from "react";
import DiscussionPost from "./DiscussionPost";
import api from "../../../api/axios";
import { useClassSocket } from "../../../hooks/useClassSocket";

function DiscussionFeed({ date, classRoomId, showNames }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Load posts whenever the date or class changes
  useEffect(() => {
    if (!classRoomId || !date) return;

    setLoading(true);
    setError(null);

    api
      .get(`/api/classes/${classRoomId}/posts?date=${date}`)
      .then((res) => {
        // Attach an empty comments array so DiscussionPost doesn't need to
        // fetch separately on first render
        setPosts(res.data.map((p) => ({ ...p, comments: [] })));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [classRoomId, date]);

  // Real-time: posts / comments / replies all patch `posts` via the hook
  useClassSocket({ classId: classRoomId, setPosts });

  if (loading) {
    return (
      <div className="w-full flex justify-center py-10">
        <p className="text-sm text-slate-400 animate-pulse">Loading posts…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex justify-center py-10">
        <p className="text-sm text-red-400">Failed to load posts: {error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="w-full flex justify-center py-10">
        <p className="text-sm text-slate-400">No posts for this day yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2 justify-center items-center">
      {posts.map((post) => (
        <DiscussionPost key={post.id} post={post} setPosts={setPosts} showNames={showNames} />
      ))}
    </div>
  );
}

export default DiscussionFeed;