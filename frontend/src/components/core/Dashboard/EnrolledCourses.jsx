import { useEffect, useState, useCallback, useMemo } from "react"
import ProgressBar from "@ramonak/react-progress-bar"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { getUserEnrolledCourses } from "../../../services/operations/profileAPI"
import { generateCertificate } from "../../../services/operations/certificateAPI"
import Img from './../../common/Img';
import IconBtn from "../../common/IconBtn"
import CertificateModal from "../Certificate/CertificateModal"

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const navigate = useNavigate()
  const [enrolledCourses, setEnrolledCourses] = useState(null)
  const [showCertificate, setShowCertificate] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [loading, setLoading] = useState(true)

  const getEnrolledCourses = useCallback(async () => {
    if (!token || enrolledCourses !== null) return; // Prevent duplicate calls
    
    setLoading(true);
    try {
      const res = await getUserEnrolledCourses(token);
      setEnrolledCourses(res);
    } catch (error) {
      console.log("Could not fetch enrolled courses.")
    } finally {
      setLoading(false);
    }
  }, [token, enrolledCourses]);

  useEffect(() => {
    getEnrolledCourses();
  }, [getEnrolledCourses])

  // Optimized Loading Skeleton
  const SkeletonCard = useMemo(() => (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 animate-pulse">
      <div className="flex gap-6">
        <div className="h-20 w-20 rounded-xl bg-slate-700/50"></div>
        <div className="flex-1 space-y-4">
          <div className="h-4 w-3/4 rounded bg-slate-700/50"></div>
          <div className="h-3 w-1/2 rounded bg-slate-700/50"></div>
          <div className="h-2 w-full rounded bg-slate-700/50"></div>
        </div>
      </div>
    </div>
  ), [])

  // Memoized navigation handler
  const handleCourseNavigation = useCallback((course) => {
    const firstSection = course.courseContent?.[0];
    const firstSubSection = firstSection?.subSection?.[0];
    if (firstSection && firstSubSection) {
      navigate(`/view-course/${course._id}/section/${firstSection._id}/sub-section/${firstSubSection._id}`);
    }
  }, [navigate]);

  // Memoized certificate handler
  const handleCertificateGeneration = useCallback(async (course) => {
    try {
      const certificateData = await generateCertificate(
        { courseId: course._id },
        token
      )
      if (certificateData) {
        setSelectedCourse({
          courseName: course.courseName,
          studentName: `${user?.firstName} ${user?.lastName}`,
          email: user?.email,
          completionDate: certificateData.completionDate || new Date().toISOString(),
          certificateId: certificateData.certificateId
        })
        setShowCertificate(true)
      }
    } catch (error) {
      console.error("Error generating certificate:", error)
    }
  }, [token, user]);

  if (enrolledCourses?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-24 h-24 mb-8 text-slate-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No Courses Yet</h2>
        <p className="text-slate-400 mb-8">You haven't enrolled in any courses. Start your learning journey today!</p>
        <button 
          onClick={() => navigate('/catalog')}
          className="px-6 py-3 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-all duration-300"
        >
          Browse Courses
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Enrolled Courses
        </h1>
        <p className="text-slate-400 mt-2">
          Continue your learning journey
        </p>
      </div>

      {/* Course List */}
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <>
            {SkeletonCard}
            {SkeletonCard}
            {SkeletonCard}
          </>
        )}

        {/* Course Cards */}
        {enrolledCourses?.map((course, i) => (
          <div
            key={i}
            className={`group bg-slate-800/50 backdrop-blur-xl rounded-2xl border transition-all duration-300 ${
              course.isDeactivated 
                ? 'border-red-500/50 hover:border-red-500/70' 
                : 'border-slate-700/50 hover:border-purple-500/30'
            }`}
          >
            {/* Deactivation Warning Banner */}
            {course.isDeactivated && (
              <div className="bg-red-500/10 border-b border-red-500/20 p-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-red-400 font-semibold text-sm">Course Deactivated</h4>
                    <p className="text-red-300/80 text-xs mt-1">
                      This course has been deactivated by the admin. Please contact the administrator for further information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Thumbnail */}
                <div 
                  className={`relative ${course.isDeactivated ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  onClick={() => !course.isDeactivated && handleCourseNavigation(course)}
                >
                  <div className="relative">
                    <Img
                      src={course.thumbnail}
                      alt={course.courseName}
                      className="h-20 w-20 rounded-xl object-cover"
                      width={80}
                      height={80}
                    />
                    {course.isDeactivated && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Course Info */}
                <div className="flex-1 min-w-0">
                  <h3 
                    className={`text-lg font-semibold mb-2 transition-colors duration-200 ${
                      course.isDeactivated 
                        ? 'text-slate-400 cursor-not-allowed' 
                        : 'text-white cursor-pointer hover:text-purple-400'
                    }`}
                    onClick={() => !course.isDeactivated && handleCourseNavigation(course)}
                  >
                    {course.courseName}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {course.courseDescription}
                  </p>

                  {/* Progress Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">{course?.totalDuration}</span>
                      </div>
                      <span className={`text-sm font-medium ${
                        course.isDeactivated ? 'text-slate-500' : 'text-purple-400'
                      }`}>
                        {course.progressPercentage || 0}% Complete
                      </span>
                    </div>
                    <ProgressBar
                      completed={course.progressPercentage || 0}
                      height="8px"
                      isLabelVisible={false}
                      bgColor={course.isDeactivated ? "#6B7280" : "linear-gradient(90deg, #8B5CF6, #3B82F6)"}
                      baseBgColor="#1F2937"
                      className="rounded-full"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
                    {course.isDeactivated ? (
                      <button
                        disabled
                        className="px-4 py-2 bg-slate-600/20 text-slate-500 rounded-xl cursor-not-allowed text-sm font-medium"
                      >
                        Course Unavailable
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCourseNavigation(course)}
                        className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-colors duration-200 text-sm font-medium"
                      >
                        Continue Learning
                      </button>
                    )}
                    
                    {course.progressPercentage === 100 && !course.isDeactivated && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCertificateGeneration(course)
                        }}
                        className="px-4 py-2 bg-green-500/10 text-green-400 rounded-xl hover:bg-green-500/20 transition-colors duration-200 text-sm font-medium"
                      >
                        View Certificate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate Modal */}
      {showCertificate && (
        <CertificateModal
          onClose={() => {
            setShowCertificate(false)
            setSelectedCourse(null)
          }}
          certificateData={selectedCourse}
        />
      )}
    </div>
  )
}
