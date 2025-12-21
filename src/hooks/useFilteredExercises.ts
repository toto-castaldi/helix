import { useState, useMemo, useCallback } from 'react'
import type { ExerciseWithDetails } from '@/types'

export function useFilteredExercises(exercises: ExerciseWithDetails[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    exercises.forEach(ex => {
      ex.tags?.forEach(t => tagSet.add(t.tag))
    })
    return Array.from(tagSet).sort()
  }, [exercises])

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchesSearch = !searchQuery.trim() ||
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every(tag =>
          ex.tags?.some(t => t.tag === tag)
        )

      return matchesSearch && matchesTags
    })
  }, [exercises, searchQuery, selectedTags])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }, [])

  const clearTags = useCallback(() => {
    setSelectedTags([])
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    clearTags,
    allTags,
    filteredExercises,
  }
}
