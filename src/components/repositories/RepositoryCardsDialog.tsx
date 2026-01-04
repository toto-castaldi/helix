import { useState, useEffect } from 'react'
import { X, FileText, AlertTriangle, Search, Eye, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared'
import { LumioLocalCardViewer } from '@/components/lumio/LumioLocalCardViewer'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { LumioRepository, LumioLocalCard, LumioLocalCardWithRepository } from '@/types'

interface RepositoryCardsDialogProps {
  repository: LumioRepository
  onClose: () => void
}

function getDisplayTitle(card: LumioLocalCard): string {
  if (card.title) return card.title
  const parts = card.file_path.split('/')
  const filename = parts[parts.length - 1]
  return filename.replace(/\.md$/, '')
}

function getContentPreview(content: string, maxLength = 100): string {
  const cleaned = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\*|_/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\n+/g, ' ')
    .trim()

  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength).trim() + '...'
}

export function RepositoryCardsDialog({ repository, onClose }: RepositoryCardsDialogProps) {
  const [cards, setCards] = useState<LumioLocalCard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingCard, setViewingCard] = useState<LumioLocalCard | null>(null)

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('lumio_cards')
        .select('*')
        .eq('repository_id', repository.id)
        .order('title', { ascending: true })

      if (!error && data) {
        setCards(data)
      }
      setLoading(false)
    }

    fetchCards()
  }, [repository.id])

  const filteredCards = cards.filter((card) => {
    if (!searchQuery.trim()) return true
    const title = getDisplayTitle(card).toLowerCase()
    const content = card.content.toLowerCase()
    const query = searchQuery.toLowerCase()
    return title.includes(query) || content.includes(query)
  })

  // Create card with repository for viewer
  const cardWithRepository: LumioLocalCardWithRepository | null = viewingCard
    ? { ...viewingCard, repository }
    : null

  // If viewing a card, show card detail view
  if (cardWithRepository) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingCard(null)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna all'elenco
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Card content */}
          <div className="flex-1 overflow-y-auto p-4">
            <LumioLocalCardViewer card={cardWithRepository} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Carte di {repository.name}</h2>
            <p className="text-sm text-muted-foreground">
              {cards.length} carte nel repository
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca carte..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <LoadingSpinner />
          ) : filteredCards.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {cards.length === 0
                ? 'Nessuna carta in questo repository'
                : 'Nessuna carta corrisponde alla ricerca'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCards.map((card) => {
                const title = getDisplayTitle(card)
                const preview = getContentPreview(card.content)
                const tags = (card.frontmatter as { tags?: string[] })?.tags || []
                const isUnavailable = !card.source_available

                return (
                  <div
                    key={card.id}
                    className={cn(
                      'p-3 rounded-lg border',
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="font-medium truncate">{title}</span>
                            {isUnavailable && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                Non disponibile
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingCard(card)}
                            className="shrink-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {card.file_path}
                        </p>
                        {preview && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {preview}
                          </p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 5).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {tags.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{tags.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
