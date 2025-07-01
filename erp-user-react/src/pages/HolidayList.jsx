import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const HolidayList = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedYear, setSelectedYear] = useState('2025');

  // Define the year range we want to show
  const targetYears = [2025, 2026, 2027, 2028, 2029, 2030];

  const fetchApprovedHolidays = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API call to fetch holidays
      const response = await fetch('http://localhost:8080/api/holidays/all');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const approvedHolidays = data.data.filter(holiday => 
          holiday.mdApprovalStatus === 'Y' && 
          targetYears.includes(holiday.year) // Filter to only include 2025-2030
        );
        
        const sortedHolidays = approvedHolidays.sort((a, b) => 
          new Date(a.holidayDate) - new Date(b.holidayDate)
        );
        
        setHolidays(sortedHolidays);
      } else {
        throw new Error(data.message || 'Failed to fetch holidays');
      }
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedHolidays();
  }, []);

  const handleRetry = () => {
    fetchApprovedHolidays();
  };

  // Filter holidays by selected year
  const filteredHolidays = selectedYear === 'all' 
    ? holidays 
    : holidays.filter(holiday => holiday.year.toString() === selectedYear);

  // Pagination logic
  const totalPages = Math.ceil(filteredHolidays.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHolidays = filteredHolidays.slice(startIndex, endIndex);

  // Get available years from the target range (show all years 2025-2030 regardless of data)
  const availableYears = targetYears;

  const handleYearChange = (year) => {
    setSelectedYear(year);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
              <span className="text-xl text-gray-700">Loading holidays...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center py-16 flex-col">
              <div className="bg-red-100 rounded-full p-4 mb-6">
                <AlertCircle className="text-red-600" size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Error Loading Holidays</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md">
                <p className="text-red-700 text-center">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-full p-2 mr-4">
                  <Calendar className="text-white" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Company Holidays</h1>
                  <p className="text-blue-100">Approved holidays</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-all duration-200 transform hover:scale-110"
                title="Refresh holidays"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {filteredHolidays.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full p-6 inline-block mb-6">
                  <Calendar className="text-gray-400" size={64} />
                </div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {selectedYear === 'all' ? 'No Holidays Found' : `No Holidays Found for ${selectedYear}`}
                </h3>
                <p className="text-gray-500">
                  {selectedYear === 'all' 
                    ? 'No approved holidays are currently available' 
                    : `No approved holidays found for the year ${selectedYear}`
                  }
                </p>
                {selectedYear !== 'all' && (
                  <button
                    onClick={() => handleYearChange('all')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View All Years
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Table Controls */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">Filter by Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="all">All Years</option>
                      {availableYears.map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredHolidays.length)} of {filteredHolidays.length} holidays
                    {selectedYear !== 'all' && ` (filtered by ${selectedYear})`}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-lg">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">sl no</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Day</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Holiday Name</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentHolidays.map((holiday, index) => {
                        const date = new Date(holiday.holidayDate);
                        const formattedDate = date.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });
                        const dayName = date.toLocaleDateString('en-IN', {
                          weekday: 'long'
                        });
                        const globalIndex = startIndex + index + 1;

                        return (
                          <tr 
                            key={holiday.holidayId || globalIndex} 
                            className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                          >
                            <td className="px-6 py-4 text-sm font-medium text-gray-700">{globalIndex}</td>
                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">{formattedDate}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{dayName}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{holiday.holidayName}</td>
                            <td className="px-6 py-4 text-sm text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                holiday.holidayType === 'National' 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : holiday.holidayType === 'Regional'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {holiday.holidayType || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => goToPage(pageNum)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayList;