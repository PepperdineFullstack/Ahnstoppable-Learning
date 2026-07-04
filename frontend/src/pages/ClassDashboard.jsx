// src/components/Dashboards/ClassDashboard.jsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";

import UnderstandCheck from "../components/classroom/UnderstandCheck";
import TalentBoard from "../components/classroom/TalentBoard";
import Header from "../components/ui/Header";
import ViewLogs from "../components/classroom/ViewLogs";
import CreateDiscussion from "../components/classroom/CreateDiscussion";
import DiscussionFeed from "../components/classroom/discussion-board/DiscussionFeed";
import AnonymousToggle from "../components/classroom/AnonymousToggle";
import { useAuth } from "../context/AuthContext";

function ClassDashboard() {
  // classId comes from the route: <Route path="/class/:classId" element={<ClassDashboard />} />
  const { classId } = useParams();
  const { user }    = useAuth();
  const [showNames, setShowNames] = useState(user?.role === 'professor');


  const today = new Date().toLocaleDateString("en-CA");
  const [viewDate, setViewDate] = useState(today);

  function handleDate(event) {
    setViewDate(event.target.value);
  }

  return (
    <div className="min-h-screen background flex transition-colors duration-300">
      <main className="w-full">
        <Header rightContent={() => null} />

        <div className="mx-auto flex flex-col justify-center items-center gap-4 w-full px-4 sm:px-6 lg:w-10/12 lg:px-0 pb-8 bg-white dark:bg-slate-800">

          {/* Date navigator */}
          <div className="w-full overflow-x-auto">
            <ViewLogs date={viewDate} today={today} handleDate={handleDate} />
          </div>

          {/* Understanding check — full width on mobile */}
          <div className="w-full sm:w-3/4 max-w-2xl">
            <UnderstandCheck classId={classId} />
          </div>

          {/* Professor controls */}
          {user?.role === "professor" && (
            <div className="w-full sm:w-3/4 max-w-2xl flex flex-col sm:flex-row gap-3">
              <AnonymousToggle showNames={showNames} setShowNames={setShowNames} />
              <CreateDiscussion classRoomId={classId} />
            </div>
          )}

          {/* Discussion feed */}
          <div className="w-full max-w-2xl">
            <DiscussionFeed
              date={viewDate}
              classRoomId={classId}
              showNames={showNames}
            />
          </div>

          {/* Talent board */}
          <div className="w-full sm:w-3/4 max-w-2xl">
            <TalentBoard classId={classId} />
          </div>

        </div>
      </main>
    </div>
  );
}

export default ClassDashboard;