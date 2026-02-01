import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PageHeader,
  FormCard,
  DeleteConfirmDialog,
  LoadingSpinner,
  ErrorAlert,
} from '@/components/shared'
import { TemplateList } from './TemplateList'
import { TemplateForm } from './TemplateForm'
import { type TemplateExerciseLocal } from './TemplateExerciseCard'
import { useGroupTemplates } from '@/hooks/useGroupTemplates'
import { useExercises } from '@/hooks/useExercises'
import type { GroupTemplateWithExercises } from '@/types'

interface TemplateManagerProps {
  onClose: () => void
}

export function TemplateManager({ onClose }: TemplateManagerProps) {
  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    addExercise,
    updateExercise,
    removeExercise,
    reorderExercises,
    refetch,
  } = useGroupTemplates()

  const { exercises: catalogExercises, refetch: refetchExercises } = useExercises()

  // CRUD state
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<GroupTemplateWithExercises | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<GroupTemplateWithExercises | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = () => {
    setEditingTemplate(null)
    setShowForm(true)
  }

  const handleEdit = (template: GroupTemplateWithExercises) => {
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingTemplate(null)
  }

  const handleSubmit = async (name: string, exercises: TemplateExerciseLocal[]) => {
    setIsSubmitting(true)

    try {
      if (editingTemplate) {
        // Update existing template
        await updateTemplate(editingTemplate.id, { name })

        // Get existing exercise IDs
        const existingExerciseIds = new Set(
          editingTemplate.exercises?.map((e) => e.id) || []
        )

        // Determine which exercises are new, updated, or removed
        const newExercises: TemplateExerciseLocal[] = []
        const updatedExercises: TemplateExerciseLocal[] = []
        const currentIds = new Set<string>()

        for (const ex of exercises) {
          if (ex.id.startsWith('temp-')) {
            newExercises.push(ex)
          } else {
            updatedExercises.push(ex)
            currentIds.add(ex.id)
          }
        }

        // Find removed exercises
        const removedIds = Array.from(existingExerciseIds).filter(
          (id) => !currentIds.has(id)
        )

        // Remove deleted exercises
        for (const id of removedIds) {
          await removeExercise(id)
        }

        // Add new exercises
        for (let i = 0; i < newExercises.length; i++) {
          const ex = newExercises[i]
          await addExercise({
            template_id: editingTemplate.id,
            exercise_id: ex.exercise_id,
            order_index: exercises.findIndex((e) => e.id === ex.id),
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg,
            duration_seconds: ex.duration_seconds,
            notes: ex.notes,
          })
        }

        // Update existing exercises
        for (const ex of updatedExercises) {
          const original = editingTemplate.exercises?.find((e) => e.id === ex.id)
          if (original) {
            await updateExercise(ex.id, {
              exercise_id: ex.exercise_id,
              sets: ex.sets,
              reps: ex.reps,
              weight_kg: ex.weight_kg,
              duration_seconds: ex.duration_seconds,
              notes: ex.notes,
            })
          }
        }

        // Reorder all exercises
        const orderedIds = exercises
          .map((ex) => {
            if (ex.id.startsWith('temp-')) {
              // We need to find the new ID after adding - refetch will handle this
              return null
            }
            return ex.id
          })
          .filter((id): id is string => id !== null)

        if (orderedIds.length > 0) {
          await reorderExercises(editingTemplate.id, orderedIds)
        }
      } else {
        // Create new template
        const template = await createTemplate({ name })
        if (template) {
          // Add exercises to the new template
          for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i]
            await addExercise({
              template_id: template.id,
              exercise_id: ex.exercise_id,
              order_index: i,
              sets: ex.sets,
              reps: ex.reps,
              weight_kg: ex.weight_kg,
              duration_seconds: ex.duration_seconds,
              notes: ex.notes,
            })
          }
        }
      }

      await refetch()
      setShowForm(false)
      setEditingTemplate(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    const success = await deleteTemplate(deleteConfirm.id)
    if (success) {
      setDeleteConfirm(null)
    }
    // If not successful, error is set in the hook and will show via ErrorAlert
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold">Template di Gruppo</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with title and close button */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">Template di Gruppo</h1>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error display */}
        {error && <ErrorAlert message={error} />}

        {/* Page Header with New button when not showing form */}
        {!showForm && (
          <div className="mb-4">
            <PageHeader title="">
              <Button size="sm" onClick={handleCreate}>
                Nuovo
              </Button>
            </PageHeader>
          </div>
        )}

        {/* Form when creating/editing */}
        {showForm && (
          <FormCard
            title={editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
            onClose={handleCancelForm}
          >
            <TemplateForm
              template={editingTemplate || undefined}
              catalogExercises={catalogExercises}
              onRefreshExercises={refetchExercises}
              onSubmit={handleSubmit}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting}
            />
          </FormCard>
        )}

        {/* Delete confirm dialog */}
        {deleteConfirm && (
          <DeleteConfirmDialog
            itemName={`template "${deleteConfirm.name}"`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}

        {/* Template list when not showing form */}
        {!showForm && (
          <TemplateList
            templates={templates}
            onEdit={handleEdit}
            onDelete={setDeleteConfirm}
          />
        )}
      </div>
    </div>
  )
}
