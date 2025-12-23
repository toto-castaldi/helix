import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LiveExerciseControl } from './LiveExerciseControl'
import type { SessionWithDetails, SessionExerciseUpdate, SessionExerciseWithDetails } from '@/types'

interface LiveClientCardProps {
  session: SessionWithDetails
  currentExercise: SessionExerciseWithDetails | null
  nextExercise: SessionExerciseWithDetails | null
  isComplete: boolean
  onUpdateExercise: (updates: SessionExerciseUpdate) => void
  onCompleteExercise: () => void
  onSkipExercise: () => void
  onPreviousExercise: () => void
  onFinishSession: () => void
}

export function LiveClientCard({
  session,
  currentExercise,
  nextExercise,
  isComplete,
  onUpdateExercise,
  onCompleteExercise,
  onSkipExercise,
  onPreviousExercise,
  onFinishSession,
}: LiveClientCardProps) {
  const totalExercises = session.exercises?.length || 0
  const currentIndex = session.current_exercise_index
  const progressPercent = totalExercises > 0 ? (currentIndex / totalExercises) * 100 : 0

  const formatExercisePreview = (exercise: SessionExerciseWithDetails): string => {
    const parts: string[] = []
    if (exercise.sets) parts.push(`${exercise.sets}x`)
    if (exercise.reps) parts.push(`${exercise.reps}`)
    if (exercise.weight_kg) parts.push(`${exercise.weight_kg}kg`)
    if (exercise.duration_seconds) {
      const mins = Math.floor(exercise.duration_seconds / 60)
      const secs = exercise.duration_seconds % 60
      parts.push(mins > 0 ? `${mins}m${secs > 0 ? ` ${secs}s` : ''}` : `${secs}s`)
    }
    return parts.join(' ')
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        {/* Client name */}
        <CardTitle className="text-xl">
          {session.client?.first_name} {session.client?.last_name}
        </CardTitle>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progresso</span>
            <span>{currentIndex}/{totalExercises}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {isComplete ? (
          /* Session complete state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div>
              <h3 className="text-xl font-semibold">Sessione Completata!</h3>
              <p className="text-muted-foreground">
                Tutti gli esercizi sono stati eseguiti
              </p>
            </div>
            <Button
              size="lg"
              onClick={onFinishSession}
              className="mt-4"
            >
              Chiudi Sessione
            </Button>
          </div>
        ) : currentExercise ? (
          <>
            {/* Current exercise controls */}
            <LiveExerciseControl
              exercise={currentExercise}
              onUpdate={onUpdateExercise}
              onComplete={onCompleteExercise}
              onSkip={onSkipExercise}
            />

            {/* Next exercise preview */}
            {nextExercise && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Prossimo
                </p>
                <p className="font-medium">{nextExercise.exercise?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatExercisePreview(nextExercise)}
                </p>
              </div>
            )}

            {/* Navigation between exercises */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentIndex === 0}
                onClick={onPreviousExercise}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Precedente
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {totalExercises}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!nextExercise}
                onClick={onSkipExercise}
              >
                Successivo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        ) : (
          /* No exercises state */
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <p>Nessun esercizio in questa sessione</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
