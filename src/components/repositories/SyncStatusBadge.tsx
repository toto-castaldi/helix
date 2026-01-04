import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SyncStatus } from '@/types'

interface SyncStatusBadgeProps {
  status: SyncStatus
  lastSyncAt?: string | null
}

const statusConfig: Record<SyncStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ComponentType<{ className?: string }>
}> = {
  pending: {
    label: 'In attesa',
    variant: 'secondary',
    icon: Clock,
  },
  syncing: {
    label: 'Sync...',
    variant: 'default',
    icon: Loader2,
  },
  synced: {
    label: 'Sincronizzato',
    variant: 'outline',
    icon: CheckCircle,
  },
  error: {
    label: 'Errore',
    variant: 'destructive',
    icon: AlertCircle,
  },
}

export function SyncStatusBadge({ status, lastSyncAt }: SyncStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="gap-1" title={lastSyncAt ? `Ultimo sync: ${new Date(lastSyncAt).toLocaleString('it-IT')}` : 'Mai sincronizzato'}>
      <Icon className={`h-3 w-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </Badge>
  )
}
