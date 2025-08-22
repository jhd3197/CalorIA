import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TrendCharts = ({ caloriesTrendData, weightTrendData }) => {
  // Default trend chart data
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

  // Use provided data or fallback to default
  const trendData = caloriesTrendData || defaultTrendData;

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

  // Use provided data or fallback to default
  const weightData = weightTrendData || defaultWeightData;
  
  // Extract weight values safely
  const currentWeight = weightData?.datasets?.[0]?.data?.slice(-1)?.[0] || 68.5;
  const startingWeight = weightData?.datasets?.[0]?.data?.[0] || 69.5;
  const weightChange = currentWeight - startingWeight;
  const goalWeight = weightData?.datasets?.[1]?.data?.slice(-1)?.[0] || 65.0;

  const weightOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
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

  return (
    <div className="space-y-6">
      {/* 7-Day Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-lg font-semibold">7-Day Trend</h2>
          <button className="text-sm text-emerald-600 hover:text-emerald-700">View report</button>
        </div>
        <div className="h-48">
          {trendData?.datasets?.length > 0 ? (
            <Line data={trendData} options={trendOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Weight Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-lg font-semibold">Weight Trend</h2>
          <button className="text-sm text-emerald-600 hover:text-emerald-700">Log weight</button>
        </div>
        <div className="h-40">
          {weightData?.datasets?.length > 0 ? (
            <Line data={weightData} options={weightOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No weight data available</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current</p>
            <p className="font-semibold">{currentWeight} kg</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Change</p>
            <p className={`font-semibold ${weightChange < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Goal</p>
            <p className="font-semibold">{goalWeight} kg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendCharts;