import { useRef, useState, useMemo } from 'react'
import { ExerciseCard } from './ExerciseCard'
import type { SessionWithDetails, SessionExerciseWithDetails } from '@/shared/types'
import { cn } from '@/shared/lib/utils'

interface ExerciseCarouselProps {
  session: SessionWithDetails
  onSelectExercise: (index: number) => void
  onUpdateExercise: (field: string, value: number | string | null) => void
  // Optional: for filtered exercise views
  exercises?: SessionExerciseWithDetails[]
  currentIndex?: number
  indexMap?: (localIndex: number) => number
  // Reset trigger - increment to reset manual navigation
  resetTrigger?: number
}

export function ExerciseCarousel({
  session,
  onSelectExercise,
  onUpdateExercise,
  exercises: exercisesProp,
  currentIndex: currentIndexProp,
  indexMap,
  resetTrigger,
}: ExerciseCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [manualIndex, setManualIndex] = useState<number | null>(null)

  // Reset manual index when resetTrigger changes
  useMemo(() => {
    if (resetTrigger !== undefined) {
      setManualIndex(null)
    }
  }, [resetTrigger])

  // Use provided exercises or fall back to session exercises
  const exercises = exercisesProp || session.exercises || []

  // For filtered views, find the first non-completed/non-skipped exercise
  const autoCurrentIndex = useMemo(() => {
    if (!exercisesProp) {
      return session.current_exercise_index
    }
    // Find first incomplete exercise in filtered list
    const firstIncomplete = exercises.findIndex(ex => !ex.completed && !ex.skipped)
    if (firstIncomplete !== -1) {
      return firstIncomplete
    }
    // All done - show last one
    return Math.max(0, exercises.length - 1)
  }, [exercisesProp, exercises, session.current_exercise_index])

  // Use provided currentIndex, manual selection, auto-computed, or session index
  const currentIndex = currentIndexProp !== undefined
    ? currentIndexProp
    : manualIndex !== null
      ? manualIndex
      : autoCurrentIndex

  // Reset manual index when exercises change (e.g., after complete/skip)
  // This allows auto-advance to take over
  const exercisesKey = exercises.map(e => `${e.id}-${e.completed}-${e.skipped}`).join(',')
  useMemo(() => {
    setManualIndex(null)
  }, [exercisesKey])

  // Map local index to global index when calling onSelectExercise
  const handleSelectExercise = (idx: number) => {
    if (exercisesProp) {
      setManualIndex(idx)
    }
    const globalIndex = indexMap ? indexMap(idx) : idx
    onSelectExercise(globalIndex)
  }

  // Swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < exercises.length - 1) {
      // Swipe left = next exercise
      handleSelectExercise(currentIndex + 1)
    } else if (isRightSwipe && currentIndex > 0) {
      // Swipe right = previous exercise
      handleSelectExercise(currentIndex - 1)
    }
  }

  if (exercises.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Nessun esercizio in questa sessione</p>
      </div>
    )
  }

  // Get the 3 exercises to display: previous, current, next
  const prevExercise = currentIndex > 0 ? exercises[currentIndex - 1] : null
  const currentExercise = exercises[currentIndex]
  const nextExercise = currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-2 shrink-0">
        {exercises.map((ex, index) => (
          <button
            key={ex.id}
            onClick={() => handleSelectExercise(index)}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all',
              index === currentIndex
                ? 'bg-amber-400 w-6'
                : ex.completed
                ? 'bg-emerald-400'
                : ex.skipped
                ? 'bg-amber-500'
                : 'bg-white/40'
            )}
          />
        ))}
      </div>

      {/* Cards container - 3 columns grid */}
      <div
        ref={containerRef}
        className="flex-1 grid grid-cols-3 gap-2 px-2 min-h-0 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Previous exercise (left) */}
        <div className="flex justify-end h-full min-h-0">
          {prevExercise ? (
            <ExerciseCard
              exercise={prevExercise}
              isCurrentExercise={false}
              onClick={() => handleSelectExercise(currentIndex - 1)}
            />
          ) : (
            <div className="w-[320px]" /> // Empty space
          )}
        </div>

        {/* Current exercise (center) */}
        <div className="flex justify-center h-full min-h-0">
          <ExerciseCard
            exercise={currentExercise}
            isCurrentExercise={true}
            onUpdateSets={(value) => onUpdateExercise('sets', value)}
            onUpdateReps={(value) => onUpdateExercise('reps', value)}
            onUpdateWeight={(value) => onUpdateExercise('weight_kg', value)}
            onUpdateDuration={(value) => onUpdateExercise('duration_seconds', value)}
            onUpdateNotes={(value) => onUpdateExercise('notes', value)}
          />
        </div>

        {/* Next exercise (right) */}
        <div className="flex justify-start h-full min-h-0">
          {nextExercise ? (
            <ExerciseCard
              exercise={nextExercise}
              isCurrentExercise={false}
              onClick={() => handleSelectExercise(currentIndex + 1)}
            />
          ) : (
            <div className="w-[320px]" /> // Empty space
          )}
        </div>
      </div>

    </div>
  )
}
