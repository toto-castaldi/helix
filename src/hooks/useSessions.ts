import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Session,
  SessionInsert,
  SessionUpdate,
  SessionWithDetails,
  SessionExercise,
  SessionExerciseInsert,
  SessionExerciseUpdate,
  SessionExerciseWithDetails,
} from '@/types'

interface FetchSessionsOptions {
  clientId?: string
  status?: 'planned' | 'completed'
  fromDate?: string
  toDate?: string
}

export function useSessions(options: FetchSessionsOptions = {}) {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('sessions')
      .select(`
        *,
        client:clients(*),
        gym:gyms(*),
        exercises:session_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .order('session_date', { ascending: false })

    if (options.clientId) {
      query = query.eq('client_id', options.clientId)
    }
    if (options.status) {
      query = query.eq('status', options.status)
    }
    if (options.fromDate) {
      query = query.gte('session_date', options.fromDate)
    }
    if (options.toDate) {
      query = query.lte('session_date', options.toDate)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      // Sort exercises by order_index
      const sessionsWithSortedExercises = (data || []).map((session) => ({
        ...session,
        exercises: session.exercises?.sort(
          (a: SessionExerciseWithDetails, b: SessionExerciseWithDetails) =>
            a.order_index - b.order_index
        ),
      }))
      setSessions(sessionsWithSortedExercises)
    }

    setLoading(false)
  }, [options.clientId, options.status, options.fromDate, options.toDate])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const getSession = useCallback(
    async (id: string): Promise<SessionWithDetails | null> => {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select(`
          *,
          client:clients(*),
          gym:gyms(*),
          exercises:session_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) {
        setError(fetchError.message)
        return null
      }

      // Sort exercises by order_index
      return {
        ...data,
        exercises: data.exercises?.sort(
          (a: SessionExerciseWithDetails, b: SessionExerciseWithDetails) =>
            a.order_index - b.order_index
        ),
      }
    },
    []
  )

  const createSession = async (
    session: SessionInsert
  ): Promise<Session | null> => {
    const { data, error: insertError } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return null
    }

    await fetchSessions()
    return data
  }

  const updateSession = async (
    id: string,
    updates: SessionUpdate
  ): Promise<Session | null> => {
    const { data, error: updateError } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return null
    }

    await fetchSessions()
    return data
  }

  const deleteSession = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    setSessions((prev) => prev.filter((s) => s.id !== id))
    return true
  }

  // Session Exercises CRUD

  const addExercise = async (
    exercise: SessionExerciseInsert
  ): Promise<SessionExercise | null> => {
    // Get current max order_index
    const { data: existing } = await supabase
      .from('session_exercises')
      .select('order_index')
      .eq('session_id', exercise.session_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

    const { data, error: insertError } = await supabase
      .from('session_exercises')
      .insert({ ...exercise, order_index: exercise.order_index ?? nextOrder })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return null
    }

    await fetchSessions()
    return data
  }

  const updateExercise = async (
    id: string,
    updates: SessionExerciseUpdate
  ): Promise<SessionExercise | null> => {
    const { data, error: updateError } = await supabase
      .from('session_exercises')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return null
    }

    await fetchSessions()
    return data
  }

  const removeExercise = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('session_exercises')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    await fetchSessions()
    return true
  }

  const reorderExercises = async (
    _sessionId: string,
    exerciseIds: string[]
  ): Promise<boolean> => {
    // Update each exercise with new order_index
    const updates = exerciseIds.map((id, index) =>
      supabase
        .from('session_exercises')
        .update({ order_index: index })
        .eq('id', id)
    )

    const results = await Promise.all(updates)
    const hasError = results.some((r) => r.error)

    if (hasError) {
      setError('Errore nel riordinamento degli esercizi')
      return false
    }

    await fetchSessions()
    return true
  }

  return {
    sessions,
    loading,
    error,
    getSession,
    createSession,
    updateSession,
    deleteSession,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
    refetch: fetchSessions,
  }
}
