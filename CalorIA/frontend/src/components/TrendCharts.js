import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TrendCharts = () => {
  // Trend chart data
  const trendData = {
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

  // Weight chart data
  const weightData = {
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
          <Line data={trendData} options={trendOptions} />
        </div>
      </div>

      {/* Weight Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-lg font-semibold">Weight Trend</h2>
          <button className="text-sm text-emerald-600 hover:text-emerald-700">Log weight</button>
        </div>
        <div className="h-40">
          <Line data={weightData} options={weightOptions} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current</p>
            <p className="font-semibold">68.5 kg</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Change</p>
            <p className="font-semibold text-emerald-600">-0.8 kg</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Goal</p>
            <p className="font-semibold">65.0 kg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendCharts;