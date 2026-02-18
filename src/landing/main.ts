import './style.css'

console.log('Helix Landing Page loaded')

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center px-4">
      <img src="/logo.svg" alt="Helix" class="w-24 h-24 mb-8" />
      <h1 class="text-4xl font-bold mb-4" style="background: linear-gradient(135deg, var(--helix-amber), var(--helix-coral), var(--helix-violet)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
        Helix
      </h1>
      <p class="text-gray-600 text-lg text-center max-w-md">
        AI-powered assistant for fitness coaches
      </p>
    </div>
  `
}
