import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getWeightTrends, getCalorieTrends, getUserData } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TrendCharts = ({ caloriesTrendData, weightTrendData }) => {
  const navigate = useNavigate();
  const [caloriesData, setCaloriesData] = useState(null);
  const [apiWeightData, setApiWeightData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userMeasurementSystem, setUserMeasurementSystem] = useState('metric');
  const [userTargetWeight, setUserTargetWeight] = useState(null);

  // Fetch trend data on component mount
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get user data
        const userData = getUserData();
        const userId = userData?.user_id || userData?.id;

        if (!userId) {
          throw new Error('User ID not found. Please log in again.');
        }

        // Fetch both calorie and weight trends in parallel
        const [caloriesResponse, weightResponse] = await Promise.all([
          getCalorieTrends(userId, { period: 'week' }).catch(() => null),
          getWeightTrends(userId, { period: 'month' }).catch(() => null)
        ]);

        if (caloriesResponse?.success) {
          setCaloriesData(caloriesResponse.data);
        }

        if (weightResponse?.success) {
          setApiWeightData(weightResponse.data);
        }

      } catch (err) {
        console.error('Error fetching trend data:', err);
        setError(err.message || 'Failed to fetch trend data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendData();
  }, []);

  // Get user preferences
  useEffect(() => {
    const userData = getUserData();
    if (userData?.preferences?.measurement_system) {
      setUserMeasurementSystem(userData.preferences.measurement_system);
    }
    if (userData?.preferences?.target_weight) {
      setUserTargetWeight(userData.preferences.target_weight);
    }
  }, []);

  // Default trend chart data (fallback)
  const defaultTrendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Consumed',
        data: [1800, 1950, 2100, 1750, 1650, 2300, 1850],
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        fill: true
      },
      {
        label: 'Goal',
        data: [2000, 2000, 2000, 2000, 2000, 2000, 2000],
        borderColor: '#9CA3AF',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0
      }
    ]
  };

  // Use API data if available, otherwise provided props, otherwise default
  const trendData = caloriesData || caloriesTrendData || defaultTrendData;

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 1500,
        max: 2500,
        grid: { drawBorder: false }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // Default weight chart data
  const defaultWeightData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Weight',
        data: [69.5, 69.0, 68.8, 68.5],
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        fill: true
      },
      {
        label: 'Goal',
        data: [69.5, 68.8, 68.1, 67.5],
        borderColor: '#9CA3AF',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0
      }
    ]
  };

  // Process weight data with unit conversion
  const processWeightData = (data) => {
    if (!data) return data;

    const convertWeight = (weight) => {
      if (userMeasurementSystem === 'imperial') {
        return weight * 2.20462; // Convert kg to lbs
      }
      return weight;
    };

    let processedDatasets = data.datasets.map(dataset => ({
      ...dataset,
      data: dataset.data.map(convertWeight)
    }));

    // Replace goal line with target_weight if available
    if (userTargetWeight !== null) {
      // target_weight is already in the user's preferred unit, no conversion needed
      const goalData = new Array(data.labels.length).fill(userTargetWeight);

      // Replace the existing goal dataset or add a new one
      const goalIndex = processedDatasets.findIndex(ds => ds.label === 'Goal');
      if (goalIndex !== -1) {
        processedDatasets[goalIndex] = {
          ...processedDatasets[goalIndex],
          data: goalData
        };
      } else {
        processedDatasets.push({
          label: 'Goal',
          data: goalData,
          borderColor: '#9CA3AF', // Gray color for goal
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        });
      }
    }

    return {
      ...data,
      datasets: processedDatasets
    };
  };

  // Use API data if available, otherwise provided props, otherwise default
  const rawWeightData = apiWeightData || weightTrendData || defaultWeightData;
  const weightData = processWeightData(rawWeightData);

  // Extract weight values safely
  const currentWeight = weightData?.datasets?.[0]?.data?.slice(-1)?.[0] || 68.5;
  const startingWeight = weightData?.datasets?.[0]?.data?.[0] || 69.5;
  const weightChange = currentWeight - startingWeight;

  // Use user's target weight if available, otherwise fall back to chart data
  const targetWeight = userTargetWeight || (weightData?.datasets?.[1]?.data?.slice(-1)?.[0] || 65.0);

  const weightOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const unit = userMeasurementSystem === 'imperial' ? 'lbs' : 'kg';
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} ${unit}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { drawBorder: false }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
            <p className="ml-3 text-gray-600 dark:text-gray-300">Loading trend data...</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
            <p className="ml-3 text-gray-600 dark:text-gray-300">Loading weight data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-center h-48 text-red-600 dark:text-red-400">
            <p>Failed to load trend data: {error}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-center h-40 text-red-600 dark:text-red-400">
            <p>Failed to load weight data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 7-Day Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-lg font-semibold text-gray-900 dark:text-white">7-Day Trend</h2>
          <button
            onClick={() => navigate('/calorie-report')}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            View report
          </button>
        </div>
        <div className="h-48">
          {trendData?.datasets?.length > 0 ? (
            <Line data={trendData} options={trendOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>No trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Weight Trend */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-lg font-semibold text-gray-900 dark:text-white">Weight Trend</h2>
          <button
            onClick={() => navigate('/weight-tracker')}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            Log weight
          </button>
        </div>
        <div className="h-40">
          {weightData?.datasets?.length > 0 ? (
            <Line data={weightData} options={weightOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>No weight data available</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current</p>
            <p className="font-semibold text-gray-900 dark:text-white">{currentWeight.toFixed(1)} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Change</p>
            <p className={`font-semibold ${weightChange < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Goal</p>
            <p className="font-semibold text-gray-900 dark:text-white">{userTargetWeight ? userTargetWeight.toFixed(1) : targetWeight.toFixed(1)} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendCharts;