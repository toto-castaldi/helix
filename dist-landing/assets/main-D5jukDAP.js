(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))r(e);new MutationObserver(e=>{for(const i of e)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function a(e){const i={};return e.integrity&&(i.integrity=e.integrity),e.referrerPolicy&&(i.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?i.credentials="include":e.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(e){if(e.ep)return;e.ep=!0;const i=a(e);fetch(e.href,i)}})();const l="dev",p={it:{tagline:"Il tuo assistente AI per il coaching fitness",featuresTitle:"Cosa offre Helix",ctaMotivation:"Pronto a trasformare il tuo coaching?",features:[{title:"Pianificazione AI",description:"Genera piani di allenamento personalizzati con l'intelligenza artificiale",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z"/><path d="M8 8v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8"/><circle cx="9" cy="5" r="0.5" fill="currentColor"/><circle cx="15" cy="5" r="0.5" fill="currentColor"/><path d="M6 12h12M8 16h8M10 20h4"/><path d="M4 12l-1 8h18l-1-8"/></svg>'},{title:"Gestione Clienti",description:"Profili completi con anamnesi, obiettivi e storico sessioni",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'},{title:"Coaching Live",description:"Guida gli allenamenti in tempo reale dal tablet in palestra",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>'},{title:"Libreria Esercizi",description:"Catalogo esercizi con immagini e schede Lumio personalizzabili",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>'}],ctaCoach:"Coach App",ctaLive:"Live Tablet",mcpTitle:"Integrazione Claude Code",mcpSubtitle:"Usa il tuo assistente AI preferito per pianificare gli allenamenti direttamente con i dati Helix",mcpStep1:"1. Genera la tua API Key nella pagina <strong>Impostazioni</strong> della Coach App",mcpStep2:"2. Esegui questo comando nel terminale:",mcpCommand:`claude mcp add --transport http helix \\
  --header "X-Helix-API-Key: YOUR_API_KEY" \\
  YOUR_HELIX_MCP_URL`,mcpNote:"Trovi il tuo URL MCP personale nella pagina Impostazioni della Coach App."},en:{tagline:"Your AI-powered fitness coaching assistant",featuresTitle:"What Helix offers",ctaMotivation:"Ready to transform your coaching?",features:[{title:"AI Planning",description:"Generate personalized training plans with artificial intelligence",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z"/><path d="M8 8v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8"/><circle cx="9" cy="5" r="0.5" fill="currentColor"/><circle cx="15" cy="5" r="0.5" fill="currentColor"/><path d="M6 12h12M8 16h8M10 20h4"/><path d="M4 12l-1 8h18l-1-8"/></svg>'},{title:"Client Management",description:"Complete profiles with health history, goals, and session records",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'},{title:"Live Coaching",description:"Guide workouts in real-time from your tablet at the gym",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>'},{title:"Exercise Library",description:"Exercise catalog with images and customizable Lumio cards",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>'}],ctaCoach:"Coach App",ctaLive:"Live Tablet",mcpTitle:"Claude Code Integration",mcpSubtitle:"Use your favorite AI assistant to plan workouts directly with your Helix data",mcpStep1:"1. Generate your API Key in the <strong>Settings</strong> page of the Coach App",mcpStep2:"2. Run this command in your terminal:",mcpCommand:`claude mcp add --transport http helix \\
  --header "X-Helix-API-Key: YOUR_API_KEY" \\
  YOUR_HELIX_MCP_URL`,mcpNote:"Find your personal MCP URL in the Settings page of the Coach App."}};function d(){const o=localStorage.getItem("helix-lang");return o==="it"||o==="en"?o:navigator.language.toLowerCase().startsWith("en")?"en":"it"}let s=d();function u(o){s=o,localStorage.setItem("helix-lang",o),document.documentElement.lang=o,c(o)}function c(o){const t=p[o],a=document.querySelector("#app");a&&(a.innerHTML=`
    <!-- Language Toggle -->
    <div class="lang-toggle" role="group" aria-label="Language selector">
      <button
        class="lang-btn ${o==="it"?"lang-btn--active":""}"
        data-lang="it"
        aria-pressed="${o==="it"}"
      >IT</button>
      <button
        class="lang-btn ${o==="en"?"lang-btn--active":""}"
        data-lang="en"
        aria-pressed="${o==="en"}"
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
        ${t.features.map(r=>`
          <div class="feature-card">
            <div class="feature-icon-wrapper">${r.icon}</div>
            <h3 class="feature-card-title">${r.title}</h3>
            <p class="feature-card-desc">${r.description}</p>
          </div>
        `).join("")}
      </div>
    </section>

    <!-- MCP Integration Section -->
    <section class="mcp-setup">
      <div class="mcp-content">
        <div class="mcp-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mcp-icon">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </div>
        <h2 class="mcp-title">${t.mcpTitle}</h2>
        <p class="mcp-subtitle">${t.mcpSubtitle}</p>
        <div class="mcp-steps">
          <p class="mcp-step">${t.mcpStep1}</p>
          <p class="mcp-step">${t.mcpStep2}</p>
          <div class="mcp-code-block">
            <pre><code>${t.mcpCommand}</code></pre>
          </div>
          <p class="mcp-note">${t.mcpNote}</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="site-footer">
      <span class="footer-version">${l}</span>
      <span class="footer-separator">·</span>
      <a href="https://github.com/toto-castaldi/helix" target="_blank" rel="noopener noreferrer" class="footer-github">
        <svg viewBox="0 0 24 24" fill="currentColor" class="footer-github-icon"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        GitHub
      </a>
    </footer>
  `,a.querySelectorAll(".lang-btn").forEach(r=>{r.addEventListener("click",()=>{const e=r.dataset.lang;e&&u(e)})}))}document.documentElement.lang=s;c(s);
