import { useEffect } from 'react'
import { RepositoryForm, RepositoryList } from '@/components/repositories'
import {
  LoadingSpinner,
  ErrorAlert,
  DeleteConfirmDialog,
  FormCard,
  PageHeader,
} from '@/components/shared'
import { useRepositories } from '@/hooks/useRepositories'
import { useEntityPage } from '@/hooks/useEntityPage'
import type { LumioRepository, LumioRepositoryInsert } from '@/types'

export function Repositories() {
  const {
    repositories,
    loading,
    error,
    syncing,
    createRepository,
    updateRepository,
    deleteRepository,
    syncRepository,
    refetch,
  } = useRepositories()

  const {
    showForm,
    editingItem,
    isSubmitting,
    deleteConfirm,
    isFormVisible,
    openCreateForm,
    openEditForm,
    closeForm,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useEntityPage<LumioRepository>()

  // Polling for sync status updates when any repo is syncing
  useEffect(() => {
    const hasSyncingRepo = repositories.some((repo) => repo.sync_status === 'syncing')
    if (!hasSyncingRepo) return

    const interval = setInterval(() => {
      refetch()
    }, 5000)

    return () => clearInterval(interval)
  }, [repositories, refetch])

  const onSubmitCreate = async (data: LumioRepositoryInsert) => {
    const result = await handleCreate(createRepository, data)
    // Auto-sync after creation
    if (result) {
      syncRepository(result.id)
    }
  }

  const onSubmitUpdate = async (data: LumioRepositoryInsert) => {
    await handleUpdate(updateRepository, data)
  }

  const onConfirmDelete = async () => {
    await handleDelete(deleteRepository)
  }

  const onSync = (repository: LumioRepository) => {
    syncRepository(repository.id)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repository Lumio"
        showAddButton={!isFormVisible}
        addButtonLabel="Aggiungi"
        onAdd={openCreateForm}
      />

      {error && <ErrorAlert message={error} />}

      {showForm && (
        <FormCard title="Nuovo Repository" onClose={closeForm}>
          <RepositoryForm
            onSubmit={onSubmitCreate}
            onCancel={closeForm}
            isSubmitting={isSubmitting}
          />
        </FormCard>
      )}

      {editingItem && (
        <FormCard title="Modifica Repository" onClose={closeForm}>
          <RepositoryForm
            repository={editingItem}
            onSubmit={onSubmitUpdate}
            onCancel={closeForm}
            isSubmitting={isSubmitting}
          />
        </FormCard>
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          itemName={deleteConfirm.name}
          onConfirm={onConfirmDelete}
          onCancel={closeDeleteConfirm}
        />
      )}

      {!isFormVisible && (
        <RepositoryList
          repositories={repositories}
          syncingId={syncing}
          onEdit={openEditForm}
          onDelete={openDeleteConfirm}
          onSync={onSync}
        />
      )}
    </div>
  )
}
