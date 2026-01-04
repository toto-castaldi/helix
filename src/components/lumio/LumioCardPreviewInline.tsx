import { FileText, AlertTriangle, Eye, X, FolderGit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { LumioLocalCardWithRepository } from '@/types'

interface LumioCardPreviewInlineProps {
  card: LumioLocalCardWithRepository
  onView?: () => void
  onRemove?: () => void
  className?: string
}

function getDisplayTitle(card: LumioLocalCardWithRepository): string {
  if (card.title) return card.title
  const parts = card.file_path.split('/')
  const filename = parts[parts.length - 1]
  return filename.replace(/\.md$/, '')
}

export function LumioCardPreviewInline({
  card,
  onView,
  onRemove,
  className,
}: LumioCardPreviewInlineProps) {
  const title = getDisplayTitle(card)
  const tags = card.frontmatter?.tags || []
  const isUnavailable = !card.source_available

  return (
    <Card className={className}>
      <CardContent className="p-3">
        {isUnavailable && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-2 p-2 bg-destructive/10 rounded">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Sorgente non disponibile nel repository</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{title}</p>
            {card.repository && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <FolderGit2 className="h-3 w-3" />
                <span className="truncate">{card.repository.name}</span>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          {onView && (
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              Visualizza
            </Button>
          )}
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <X className="h-4 w-4 mr-1" />
              Rimuovi
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
