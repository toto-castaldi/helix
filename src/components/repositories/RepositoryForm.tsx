import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { FormActions } from '@/components/shared'
import { parseGitHubUrl } from '@/lib/github'
import type { LumioRepository, LumioRepositoryInsert } from '@/types'

const repositorySchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio'),
  github_url: z.string().min(1, 'URL GitHub obbligatorio').refine(
    (url) => parseGitHubUrl(url) !== null,
    'URL GitHub non valido. Usa il formato: github.com/owner/repo'
  ),
  access_token: z.string().optional(),
})

type RepositoryFormData = z.infer<typeof repositorySchema>

interface RepositoryFormProps {
  repository?: LumioRepository
  onSubmit: (data: LumioRepositoryInsert) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function RepositoryForm({
  repository,
  onSubmit,
  onCancel,
  isSubmitting,
}: RepositoryFormProps) {
  const [showToken, setShowToken] = useState(false)

  const defaultGitHubUrl = repository
    ? `https://github.com/${repository.github_owner}/${repository.github_repo}`
    : ''

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RepositoryFormData>({
    resolver: zodResolver(repositorySchema),
    defaultValues: {
      name: repository?.name || '',
      github_url: defaultGitHubUrl,
      access_token: repository?.access_token || '',
    },
  })

  // Auto-populate name from repo when URL changes
  const githubUrl = watch('github_url')
  const currentName = watch('name')

  useEffect(() => {
    if (!repository && githubUrl && !currentName) {
      const parsed = parseGitHubUrl(githubUrl)
      if (parsed) {
        setValue('name', parsed.repo)
      }
    }
  }, [githubUrl, currentName, repository, setValue])

  const handleFormSubmit = async (data: RepositoryFormData) => {
    const parsed = parseGitHubUrl(data.github_url)
    if (!parsed) {
      return
    }

    await onSubmit({
      name: data.name,
      github_owner: parsed.owner,
      github_repo: parsed.repo,
      access_token: data.access_token || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="github_url">URL Repository GitHub *</Label>
        <Input
          id="github_url"
          {...register('github_url')}
          placeholder="https://github.com/owner/repo"
        />
        {errors.github_url && (
          <p className="text-sm text-destructive">{errors.github_url.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Formati accettati: github.com/owner/repo, owner/repo
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Nome descrittivo"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="access_token">Token di accesso (per repository privati)</Label>
        <div className="relative">
          <Input
            id="access_token"
            type={showToken ? 'text' : 'password'}
            {...register('access_token')}
            placeholder="ghp_..."
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Lascia vuoto per repository pubblici. Per repo privati, usa un Personal Access Token con permesso &quot;repo&quot;.
        </p>
      </div>

      <FormActions
        isSubmitting={isSubmitting}
        isEditing={!!repository}
        onCancel={onCancel}
      />
    </form>
  )
}
