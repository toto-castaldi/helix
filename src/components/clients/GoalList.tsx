import { Target, Trash2, Edit2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { GoalHistory } from '@/types'

interface GoalListProps {
  goals: GoalHistory[]
  onEdit: (goal: GoalHistory) => void
  onDelete: (goal: GoalHistory) => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function GoalList({ goals, onEdit, onDelete }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nessun obiettivo definito.</p>
        <p className="text-sm">Aggiungi il primo obiettivo per questo cliente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {goals.map((goal, index) => {
        // Il primo obiettivo (più recente) è quello attivo
        const isActive = index === 0

        return (
          <Card key={goal.id} className={isActive ? 'border-primary' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`rounded-full p-2 ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                    {isActive ? (
                      <Target className="h-4 w-4 text-primary" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          Attivo
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {goal.goal}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(goal.started_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(goal)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(goal)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
