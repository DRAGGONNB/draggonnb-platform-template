/**
 * Base Agent - Thin wrapper around Claude API
 * Provides conversation memory, token tracking, and structured output
 */

import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AgentConfig,
  AgentRunOptions,
  AgentRunResult,
  AgentMessage,
  AgentStatus,
} from './types'

// ============================================================================
// CLIENT
// ============================================================================

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set. ' +
        'Get your key from https://console.anthropic.com/settings/keys'
      )
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

// ============================================================================
// BASE AGENT
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.7

export abstract class BaseAgent {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = {
      model: DEFAULT_MODEL,
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      ...config,
    }
  }

  /**
   * Run the agent with the given input
   * Creates or resumes a session, calls Claude, saves the result
   */
  async run(options: AgentRunOptions): Promise<AgentRunResult> {
    const supabase = createAdminClient()
    const client = getAnthropicClient()

    // Load or create session
    let sessionId = options.sessionId
    let previousMessages: AgentMessage[] = []

    if (sessionId) {
      const { data: session } = await supabase
        .from('agent_sessions')
        .select('messages, tokens_used')
        .eq('id', sessionId)
        .single()

      if (session) {
        previousMessages = (session.messages as AgentMessage[]) || []
      }
    } else {
      // Create new session
      const { data: newSession, error } = await supabase
        .from('agent_sessions')
        .insert({
          organization_id: options.organizationId || null,
          agent_type: this.config.agentType,
          lead_id: options.leadId || null,
          messages: [],
          tokens_used: 0,
          status: 'active',
        })
        .select('id')
        .single()

      if (error || !newSession) {
        throw new Error(`Failed to create agent session: ${error?.message}`)
      }
      sessionId = newSession.id
    }

    // Build message history for Claude
    const claudeMessages: Anthropic.MessageParam[] = previousMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Prepare the user input with any context
    let userContent = options.input
    if (options.context) {
      userContent = `Context:\n${JSON.stringify(options.context, null, 2)}\n\nRequest:\n${options.input}`
    }

    claudeMessages.push({ role: 'user', content: userContent })

    // Call Claude
    try {
      const response = await client.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature,
        system: this.config.systemPrompt,
        messages: claudeMessages,
      })

      // Extract text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      )
      const responseText = textBlocks.map((b) => b.text).join('\n')

      // Calculate tokens
      const tokensUsed =
        (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)

      // Parse structured result if the agent implements it
      let parsedResult: unknown = null
      let status: AgentStatus = 'completed'
      try {
        parsedResult = this.parseResponse(responseText)
      } catch {
        // If parsing fails, still save the raw response
        parsedResult = { raw: responseText }
      }

      // Save messages and result to session
      const newMessages: AgentMessage[] = [
        ...previousMessages,
        {
          role: 'user',
          content: userContent,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString(),
          tokens: tokensUsed,
        },
      ]

      // Get existing tokens
      const { data: existingSession } = await supabase
        .from('agent_sessions')
        .select('tokens_used')
        .eq('id', sessionId)
        .single()

      const totalTokens = ((existingSession?.tokens_used as number) || 0) + tokensUsed

      await supabase
        .from('agent_sessions')
        .update({
          messages: newMessages,
          tokens_used: totalTokens,
          status,
          result: parsedResult,
        })
        .eq('id', sessionId)

      return {
        sessionId: sessionId!,
        response: responseText,
        tokensUsed: totalTokens,
        result: parsedResult,
        status,
      }
    } catch (error) {
      // Mark session as failed
      await supabase
        .from('agent_sessions')
        .update({ status: 'failed' })
        .eq('id', sessionId)

      throw error
    }
  }

  /**
   * Parse the raw response text into a structured result.
   * Override in subclasses for specific parsing logic.
   */
  protected abstract parseResponse(response: string): unknown
}
