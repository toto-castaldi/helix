import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { ParameterControl } from './ParameterControl'
import { cn } from '@/shared/lib/utils'
import type { SessionExerciseWithDetails } from '@/shared/types'
import { Check, SkipForward } from 'lucide-react'

interface ExerciseCardProps {
  exercise: SessionExerciseWithDetails
  isCurrentExercise: boolean
  onClick?: () => void
  onUpdateSets?: (value: number | null) => void
  onUpdateReps?: (value: number | null) => void
  onUpdateWeight?: (value: number | null) => void
  onUpdateDuration?: (value: number | null) => void
}

export function ExerciseCard({
  exercise,
  isCurrentExercise,
  onClick,
  onUpdateSets,
  onUpdateReps,
  onUpdateWeight,
  onUpdateDuration,
}: ExerciseCardProps) {
  const exerciseInfo = exercise.exercise
  const isCompleted = exercise.completed
  const isSkipped = exercise.skipped

  return (
    <Card
      className={cn(
        'bg-gray-800 border-gray-700 transition-all cursor-pointer w-[320px] h-full flex flex-col',
        isCurrentExercise && 'ring-2 ring-primary',
        isCompleted && 'opacity-60 bg-green-900/20',
        isSkipped && 'opacity-60 bg-yellow-900/20',
        !isCurrentExercise && 'hover:bg-gray-750'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col h-full">
        {/* Header - Nome e Badge */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white truncate flex-1">
            {exerciseInfo?.name || 'Esercizio'}
          </h3>
          {isCompleted && (
            <Badge className="bg-green-600 ml-2 flex-shrink-0">
              <Check className="w-3 h-3 mr-1" />
              OK
            </Badge>
          )}
          {isSkipped && (
            <Badge variant="secondary" className="ml-2 flex-shrink-0">
              <SkipForward className="w-3 h-3 mr-1" />
              SKIP
            </Badge>
          )}
        </div>

        {/* Descrizione - Altezza fissa */}
        <div className="h-[60px] mt-2">
          {exerciseInfo?.description ? (
            <p className="text-sm text-gray-400 line-clamp-3">
              {exerciseInfo.description}
            </p>
          ) : (
            <div /> // Spazio vuoto
          )}
        </div>

        {/* Parametri - Flex grow per riempire spazio */}
        <div className="flex-1 flex flex-col justify-center gap-4 mt-4">
          {/* Riga 1: Serie e Reps */}
          <div className="grid grid-cols-2 gap-4">
            <ParameterControl
              label="Serie"
              value={exercise.sets}
              onChange={isCurrentExercise ? onUpdateSets : undefined}
              readOnly={!isCurrentExercise}
              min={1}
              max={20}
            />
            <ParameterControl
              label="Reps"
              value={exercise.reps}
              onChange={isCurrentExercise ? onUpdateReps : undefined}
              readOnly={!isCurrentExercise}
              min={1}
              max={100}
            />
          </div>

          {/* Riga 2: Peso e Durata */}
          <div className="grid grid-cols-2 gap-4">
            <ParameterControl
              label="Peso"
              value={exercise.weight_kg}
              unit="kg"
              onChange={isCurrentExercise ? onUpdateWeight : undefined}
              readOnly={!isCurrentExercise}
              min={0}
              max={500}
              step={0.5}
            />
            <ParameterControl
              label="Durata"
              value={exercise.duration_seconds}
              unit="s"
              onChange={isCurrentExercise ? onUpdateDuration : undefined}
              readOnly={!isCurrentExercise}
              min={0}
              max={3600}
              step={10}
            />
          </div>
        </div>

        {/* Note - Altezza fissa in fondo */}
        <div className="h-[40px] mt-4">
          {exercise.notes ? (
            <p className="text-xs text-gray-500 italic line-clamp-2">
              {exercise.notes}
            </p>
          ) : (
            <div /> // Spazio vuoto
          )}
        </div>
      </CardContent>
    </Card>
  )
}
