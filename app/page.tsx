import { LandingNav } from '@/components/landing/nav'
import {
  HeroSection,
  SocialProofBar,
  ProblemSolutionSection,
  FeaturesSection,
  HowItWorksSection,
  PricingPreviewSection,
  CTASection,
} from '@/components/landing/sections'
import { LandingFooter } from '@/components/landing/footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofBar />
        <ProblemSolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingPreviewSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
