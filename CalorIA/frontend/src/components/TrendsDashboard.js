import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getCombinedTrends, getUserData } from '../utils/api';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Activity, Scale, BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TrendsDashboard = ({ onBack }) => {
  const [trendsData, setTrendsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [userMeasurementSystem, setUserMeasurementSystem] = useState('metric');

  useEffect(() => {
    fetchTrendsData();
  }, [selectedPeriod]);

  // Get user preferences
  useEffect(() => {
    const userData = getUserData();
    if (userData?.preferences?.measurement_system) {
      setUserMeasurementSystem(userData.preferences.measurement_system);
    }
  }, []);

  const fetchTrendsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getCombinedTrends(null, { period: selectedPeriod });

      if (response?.success) {
        setTrendsData(response.data);
      } else {
        throw new Error('Failed to fetch trends data');
      }

    } catch (err) {
      console.error('Error fetching trends data:', err);
      setError(err.message || 'Failed to fetch trends data');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare combined chart data
  const getCombinedChartData = () => {
    if (!trendsData) return null;

    const weightLabels = trendsData.weight?.labels || [];
    const calorieLabels = trendsData.calories?.labels || [];
    const allLabels = [...new Set([...weightLabels, ...calorieLabels])].sort();

    // Convert weight data based on measurement system
    const convertWeight = (weightKg) => {
      if (userMeasurementSystem === 'imperial') {
        return weightKg * 2.20462; // Convert kg to lbs
      }
      return weightKg;
    };

    const weightUnit = userMeasurementSystem === 'imperial' ? 'lbs' : 'kg';

    return {
      labels: allLabels,
      datasets: [
        {
          label: `Weight (${weightUnit})`,
          data: allLabels.map(label => {
            const index = weightLabels.indexOf(label);
            return index !== -1 ? convertWeight(trendsData.weight.data[index]) : null;
          }),
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y',
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Calories',
          data: allLabels.map(label => {
            const index = calorieLabels.indexOf(label);
            return index !== -1 ? trendsData.calories.data[index] : null;
          }),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y1',
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  };

  // Calculate trend statistics
  const calculateStats = () => {
    if (!trendsData) return null;

    const weightData = trendsData.weight?.data || [];
    const calorieData = trendsData.calories?.data || [];

    const weightChange = weightData.length >= 2 ? weightData[weightData.length - 1] - weightData[0] : 0;
    const calorieAvg = calorieData.length > 0 ? calorieData.reduce((sum, val) => sum + val, 0) / calorieData.length : 0;

    const weightGoal = trendsData.weight?.goal;
    const calorieGoal = trendsData.calories?.goal;

    return {
      weightChange,
      calorieAvg,
      weightGoal,
      calorieGoal,
      weightCurrent: weightData[weightData.length - 1],
      calorieLatest: calorieData[calorieData.length - 1]
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
            <p className="ml-3 text-gray-600 dark:text-gray-300">Loading trends dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-6">
            <p className="text-center">{error}</p>
            <button
              onClick={fetchTrendsData}
              className="mt-4 mx-auto block bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const combinedChartData = getCombinedChartData();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trends Dashboard</h1>
              <p className="text-gray-600 mt-1">Comprehensive view of your health metrics over time</p>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Weight</p>
                <p className="text-2xl font-bold">
                  {stats?.weightCurrent ?
                    (userMeasurementSystem === 'imperial' ?
                      (stats.weightCurrent * 2.20462).toFixed(1) :
                      stats.weightCurrent.toFixed(1)
                    ) : '—'} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}
                </p>
                {stats?.weightGoal && (
                  <p className="text-sm text-gray-500">
                    Goal: {userMeasurementSystem === 'imperial' ?
                      (stats.weightGoal * 2.20462).toFixed(1) :
                      stats.weightGoal.toFixed(1)} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                {stats?.weightChange < 0 ? (
                  <TrendingDown className="w-6 h-6 text-green-600" />
                ) : stats?.weightChange > 0 ? (
                  <TrendingUp className="w-6 h-6 text-red-600" />
                ) : (
                  <Activity className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Weight Change</p>
                <p className={`text-2xl font-bold ${
                  stats?.weightChange < 0 ? 'text-green-600' :
                  stats?.weightChange > 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stats?.weightChange ? `${stats.weightChange > 0 ? '+' : ''}${(userMeasurementSystem === 'imperial' ? stats.weightChange * 2.20462 : stats.weightChange).toFixed(1)} ${userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Daily Calories</p>
                <p className="text-2xl font-bold">{Math.round(stats?.calorieAvg || 0)}</p>
                {stats?.calorieGoal && (
                  <p className="text-sm text-gray-500">Goal: {stats.calorieGoal}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mr-4">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Latest Calories</p>
                <p className="text-2xl font-bold">{Math.round(stats?.calorieLatest || 0)}</p>
                <p className={`text-sm ${
                  (stats?.calorieLatest || 0) > (stats?.calorieGoal || 0) ? 'text-red-600' :
                  (stats?.calorieLatest || 0) < (stats?.calorieGoal || 0) ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {stats?.calorieLatest && stats?.calorieGoal ?
                    (stats.calorieLatest > stats.calorieGoal ? 'Above goal' :
                     stats.calorieLatest < stats.calorieGoal ? 'Below goal' : 'On target') : '—'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Combined Health Trends</h2>
          <div className="h-96">
            {combinedChartData ? (
              <Line
                data={combinedChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top'
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          if (context.datasetIndex === 0) {
                            const unit = userMeasurementSystem === 'imperial' ? 'lbs' : 'kg';
                            return `Weight: ${context.parsed.y.toFixed(1)} ${unit}`;
                          } else {
                            return `Calories: ${Math.round(context.parsed.y)}`;
                          }
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: `Weight (${userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'})`
                      },
                      grid: { drawBorder: false }
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: {
                        display: true,
                        text: 'Calories'
                      },
                      grid: {
                        drawOnChartArea: false,
                        drawBorder: false
                      }
                    },
                    x: {
                      grid: { display: false }
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No trends data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Individual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weight Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Scale className="w-5 h-5 mr-2 text-green-600" />
              Weight Trend
            </h3>
            <div className="h-64">
              {trendsData?.weight?.data?.length > 0 ? (
                <Line
                  data={{
                    labels: trendsData.weight.labels,
                    datasets: [{
                      label: 'Weight',
                      data: trendsData.weight.data.map(weight => userMeasurementSystem === 'imperial' ? weight * 2.20462 : weight),
                      borderColor: '#22C55E',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      borderWidth: 2,
                      tension: 0.3,
                      fill: true
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const unit = userMeasurementSystem === 'imperial' ? 'lbs' : 'kg';
                            return `${context.parsed.y.toFixed(1)} ${unit}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: false,
                        grid: { drawBorder: false }
                      },
                      x: { grid: { display: false } }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No weight data</p>
                </div>
              )}
            </div>
          </div>

          {/* Calorie Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Calorie Trend
            </h3>
            <div className="h-64">
              {trendsData?.calories?.data?.length > 0 ? (
                <Line
                  data={{
                    labels: trendsData.calories.labels,
                    datasets: [{
                      label: 'Calories',
                      data: trendsData.calories.data,
                      borderColor: '#3B82F6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 2,
                      tension: 0.3,
                      fill: true
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${Math.round(context.parsed.y)} calories`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: false,
                        grid: { drawBorder: false }
                      },
                      x: { grid: { display: false } }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No calorie data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Insights & Recommendations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Weight Progress</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {stats?.weightChange !== undefined && (
                  <li className={`flex items-center ${
                    stats.weightChange < 0 ? 'text-green-600' : stats.weightChange > 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stats.weightChange < 0 ? <TrendingDown className="w-4 h-4 mr-2" /> :
                     stats.weightChange > 0 ? <TrendingUp className="w-4 h-4 mr-2" /> :
                     <Activity className="w-4 h-4 mr-2" />}
                    {stats.weightChange === 0 ? 'Weight stable' :
                     `Weight ${stats.weightChange < 0 ? 'decreased' : 'increased'} by ${Math.abs(stats.weightChange).toFixed(1)} kg`}
                  </li>
                )}
                {stats?.weightGoal && stats?.weightCurrent && (
                  <li>
                    {Math.abs(stats.weightCurrent - stats.weightGoal).toFixed(1)} kg to reach goal
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Calorie Patterns</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Average daily calories: {Math.round(stats?.calorieAvg || 0)}</li>
                {stats?.calorieGoal && (
                  <li>
                    {stats.calorieAvg > stats.calorieGoal ? 'Above' :
                     stats.calorieAvg < stats.calorieGoal ? 'Below' : 'Meeting'} daily goal
                  </li>
                )}
                <li>Latest intake: {Math.round(stats?.calorieLatest || 0)} calories</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendsDashboard;