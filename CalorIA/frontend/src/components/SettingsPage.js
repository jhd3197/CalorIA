import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette, Globe, Database, Save, Edit3, Mail, Phone } from 'lucide-react';
import { fetchUserProfile, getUserData, updateUserProfile } from '../utils/api';
import { applyTheme, getCurrentTheme } from '../utils/theme';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // User profile data
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    height: '',
    weight: '',
    activityLevel: '',
    goal: ''
  });

  const [preferences, setPreferences] = useState({
    measurement_system: 'metric',
    preferred_language: 'en',
    timezone: 'America/New_York',
    theme: 'light',
    week_starts_on: 'monday',
    activity_level: 'sedentary',
    daily_calorie_goal: 2000,
    daily_water_goal_ml: 2000,
    goal_type: 'maintain',
    sex: 'other',
    target_weight: 70.0
  });

  // Height in feet and inches for imperial system
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');


  // Fetch user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const userData = getUserData();
        if (!userData || !userData.user_id) {
          throw new Error('User not authenticated');
        }

        const response = await fetchUserProfile(userData.user_id);
        const user = response.user || response;

        // Map backend data to frontend format
        const nameParts = (user.name || '').split(' ');
        const preferences = user.preferences || {};

        setUserProfile({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: user.email || '',
          phone: user.phone || '',
          dateOfBirth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
          gender: preferences.sex ? preferences.sex.charAt(0).toUpperCase() + preferences.sex.slice(1) : '',
          height: preferences.height ? preferences.height.toString() : '',
          weight: preferences.target_weight ? preferences.target_weight.toString() : '',
          activityLevel: preferences.activity_level ? preferences.activity_level.charAt(0).toUpperCase() + preferences.activity_level.slice(1).replace('_', ' ') : '',
          goal: preferences.goal_type ? preferences.goal_type.charAt(0).toUpperCase() + preferences.goal_type.slice(1) : ''
        });

        // Update preferences
        const userPreferences = {
          measurement_system: preferences.measurement_system || 'metric',
          preferred_language: preferences.preferred_language || 'en',
          timezone: preferences.timezone || 'America/New_York',
          theme: preferences.theme || 'light',
          week_starts_on: preferences.week_starts_on || 'monday',
          activity_level: preferences.activity_level || 'sedentary',
          daily_calorie_goal: preferences.daily_calorie_goal || 2000,
          daily_water_goal_ml: preferences.daily_water_goal_ml || 2000,
          goal_type: preferences.goal_type || 'maintain',
          sex: preferences.sex || 'other',
          target_weight: preferences.target_weight || 70.0
        };

        setPreferences(userPreferences);

        // Apply theme immediately when user data is loaded (only if not already applied by App.js)
        const currentThemeClass = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const userTheme = getCurrentTheme(userPreferences.theme);

        // Only apply if there's a mismatch and we're not in the middle of a theme transition
        if (currentThemeClass !== userTheme && !document.documentElement.classList.contains('theme-transitioning')) {
          document.documentElement.classList.add('theme-transitioning');
          setTimeout(() => {
            applyTheme(userTheme);
            document.documentElement.classList.remove('theme-transitioning');
          }, 10);
        }

        // Initialize feet and inches if in imperial mode and fields are empty
        if (userPreferences.measurement_system === 'imperial' && user.preferences?.height && !heightFeet && !heightInches) {
          const { feet, inches } = convertHeightToFeetInches(user.preferences.height);
          setHeightFeet(feet);
          setHeightInches(inches);
        }

      } catch (err) {
        console.error('Failed to load user data:', err);
        setError(err.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Handle measurement system changes to convert height values
  useEffect(() => {
    if (preferences.measurement_system === 'imperial' && userProfile.height && !heightFeet && !heightInches) {
      // Only convert if feet/inches fields are empty (user hasn't started typing)
      const { feet, inches } = convertHeightToFeetInches(parseFloat(userProfile.height));
      setHeightFeet(feet);
      setHeightInches(inches);
    } else if (preferences.measurement_system === 'metric') {
      // Reset feet/inches when switching to metric
      setHeightFeet('');
      setHeightInches('');
    }
  }, [preferences.measurement_system, userProfile.height, heightFeet, heightInches]);


  const handleProfileUpdate = (field, value) => {
    setUserProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceUpdate = (field, value) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, [field]: value };

      // Apply theme immediately when theme preference changes
      if (field === 'theme') {
        const theme = getCurrentTheme(value);
        // Use setTimeout to ensure state update happens first
        setTimeout(() => applyTheme(theme), 0);
      }

      return newPreferences;
    });
  };

  // Convert total height (cm) to feet and inches
  const convertHeightToFeetInches = (totalCm) => {
    if (!totalCm || totalCm <= 0) return { feet: '', inches: '' };
    const totalInches = totalCm / 2.54; // Convert cm to inches
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet: feet.toString(), inches: inches.toString() };
  };

  // Convert feet and inches to total height (cm)
  const convertFeetInchesToHeight = (feet, inches) => {
    const feetNum = parseInt(feet) || 0;
    const inchesNum = parseInt(inches) || 0;
    const totalInches = (feetNum * 12) + inchesNum;
    return Math.round(totalInches * 2.54); // Convert inches to cm
  };

  // Handle feet input change
  const handleHeightFeetChange = (value) => {
    setHeightFeet(value);
    // Only convert if both feet and inches have values
    if (value && heightInches) {
      const newHeight = convertFeetInchesToHeight(value, heightInches);
      handleProfileUpdate('height', newHeight.toString());
    }
  };

  // Handle inches input change
  const handleHeightInchesChange = (value) => {
    setHeightInches(value);
    // Only convert if both feet and inches have values
    if (heightFeet && value) {
      const newHeight = convertFeetInchesToHeight(heightFeet, value);
      handleProfileUpdate('height', newHeight.toString());
    }
  };


  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      const userData = getUserData();
      if (!userData || !userData.user_id) {
        throw new Error('User not authenticated');
      }

      // Prepare the update data
      const updateData = {
        name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        email: userProfile.email,
        phone: userProfile.phone,
        date_of_birth: userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toISOString().split('T')[0] : null,
        preferences: {
          ...preferences,
          height: userProfile.height ? parseFloat(userProfile.height) : null,
          target_weight: userProfile.weight ? parseFloat(userProfile.weight) : null,
          sex: preferences.sex
        }
      };

      // Remove null values from preferences
      Object.keys(updateData.preferences).forEach(key => {
        if (updateData.preferences[key] === null) {
          delete updateData.preferences[key];
        }
      });

      await updateUserProfile(userData.user_id, updateData);

    } catch (err) {
      console.error('Failed to save changes:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };


  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <Shield className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Settings</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Profile</p>
              <p className="font-semibold text-gray-900 dark:text-white">95% Complete</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
              <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Preferences</p>
              <p className="font-semibold text-gray-900 dark:text-white">Configured</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Language</p>
              <p className="font-semibold text-gray-900 dark:text-white">{preferences.preferred_language === 'en' ? 'English' : preferences.preferred_language.toUpperCase()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mr-3">
              <Database className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Calorie Goal</p>
              <p className="font-semibold text-gray-900 dark:text-white">{preferences.daily_calorie_goal} cal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="p-6">
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="flex items-center space-x-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{userProfile.firstName} {userProfile.lastName}</h3>
                <p className="text-gray-600 dark:text-gray-300">{userProfile.email}</p>
              </div>
            </div>

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-white">Personal Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={userProfile.firstName}
                      onChange={(e) => handleProfileUpdate('firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={userProfile.lastName}
                      onChange={(e) => handleProfileUpdate('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                      <input
                        type="email"
                        value={userProfile.email}
                        onChange={(e) => handleProfileUpdate('email', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                      <input
                        type="tel"
                        value={userProfile.phone}
                        onChange={(e) => handleProfileUpdate('phone', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-white">Health Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={userProfile.dateOfBirth}
                      onChange={(e) => handleProfileUpdate('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Height ({preferences.measurement_system === 'imperial' ? 'ft in' : 'cm'})
                    </label>
                    {preferences.measurement_system === 'imperial' ? (
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="Feet"
                            value={heightFeet}
                            onChange={(e) => handleHeightFeetChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            min="0"
                            max="8"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="Inches"
                            value={heightInches}
                            onChange={(e) => handleHeightInchesChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            min="0"
                            max="11"
                          />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={userProfile.height}
                        onChange={(e) => handleProfileUpdate('height', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Weight ({preferences.measurement_system === 'imperial' ? 'lbs' : 'kg'})
                    </label>
                    <input
                      type="number"
                      value={userProfile.weight}
                      onChange={(e) => handleProfileUpdate('weight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-800 dark:text-white">App Preferences</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Measurement System</label>
                    <select
                      value={preferences.measurement_system}
                      onChange={(e) => handlePreferenceUpdate('measurement_system', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="metric">Metric (kg, cm)</option>
                      <option value="imperial">Imperial (lbs, ft)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                    <select
                      value={preferences.preferred_language}
                      onChange={(e) => handlePreferenceUpdate('preferred_language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => handlePreferenceUpdate('theme', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Activity Level</label>
                    <select
                      value={preferences.activity_level}
                      onChange={(e) => handlePreferenceUpdate('activity_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="sedentary">Sedentary</option>
                      <option value="light">Light Activity</option>
                      <option value="moderate">Moderate Activity</option>
                      <option value="active">Active</option>
                      <option value="very_active">Very Active</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Type</label>
                    <select
                      value={preferences.goal_type}
                      onChange={(e) => handlePreferenceUpdate('goal_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="lose">Lose Weight</option>
                      <option value="maintain">Maintain Weight</option>
                      <option value="gain">Gain Weight</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => handlePreferenceUpdate('timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Week Start</label>
                    <select
                      value={preferences.week_starts_on}
                      onChange={(e) => handlePreferenceUpdate('week_starts_on', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Calorie Goal</label>
                    <input
                      type="number"
                      value={preferences.daily_calorie_goal}
                      onChange={(e) => handlePreferenceUpdate('daily_calorie_goal', parseInt(e.target.value) || 2000)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      min="1000"
                      max="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Water Goal (ml)</label>
                    <input
                      type="number"
                      value={preferences.daily_water_goal_ml}
                      onChange={(e) => handlePreferenceUpdate('daily_water_goal_ml', parseInt(e.target.value) || 2000)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      min="500"
                      max="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sex</label>
                    <select
                      value={preferences.sex}
                      onChange={(e) => handlePreferenceUpdate('sex', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600 flex justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;