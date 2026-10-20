// src/components/classroom/discussion-board/DiscussionFeed.jsx
import React, { useState, useEffect, useRef } from "react";
import DiscussionPost from "./DiscussionPost";
import api from "../../../api/axios";
import socket from "../../../api/socket";
import { useClassSocket } from "../../../hooks/useClassSocket";

function DiscussionFeed({ date, classRoomId, showNames }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  // Bumped each time the socket rejoins the class after a drop (laptop sleep,
  // Wi-Fi blip). Live events sent while we were away are lost, so the posts
  // and every post's comments are fetched again.
  const [reloadKey, setReloadKey] = useState(0);
  const viewRef = useRef(null);

  useEffect(() => {
    // If the socket isn't connected yet, the first joinedClass is the initial
    // join, which happens alongside the first load; skip that one.
    let skipNext = !socket.connected;
    const onJoined = () => {
      if (skipNext) { skipNext = false; return; }
      setReloadKey((k) => k + 1);
    };
    socket.on("joinedClass", onJoined);
    return () => socket.off("joinedClass", onJoined);
  }, []);

  // Load posts whenever the date or class changes, or after a reconnect
  useEffect(() => {
    if (!classRoomId || !date) return;

    // A reconnect on the same day refreshes in place: no loading screen, and
    // comments already on screen stay until each post refetches its own.
    const view = `${classRoomId}|${date}`;
    const refresh = viewRef.current === view;
    viewRef.current = view;
    if (!refresh) {
      setLoading(true);
      setError(null);
    }

    let ignore = false;
    api
      .get(`/api/classes/${classRoomId}/posts?date=${date}`)
      .then((res) => {
        if (ignore) return;
        // Attach a comments array so DiscussionPost doesn't need to
        // fetch separately on first render
        setPosts((prev) => res.data.map((p) => ({
          ...p,
          comments: refresh ? prev.find((x) => x.id === p.id)?.comments ?? [] : [],
        })));
      })
      .catch((err) => {
        if (ignore) return;
        if (refresh) console.error("Failed to refresh posts:", err);
        else setError(err.message);
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [classRoomId, date, reloadKey]);

  // Real-time: posts / comments / replies all patch `posts` via the hook
  useClassSocket({ classId: classRoomId, setPosts, date });

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
        <DiscussionPost key={post.id} post={post} setPosts={setPosts} showNames={showNames} reloadKey={reloadKey} />
      ))}
    </div>
  );
}

export default DiscussionFeed;