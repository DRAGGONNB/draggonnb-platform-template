import Link from 'next/link'
import { ActionCard } from './ActionCard'
import { ToggleViewButton } from './ToggleViewButton'
import type { ModuleHomeProps } from './types'

export function ModuleHome({
  module: moduleName,
  cards,
  cardData,
  hasBrandVoice,
  advancedHref,
  apiEndpointBase,
}: ModuleHomeProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold capitalize">{moduleName}</h1>
        <p className="text-sm text-muted-foreground">Easy view</p>
      </div>

      {/* Brand voice banner */}
      {!hasBrandVoice && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complete your brand voice in 30 seconds for personalised outreach{' '}
          <Link
            href="/settings/brand-voice"
            className="font-medium underline underline-offset-2 hover:text-amber-900"
          >
            →
          </Link>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const data = cardData[card.id] ?? { items: [], totalCount: 0 }
          return (
            <ActionCard
              key={card.id}
              cardId={card.id}
              title={card.title}
              description={card.description}
              emptyStateCTA={card.emptyStateCTA}
              items={data.items}
              totalCount={data.totalCount}
              hasBrandVoice={hasBrandVoice}
              apiEndpoint={`${apiEndpointBase}/approve`}
              dismissEndpoint={`${apiEndpointBase}/dismiss`}
              advancedHref={advancedHref}
              variant="generic"
            />
          )
        })}
      </div>

      {/* Toggle button */}
      <ToggleViewButton
        currentMode="easy"
        advancedHref={advancedHref}
        easyHref="#"
        apiEndpoint={`${apiEndpointBase}/ui-mode`}
      />
    </div>
  )
}
