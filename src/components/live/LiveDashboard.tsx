import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LiveClientCard } from './LiveClientCard'
import type { SessionWithDetails, SessionExerciseUpdate, SessionExerciseWithDetails } from '@/types'

interface LiveDashboardProps {
  sessions: SessionWithDetails[]
  getCurrentExercise: (sessionId: string) => SessionExerciseWithDetails | null
  getNextExercise: (sessionId: string) => SessionExerciseWithDetails | null
  isSessionComplete: (sessionId: string) => boolean
  onUpdateExercise: (sessionId: string, exerciseId: string, updates: SessionExerciseUpdate) => void
  onCompleteExercise: (sessionId: string, exerciseId: string) => void
  onSkipExercise: (sessionId: string) => void
  onPreviousExercise: (sessionId: string) => void
  onFinishSession: (sessionId: string) => void
}

export function LiveDashboard({
  sessions,
  getCurrentExercise,
  getNextExercise,
  isSessionComplete,
  onUpdateExercise,
  onCompleteExercise,
  onSkipExercise,
  onPreviousExercise,
  onFinishSession,
}: LiveDashboardProps) {
  const [currentClientIndex, setCurrentClientIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const minSwipeDistance = 50

  // Handle touch events for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return

    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentClientIndex < sessions.length - 1) {
      setCurrentClientIndex((prev) => prev + 1)
    }
    if (isRightSwipe && currentClientIndex > 0) {
      setCurrentClientIndex((prev) => prev - 1)
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentClientIndex > 0) {
        setCurrentClientIndex((prev) => prev - 1)
      }
      if (e.key === 'ArrowRight' && currentClientIndex < sessions.length - 1) {
        setCurrentClientIndex((prev) => prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentClientIndex, sessions.length])

  const currentSession = sessions[currentClientIndex]
  if (!currentSession) return null

  return (
    <div className="h-full flex flex-col">
      {/* Client tabs/indicators */}
      {sessions.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-3 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentClientIndex === 0}
            onClick={() => setCurrentClientIndex((prev) => prev - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Dots indicator */}
          <div className="flex gap-2">
            {sessions.map((session, index) => (
              <button
                key={session.id}
                onClick={() => setCurrentClientIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentClientIndex
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                title={`${session.client?.first_name} ${session.client?.last_name}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentClientIndex === sessions.length - 1}
            onClick={() => setCurrentClientIndex((prev) => prev + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Swipeable area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="h-full flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentClientIndex * 100}%)` }}
        >
          {sessions.map((session) => {
            const exercise = getCurrentExercise(session.id)
            const next = getNextExercise(session.id)
            const complete = isSessionComplete(session.id)

            return (
              <div key={session.id} className="h-full w-full flex-shrink-0 p-4">
                <LiveClientCard
                  session={session}
                  currentExercise={exercise}
                  nextExercise={next}
                  isComplete={complete}
                  onUpdateExercise={(updates) =>
                    exercise && onUpdateExercise(session.id, exercise.id, updates)
                  }
                  onCompleteExercise={() =>
                    exercise && onCompleteExercise(session.id, exercise.id)
                  }
                  onSkipExercise={() => onSkipExercise(session.id)}
                  onPreviousExercise={() => onPreviousExercise(session.id)}
                  onFinishSession={() => onFinishSession(session.id)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Client name bar */}
      {sessions.length > 1 && (
        <div className="text-center py-2 text-sm text-muted-foreground border-t">
          {currentSession.client?.first_name} {currentSession.client?.last_name}
          <span className="ml-2 text-xs">
            ({currentClientIndex + 1}/{sessions.length})
          </span>
        </div>
      )}
    </div>
  )
}
