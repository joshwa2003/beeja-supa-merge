import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserCertificates } from '../../services/operations/certificateAPI';
import CertificateModal from '../../components/core/Certificate/CertificateModal';
import { formatDate } from '../../utils/dateFormatter';

export default function Certificates() {
  const { token } = useSelector((state) => state.auth);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const data = await getUserCertificates(token);
        setCertificates(data);
      } catch (error) {
        console.error("Error fetching certificates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [token]);

  if (loading) {
    return (
      <div className="grid h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-0">
      <h1 className="mb-8 sm:mb-12 lg:mb-14 text-2xl sm:text-3xl font-medium text-richblack-5">My Certificates</h1>
      {certificates.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <p className="text-richblack-100 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
            You haven't earned any certificates yet. Complete a course to get your first certificate!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((certificate) => (
            <div
              key={certificate.certificateId}
              onClick={() => setSelectedCertificate(certificate)}
              className="cursor-pointer rounded-lg border border-richblack-700 bg-richblack-800 p-4 sm:p-6 hover:scale-105 hover:border-richblack-600 transition-all duration-200 active:scale-95"
            >
              <h3 className="text-base sm:text-lg font-semibold text-richblack-5 mb-3 leading-tight line-clamp-2">
                {certificate.courseName}
              </h3>
              <div className="text-sm text-richblack-300 space-y-1 sm:space-y-2">
                <p className="break-all">
                  <span className="font-medium">Certificate ID:</span> {certificate.certificateId}
                </p>
                <p>
                  <span className="font-medium">Completed on:</span> {formatDate(certificate.completionDate)}
                </p>
              </div>
              <button className="mt-4 text-yellow-50 text-sm font-medium hover:text-yellow-25 transition-colors flex items-center gap-1">
                View Certificate 
                <span className="text-xs">→</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedCertificate && (
        <CertificateModal
          certificateData={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
}
