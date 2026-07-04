import React, { useState } from 'react';
import SectionHeading from '../ui/SectionHeading';
import CourseInputTemplate from '../ui/CourseInputTemplate';

function CourseAddPopup({ removePopUp, addCourse }){
    const [courseID,setCourseID] = useState("");
    return (
        <div className="absolute inset-0 min-w-full min-h-full bg-gray-700/50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-700 min-w-3/4 w-half p-4">
                <div className="flex flex-row items-between justify-between p-2">
                    <SectionHeading text="Enroll In a Course" />
                    <button onClick={removePopUp}>
                        <span className="std-text text-2xl font-semibold cursor-pointer">
                            X
                        </span>
                    </button>
                </div>
                <form action={addCourse}>
                    <CourseInputTemplate 
                        label="Enter a course ID below as provided by your professor to enroll in a class."
                        name="courseid"
                        type="text"
                        id="courseid"
                        value={courseID}
                        onChange={(event) => setCourseID(event.target.value)}
                        placeholder="Enter Course Link"
                    />
                    
                    <div className="flex flex-row items-end justify-end gap-2 pt-2">
                        <button className="white-btn" onClick={removePopUp}>
                            Cancel
                        </button>
                        <button className="blue-btn" type="submit">
                            Enroll
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CourseAddPopup;