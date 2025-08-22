import React, { useEffect, useRef } from 'react';
import { Target, Activity, Scale, Droplet } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = ({ userData, mealsData }) => {
  const progressRef = useRef(null);

  // Default data if none provided
  const defaultUserData = {
    dailyGoal: 2000,
    consumed: 1450,
    burned: 450,
    weight: 68.5,
    water: 1.8,
    macros: {
      protein: { grams: 85, percent: 34 },
      carbs: { grams: 120, percent: 48 },
      fat: { grams: 45, percent: 18 },
      other: { grams: 10, percent: 0 }
    }
  };

  // Properly merge userData with defaultUserData to ensure all required fields exist
  const data = {
    ...defaultUserData,
    ...userData,
    macros: {
      ...defaultUserData.macros,
      ...(userData?.macros || {})
    }
  };
  
  // Add fallbacks for calculations
  const dailyGoal = data.dailyGoal || defaultUserData.dailyGoal;
  const consumed = data.consumed || 0;
  const burned = data.burned || 0;
  const remaining = dailyGoal - consumed;
  const net = consumed - burned;

  // Setup progress ring
  useEffect(() => {
    if (progressRef.current) {
      const circle = progressRef.current;
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      circle.style.strokeDashoffset = circumference;
      
      const progress = consumed / dailyGoal;
      const offset = circumference - progress * circumference;
      circle.style.strokeDashoffset = offset;
      
      // Set color based on progress
      if (progress < 0.7) {
        circle.style.stroke = '#22C55E'; // green
      } else if (progress < 0.9) {
        circle.style.stroke = '#F59E0B'; // amber
      } else {
        circle.style.stroke = '#EF4444'; // red
      }
    }
  }, [consumed, dailyGoal]);

  // Macro chart data with defensive checks
  const macroChartData = {
    labels: ['Protein', 'Carbs', 'Fat', 'Other'],
    datasets: [{
      data: [
        data.macros?.protein?.grams || 0,
        data.macros?.carbs?.grams || 0,
        data.macros?.fat?.grams || 0,
        data.macros?.other?.grams || 0
      ],
      backgroundColor: ['#3B82F6', '#F59E0B', '#8B5CF6', '#9CA3AF'],
      borderWidth: 0
    }]
  };

  const macroChartOptions = {
    cutout: '70%',
    plugins: {
      legend: { display: false }
    }
  };

  // Trend and weight charts are handled in the TrendCharts component

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Daily Goal</p>
              <p className="font-semibold">{dailyGoal.toLocaleString()} kcal</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activity</p>
              <p className="font-semibold">{burned} kcal</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
              <Scale className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Weight</p>
              <p className="font-semibold">{data.weight || 0} kg</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
              <Droplet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Water</p>
              <p className="font-semibold">{data.water || 0} L</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today at a Glance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="heading text-lg font-semibold mb-4">Today at a Glance</h2>
            <div className="flex flex-col md:flex-row items-center">
              <div className="relative w-48 h-48 mb-6 md:mb-0 md:mr-6">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    className="text-gray-100" 
                    strokeWidth="8" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                  <circle 
                    ref={progressRef}
                    className="progress-ring__circle text-emerald-500" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{consumed.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">kcal consumed</span>
                  <span className="text-emerald-600 font-medium mt-1">{remaining} remaining</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Goal</p>
                    <p className="font-semibold">{dailyGoal.toLocaleString()} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Burned</p>
                    <p className="font-semibold">{burned} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Net</p>
                    <p className="font-semibold">{net.toLocaleString()} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-emerald-600">On track</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Protein</span>
                    <span className="text-sm font-medium">{data.macros?.protein?.grams || 0}g ({data.macros?.protein?.percent || 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: `${data.macros?.protein?.percent || 0}%`}}></div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Carbs</span>
                    <span className="text-sm font-medium">{data.macros?.carbs?.grams || 0}g ({data.macros?.carbs?.percent || 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{width: `${data.macros?.carbs?.percent || 0}%`}}></div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Fat</span>
                    <span className="text-sm font-medium">{data.macros?.fat?.grams || 0}g ({data.macros?.fat?.percent || 0}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: `${data.macros?.fat?.percent || 0}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Macro Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading text-lg font-semibold">Macro Breakdown</h2>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-emerald-50 text-emerald-600 rounded-lg">Day</button>
                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">Week</button>
                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">Month</button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-48 h-48 mb-6 md:mb-0 md:mr-6">
                <Doughnut data={macroChartData} options={macroChartOptions} />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-sm font-medium">Protein</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.macros?.protein?.grams || 0}g</p>
                  <p className="text-sm text-gray-500">{data.macros?.protein?.percent || 0}% of total</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                    <span className="text-sm font-medium">Carbs</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.macros?.carbs?.grams || 0}g</p>
                  <p className="text-sm text-gray-500">{data.macros?.carbs?.percent || 0}% of total</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="text-sm font-medium">Fat</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.macros?.fat?.grams || 0}g</p>
                  <p className="text-sm text-gray-500">{data.macros?.fat?.percent || 0}% of total</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                    <span className="text-sm font-medium">Other</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.macros?.other?.grams || 0}g</p>
                  <p className="text-sm text-gray-500">-</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;