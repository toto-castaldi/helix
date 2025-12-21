export interface Client {
  id: string
  user_id: string
  first_name: string
  last_name: string
  birth_date: string | null
  age_years: number | null
  current_goal: string | null
  physical_notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientInsert {
  first_name: string
  last_name: string
  birth_date?: string | null
  age_years?: number | null
  current_goal?: string | null
  physical_notes?: string | null
}

export interface ClientUpdate extends Partial<ClientInsert> {}

export interface GoalHistory {
  id: string
  client_id: string
  goal: string
  started_at: string
  ended_at: string | null
}

export interface GoalInsert {
  client_id: string
  goal: string
  started_at?: string
}

export interface Exercise {
  id: string
  user_id: string | null
  name: string
  description: string | null
  created_at: string
}

export interface ExerciseBlock {
  id: string
  exercise_id: string
  image_url: string | null
  description: string | null
  order_index: number
  created_at: string
}

export interface ExerciseBlockInsert {
  image_url?: string | null
  description?: string | null
  order_index?: number
}

export interface ExerciseTag {
  id: string
  exercise_id: string
  tag: string
  created_at: string
}

export interface ExerciseInsert {
  name: string
  description?: string | null
}

export interface ExerciseUpdate extends Partial<ExerciseInsert> {}

export interface ExerciseWithDetails extends Exercise {
  blocks?: ExerciseBlock[]
  tags?: ExerciseTag[]
}

export interface Gym {
  id: string
  user_id: string
  name: string
  address: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface GymInsert {
  name: string
  address?: string | null
  description?: string | null
}

export interface GymUpdate extends Partial<GymInsert> {}

// Sessions

export type SessionStatus = 'planned' | 'completed'

export interface Session {
  id: string
  client_id: string
  gym_id: string | null
  session_date: string
  status: SessionStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SessionInsert {
  client_id: string
  gym_id?: string | null
  session_date: string
  status?: SessionStatus
  notes?: string | null
}

export interface SessionUpdate extends Partial<Omit<SessionInsert, 'client_id'>> {}

export interface SessionExercise {
  id: string
  session_id: string
  exercise_id: string
  order_index: number
  sets: number | null
  reps: number | null
  weight_kg: number | null
  duration_seconds: number | null
  notes: string | null
}

export interface SessionExerciseInsert {
  session_id: string
  exercise_id: string
  order_index?: number
  sets?: number | null
  reps?: number | null
  weight_kg?: number | null
  duration_seconds?: number | null
  notes?: string | null
}

export interface SessionExerciseUpdate extends Partial<Omit<SessionExerciseInsert, 'session_id' | 'exercise_id'>> {}

export interface SessionExerciseWithDetails extends SessionExercise {
  exercise?: Exercise
}

export interface SessionWithDetails extends Session {
  client?: Client
  gym?: Gym | null
  exercises?: SessionExerciseWithDetails[]
}
