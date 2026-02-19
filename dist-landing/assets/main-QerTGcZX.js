(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))r(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function a(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(e){if(e.ep)return;e.ep=!0;const o=a(e);fetch(e.href,o)}})();const l={it:{tagline:"Il tuo assistente AI per il coaching fitness",featuresTitle:"Cosa offre Helix",ctaMotivation:"Pronto a trasformare il tuo coaching?",features:[{title:"Pianificazione AI",description:"Genera piani di allenamento personalizzati con l'intelligenza artificiale",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z"/><path d="M8 8v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8"/><circle cx="9" cy="5" r="0.5" fill="currentColor"/><circle cx="15" cy="5" r="0.5" fill="currentColor"/><path d="M6 12h12M8 16h8M10 20h4"/><path d="M4 12l-1 8h18l-1-8"/></svg>'},{title:"Gestione Clienti",description:"Profili completi con anamnesi, obiettivi e storico sessioni",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'},{title:"Coaching Live",description:"Guida gli allenamenti in tempo reale dal tablet in palestra",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>'},{title:"Libreria Esercizi",description:"Catalogo esercizi con immagini e schede Lumio personalizzabili",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>'}],ctaCoach:"Coach App",ctaLive:"Live Tablet"},en:{tagline:"Your AI-powered fitness coaching assistant",featuresTitle:"What Helix offers",ctaMotivation:"Ready to transform your coaching?",features:[{title:"AI Planning",description:"Generate personalized training plans with artificial intelligence",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z"/><path d="M8 8v1a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8"/><circle cx="9" cy="5" r="0.5" fill="currentColor"/><circle cx="15" cy="5" r="0.5" fill="currentColor"/><path d="M6 12h12M8 16h8M10 20h4"/><path d="M4 12l-1 8h18l-1-8"/></svg>'},{title:"Client Management",description:"Complete profiles with health history, goals, and session records",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'},{title:"Live Coaching",description:"Guide workouts in real-time from your tablet at the gym",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>'},{title:"Exercise Library",description:"Exercise catalog with images and customizable Lumio cards",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feature-icon"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>'}],ctaCoach:"Coach App",ctaLive:"Live Tablet"}};function d(){const t=localStorage.getItem("helix-lang");return t==="it"||t==="en"?t:navigator.language.toLowerCase().startsWith("en")?"en":"it"}let s=d();function u(t){s=t,localStorage.setItem("helix-lang",t),document.documentElement.lang=t,c(t)}function c(t){const i=l[t],a=document.querySelector("#app");a&&(a.innerHTML=`
    <!-- Language Toggle -->
    <div class="lang-toggle" role="group" aria-label="Language selector">
      <button
        class="lang-btn ${t==="it"?"lang-btn--active":""}"
        data-lang="it"
        aria-pressed="${t==="it"}"
      >IT</button>
      <button
        class="lang-btn ${t==="en"?"lang-btn--active":""}"
        data-lang="en"
        aria-pressed="${t==="en"}"
      >EN</button>
    </div>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <img src="/logo.svg" alt="Helix logo" class="hero-logo" />
        <h1 class="hero-title">Helix</h1>
        <p class="hero-tagline">${i.tagline}</p>
        <div class="cta-group">
          <a href="https://coach.helix.toto-castaldi.com" class="btn btn-primary">${i.ctaCoach}</a>
          <a href="https://live.helix.toto-castaldi.com" class="btn btn-secondary">${i.ctaLive}</a>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2 class="features-title">${i.featuresTitle}</h2>
      <div class="features-grid">
        ${i.features.map(r=>`
          <div class="feature-card">
            <div class="feature-icon-wrapper">${r.icon}</div>
            <h3 class="feature-card-title">${r.title}</h3>
            <p class="feature-card-desc">${r.description}</p>
          </div>
        `).join("")}
      </div>
    </section>

    <!-- Bottom CTA Section -->
    <section class="bottom-cta">
      <p class="bottom-cta-text">${i.ctaMotivation}</p>
      <div class="cta-group">
        <a href="https://coach.helix.toto-castaldi.com" class="btn btn-primary">${i.ctaCoach}</a>
        <a href="https://live.helix.toto-castaldi.com" class="btn btn-secondary">${i.ctaLive}</a>
      </div>
    </section>
  `,a.querySelectorAll(".lang-btn").forEach(r=>{r.addEventListener("click",()=>{const e=r.dataset.lang;e&&u(e)})}))}document.documentElement.lang=s;c(s);
