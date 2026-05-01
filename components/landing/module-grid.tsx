import { MODULE_CARDS } from '@/lib/landing/module-content'
import { ModuleCard } from './module-card'

export function ModuleGrid() {
  return (
    <section id="modules" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#6B1420]">
            Built for your business
          </p>
          <h2 className="mb-4 font-display text-3xl font-bold text-[#363940] lg:text-4xl">
            Pick the operating system that{' '}
            <span className="gradient-text-brand">fits your trade</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#A8A9AD]">
            DraggonnB ships purpose-built modules for South African operators. Activate what you
            need today, add more as you scale.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_CARDS.map((card) => (
            <ModuleCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  )
}
