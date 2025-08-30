import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getCalorieTrends, getUserData } from '../utils/api';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const CalorieReport = ({ onBack }) => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userData = getUserData();
      const userId = userData?.user_id || userData?.id;

      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      const response = await getCalorieTrends(userId, { period: selectedPeriod });

      if (response?.success) {
        setReportData(response);
      } else {
        throw new Error('Failed to fetch calorie data');
      }

    } catch (err) {
      console.error('Error fetching calorie report:', err);
      setError(err.message || 'Failed to fetch calorie report');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (change) => {
    if (change > 0) return 'text-red-600';
    if (change < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="ml-3 text-gray-600 dark:text-gray-400">Loading calorie report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-6">
            <p className="text-center">{error}</p>
            <button
              onClick={fetchReportData}
              className="mt-4 mx-auto block bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chartData = reportData?.data;
  const dailyGoal = reportData?.daily_goal || 2000;

  // Calculate summary statistics
  const consumedData = chartData?.datasets?.[0]?.data || [];
  const totalConsumed = consumedData.reduce((sum, val) => sum + (val || 0), 0);
  const averageConsumed = consumedData.length > 0 ? totalConsumed / consumedData.length : 0;
  const daysAboveGoal = consumedData.filter(val => val > dailyGoal).length;
  const maxConsumed = Math.max(...consumedData.filter(val => val !== null && val !== undefined));
  const minConsumed = Math.min(...consumedData.filter(val => val !== null && val !== undefined));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calorie Report</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Detailed breakdown of your calorie consumption</p>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Average Daily</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Math.round(averageConsumed)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">calories</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Days Above Goal</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{daysAboveGoal}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">out of {consumedData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Highest Day</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Math.round(maxConsumed)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">calories</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-4">
                <TrendingDown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lowest Day</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Math.round(minConsumed)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">calories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Calorie Trend</h2>
          <div className="h-80">
            {chartData ? (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true },
                    tooltip: {
                      mode: 'index',
                      intersect: false,
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${Math.round(context.parsed.y)} calories`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                      min: Math.max(0, minConsumed - 200),
                      grid: { drawBorder: false, color: 'rgba(156, 163, 175, 0.2)' },
                      ticks: { color: 'rgb(156, 163, 175)' }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: 'rgb(156, 163, 175)' }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>No chart data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Calories Consumed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Goal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Difference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {chartData?.labels?.map((label, index) => {
                  const consumed = consumedData[index] || 0;
                  const difference = consumed - dailyGoal;
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {Math.round(consumed)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {dailyGoal}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`flex items-center ${getTrendColor(difference)}`}>
                          {getTrendIcon(difference)}
                          <span className="ml-1">
                            {difference > 0 ? '+' : ''}{Math.round(difference)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          difference > 0
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                            : difference < 0
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {difference > 0 ? 'Above Goal' : difference < 0 ? 'Below Goal' : 'On Target'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalorieReport;