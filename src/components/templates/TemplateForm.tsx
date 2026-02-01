import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormActions } from '@/components/shared'
import { ExercisePicker } from '@/components/sessions/ExercisePicker'
import { TemplateExerciseCard, type TemplateExerciseLocal, type TemplateExerciseUpdate } from './TemplateExerciseCard'
import type { GroupTemplateWithExercises, ExerciseWithDetails } from '@/types'

// Generate a temporary ID for local state management
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface TemplateFormProps {
  template?: GroupTemplateWithExercises
  catalogExercises: ExerciseWithDetails[]
  onRefreshExercises?: () => void
  onSubmit: (name: string, exercises: TemplateExerciseLocal[]) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function TemplateForm({
  template,
  catalogExercises,
  onRefreshExercises,
  onSubmit,
  onCancel,
  isSubmitting,
}: TemplateFormProps) {
  const [name, setName] = useState(template?.name || '')
  const [exercises, setExercises] = useState<TemplateExerciseLocal[]>(() => {
    // Initialize from existing template exercises
    if (template?.exercises) {
      return template.exercises.map((e) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        exercise: e.exercise,
        sets: e.sets,
        reps: e.reps,
        weight_kg: e.weight_kg,
        duration_seconds: e.duration_seconds,
        notes: e.notes,
      }))
    }
    return []
  })
  const [showPicker, setShowPicker] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit(name.trim(), exercises)
  }

  const handleAddExercise = (exercise: ExerciseWithDetails) => {
    const newExercise: TemplateExerciseLocal = {
      id: generateTempId(),
      exercise_id: exercise.id,
      exercise,
      sets: null,
      reps: null,
      weight_kg: null,
      duration_seconds: null,
      notes: null,
    }
    setExercises([...exercises, newExercise])
    setShowPicker(false)
  }

  const handleUpdateExercise = (index: number, updates: TemplateExerciseUpdate) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    )
  }

  const handleChangeExercise = (index: number, newExercise: ExerciseWithDetails) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === index
          ? { ...ex, exercise_id: newExercise.id, exercise: newExercise }
          : ex
      )
    )
  }

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setExercises((prev) => {
      const newExercises = [...prev]
      ;[newExercises[index - 1], newExercises[index]] = [
        newExercises[index],
        newExercises[index - 1],
      ]
      return newExercises
    })
  }

  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return
    setExercises((prev) => {
      const newExercises = [...prev]
      ;[newExercises[index], newExercises[index + 1]] = [
        newExercises[index + 1],
        newExercises[index],
      ]
      return newExercises
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Name */}
      <div className="space-y-2">
        <Label htmlFor="template-name">Nome Template *</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es: Warm-up Pilates"
          required
          autoFocus
        />
      </div>

      {/* Exercise List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Esercizi ({exercises.length})</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPicker(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Esercizio
          </Button>
        </div>

        {exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nessun esercizio aggiunto. Clicca "Aggiungi Esercizio" per iniziare.
          </p>
        ) : (
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <TemplateExerciseCard
                key={exercise.id}
                exercise={exercise}
                index={index}
                isFirst={index === 0}
                isLast={index === exercises.length - 1}
                catalogExercises={catalogExercises}
                onRefreshExercises={onRefreshExercises}
                onUpdate={handleUpdateExercise}
                onChangeExercise={handleChangeExercise}
                onRemove={handleRemoveExercise}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}
          </div>
        )}
      </div>

      <FormActions
        isSubmitting={isSubmitting}
        isEditing={!!template}
        onCancel={onCancel}
        submitLabel="Salva Template"
      />

      {/* Exercise Picker Modal */}
      {showPicker && (
        <ExercisePicker
          exercises={catalogExercises}
          onSelect={handleAddExercise}
          onClose={() => setShowPicker(false)}
          onRefresh={onRefreshExercises}
          title="Aggiungi Esercizio al Template"
        />
      )}
    </form>
  )
}
