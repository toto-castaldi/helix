import { FileText, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LumioLocalCardWithRepository } from '@/types'

interface LumioCardPickerItemProps {
  card: LumioLocalCardWithRepository
  isSelected?: boolean
  onClick: () => void
}

function getDisplayTitle(card: LumioLocalCardWithRepository): string {
  if (card.title) return card.title
  // Extract filename from path
  const parts = card.file_path.split('/')
  const filename = parts[parts.length - 1]
  return filename.replace(/\.md$/, '')
}

function getContentPreview(content: string, maxLength = 100): string {
  // Remove markdown syntax for preview
  const cleaned = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*|__/g, '') // Remove bold
    .replace(/\*|_/g, '') // Remove italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()

  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength).trim() + '...'
}

export function LumioCardPickerItem({ card, isSelected, onClick }: LumioCardPickerItemProps) {
  const title = getDisplayTitle(card)
  const preview = getContentPreview(card.content)
  const tags = card.frontmatter?.tags || []
  const isUnavailable = !card.source_available

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-accent/50',
        isUnavailable && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'rounded-full p-2 shrink-0',
          isUnavailable ? 'bg-destructive/10' : 'bg-primary/10'
        )}>
          {isUnavailable ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <FileText className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{title}</span>
            {isUnavailable && (
              <Badge variant="destructive" className="text-xs">
                Non disponibile
              </Badge>
            )}
          </div>
          {card.repository && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {card.repository.name}
            </p>
          )}
          {preview && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {preview}
            </p>
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
    </button>
  )
}
