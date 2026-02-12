import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Textarea } from '@/shared/components/ui/textarea'
import { ParameterControl } from './ParameterControl'
import { ImageGallery } from './ImageGallery'
import { cn } from '@/shared/lib/utils'
import type { SessionExerciseWithDetails, LumioLocalCardWithImages } from '@/shared/types'
import { Check, SkipForward, Users, ImageOff } from 'lucide-react'

interface ExerciseCardProps {
  exercise: SessionExerciseWithDetails
  isCurrentExercise: boolean
  onClick?: () => void
  onUpdateSets?: (value: number | null) => void
  onUpdateReps?: (value: number | null) => void
  onUpdateWeight?: (value: number | null) => void
  onUpdateDuration?: (value: number | null) => void
  onUpdateNotes?: (value: string) => void
}

export function ExerciseCard({
  exercise,
  isCurrentExercise,
  onClick,
  onUpdateSets,
  onUpdateReps,
  onUpdateWeight,
  onUpdateDuration,
  onUpdateNotes,
}: ExerciseCardProps) {
  const exerciseInfo = exercise.exercise
  const isCompleted = exercise.completed
  const isSkipped = exercise.skipped

  // Check for Lumio card images
  const lumioCard = exerciseInfo?.lumio_card as LumioLocalCardWithImages | null | undefined
  const lumioImages = lumioCard?.images || []
  const hasImages = lumioImages.length > 0

  // DEBUG
  console.log(`[ExerciseCard] ${exerciseInfo?.name}: lumio_card=${!!lumioCard}, images=${lumioImages.length}, hasImages=${hasImages}`, { lumioCard, lumioImages })

  // Determina lo stato dell'esercizio
  const getCardStyles = () => {
    if (isCompleted) {
      // Completato - verde
      return 'bg-emerald-900/30 border-emerald-600 border-2'
    }
    if (isSkipped) {
      // Saltato - ambra
      return 'bg-amber-900/30 border-amber-600 border-2'
    }
    if (isCurrentExercise) {
      // Corrente - stesso sfondo, nessun bordo speciale
      return 'bg-gray-800 border-gray-700'
    }
    // Da fare - neutro
    return 'bg-gray-800 border-gray-700'
  }

  // Title + badges section (shared between both layouts)
  const titleSection = (
    <div className="flex items-start justify-between">
      <h3 className={cn(
        'text-xl font-bold text-white flex-1',
        hasImages ? 'line-clamp-2' : 'line-clamp-3'
      )}>
        {exerciseInfo?.name || 'Esercizio'}
      </h3>
      {exercise.is_group && (
        <Badge className="bg-violet-600 ml-2 flex-shrink-0 p-1">
          <Users className="w-4 h-4" />
        </Badge>
      )}
      {isCompleted && (
        <Badge className="bg-emerald-600 ml-2 flex-shrink-0 p-1">
          <Check className="w-4 h-4" />
        </Badge>
      )}
      {isSkipped && (
        <Badge className="bg-amber-600 ml-2 flex-shrink-0 p-1">
          <SkipForward className="w-4 h-4" />
        </Badge>
      )}
    </div>
  )

  // Parameters section (shared between both layouts)
  const parametersSection = (
    <>
      <div className="grid grid-cols-2 gap-2">
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
      <div className="mt-2 grid grid-cols-2 gap-2">
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
    </>
  )

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer w-[320px] h-full overflow-hidden',
        getCardStyles(),
        !isCurrentExercise && !isCompleted && !isSkipped && 'hover:bg-gray-750'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 h-full flex flex-col">
        {/* Unified layout: Title 15% -> Image/Placeholder 40% -> Notes 20% -> Parameters 25% */}

        {/* 1. Title - 15% */}
        <div className="h-[15%] overflow-hidden">
          {titleSection}
        </div>

        {/* 2. Image gallery or placeholder - 40% */}
        <div className="h-[40%] overflow-hidden">
          {hasImages ? (
            <ImageGallery
              images={lumioImages}
              maxHeight="100%"
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-700/50 rounded-lg">
              <ImageOff className="w-10 h-10 text-gray-600" />
            </div>
          )}
        </div>

        {/* 3. Notes - 20% */}
        <div className="h-[20%] overflow-hidden mt-2">
          {isCurrentExercise ? (
            <Textarea
              value={exercise.notes || ''}
              onChange={(e) => onUpdateNotes?.(e.target.value)}
              placeholder="Note..."
              className="h-full w-full resize-none bg-gray-700 border-gray-600 text-white text-xs"
            />
          ) : (
            <p className="text-xs text-gray-500 italic line-clamp-2">
              {exercise.notes || '\u00A0'}
            </p>
          )}
        </div>

        {/* 4. Parameters - 25% */}
        <div className="h-[25%] flex flex-col justify-center">
          {parametersSection}
        </div>
      </CardContent>
    </Card>
  )
}
