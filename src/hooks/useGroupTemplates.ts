import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  GroupTemplate,
  GroupTemplateInsert,
  GroupTemplateUpdate,
  GroupTemplateWithExercises,
  GroupTemplateExercise,
  GroupTemplateExerciseInsert,
  GroupTemplateExerciseUpdate,
  GroupTemplateExerciseWithDetails,
} from '@/types'

export function useGroupTemplates() {
  const [templates, setTemplates] = useState<GroupTemplateWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('group_templates')
      .select(`
        *,
        exercises:group_template_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      // Sort exercises by order_index
      const templatesWithSortedExercises = (data || []).map((template) => ({
        ...template,
        exercises: template.exercises?.sort(
          (a: GroupTemplateExerciseWithDetails, b: GroupTemplateExerciseWithDetails) =>
            a.order_index - b.order_index
        ),
      }))
      setTemplates(templatesWithSortedExercises)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const getTemplate = useCallback(
    async (id: string): Promise<GroupTemplateWithExercises | null> => {
      const { data, error: fetchError } = await supabase
        .from('group_templates')
        .select(`
          *,
          exercises:group_template_exercises(
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
          (a: GroupTemplateExerciseWithDetails, b: GroupTemplateExerciseWithDetails) =>
            a.order_index - b.order_index
        ),
      }
    },
    []
  )

  const createTemplate = async (
    template: GroupTemplateInsert
  ): Promise<GroupTemplate | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Utente non autenticato')
      return null
    }

    const { data, error: insertError } = await supabase
      .from('group_templates')
      .insert({ ...template, user_id: user.id })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return null
    }

    await fetchTemplates()
    return data
  }

  const updateTemplate = async (
    id: string,
    updates: GroupTemplateUpdate
  ): Promise<GroupTemplate | null> => {
    const { data, error: updateError } = await supabase
      .from('group_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return null
    }

    await fetchTemplates()
    return data
  }

  const canDeleteTemplate = async (templateId: string): Promise<boolean> => {
    const { count, error: countError } = await supabase
      .from('session_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', templateId)

    if (countError) {
      setError(countError.message)
      return false
    }

    return count === 0
  }

  const deleteTemplate = async (id: string): Promise<boolean> => {
    // Check if template is in use by any session
    const canDelete = await canDeleteTemplate(id)
    if (!canDelete) {
      setError('Impossibile eliminare: il template è utilizzato in una o più sessioni')
      return false
    }

    const { error: deleteError } = await supabase
      .from('group_templates')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    setTemplates((prev) => prev.filter((t) => t.id !== id))
    return true
  }

  // Template Exercises CRUD

  const addExercise = async (
    exercise: GroupTemplateExerciseInsert
  ): Promise<GroupTemplateExercise | null> => {
    // Get current max order_index for this template
    const { data: existing } = await supabase
      .from('group_template_exercises')
      .select('order_index')
      .eq('template_id', exercise.template_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

    const { data, error: insertError } = await supabase
      .from('group_template_exercises')
      .insert({ ...exercise, order_index: exercise.order_index ?? nextOrder })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return null
    }

    await fetchTemplates()
    return data
  }

  const updateExercise = async (
    id: string,
    updates: GroupTemplateExerciseUpdate
  ): Promise<GroupTemplateExercise | null> => {
    const { data, error: updateError } = await supabase
      .from('group_template_exercises')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return null
    }

    await fetchTemplates()
    return data
  }

  const removeExercise = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('group_template_exercises')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    await fetchTemplates()
    return true
  }

  const reorderExercises = async (
    _templateId: string,
    exerciseIds: string[]
  ): Promise<boolean> => {
    // Update each exercise with new order_index
    const updates = exerciseIds.map((id, index) =>
      supabase
        .from('group_template_exercises')
        .update({ order_index: index })
        .eq('id', id)
    )

    const results = await Promise.all(updates)
    const hasError = results.some((r) => r.error)

    if (hasError) {
      setError('Errore nel riordinamento degli esercizi')
      return false
    }

    await fetchTemplates()
    return true
  }

  const applyTemplateToSession = async (
    sessionId: string,
    templateId: string,
    mode: 'add' | 'replace'
  ): Promise<boolean> => {
    // 1. Fetch template with exercises
    const template = await getTemplate(templateId)
    if (!template || !template.exercises?.length) {
      setError('Template non trovato o senza esercizi')
      return false
    }

    // 2. If mode is 'replace', delete existing group exercises
    if (mode === 'replace') {
      const { error: deleteError } = await supabase
        .from('session_exercises')
        .delete()
        .eq('session_id', sessionId)
        .eq('is_group', true)

      if (deleteError) {
        setError(deleteError.message)
        return false
      }
    }

    // 3. Get current max order_index for add mode
    const { data: existing } = await supabase
      .from('session_exercises')
      .select('order_index')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: false })
      .limit(1)

    const startIndex = mode === 'add' ? ((existing?.[0]?.order_index ?? -1) + 1) : 0

    // 4. Insert template exercises as session exercises with template_id link
    const exercisesToInsert = template.exercises.map((ex, idx) => ({
      session_id: sessionId,
      exercise_id: ex.exercise_id,
      template_id: templateId,  // CRITICAL: Link to template!
      order_index: startIndex + idx,
      sets: ex.sets,
      reps: ex.reps,
      weight_kg: ex.weight_kg,
      duration_seconds: ex.duration_seconds,
      notes: ex.notes,
      is_group: true,
      completed: false,
      skipped: false,
    }))

    const { error: insertError } = await supabase
      .from('session_exercises')
      .insert(exercisesToInsert)

    if (insertError) {
      setError(insertError.message)
      return false
    }

    return true
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    canDeleteTemplate,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
    applyTemplateToSession,
    refetch: fetchTemplates,
  }
}
