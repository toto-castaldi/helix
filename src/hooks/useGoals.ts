import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { GoalHistory, GoalInsert } from '@/types'

export function useGoals(clientId: string) {
  const [goals, setGoals] = useState<GoalHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('goal_history')
      .select('*')
      .eq('client_id', clientId)
      .order('started_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setGoals(data || [])
    }

    setLoading(false)
  }, [clientId])

  const addGoal = async (goal: string, startedAt?: string): Promise<GoalHistory | null> => {
    // Close the current active goal (the one without ended_at)
    const activeGoal = goals.find(g => !g.ended_at)
    if (activeGoal) {
      await supabase
        .from('goal_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeGoal.id)
    }

    // Insert new goal
    const newGoal: GoalInsert = {
      client_id: clientId,
      goal,
      started_at: startedAt || new Date().toISOString(),
    }

    const { data, error: insertError } = await supabase
      .from('goal_history')
      .insert(newGoal)
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return null
    }

    // Update client's current_goal
    await supabase
      .from('clients')
      .update({ current_goal: goal })
      .eq('id', clientId)

    // Refresh goals list
    await fetchGoals()

    return data
  }

  const deleteGoal = async (goalId: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('goal_history')
      .delete()
      .eq('id', goalId)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    setGoals((prev) => prev.filter((g) => g.id !== goalId))

    // If we deleted the active goal, update client's current_goal
    const remainingGoals = goals.filter(g => g.id !== goalId)
    const newActiveGoal = remainingGoals.find(g => !g.ended_at)
    await supabase
      .from('clients')
      .update({ current_goal: newActiveGoal?.goal || null })
      .eq('id', clientId)

    return true
  }

  const getCurrentGoal = (): GoalHistory | undefined => {
    return goals.find(g => !g.ended_at)
  }

  return {
    goals,
    loading,
    error,
    fetchGoals,
    addGoal,
    deleteGoal,
    getCurrentGoal,
  }
}
