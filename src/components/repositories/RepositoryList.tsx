import { EmptyState } from '@/components/shared'
import { RepositoryCard } from './RepositoryCard'
import type { LumioRepository } from '@/types'

interface RepositoryListProps {
  repositories: LumioRepository[]
  syncingId: string | null
  onEdit: (repository: LumioRepository) => void
  onDelete: (repository: LumioRepository) => void
  onSync: (repository: LumioRepository) => void
  onViewCards: (repository: LumioRepository) => void
}

export function RepositoryList({
  repositories,
  syncingId,
  onEdit,
  onDelete,
  onSync,
  onViewCards,
}: RepositoryListProps) {
  if (repositories.length === 0) {
    return (
      <EmptyState
        title="Nessun repository"
        description="Aggiungi un repository GitHub contenente carte Lumio per iniziare"
      />
    )
  }

  const totalCards = repositories.reduce((sum, repo) => sum + repo.cards_count, 0)

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {repositories.length} repository, {totalCards} carte totali
      </div>
      <div className="space-y-3">
        {repositories.map((repository) => (
          <RepositoryCard
            key={repository.id}
            repository={repository}
            onEdit={onEdit}
            onDelete={onDelete}
            onSync={onSync}
            onViewCards={onViewCards}
            isSyncing={syncingId === repository.id}
          />
        ))}
      </div>
    </div>
  )
}
