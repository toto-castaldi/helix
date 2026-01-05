import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { LumioRepository, LumioRepositoryInsert, LumioRepositoryUpdate } from '@/types'

export function useRepositories() {
  const [repositories, setRepositories] = useState<LumioRepository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null) // repository id being synced

  const fetchRepositories = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('lumio_repositories')
      .select('*')
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setRepositories(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRepositories()
  }, [fetchRepositories])

  const createRepository = async (repo: LumioRepositoryInsert): Promise<LumioRepository | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Utente non autenticato')
      return null
    }

    const { data, error: insertError } = await supabase
      .from('lumio_repositories')
      .insert({
        ...repo,
        user_id: user.id,
        sync_status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return null
    }

    setRepositories((prev) => [...prev, data].sort((a, b) =>
      a.name.localeCompare(b.name)
    ))
    return data
  }

  const updateRepository = async (id: string, updates: LumioRepositoryUpdate): Promise<LumioRepository | null> => {
    const { data, error: updateError } = await supabase
      .from('lumio_repositories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      return null
    }

    setRepositories((prev) =>
      prev.map((r) => (r.id === id ? data : r)).sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    )
    return data
  }

  const deleteRepository = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('lumio_repositories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    setRepositories((prev) => prev.filter((r) => r.id !== id))
    return true
  }

  const getRepository = useCallback(async (id: string): Promise<LumioRepository | null> => {
    const { data, error: fetchError } = await supabase
      .from('lumio_repositories')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      setError(fetchError.message)
      return null
    }

    return data
  }, [])

  const syncRepository = async (id: string): Promise<boolean> => {
    setSyncing(id)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sessione non valida')
        setSyncing(null)
        return false
      }

      const response = await supabase.functions.invoke('lumio-sync-repo', {
        body: { repositoryId: id },
      })

      if (response.error) {
        setError(response.error.message)
        setSyncing(null)
        return false
      }

      const result = response.data as { success: boolean; error?: string; cardsCount?: number }

      if (!result.success) {
        setError(result.error || 'Errore durante la sincronizzazione')
        setSyncing(null)
        return false
      }

      // Refresh the repository to get updated status
      await fetchRepositories()
      setSyncing(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setSyncing(null)
      return false
    }
  }

  return {
    repositories,
    loading,
    error,
    syncing,
    createRepository,
    updateRepository,
    deleteRepository,
    getRepository,
    syncRepository,
    refetch: fetchRepositories,
  }
}
