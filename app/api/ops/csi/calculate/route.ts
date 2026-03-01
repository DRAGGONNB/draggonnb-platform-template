import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateAllCSI } from '@/lib/csi/calculator'

/**
 * POST /api/ops/csi/calculate
 * Triggered by N8N weekly cron. Calculates CSI for all active orgs.
 */
export async function POST() {
  try {
    const scores = await calculateAllCSI()
    const supabase = createAdminClient()

    // Upsert scores (create table if needed via migration, or just log for now)
    for (const score of scores) {
      await supabase.from('csi_scores').upsert({
        organization_id: score.organizationId,
        overall: score.overall,
        band: score.band,
        components: score.components,
        recommendation: score.recommendation,
        calculated_at: score.calculatedAt,
      }, { onConflict: 'organization_id' }).catch(() => {
        // Table may not exist yet - log instead
        console.log(`[CSI] ${score.orgName}: ${score.overall} (${score.band}) - ${score.recommendation}`)
      })
    }

    return NextResponse.json({
      calculated: scores.length,
      summary: {
        green: scores.filter(s => s.band === 'green').length,
        yellow: scores.filter(s => s.band === 'yellow').length,
        orange: scores.filter(s => s.band === 'orange').length,
        red: scores.filter(s => s.band === 'red').length,
      },
    })
  } catch (error) {
    console.error('[CSI] Calculation error:', error)
    return NextResponse.json({ error: 'CSI calculation failed' }, { status: 500 })
  }
}
