/**
 * Telegram notification templates for restaurant staff.
 * Staff-only channel. Guests always use WhatsApp.
 */

function esc(text: string | number): string {
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}

function time(): string {
  return new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' })
}

export const TelegramTemplates = {

  sessionOpened: (table: string, waiter: string, partySize: number, splitMode: string) =>
    `🟢 *Table Opened*\n📍 ${esc(table)} \\| Waiter: ${esc(waiter)}\n👥 Party of ${esc(partySize)}${splitMode !== 'none' ? ` \\| Split: ${esc(splitMode)}` : ''}\n🕐 ${esc(time())}`,

  billRequested: (table: string, waiter: string, subtotal: number, serviceCharge: number) =>
    `🧾 *Bill Requested*\n📍 ${esc(table)} \\| Waiter: ${esc(waiter)}\n💰 Subtotal: R${esc(subtotal.toFixed(2))}\n🛎️ Service: R${esc(serviceCharge.toFixed(2))}\n💳 Payment link sent to guest`,

  paymentReceived: (table: string, sessionSuffix: string, total: number, paid: number, tip: number, method: string, waiter: string) =>
    `✅ *Payment Received*\n📍 ${esc(table)} \\| Session \\#${esc(sessionSuffix)}\n\n💰 Total: R${esc(total.toFixed(2))}\n💳 Paid: R${esc(paid.toFixed(2))}\n🎁 Tip: R${esc(tip.toFixed(2))}\n📊 Method: ${esc(method.toUpperCase())}\n\n👤 Waiter: ${esc(waiter)}\n💡 *Table clear to reset*`,

  partialPayment: (table: string, slotPaid: number, amountPaid: number, pendingSlots: number[]) =>
    `⚠️ *Partial Payment — ${esc(table)}*\nSlot ${esc(slotPaid)} paid: R${esc(amountPaid.toFixed(2))}\n⏳ Pending: Slots ${esc(pendingSlots.join(', '))}`,

  sessionClosed: (table: string, waiter: string, total: number) =>
    `🔴 *Session Closed*\n📍 ${esc(table)} \\| Waiter: ${esc(waiter)}\n💰 Total collected: R${esc(total.toFixed(2))}`,

  tempCritical: (equipment: string, temp: number, type: string) =>
    `🌡️ ⛔ *CRITICAL TEMPERATURE*\nEquipment: ${esc(equipment)} \\(${esc(type)}\\)\nReading: ${esc(temp)}°C\n\n⚠️ Immediate corrective action required\\.\nLog in DraggonnB dashboard\\.`,

  tempWarning: (equipment: string, temp: number) =>
    `🌡️ ⚠️ *Temperature Warning*\n${esc(equipment)}: ${esc(temp)}°C\nMonitor and log corrective action if needed\\.`,

  shiftSummary: (waiter: string, date: string, tables: number, billed: number, collected: number, tips: number) =>
    `📊 *Shift Summary — ${esc(waiter)}*\n${esc(date)}\n\nTables served:    ${esc(tables)}\nTotal billed:     R${esc(billed.toFixed(2))}\nTotal collected:  R${esc(collected.toFixed(2))}\n💰 Tips earned:   R${esc(tips.toFixed(2))}`,

  dailyBriefing: (restaurantName: string, date: string, reservations: number, staffOnShift: number, pendingChecklists: string[]) =>
    `☀️ *Daily Briefing — ${esc(restaurantName)}*\n${esc(date)}\n\n📅 Reservations: ${esc(reservations)}\n👥 Staff on shift: ${esc(staffOnShift)}\n📋 Pending checklists: ${esc(pendingChecklists.join(', ') || 'None')}\n\nHave a great service\\! 🍽️`,

  reservationBooked: (name: string, date: string, timeStr: string, partySize: number, source: string) =>
    `📅 *New Reservation*\n👤 ${esc(name)}\n📅 ${esc(date)} at ${esc(timeStr)}\n👥 Party of ${esc(partySize)}\n📱 Source: ${esc(source)}`,

  checklistOverdue: (checklistName: string, deadline: string) =>
    `📋 *Checklist Overdue*\n${esc(checklistName)}\nDeadline: ${esc(deadline)}\n\nPlease complete and log in the DraggonnB dashboard\\.`,

  loadSheddingAlert: (stage: number, startTime: string, hours: number) =>
    `⚡ *Load Shedding Alert*\nStage ${esc(stage)} — Starts: ${esc(startTime)}\nDuration: ±${esc(hours)} hours\n\n🧊 Check fridge/freezer temps every 30 min\n📋 Complete temp log before power goes out\n🔦 Emergency lighting protocol activated`,

  eventBriefing: (eventName: string, date: string, guestCount: number, venue: string) =>
    `🎉 *Event Briefing*\n${esc(eventName)}\n📅 ${esc(date)}\n📍 ${esc(venue)}\n👥 Guests: ${esc(guestCount)}`,
}

/**
 * Send a message to a restaurant's Telegram channel.
 * Uses per-restaurant bot token (not global env).
 */
export async function sendRestaurantTelegram(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' = 'MarkdownV2'
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[Restaurant Telegram] Send error:', err)
  }
}

/**
 * Send a direct Telegram message to a specific staff member.
 */
export async function sendStaffTelegram(
  botToken: string,
  staffChatId: string,
  text: string
): Promise<void> {
  return sendRestaurantTelegram(botToken, staffChatId, text)
}
