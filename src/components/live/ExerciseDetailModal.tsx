import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LumioCardViewer } from '@/components/markdown/LumioCardViewer'
import { LumioLocalCardViewer } from '@/components/lumio'
import type { ExerciseWithDetails, LumioLocalCardWithRepository } from '@/types'

interface ExerciseDetailModalProps {
  exercise: ExerciseWithDetails
  onClose: () => void
}

export function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  const [cardError, setCardError] = useState(false)

  // Cast lumio_card to include repository data
  const lumioCard = exercise.lumio_card as LumioLocalCardWithRepository | null

  // Priority: lumioCard > card_url > local blocks
  const showLocalCard = !!lumioCard
  const showExternalCard = !showLocalCard && exercise.card_url && !cardError
  const showLocalBlocks = !showLocalCard && (!exercise.card_url || cardError)
  const showCardContent = showLocalCard || showExternalCard

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold truncate pr-4">{exercise.name}</h1>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {exercise.description && !showCardContent && (
          <p className="text-muted-foreground">{exercise.description}</p>
        )}

        {exercise.tags && exercise.tags.length > 0 && !showCardContent && (
          <div className="flex flex-wrap gap-2">
            {exercise.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Lumio Local Card View (highest priority) */}
        {showLocalCard && lumioCard && (
          <LumioLocalCardViewer card={lumioCard} />
        )}

        {/* Lumio External Card View (second priority) */}
        {showExternalCard && (
          <LumioCardViewer
            cardUrl={exercise.card_url!}
            onError={() => setCardError(true)}
          />
        )}

        {/* Local Blocks Fallback */}
        {showLocalBlocks && (
          <>
            {exercise.blocks && exercise.blocks.length > 0 ? (
              <div className="space-y-4">
                {cardError && (
                  <p className="text-sm text-muted-foreground italic">
                    Scheda esterna non disponibile. Mostrando blocchi locali.
                  </p>
                )}
                {exercise.blocks.map((block, index) => (
                  <Card key={block.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">
                          {index + 1}
                        </span>
                        Step {index + 1}
                      </div>

                      {block.image_url && (
                        <img
                          src={block.image_url}
                          alt={`Step ${index + 1}`}
                          className="w-full rounded-lg object-contain max-h-[70vh]"
                        />
                      )}

                      {block.description && (
                        <p className="text-sm">{block.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nessun blocco per questo esercizio
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
