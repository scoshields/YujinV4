import React, { useState, useEffect } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { WorkoutCard } from '../components/workouts/WorkoutCard';
import { WorkoutGenerator } from '../components/workouts/WorkoutGenerator';
import { getCurrentWeekWorkouts } from '../services/workouts';
import { WorkoutList } from '../components/workouts/WorkoutList';

export function Workouts() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await getCurrentWeekWorkouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Your Workouts</h1>
            <p className="text-gray-400">Track and generate your weekly workout plans</p>
          </div>
          <button 
            onClick={() => setShowGenerator(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Generate Workout
          </button>
        </div>

        <WorkoutList onWorkoutChange={loadData} />

        {showGenerator && (
          <WorkoutGenerator onClose={() => {
            setShowGenerator(false);
            loadData();
          }} />
        )}
      </div>
    </div>
  );
}