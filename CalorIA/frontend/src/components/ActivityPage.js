import React, { useState, useRef, useEffect } from 'react';
import { Activity, Clock, Flame, Target, Heart, TrendingUp, Play, Pause } from 'lucide-react';

const ActivityPage = () => {
  const [activeWorkout, setActiveWorkout] = useState(null);
  const progressRef = useRef(null);

  // Sample data
  const todayStats = {
    caloriesBurned: 420,
    activeMinutes: 65,
    steps: 8450,
    heartRate: 72,
    weeklyGoal: 2500,
    dailyGoal: 500
  };

  const recentActivities = [
    { id: 1, type: 'Running', duration: 45, calories: 380, time: '7:00 AM', intensity: 'High' },
    { id: 2, type: 'Strength Training', duration: 30, calories: 220, time: '6:00 PM', intensity: 'Medium' },
    { id: 3, type: 'Yoga', duration: 60, calories: 180, time: '8:00 AM', intensity: 'Low' },
    { id: 4, type: 'Cycling', duration: 90, calories: 520, time: '9:00 AM', intensity: 'High' }
  ];

  const workoutPlans = [
    { id: 1, name: 'Morning Cardio', duration: 30, exercises: 5, difficulty: 'Beginner' },
    { id: 2, name: 'Full Body Strength', duration: 45, exercises: 8, difficulty: 'Intermediate' },
    { id: 3, name: 'HIIT Blast', duration: 20, exercises: 6, difficulty: 'Advanced' },
    { id: 4, name: 'Flexibility Flow', duration: 25, exercises: 10, difficulty: 'Beginner' }
  ];

  // Setup progress ring for weekly goal
  useEffect(() => {
    if (progressRef.current) {
      const circle = progressRef.current;
      const radius = 35;
      const circumference = 2 * Math.PI * radius;
      
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      circle.style.strokeDashoffset = circumference;
      
      const progress = todayStats.caloriesBurned / todayStats.weeklyGoal * 7; // Weekly progress
      const offset = circumference - progress * circumference;
      circle.style.strokeDashoffset = offset;
      
      circle.style.stroke = progress < 0.7 ? '#22C55E' : progress < 0.9 ? '#F59E0B' : '#EF4444';
    }
  }, [todayStats.caloriesBurned, todayStats.weeklyGoal]);

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntensityColor = (intensity) => {
    switch(intensity) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <Flame className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Calories Burned</p>
              <p className="font-semibold">{todayStats.caloriesBurned} kcal</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Minutes</p>
              <p className="font-semibold">{todayStats.activeMinutes} min</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Steps</p>
              <p className="font-semibold">{todayStats.steps.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mr-3">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Heart Rate</p>
              <p className="font-semibold">{todayStats.heartRate} bpm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="heading text-lg font-semibold mb-4">Weekly Activity Goal</h2>
          <div className="flex flex-col md:flex-row items-center">
            <div className="relative w-40 h-40 mb-6 md:mb-0 md:mr-6">
              <svg className="w-full h-full" viewBox="0 0 80 80">
                <circle 
                  className="text-gray-100" 
                  strokeWidth="8" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="35" 
                  cx="40" 
                  cy="40" 
                />
                <circle 
                  ref={progressRef}
                  className="progress-ring__circle text-red-500" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="35" 
                  cx="40" 
                  cy="40" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{Math.round((todayStats.caloriesBurned / todayStats.weeklyGoal * 7) * 100)}%</span>
                <span className="text-xs text-gray-500">of weekly goal</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Weekly Goal</p>
                  <p className="font-semibold">{todayStats.weeklyGoal.toLocaleString()} kcal</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Daily Average</p>
                  <p className="font-semibold">{Math.round(todayStats.weeklyGoal / 7)} kcal</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">This Week</p>
                  <p className="font-semibold">{todayStats.caloriesBurned * 7} kcal</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remaining</p>
                  <p className="font-semibold text-red-600">{todayStats.weeklyGoal - (todayStats.caloriesBurned * 7)} kcal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Workout */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading text-lg font-semibold">Current Workout</h2>
            <button className={`px-4 py-2 rounded-lg flex items-center ${activeWorkout ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
              {activeWorkout ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {activeWorkout ? 'Pause' : 'Start'}
            </button>
          </div>
          {activeWorkout ? (
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">{activeWorkout}</h3>
              <div className="text-3xl font-bold text-green-600 mb-4">25:30</div>
              <p className="text-gray-600">Keep going! You're doing great.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Workout</h3>
              <p className="text-gray-500 mb-4">Start a workout to begin tracking your activity</p>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Browse Workouts
              </button>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading text-lg font-semibold">Recent Activities</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="space-y-3">
            {recentActivities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{activity.type}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{activity.duration} min • {activity.time}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{activity.calories} kcal</p>
                  <p className={`text-xs font-medium ${getIntensityColor(activity.intensity)}`}>
                    {activity.intensity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workout Plans */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading text-lg font-semibold">Workout Plans</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700">Create New</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {workoutPlans.map((plan) => (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(plan.difficulty)}`}>
                    {plan.difficulty}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600 space-x-4">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{plan.duration} min</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    <span>{plan.exercises} exercises</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ActivityPage;