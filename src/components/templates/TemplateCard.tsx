import { Card, CardContent } from '@/components/ui/card'
import { CardActions } from '@/components/shared'
import type { GroupTemplateWithExercises } from '@/types'

interface TemplateCardProps {
  template: GroupTemplateWithExercises
  onEdit: (template: GroupTemplateWithExercises) => void
  onDelete: (template: GroupTemplateWithExercises) => void
}

export function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const exercisePreview = template.exercises?.slice(0, 3).map(e => e.exercise?.name).filter(Boolean) || []
  const hasMore = (template.exercises?.length || 0) > 3

  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{template.name}</h3>
            {exercisePreview.length > 0 ? (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {exercisePreview.join(', ')}
                {hasMore && ` +${(template.exercises?.length || 0) - 3} altri`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1 italic">
                Nessun esercizio
              </p>
            )}
          </div>
          <CardActions
            onEdit={() => onEdit(template)}
            onDelete={() => onDelete(template)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
