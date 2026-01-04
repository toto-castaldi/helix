import { useState, useEffect, useMemo } from 'react'
import { X, Search, Filter, FolderGit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared'
import { LumioCardPickerItem } from './LumioCardPickerItem'
import { useLumioCards } from '@/hooks/useLumioCards'
import { useRepositories } from '@/hooks/useRepositories'
import type { LumioLocalCardWithRepository } from '@/types'

interface LumioCardPickerProps {
  onSelect: (card: LumioLocalCardWithRepository) => void
  onCancel: () => void
  selectedCardId?: string | null
  title?: string
}

export function LumioCardPicker({
  onSelect,
  onCancel,
  selectedCardId,
  title = 'Seleziona Carta Lumio',
}: LumioCardPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const { repositories, loading: reposLoading } = useRepositories()
  const { cards, loading: cardsLoading, getAllTags } = useLumioCards({
    repositoryId: selectedRepoId || undefined,
    onlyAvailable: false, // Show unavailable cards with warning
  })

  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    getAllTags().then(setAllTags)
  }, [getAllTags])

  // Filter cards by search query and tags
  const filteredCards = useMemo(() => {
    let filtered = cards

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((card) => {
        const title = card.title?.toLowerCase() || ''
        const content = card.content.toLowerCase()
        const path = card.file_path.toLowerCase()
        return title.includes(query) || content.includes(query) || path.includes(query)
      })
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((card) => {
        const cardTags = card.frontmatter?.tags || []
        return selectedTags.every((tag) => cardTags.includes(tag))
      })
    }

    return filtered
  }, [cards, searchQuery, selectedTags])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const clearFilters = () => {
    setSelectedRepoId(null)
    setSelectedTags([])
    setSearchQuery('')
  }

  const hasActiveFilters = selectedRepoId || selectedTags.length > 0

  const loading = reposLoading || cardsLoading

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">{title}</h1>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Search and filter bar */}
      <div className="p-4 border-b space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca carta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="space-y-3 pt-2">
            {/* Repository filter */}
            <div>
              <p className="text-sm font-medium mb-2">Repository</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedRepoId === null ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedRepoId(null)}
                >
                  Tutti
                </Badge>
                {repositories.map((repo) => (
                  <Badge
                    key={repo.id}
                    variant={selectedRepoId === repo.id ? 'default' : 'outline'}
                    className="cursor-pointer gap-1"
                    onClick={() => setSelectedRepoId(repo.id)}
                  >
                    <FolderGit2 className="h-3 w-3" />
                    {repo.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags filter */}
            {allTags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tag</p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Rimuovi filtri
              </Button>
            )}
          </div>
        )}

        {/* Active filters summary */}
        {!showFilters && hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {selectedRepoId && (
              <Badge variant="secondary" className="gap-1">
                <FolderGit2 className="h-3 w-3" />
                {repositories.find((r) => r.id === selectedRepoId)?.name}
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={() => setSelectedRepoId(null)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={() => toggleTag(tag)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <LoadingSpinner />
        ) : filteredCards.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {cards.length === 0
              ? 'Nessuna carta disponibile. Aggiungi un repository e sincronizzalo.'
              : 'Nessuna carta corrisponde ai criteri di ricerca.'}
          </p>
        ) : (
          filteredCards.map((card) => (
            <LumioCardPickerItem
              key={card.id}
              card={card}
              isSelected={card.id === selectedCardId}
              onClick={() => onSelect(card)}
            />
          ))
        )}
      </div>

      {/* Footer with count */}
      <div className="p-4 border-t bg-muted/50">
        <p className="text-sm text-muted-foreground text-center">
          {filteredCards.length} {filteredCards.length === 1 ? 'carta' : 'carte'} disponibili
        </p>
      </div>
    </div>
  )
}
