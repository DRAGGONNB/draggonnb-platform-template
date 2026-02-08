'use client'

import { useState } from 'react'
import { Sparkles, Wand2, Save, Edit, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface GeneratedContent {
  platform: string
  content: string
  hashtags?: string[]
  imagePrompt?: string
}

interface GenerationResult {
  success: boolean
  data?: {
    contents: GeneratedContent[]
  }
  usage?: {
    current: number
    limit: number
  }
  error?: string
}

export default function ContentGeneratorPage() {
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [tone, setTone] = useState('professional')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([])
  const [editedContent, setEditedContent] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('linkedin')
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ current: number; limit: number } | null>(null)

  const platforms = [
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'facebook', label: 'Facebook', icon: '👥' },
    { value: 'instagram', label: 'Instagram', icon: '📸' },
    { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
  ]

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'inspirational', label: 'Inspirational' },
  ]

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedContent([])

    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          tone,
          platforms: selectedPlatforms,
        }),
      })

      const result: GenerationResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content')
      }

      if (result.success && result.data?.contents) {
        setGeneratedContent(result.data.contents)
        setUsage(result.usage || null)
        // Set active tab to first generated platform
        if (result.data.contents.length > 0) {
          setActiveTab(result.data.contents[0].platform)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEdit = (platform: string, content: string) => {
    setEditedContent((prev) => ({ ...prev, [platform]: content }))
  }

  const handleSaveToQueue = async (platform: string) => {
    const content = editedContent[platform] || generatedContent.find((c) => c.platform === platform)?.content

    if (!content) return

    try {
      // TODO: Implement save to content queue API
      const response = await fetch('/api/content/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          content,
          status: 'pending_approval',
        }),
      })

      if (response.ok) {
        alert('Content saved to queue!')
      }
    } catch (err) {
      console.error('Failed to save content:', err)
      alert('Failed to save content to queue')
    }
  }

  const getCurrentContent = (platform: string): GeneratedContent | undefined => {
    return generatedContent.find((c) => c.platform === platform)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Content Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate engaging social media content for multiple platforms using AI
        </p>
      </div>

      {usage && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            AI Generations this month: <strong>{usage.current}</strong> / {usage.limit}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Content Configuration</CardTitle>
              <CardDescription>
                Define your topic and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Topic Input */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Main Idea *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., The benefits of cloud automation for small businesses"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  placeholder="e.g., automation, efficiency, cost-saving"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>

              {/* Tone Selection */}
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Platform Selection */}
              <div className="space-y-2">
                <Label>Platforms *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.value}
                      onClick={() => togglePlatform(platform.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedPlatforms.includes(platform.value)
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{platform.icon}</span>
                        <span className="font-medium text-sm">
                          {platform.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Content Preview */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
              <CardDescription>
                Review, edit, and save your AI-generated posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedContent.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                  <p>Generated content will appear here</p>
                  <p className="text-sm mt-2">
                    Fill in the form and click Generate Content to get started
                  </p>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full">
                    {generatedContent.map((content) => {
                      const platform = platforms.find(
                        (p) => p.value === content.platform
                      )
                      return (
                        <TabsTrigger
                          key={content.platform}
                          value={content.platform}
                          className="flex-1"
                        >
                          <span className="mr-1">{platform?.icon}</span>
                          {platform?.label}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>

                  {generatedContent.map((content) => (
                    <TabsContent key={content.platform} value={content.platform}>
                      <div className="space-y-4 mt-4">
                        {/* Content Editor */}
                        <div className="space-y-2">
                          <Label htmlFor={`content-${content.platform}`}>
                            Post Content
                          </Label>
                          <Textarea
                            id={`content-${content.platform}`}
                            value={
                              editedContent[content.platform] || content.content
                            }
                            onChange={(e) =>
                              handleEdit(content.platform, e.target.value)
                            }
                            rows={10}
                            className="font-mono text-sm"
                          />
                        </div>

                        {/* Hashtags */}
                        {content.hashtags && content.hashtags.length > 0 && (
                          <div className="space-y-2">
                            <Label>Suggested Hashtags</Label>
                            <div className="flex flex-wrap gap-2">
                              {content.hashtags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Image Prompt */}
                        {content.imagePrompt && (
                          <div className="space-y-2">
                            <Label>AI Image Prompt</Label>
                            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                              {content.imagePrompt}
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                          <Button
                            onClick={() => handleSaveToQueue(content.platform)}
                            className="flex-1"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save to Queue
                          </Button>
                          <Button variant="outline" className="flex-1">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit More
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
