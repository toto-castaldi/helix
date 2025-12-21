import { Search, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFilteredExercises } from '@/hooks/useFilteredExercises'
import type { ExerciseWithDetails } from '@/types'

interface ExercisePickerProps {
  exercises: ExerciseWithDetails[]
  onSelect: (exercise: ExerciseWithDetails) => void
  onClose: () => void
}

export function ExercisePicker({ exercises, onSelect, onClose }: ExercisePickerProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    clearTags,
    allTags,
    filteredExercises,
  } = useFilteredExercises(exercises)

  return (
    <Card className="absolute inset-x-0 top-0 z-50 mx-4 mt-4 max-h-[80vh] overflow-hidden flex flex-col shadow-lg">
      <CardHeader className="pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Aggiungi Esercizio</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca esercizio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={clearTags}
              >
                Rimuovi filtri
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 pb-4">
        {filteredExercises.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {exercises.length === 0
              ? 'Nessun esercizio nel catalogo.'
              : 'Nessun esercizio corrisponde ai criteri di ricerca.'}
          </p>
        ) : (
          filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center justify-between p-3 rounded-md border hover:bg-accent cursor-pointer"
              onClick={() => onSelect(exercise)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{exercise.name}</p>
                {exercise.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {exercise.description}
                  </p>
                )}
                {exercise.tags && exercise.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {exercise.tags.map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">
                        {t.tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Plus className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
