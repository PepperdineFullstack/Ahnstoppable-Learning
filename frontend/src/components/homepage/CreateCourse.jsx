import React, { useState } from "react";
import CourseInputTemplate from "../ui/CourseInputTemplate";

function CreateCourse({ submitCourse }){

    const [isMakingCourse, setCourse] = useState(false);


    const [courseName, setCourseName] = useState("");
    const [courseSTime, setCourseSTime] = useState("");
    const [courseETime, setCourseETime] = useState("");
    function clearForm(){
        setCourse(!isMakingCourse);
        setCourseName("");
        setCourseSTime("");
        setCourseETime("");
    }

    async function formSubmit( body ){
        await submitCourse(body);
        clearForm();
    }

    return (
        <div>
            { isMakingCourse ? (
                <form className="p-6 max-w-half w-full" action={formSubmit}>
                    <div className=" grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <CourseInputTemplate 
                                label="Course Name"
                                name="coursename"
                                type="text"
                                id={0}
                                value={courseName}
                                onChange={(event) => setCourseName(event.target.value)}
                                placeholder="" 
                            />
                        </div>
                        <div>
                            <label className="std-text text-sm mb-2 block" htmlFor="coursestime">
                                Course Start Time
                            </label>
                            <div className="relative flex items-center">
                                <input 
                                    name="coursestime"
                                    type="time"
                                    id="coursestime"
                                    required
                                    value={courseSTime}
                                    onChange={(event) => setCourseSTime(event.target.value)}
                                    className="w-full std-text  bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-3 pr-10 rounded-md outline-blue-600 focus:ring-2 focus:ring-blue-500/20" 
                                    placeholder=""
                                />
                            </div>
                        </div>
                        <div>
                            <label className="std-text text-sm mb-2 block" htmlFor="courseetime">
                                Course End Time
                            </label>
                            <div className="relative flex items-center">
                                <input 
                                    name="courseetime"
                                    type="time"
                                    id="courseetime"
                                    required
                                    value={courseETime}
                                    onChange={(event) => setCourseETime(event.target.value)}
                                    className="w-full std-text  bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-3 pr-10 rounded-md outline-blue-600 focus:ring-2 focus:ring-blue-500/20" 
                                    placeholder=""
                                    min={courseSTime}
                                />
                            </div>
                        </div>
                        <div className="col-span-2 gap-2 flex flex-row items-end justify-end">
                            <button
                                className="blue-btn"
                                onClick={clearForm}
                            >
                                Cancel
                            </button>
                            <button
                                className="blue-btn"
                                type="submit"
                            >
                                Create Course
                            </button>
                        </div>
                    </div>
                </form>
            ) :
            (
                <div className="flex items-center justify-center">
                <button 
                    type="submit"
                    className="blue-btn w-1/2 max-w-2xl"
                    onClick={() => {setCourse(!isMakingCourse)
                }}>
                    Create A Course
                </button>
                </div>
            )}
        </div>
    );
}

export default CreateCourse;