import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { LumioLocalCardWithRepository, LumioCardImage, LumioRepository } from '@/types'

interface UseLumioCardsOptions {
  repositoryId?: string
  searchQuery?: string
  tags?: string[]
  onlyAvailable?: boolean
}

export function useLumioCards(options: UseLumioCardsOptions = {}) {
  const [cards, setCards] = useState<LumioLocalCardWithRepository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { repositoryId, searchQuery, tags, onlyAvailable = true } = options

  const fetchCards = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('lumio_cards')
      .select(`
        *,
        repository:lumio_repositories(*)
      `)
      .order('title', { ascending: true })

    // Filter by repository if specified
    if (repositoryId) {
      query = query.eq('repository_id', repositoryId)
    }

    // Filter by availability (source_available)
    if (onlyAvailable) {
      query = query.eq('source_available', true)
    }

    // Full-text search on title and content
    if (searchQuery && searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
    }

    // Filter by tags using JSONB containment
    if (tags && tags.length > 0) {
      // Use contains operator for JSONB array
      query = query.contains('frontmatter->tags', tags)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      // Transform the nested repository data
      const transformedCards = (data || []).map((card) => ({
        ...card,
        repository: card.repository as LumioRepository | undefined,
      })) as LumioLocalCardWithRepository[]
      setCards(transformedCards)
    }

    setLoading(false)
  }, [repositoryId, searchQuery, tags, onlyAvailable])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const getCard = useCallback(async (id: string): Promise<LumioLocalCardWithRepository | null> => {
    const { data, error: fetchError } = await supabase
      .from('lumio_cards')
      .select(`
        *,
        repository:lumio_repositories(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      setError(fetchError.message)
      return null
    }

    return {
      ...data,
      repository: data.repository as LumioRepository | undefined,
    } as LumioLocalCardWithRepository
  }, [])

  const getCardImages = useCallback(async (cardId: string): Promise<LumioCardImage[]> => {
    const { data, error: fetchError } = await supabase
      .from('lumio_card_images')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      return []
    }

    return data || []
  }, [])

  const getImageUrl = useCallback((storagePath: string): string => {
    const { data } = supabase.storage
      .from('lumio-images')
      .getPublicUrl(storagePath)
    return data.publicUrl
  }, [])

  const getAllTags = useCallback(async (): Promise<string[]> => {
    // Get all unique tags from cards
    const { data, error: fetchError } = await supabase
      .from('lumio_cards')
      .select('frontmatter')
      .eq('source_available', true)
      .not('frontmatter', 'is', null)

    if (fetchError) {
      setError(fetchError.message)
      return []
    }

    // Extract unique tags from frontmatter
    const allTags = new Set<string>()
    for (const card of data || []) {
      const tags = card.frontmatter?.tags
      if (Array.isArray(tags)) {
        tags.forEach((tag: string) => allTags.add(tag))
      }
    }

    return Array.from(allTags).sort()
  }, [])

  return {
    cards,
    loading,
    error,
    getCard,
    getCardImages,
    getImageUrl,
    getAllTags,
    refetch: fetchCards,
  }
}
