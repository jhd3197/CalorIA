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
  const [formData, setFormData] = useState({
    weight: '',
    on_date: new Date().toISOString().split('T')[0],
    unit: 'kg'
  });

  useEffect(() => {
    fetchWeightHistory();
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
  const chartData = {
    labels: weightEntries.slice(0, 30).reverse().map(entry =>
      new Date(entry.on_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Weight',
        data: weightEntries.slice(0, 30).reverse().map(entry => entry.weight_kg),
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        borderWidth: 2,
        tension: 0.3,
        fill: true
      }
    ]
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="ml-3 text-gray-600">Loading weight history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
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
              <h1 className="text-3xl font-bold text-gray-900">Weight Tracker</h1>
              <p className="text-gray-600 mt-1">Monitor your weight progress over time</p>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Log Weight
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Weight</p>
                <p className="text-2xl font-bold">
                  {weightEntries.length > 0 ? `${weightEntries[0].weight_kg} kg` : 'No data'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                {weightChange?.direction === 'down' ? (
                  <TrendingDown className="w-6 h-6 text-green-600" />
                ) : weightChange?.direction === 'up' ? (
                  <TrendingUp className="w-6 h-6 text-red-600" />
                ) : (
                  <Scale className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Recent Change</p>
                <p className={`text-2xl font-bold ${
                  weightChange?.isPositive ? 'text-green-600' :
                  weightChange?.direction === 'up' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {weightChange ? `${weightChange.value.toFixed(1)} kg` : 'No data'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Entries</p>
                <p className="text-2xl font-bold">{weightEntries.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Weight Trend</h2>
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
                          return `${context.dataset.label}: ${context.parsed.y} kg`;
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
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No weight data available. Start by logging your first weight entry!</p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingEntry) && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingEntry ? 'Edit Weight Entry' : 'Add New Weight Entry'}
            </h2>

            <form onSubmit={editingEntry ? handleUpdateWeight : handleAddWeight} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="68.5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.on_date}
                    onChange={(e) => setFormData({...formData, on_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="lbs">Pounds (lbs)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center"
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
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Weight History Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Weight History</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
              <p>{error}</p>
            </div>
          )}

          {weightEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weightEntries.map((entry, index) => {
                    const previousEntry = weightEntries[index + 1];
                    const change = previousEntry ? entry.weight_kg - previousEntry.weight_kg : 0;

                    return (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {new Date(entry.on_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.weight_kg} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {previousEntry ? (
                            <span className={`flex items-center ${
                              change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {change !== 0 && (
                                change > 0 ?
                                  <TrendingUp className="w-4 h-4 mr-1" /> :
                                  <TrendingDown className="w-4 h-4 mr-1" />
                              )}
                              {change === 0 ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => startEditing(entry)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWeight(entry.id)}
                            className="text-red-600 hover:text-red-900"
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
            <div className="text-center py-8 text-gray-500">
              <Scale className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No weight entries yet. Click "Log Weight" to add your first entry!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeightTracker;