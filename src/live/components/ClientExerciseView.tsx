import { useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { ExerciseCarousel } from './ExerciseCarousel'
import { Users, User } from 'lucide-react'
import type { SessionWithDetails, SessionExerciseWithDetails } from '@/shared/types'

interface ClientExerciseViewProps {
  session: SessionWithDetails
  onSelectExercise: (index: number) => void
  onUpdateExercise: (field: string, value: number | string | null) => void
}

export function ClientExerciseView({
  session,
  onSelectExercise,
  onUpdateExercise,
}: ClientExerciseViewProps) {
  // Filter exercises by is_group and track original indices
  const { individualExercises, groupExercises, individualIndices, groupIndices } = useMemo(() => {
    const exercises = session.exercises || []
    const individual: SessionExerciseWithDetails[] = []
    const group: SessionExerciseWithDetails[] = []
    const indivIdx: number[] = []
    const grpIdx: number[] = []

    exercises.forEach((ex, idx) => {
      if (ex.is_group) {
        group.push(ex)
        grpIdx.push(idx)
      } else {
        individual.push(ex)
        indivIdx.push(idx)
      }
    })

    return {
      individualExercises: individual,
      groupExercises: group,
      individualIndices: indivIdx,
      groupIndices: grpIdx,
    }
  }, [session.exercises])

  const currentExercise = session.exercises?.[session.current_exercise_index]

  // Check if current exercise is in individual or group tab
  const isCurrentIndividual = currentExercise && !currentExercise.is_group
  const defaultTab = isCurrentIndividual ? 'individual' : 'group'

  // Create index map functions for each tab
  const individualIndexMap = (localIndex: number) => individualIndices[localIndex]
  const groupIndexMap = (localIndex: number) => groupIndices[localIndex]

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue={defaultTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="bg-gray-800 border border-gray-700 shrink-0 mx-4 mb-2">
          <TabsTrigger
            value="individual"
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-300 gap-2"
          >
            <User className="w-4 h-4" />
            I miei
            <Badge variant="secondary" className="ml-1 bg-gray-700 text-gray-200">
              {individualExercises.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="group"
            className="data-[state=active]:bg-primary data-[state=active]:text-white text-gray-300 gap-2"
          >
            <Users className="w-4 h-4" />
            Gruppo
            <Badge variant="secondary" className="ml-1 bg-gray-700 text-gray-200">
              {groupExercises.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="flex-1 min-h-0 mt-0 h-full">
          {individualExercises.length > 0 ? (
            <div className="h-full">
              <ExerciseCarousel
                session={session}
                exercises={individualExercises}
                indexMap={individualIndexMap}
                onSelectExercise={onSelectExercise}
                onUpdateExercise={onUpdateExercise}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-lg">Nessun esercizio individuale</p>
                <p className="text-sm mt-2">Gli esercizi personali appariranno qui</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="group" className="flex-1 min-h-0 mt-0 h-full">
          {groupExercises.length > 0 ? (
            <div className="h-full">
              <ExerciseCarousel
                session={session}
                exercises={groupExercises}
                indexMap={groupIndexMap}
                onSelectExercise={onSelectExercise}
                onUpdateExercise={onUpdateExercise}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-lg">Nessun esercizio di gruppo</p>
                <p className="text-sm mt-2">Gli esercizi di gruppo appariranno qui</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
