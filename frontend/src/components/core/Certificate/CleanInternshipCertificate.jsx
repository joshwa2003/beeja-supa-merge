import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatDate } from '../../../utils/dateFormatter';

export default function CleanInternshipCertificate({ certificateData }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const generateQR = async () => {
      if (certificateData?.certificateId) {
        try {
          const url = await QRCode.toDataURL(
            `${window.location.origin}/verify-certificate/${certificateData.certificateId}`
          );
          setQrCodeUrl(url);
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      }
    };
    generateQR();
  }, [certificateData?.certificateId]);

  return (
    <div 
      className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-4 sm:p-6 lg:p-8 mx-auto"
      style={{ 
        width: '100%', 
        maxWidth: '842px', 
        height: 'auto',
        minHeight: '420px',
        aspectRatio: '842/595'
      }}
    >
      {/* Outer Border */}
      <div className="absolute inset-1 border border-white sm:border-2"></div>
      
      {/* Inner Border */}
      <div className="absolute inset-4 sm:inset-6 lg:inset-8 border border-white sm:border-2"></div>
      
      {/* Main Certificate Content */}
      <div className="relative bg-white h-full mx-3 my-3 sm:mx-4 sm:my-4 lg:mx-6 lg:my-6 p-4 sm:p-6 lg:p-8 flex flex-col">
        
        {/* Header with Logo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
            C.ID: {certificateData?.certificateId || 'BEEJA-175035933086-165'}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2">
            {/* Beeja Academy Logo */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 relative">
              <div className="w-full h-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-full flex items-center justify-center relative overflow-hidden">
                {/* Leaf elements */}
                <div className="absolute top-0 left-1/4 w-1 h-2 sm:w-2 sm:h-3 bg-cyan-300 rounded-full transform rotate-12"></div>
                <div className="absolute top-0 left-1/3 w-0.5 h-1 sm:w-1 sm:h-2 bg-cyan-200 rounded-full transform rotate-45"></div>
                <div className="absolute top-0 left-2/3 w-0.5 h-1 sm:w-1 sm:h-2 bg-cyan-200 rounded-full transform -rotate-12"></div>
                {/* Main spiral */}
                <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800">Beeja Academy</h1>
              <p className="text-xs text-gray-500">LEARNING PLATFORM</p>
            </div>
          </div>
        </div>

        {/* Certificate Title */}
        <div className="text-center mb-4 sm:mb-6 lg:mb-8">
          <h2 className="text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-blue-700 mb-2 leading-tight" style={{ fontFamily: 'serif' }}>
            Beeja Academy Certificate of Completion
          </h2>
        </div>

        {/* Certificate Body */}
        <div className="flex-1 flex flex-col justify-center space-y-3 sm:space-y-4 lg:space-y-6">
          
          {/* Student Name */}
          <div className="text-center">
            <div className="border-b border-gray-400 sm:border-b-2 pb-1 sm:pb-2 mx-auto max-w-[280px] sm:max-w-[350px] lg:max-w-[400px]">
              <span className="text-base sm:text-xl lg:text-2xl font-bold text-gray-800 break-words">
                {certificateData?.studentName || 'Student Name'}
              </span>
            </div>
          </div>

          {/* Has Earned Section */}
          <div className="text-center space-y-1 sm:space-y-2">
            <p className="text-sm sm:text-lg lg:text-xl italic" style={{ fontFamily: 'cursive' }}>has earned</p>
            <p className="text-sm sm:text-base lg:text-lg font-bold">Course Completion Certificate</p>
          </div>

          {/* Course Title Section */}
          <div className="text-center space-y-1 sm:space-y-2">
            <p className="text-xs sm:text-sm lg:text-base italic px-2" style={{ fontFamily: 'cursive' }}>
              while completing the Course program entitled
            </p>
          </div>

          {/* Course Name */}
          <div className="text-center">
            <div className="border-b border-gray-400 sm:border-b-2 pb-1 sm:pb-2 mx-auto max-w-[300px] sm:max-w-[400px] lg:max-w-[500px]">
              <span className="text-sm sm:text-base lg:text-lg font-bold break-words px-2">
                {certificateData?.courseName || 'Web Development Internship Program'}
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mt-4 sm:mt-6 lg:mt-8 gap-4 sm:gap-2">
          
          {/* Left Side - Institution */}
          <div className="text-center flex-1 max-w-[120px] sm:max-w-[150px] lg:max-w-[200px]">
            <p className="text-xs sm:text-sm mb-1 sm:mb-2">Beeja Academy</p>
            <div className="border-b border-gray-400 mb-1 sm:mb-2 h-4 sm:h-6 lg:h-8"></div>
            <p className="text-xs font-bold">Learning Institution</p>
          </div>

          {/* Center - QR Code */}
          <div className="flex flex-col items-center order-first sm:order-none">
            {qrCodeUrl && (
              <div className="mb-2">
                <img src={qrCodeUrl} alt="Certificate QR Code" className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border border-gray-300" />
                <p className="text-xs text-gray-500 mt-1 text-center">Verify Online</p>
              </div>
            )}
          </div>

          {/* Right Side - Date */}
          <div className="text-center flex-1 max-w-[120px] sm:max-w-[150px] lg:max-w-[200px]">
            <p className="text-xs sm:text-sm mb-1 sm:mb-2">Date Completed</p>
            <div className="border-b border-gray-400 mb-1 sm:mb-2 h-4 sm:h-6 lg:h-8 flex items-end justify-center">
              <span className="text-xs sm:text-sm break-words">
                {formatDate(certificateData?.completionDate) || 'June 20, 2025'}
              </span>
            </div>
            <p className="text-xs font-bold">Completion Date</p>
          </div>

        </div>

      </div>
    </div>
  );
}
