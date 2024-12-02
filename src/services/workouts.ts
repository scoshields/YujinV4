import { supabase } from '../lib/supabase';
import type { WorkoutExercise } from '../types/workout';

export async function getWorkoutStats() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current week's workouts and exercises
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Get all workouts and their exercises
  const { data: workouts, error: workoutsError } = await supabase
    .from('daily_workouts')
    .select(`
      id,
      completed,
      workout_exercises (
        id,
        exercise_sets (
          weight,
          completed
        )
      )
    `)
    .eq('user_id', user.id)
    .gte('date', startOfWeek.toISOString());

  if (workoutsError) throw workoutsError;

  return workouts;
}

export async function getCurrentWeekWorkouts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const { data, error } = await supabase
    .from('daily_workouts')
    .select(`
      *,
      workout_exercises (
        id,
        name,
        target_sets,
        target_reps,
        notes,
        exercise_sets (
          id,
          completed
        )
      )
    `)
    .eq('user_id', user.id)
    .gte('date', startOfWeek.toISOString())
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function generateWorkout(
  workoutType: 'strength' | 'weight_loss',
  difficulty: 'easy' | 'medium' | 'hard',
  exercises: WorkoutExercise[],
  sharing?: {
    isShared: boolean;
    sharedWith: string[];
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create workout title from selected body parts
  const bodyPartsTitle = exercises
    .map(ex => ex.bodyPart)
    .filter((value, index, self) => self.indexOf(value) === index)
    .join('/');
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  });

  // Create daily workout
  const { data: dailyWorkout, error: dayError } = await supabase
    .from('daily_workouts')
    .insert({
      user_id: user.id,
      date: new Date().toISOString(),
      title: `${bodyPartsTitle} (${formattedDate})`,
      workout_type: workoutType,
      difficulty: difficulty,
      duration: 1, // Will be updated by trigger
      is_shared: sharing?.isShared ?? false,
      shared_with: sharing?.sharedWith || [],
      completed: false,
      is_favorite: false
    })
    .select()
    .single();

  if (dayError) throw dayError;
  if (!dailyWorkout) throw new Error('Failed to create workout');

  // Insert exercises
  for (const exercise of exercises) {
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('workout_exercises')
      .insert({
        daily_workout_id: dailyWorkout.id,
        name: exercise.name,
        target_sets: exercise.targetSets,
        target_reps: exercise.targetReps,
        notes: exercise.notes || ''
      })
      .select()
      .single();

    if (exerciseError) throw exerciseError;
    if (!exerciseData) throw new Error('Failed to create exercise');

    // Create exercise sets
    const exerciseSets = Array.from(
      { length: exercise.targetSets },
      (_, i) => ({
        exercise_id: exerciseData.id,
        user_id: user.id,
        set_number: i + 1,
        weight: 0,
        reps: 0,
        completed: false
      })
    );

    const { error: setsError } = await supabase
      .from('exercise_sets')
      .insert(exerciseSets);

    if (setsError) throw setsError;
  }

  return dailyWorkout;
}

export async function deleteWorkout(workoutId: string) {
  const { error } = await supabase
    .from('daily_workouts')
    .delete()
    .eq('id', workoutId);

  if (error) throw error;
}

export async function deleteExercise(exerciseId: string) {
  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', exerciseId);

  if (error) throw error;
}

export async function toggleFavorite(workoutId: string, isFavorite: boolean) {
  const { error } = await supabase
    .from('daily_workouts')
    .update({ is_favorite: isFavorite })
    .eq('id', workoutId);

  if (error) throw error;
}