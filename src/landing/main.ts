import './style.css'

// --- I18N System ---

type Lang = 'it' | 'en'

interface Translations {
  tagline: string
  featuresTitle: string
  ctaMotivation: string
  features: {
    title: string
    description: string
    icon: string
  }[]
  ctaCoach: string
  ctaLive: string
}

const translations: Record<Lang, Translations> = {
  it: {
    tagline: 'Il tuo assistente AI per il coaching fitness',
    featuresTitle: 'Cosa offre Helix',
    ctaMotivation: 'Pronto a trasformare il tuo coaching?',
    features: [
      {
        title: 'Pianificazione AI',
        description: 'Genera piani di allenamento personalizzati con l\'intelligenza artificiale',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z"/><path d="M8 8v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8"/><circle cx="9" cy="5" r="0.5" fill="currentColor"/><circle cx="15" cy="5" r="0.5" fill="currentColor"/><path d="M6 12h12M8 16h8M10 20h4"/><path d="M4 12l-1 8h18l-1-8"/></svg>`,
      },
      {
        title: 'Gestione Clienti',
        description: 'Profili completi con anamnesi, obiettivi e storico sessioni',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      },
      {
        title: 'Coaching Live',
        description: 'Guida gli allenamenti in tempo reale dal tablet in palestra',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
      },
      {
        title: 'Libreria Esercizi',
        description: 'Catalogo esercizi con immagini e schede Lumio personalizzabili',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>`,
      },
    ],
    ctaCoach: 'Coach App',
    ctaLive: 'Live Tablet',
  },
  en: {
    tagline: 'Your AI-powered fitness coaching assistant',
    featuresTitle: 'What Helix offers',
    ctaMotivation: 'Ready to transform your coaching?',
    features: [
      {
        title: 'AI Planning',
        description: 'Generate personalized training plans with artificial intelligence',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z"/><path d="M8 8v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8"/><circle cx="9" cy="5" r="0.5" fill="currentColor"/><circle cx="15" cy="5" r="0.5" fill="currentColor"/><path d="M6 12h12M8 16h8M10 20h4"/><path d="M4 12l-1 8h18l-1-8"/></svg>`,
      },
      {
        title: 'Client Management',
        description: 'Complete profiles with health history, goals, and session records',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      },
      {
        title: 'Live Coaching',
        description: 'Guide workouts in real-time from your tablet at the gym',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
      },
      {
        title: 'Exercise Library',
        description: 'Exercise catalog with images and customizable Lumio cards',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>`,
      },
    ],
    ctaCoach: 'Coach App',
    ctaLive: 'Live Tablet',
  },
}

// --- Language Detection & Persistence ---

function detectLanguage(): Lang {
  const stored = localStorage.getItem('helix-lang')
  if (stored === 'it' || stored === 'en') return stored

  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('en')) return 'en'
  // Italian default for all other languages
  return 'it'
}

let currentLang: Lang = detectLanguage()

function setLanguage(lang: Lang): void {
  currentLang = lang
  localStorage.setItem('helix-lang', lang)
  document.documentElement.lang = lang
  render(lang)
}

// --- Render ---

function render(lang: Lang): void {
  const t = translations[lang]
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  app.innerHTML = `
    <!-- Language Toggle -->
    <div class="lang-toggle" role="group" aria-label="Language selector">
      <button
        class="lang-btn ${lang === 'it' ? 'lang-btn--active' : ''}"
        data-lang="it"
        aria-pressed="${lang === 'it'}"
      >IT</button>
      <button
        class="lang-btn ${lang === 'en' ? 'lang-btn--active' : ''}"
        data-lang="en"
        aria-pressed="${lang === 'en'}"
      >EN</button>
    </div>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <img src="/logo.svg" alt="Helix logo" class="hero-logo" />
        <h1 class="hero-title">Helix</h1>
        <p class="hero-tagline">${t.tagline}</p>
        <div class="cta-group">
          <a href="https://coach.helix.toto-castaldi.com" class="btn btn-primary">${t.ctaCoach}</a>
          <a href="https://live.helix.toto-castaldi.com" class="btn btn-secondary">${t.ctaLive}</a>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2 class="features-title">${t.featuresTitle}</h2>
      <div class="features-grid">
        ${t.features.map(f => `
          <div class="feature-card">
            <div class="feature-icon-wrapper">${f.icon}</div>
            <h3 class="feature-card-title">${f.title}</h3>
            <p class="feature-card-desc">${f.description}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Bottom CTA Section -->
    <section class="bottom-cta">
      <p class="bottom-cta-text">${t.ctaMotivation}</p>
      <div class="cta-group">
        <a href="https://coach.helix.toto-castaldi.com" class="btn btn-primary">${t.ctaCoach}</a>
        <a href="https://live.helix.toto-castaldi.com" class="btn btn-secondary">${t.ctaLive}</a>
      </div>
    </section>
  `

  // Bind language toggle clicks
  app.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = (btn as HTMLElement).dataset.lang as Lang
      if (lang) setLanguage(lang)
    })
  })
}

// --- Init ---

document.documentElement.lang = currentLang
render(currentLang)
