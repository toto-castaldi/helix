import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Hide prompt if app is already installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom">
      <div className="flex items-start gap-3">
        <Download className="h-6 w-6 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">Installa l'app</p>
          <p className="text-sm opacity-90">
            Aggiungi Helix alla schermata home per un accesso rapido
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-primary-foreground/20 rounded"
          aria-label="Chiudi"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDismiss}
          className="flex-1"
        >
          Non ora
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleInstall}
          className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          Installa
        </Button>
      </div>
    </div>
  )
}
