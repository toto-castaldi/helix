import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Users, CheckCircle2, ArrowLeft, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LiveDashboard } from '@/components/live'
import { useLiveCoaching } from '@/hooks/useLiveCoaching'

type Step = 'select-date' | 'live' | 'summary'

export function LiveCoaching() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('select-date')
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0]
  })

  const {
    sessions,
    loading,
    error,
    fetchSessionsForDate,
    updateExerciseOnTheFly,
    completeExercise,
    skipExercise,
    finishSession,
    finishAllSessions,
    replanSession,
    getCurrentExercise,
    isSessionComplete,
  } = useLiveCoaching()

  // Fetch sessions when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchSessionsForDate(selectedDate)
    }
  }, [selectedDate, fetchSessionsForDate])

  const handleStartSession = async () => {
    if (plannedSessions.length > 0) {
      // Reset all planned sessions to start from beginning
      for (const session of plannedSessions) {
        if (session.current_exercise_index > 0) {
          await replanSession(session.id)
        }
      }
      setStep('live')
    }
  }

  const handleFinishAll = async () => {
    await finishAllSessions()
    setStep('summary')
  }

  const handleBackToSessions = () => {
    navigate('/sessions')
  }

  const completedSessions = sessions.filter((s) => s.status === 'completed')
  const plannedSessions = sessions.filter((s) => s.status === 'planned')
  const allComplete = plannedSessions.length === 0 && completedSessions.length > 0

  // Step 1: Select Date
  if (step === 'select-date') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Live Coaching</h1>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seleziona Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data Allenamento</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-lg"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : sessions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {plannedSessions.length} sessioni pianificate
                    {completedSessions.length > 0 &&
                      `, ${completedSessions.length} completate`}
                  </span>
                </div>

                {/* Client list - show planned first, then completed */}
                <div className="space-y-2">
                  {[...plannedSessions, ...completedSessions].map((session, index) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {session.client?.first_name} {session.client?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.exercises?.length || 0} esercizi
                          {session.gym && ` @ ${session.gym.name}`}
                        </p>
                      </div>
                      {session.status === 'completed' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => replanSession(session.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {index + 1}° cliente
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {plannedSessions.length > 0 && (
                  <Button
                    className="w-full h-12 text-lg"
                    onClick={handleStartSession}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Inizia Lezione ({plannedSessions.length} clienti)
                  </Button>
                )}

                {allComplete && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-lg font-medium">Tutte le sessioni completate!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna sessione per questa data.</p>
                <p className="text-sm">Seleziona un'altra data o pianifica nuove sessioni.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 2: Live Dashboard
  if (step === 'live') {
    const activeSessions = sessions.filter((s) => s.status === 'planned')

    // If all sessions completed during live, go directly to summary
    if (activeSessions.length === 0) {
      setStep('summary')
      return null
    }

    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col -mx-4 -mt-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <Button variant="ghost" size="sm" onClick={() => setStep('select-date')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Esci
          </Button>
          <h1 className="font-semibold">
            {new Date(selectedDate).toLocaleDateString('it-IT', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </h1>
          <Button size="sm" variant="outline" onClick={handleFinishAll}>
            Termina Tutto
          </Button>
        </div>

        {/* Dashboard */}
        <div className="flex-1 overflow-hidden">
          <LiveDashboard
            key={selectedDate}
            sessions={activeSessions}
            getCurrentExercise={getCurrentExercise}
            isSessionComplete={isSessionComplete}
            onUpdateExercise={updateExerciseOnTheFly}
            onCompleteExercise={completeExercise}
            onSkipExercise={skipExercise}
            onFinishSession={finishSession}
          />
        </div>
      </div>
    )
  }

  // Step 3: Summary
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setStep('select-date')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Riepilogo Lezione</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Sessioni Completate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {completedSessions.length > 0 ? (
            completedSessions.map((session) => {
              const completedExercises = session.exercises?.filter((e) => e.completed).length || 0
              const totalExercises = session.exercises?.length || 0

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {session.client?.first_name} {session.client?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {completedExercises}/{totalExercises} esercizi completati
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              )
            })
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nessuna sessione completata.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setStep('select-date')}>
          Nuova Lezione
        </Button>
        <Button className="flex-1" onClick={handleBackToSessions}>
          Torna alle Sessioni
        </Button>
      </div>
    </div>
  )
}
