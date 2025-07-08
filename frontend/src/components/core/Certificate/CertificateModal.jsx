import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import CleanInternshipCertificate from './CleanInternshipCertificate';
import IconBtn from '../../common/IconBtn';

export default function CertificateModal({ onClose, certificateData }) {
  const certificateRef = useRef();

  const handleDownload = useReactToPrint({
    contentRef: certificateRef,
    documentTitle: `${certificateData?.courseName}_Internship_Certificate`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `
  });

  return (
    <div className="fixed inset-0 z-[1000] !mt-0 grid h-screen w-screen place-items-center overflow-auto bg-white bg-opacity-10 backdrop-blur-sm p-2 sm:p-4">
      <div className="min-h-[80vh] sm:min-h-[85vh] w-full max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px] rounded-lg border border-richblack-400 bg-richblack-800 p-3 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-lg sm:text-xl font-semibold text-richblack-5">Course Certificate</p>
          <button
            onClick={onClose}
            className="text-richblack-5 hover:text-richblack-50 px-3 py-1 bg-richblack-700 rounded-md text-sm sm:text-base"
          >
            Close
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <div ref={certificateRef} className="w-full overflow-x-auto overflow-y-hidden">
            <div className="min-w-[320px]">
              <CleanInternshipCertificate certificateData={certificateData} />
            </div>
          </div>
          
          <div className="mt-4 w-full sm:w-auto">
            <IconBtn
              text="Download Course Certificate"
              onClick={handleDownload}
              customClasses="w-full sm:w-auto text-sm sm:text-base px-4 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
