import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const handleUpdate = () => {
    updateServiceWorker(true)
  }

  const handleClose = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-background border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-6 w-6 flex-shrink-0 mt-0.5 text-primary" />
        <div className="flex-1">
          <p className="font-medium">Aggiornamento disponibile</p>
          <p className="text-sm text-muted-foreground">
            Una nuova versione dell'app è disponibile
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          className="flex-1"
        >
          Dopo
        </Button>
        <Button
          size="sm"
          onClick={handleUpdate}
          className="flex-1"
        >
          Aggiorna ora
        </Button>
      </div>
    </div>
  )
}
