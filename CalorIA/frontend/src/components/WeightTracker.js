import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getWeightHistory, addWeightEntry, updateWeightEntry, deleteWeightEntry, getUserData } from '../utils/api';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Scale, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const WeightTracker = ({ onBack }) => {
  const [weightEntries, setWeightEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [userMeasurementSystem, setUserMeasurementSystem] = useState('metric');
  const [userTargetWeight, setUserTargetWeight] = useState(null);
  const [formData, setFormData] = useState({
    weight: '',
    on_date: new Date().toISOString().split('T')[0],
    unit: 'kg'
  });

  useEffect(() => {
    fetchWeightHistory();
  }, []);

  // Get user preferences and set default unit
  useEffect(() => {
    const userData = getUserData();
    if (userData?.preferences?.measurement_system) {
      const system = userData.preferences.measurement_system;
      setUserMeasurementSystem(system);
      setFormData(prev => ({
        ...prev,
        unit: system === 'imperial' ? 'lbs' : 'kg'
      }));
    }
    if (userData?.preferences?.target_weight) {
      setUserTargetWeight(userData.preferences.target_weight);
    }
  }, []);

  const fetchWeightHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getWeightHistory();

      if (response.entries) {
        // Sort entries by date (newest first)
        const sortedEntries = response.entries.sort((a, b) =>
          new Date(b.on_date) - new Date(a.on_date)
        );
        setWeightEntries(sortedEntries);
      }

    } catch (err) {
      console.error('Error fetching weight history:', err);
      setError(err.message || 'Failed to fetch weight history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWeight = async (e) => {
    e.preventDefault();

    try {
      const userData = getUserData();
      const userId = userData?.user_id || userData?.id;

      if (!userId) {
        throw new Error('User ID not found');
      }

      const weightData = {
        user_id: userId,
        weight: parseFloat(formData.weight),
        on_date: formData.on_date,
        unit: formData.unit
      };

      await addWeightEntry(weightData);

      // Reset form and refresh data
      setFormData({
        weight: '',
        on_date: new Date().toISOString().split('T')[0],
        unit: 'kg'
      });
      setShowAddForm(false);
      fetchWeightHistory();

    } catch (err) {
      console.error('Error adding weight entry:', err);
      setError(err.message || 'Failed to add weight entry');
    }
  };

  const handleUpdateWeight = async (e) => {
    e.preventDefault();

    try {
      const weightData = {
        weight: parseFloat(formData.weight),
        on_date: formData.on_date,
        unit: formData.unit
      };

      await updateWeightEntry(editingEntry.id, weightData);

      // Reset form and refresh data
      setFormData({
        weight: '',
        on_date: new Date().toISOString().split('T')[0],
        unit: 'kg'
      });
      setEditingEntry(null);
      fetchWeightHistory();

    } catch (err) {
      console.error('Error updating weight entry:', err);
      setError(err.message || 'Failed to update weight entry');
    }
  };

  const handleDeleteWeight = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this weight entry?')) {
      return;
    }

    try {
      await deleteWeightEntry(entryId);
      fetchWeightHistory();
    } catch (err) {
      console.error('Error deleting weight entry:', err);
      setError(err.message || 'Failed to delete weight entry');
    }
  };

  const startEditing = (entry) => {
    setEditingEntry(entry);
    setFormData({
      weight: entry.weight_kg.toString(),
      on_date: entry.on_date.split('T')[0],
      unit: entry.unit || 'kg'
    });
  };

  const cancelEditing = () => {
    setEditingEntry(null);
    setFormData({
      weight: '',
      on_date: new Date().toISOString().split('T')[0],
      unit: 'kg'
    });
  };

  // Prepare chart data
  const labels = weightEntries.slice(0, 30).reverse().map(entry =>
    new Date(entry.on_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  const datasets = [
    {
      label: 'Weight',
      data: weightEntries.slice(0, 30).reverse().map(entry =>
        userMeasurementSystem === 'imperial' ? entry.weight_kg * 2.20462 : entry.weight_kg
      ),
      borderColor: '#22C55E',
      backgroundColor: 'rgba(34, 197, 94, 0.05)',
      borderWidth: 2,
      tension: 0.3,
      fill: true
    }
  ];

  // Add goal line using target_weight if available
  if (userTargetWeight !== null) {
    // target_weight is already in the user's preferred unit, no conversion needed
    const goalData = new Array(labels.length).fill(userTargetWeight);

    datasets.push({
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

  const chartData = {
    labels,
    datasets
  };

  // Calculate weight change
  const calculateWeightChange = () => {
    if (weightEntries.length < 2) return null;

    const latest = weightEntries[0].weight_kg;
    const previous = weightEntries[1].weight_kg;
    const change = latest - previous;

    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
      isPositive: change < 0 // Weight loss is positive
    };
  };

  const weightChange = calculateWeightChange();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="ml-3 text-gray-600 dark:text-gray-400">Loading weight history...</p>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Weight Tracker</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor your weight progress over time</p>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Log Weight
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4">
                <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Weight</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {weightEntries.length > 0 ?
                    `${userMeasurementSystem === 'imperial' ?
                      (weightEntries[0].weight_kg * 2.20462).toFixed(1) :
                      weightEntries[0].weight_kg.toFixed(1)} ${userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}` :
                    'No data'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-4">
                {weightChange?.direction === 'down' ? (
                  <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : weightChange?.direction === 'up' ? (
                  <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                ) : (
                  <Scale className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recent Change</p>
                <p className={`text-2xl font-bold ${
                  weightChange?.isPositive ? 'text-green-600 dark:text-green-400' :
                  weightChange?.direction === 'up' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {weightChange ?
                    `${(userMeasurementSystem === 'imperial' ? weightChange.value * 2.20462 : weightChange.value).toFixed(1)} ${userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}` :
                    'No data'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{weightEntries.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Weight Trend</h2>
          <div className="h-80">
            {weightEntries.length > 0 ? (
              <Line
                data={chartData}
                options={{
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
                <p>No weight data available. Start by logging your first weight entry!</p>
              </div>
            )}
          </div>

          {/* Weight Summary */}
          {weightEntries.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {userMeasurementSystem === 'imperial' ?
                    (weightEntries[0].weight_kg * 2.20462).toFixed(1) :
                    weightEntries[0].weight_kg.toFixed(1)} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Change</p>
                <p className={`font-semibold ${weightChange?.isPositive ? 'text-green-600 dark:text-green-400' : weightChange?.direction === 'up' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {weightChange ?
                    `${(userMeasurementSystem === 'imperial' ? weightChange.value * 2.20462 : weightChange.value).toFixed(1)} ${userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}` :
                    'No data'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Goal</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {userTargetWeight ? userTargetWeight.toFixed(1) : '—'} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingEntry) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingEntry ? 'Edit Weight Entry' : 'Add New Weight Entry'}
            </h2>

            <form onSubmit={editingEntry ? handleUpdateWeight : handleAddWeight} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="68.5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.on_date}
                    onChange={(e) => setFormData({...formData, on_date: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {userMeasurementSystem === 'imperial' ? (
                      <>
                        <option value="lbs">Pounds (lbs)</option>
                        <option value="kg">Kilograms (kg)</option>
                      </>
                    ) : (
                      <>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="lbs">Pounds (lbs)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingEntry ? 'Update' : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    cancelEditing();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Weight History Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Weight History</h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-4 mb-4">
              <p>{error}</p>
            </div>
          )}

          {weightEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {weightEntries.map((entry, index) => {
                    const previousEntry = weightEntries[index + 1];
                    const change = previousEntry ? entry.weight_kg - previousEntry.weight_kg : 0;

                    return (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          <div>
                            <div>{new Date(entry.on_date).toLocaleDateString()}</div>
                            {entry.created_at && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {userMeasurementSystem === 'imperial' ?
                            (entry.weight_kg * 2.20462).toFixed(1) :
                            entry.weight_kg.toFixed(1)} {userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {previousEntry ? (
                            <span className={`flex items-center ${
                              change < 0 ? 'text-green-600 dark:text-green-400' : change > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {change !== 0 && (
                                change > 0 ?
                                  <TrendingUp className="w-4 h-4 mr-1" /> :
                                  <TrendingDown className="w-4 h-4 mr-1" />
                              )}
                              {change === 0 ? '—' : `${change > 0 ? '+' : ''}${(userMeasurementSystem === 'imperial' ? change * 2.20462 : change).toFixed(1)} ${userMeasurementSystem === 'imperial' ? 'lbs' : 'kg'}`}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => startEditing(entry)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWeight(entry.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No weight entries yet. Click "Log Weight" to add your first entry!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeightTracker;