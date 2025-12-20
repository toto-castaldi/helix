import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { GoalHistory } from '@/types'

interface GoalFormProps {
  onSubmit: (goal: string, startedAt?: string) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  editingGoal?: GoalHistory | null
}

export function GoalForm({ onSubmit, onCancel, isSubmitting, editingGoal }: GoalFormProps) {
  const [goal, setGoal] = useState('')
  const [startedAt, setStartedAt] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingGoal) {
      setGoal(editingGoal.goal)
      setStartedAt(editingGoal.started_at.split('T')[0])
    } else {
      setGoal('')
      setStartedAt(new Date().toISOString().split('T')[0])
    }
  }, [editingGoal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!goal.trim()) {
      setError('Descrizione obiettivo obbligatoria')
      return
    }

    await onSubmit(goal.trim(), startedAt)
  }

  const isEditing = !!editingGoal

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal">Descrizione obiettivo *</Label>
        <Textarea
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Es: Perdere 5kg, Aumentare massa muscolare, Migliorare flessibilità..."
          rows={3}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="started_at">Data inizio</Label>
        <Input
          id="started_at"
          type="date"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Aggiungi Obiettivo'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </form>
  )
}
