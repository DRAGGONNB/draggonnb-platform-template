# DraggonnB CRMM - Quick Start Implementation Guide

**Created:** 2025-11-30
**Purpose:** Step-by-step guide to build the first working dashboard
**Timeline:** 2-3 days for Phase 1

---

## Phase 1: Foundation (Days 1-3)

### Day 1: Setup & Authentication (6-8 hours)

#### Step 1.1: Install shadcn/ui Components (30 mins)

```bash
cd /c/Dev/DraggonnB_CRMM

# Core components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add tabs
npx shadcn@latest add select
npx shadcn@latest add separator
npx shadcn@latest add progress
npx shadcn@latest add toast

# Form components
npx shadcn@latest add form
npx shadcn@latest add label
npx shadcn@latest add textarea
npx shadcn@latest add checkbox
```

#### Step 1.2: Update Tailwind Config (15 mins)

Add custom colors from demo to `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom DraggonnB colors
        brand: {
          purple: '#667EEA',
          'purple-dark': '#764BA2',
          blue: '#3B82F6',
          'blue-dark': '#2563EB',
          orange: '#F97316',
          'orange-dark': '#EA580C',
        },
        linkedin: '#0A66C2',
        facebook: '#1877F2',
        instagram: '#E4405F',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

#### Step 1.3: Update globals.css (15 mins)

Add DraggonnB-specific CSS variables to `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 217.2 91.2% 59.8%; /* #3B82F6 */
    --primary-foreground: 210 40% 98%;
    --secondary: 220 14.3% 95.9%;
    --secondary-foreground: 220.9 39.3% 11%;
    --muted: 220 14.3% 95.9%;
    --muted-foreground: 220 8.9% 46.1%;
    --accent: 220 14.3% 95.9%;
    --accent-foreground: 220.9 39.3% 11%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 217.2 91.2% 59.8%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-[#F5F7FA] text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer utilities {
  .gradient-brand {
    background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
  }

  .gradient-primary {
    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
  }

  .gradient-orange {
    background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  }

  .text-gradient-brand {
    background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
```

#### Step 1.4: Create Auth Layout (1 hour)

**File:** `app/(auth)/layout.tsx`

```typescript
import { PropsWithChildren } from 'react'

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen gradient-brand flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
```

#### Step 1.5: Create Login Page (2 hours)

**File:** `app/(auth)/login/page.tsx`

```typescript
import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Login | DraggonnB CRMM',
  description: 'Sign in to your DraggonnB account',
}

export default function LoginPage() {
  return <LoginForm />
}
```

**File:** `components/auth/LoginForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      })

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-2xl border-0">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gradient-brand">
            🚀 DraggonnB POWER CRM
          </h1>
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-12"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full h-12 gradient-primary text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
```

#### Step 1.6: Create Signup Page (2 hours)

**File:** `app/(auth)/signup/page.tsx`

```typescript
import { Metadata } from 'next'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Sign Up | DraggonnB CRMM',
  description: 'Create your DraggonnB account',
}

export default function SignupPage() {
  return <SignupForm />
}
```

**File:** `components/auth/SignupForm.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

export function SignupForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 15
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10
    return Math.min(strength, 100)
  }

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })
    setPasswordStrength(calculatePasswordStrength(password))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    if (!formData.acceptTerms) {
      toast({
        title: 'Accept terms',
        description: 'You must accept the terms and conditions to continue.',
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
          },
        },
      })

      if (error) throw error

      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      })

      router.push('/verify-email')
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 40) return 'bg-red-500'
    if (strength < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthLabel = (strength: number): string => {
    if (strength < 40) return 'Weak'
    if (strength < 70) return 'Medium'
    return 'Strong'
  }

  return (
    <Card className="shadow-2xl border-0">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gradient-brand">
            🚀 DraggonnB POWER CRM
          </h1>
        </div>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Get started with your 14-day free trial
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Acme Corporation"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
              disabled={isLoading}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              disabled={isLoading}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              required
              disabled={isLoading}
              className="h-12"
            />
            {formData.password && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span className={`font-semibold ${passwordStrength < 40 ? 'text-red-500' : passwordStrength < 70 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {getPasswordStrengthLabel(passwordStrength)}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              disabled={isLoading}
              className="h-12"
            />
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={formData.acceptTerms}
              onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
              disabled={isLoading}
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms & Conditions
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>
          <Button
            type="submit"
            className="w-full h-12 gradient-primary text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
```

---

### Day 2: Dashboard Layout (6-8 hours)

#### Step 2.1: Create Sidebar Component (2-3 hours)

**File:** `components/layout/Sidebar.tsx`

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Sparkles,
  Clock,
  Repeat,
  Linkedin,
  Facebook,
  Instagram,
  Settings,
  UserCog,
  CreditCard
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface SidebarItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function SidebarItem({ href, icon, label, badge, badgeVariant = 'default' }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 px-6 py-3 text-sm transition-all cursor-pointer",
        "hover:bg-gray-50",
        isActive && "bg-blue-50 text-blue-600 border-l-3 border-blue-600 pl-[21px]"
      )}>
        <div className={cn(
          "w-5 h-5 rounded flex items-center justify-center text-xs font-semibold",
          isActive && "gradient-primary text-white"
        )}>
          {icon}
        </div>
        <span className="flex-1">{label}</span>
        {badge && (
          <Badge variant={badgeVariant} className="text-xs">
            {badge}
          </Badge>
        )}
      </div>
    </Link>
  )
}

interface SidebarSectionProps {
  title: string
  children: React.ReactNode
}

function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="mb-6">
      <div className="px-6 text-[11px] font-semibold uppercase text-gray-400 mb-3 tracking-wider">
        {title}
      </div>
      {children}
    </div>
  )
}

export function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-8">
        <h1 className="text-base font-bold text-gradient-brand">
          🚀 DraggonnB POWER CRM
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex-1">
        <SidebarSection title="Main">
          <SidebarItem
            href="/dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
          />
          <SidebarItem
            href="/contacts"
            icon={<Users className="w-4 h-4" />}
            label="Contacts"
            badge={23}
          />
          <SidebarItem
            href="/content-calendar"
            icon={<Calendar className="w-4 h-4" />}
            label="Content Calendar"
          />
          <SidebarItem
            href="/analytics"
            icon={<BarChart3 className="w-4 h-4" />}
            label="Analytics"
            badge="NEW"
            badgeVariant="secondary"
          />
        </SidebarSection>

        <SidebarSection title="Automation">
          <SidebarItem
            href="/ai-generator"
            icon={<Sparkles className="w-4 h-4" />}
            label="AI Content Generator"
          />
          <SidebarItem
            href="/scheduled-posts"
            icon={<Clock className="w-4 h-4" />}
            label="Scheduled Posts"
          />
          <SidebarItem
            href="/workflows"
            icon={<Repeat className="w-4 h-4" />}
            label="Workflows"
            badge={3}
          />
        </SidebarSection>

        <SidebarSection title="Social Platforms">
          <SidebarItem
            href="/platforms/linkedin"
            icon={<Linkedin className="w-4 h-4" />}
            label="LinkedIn"
          />
          <SidebarItem
            href="/platforms/facebook"
            icon={<Facebook className="w-4 h-4" />}
            label="Facebook"
          />
          <SidebarItem
            href="/platforms/instagram"
            icon={<Instagram className="w-4 h-4" />}
            label="Instagram"
          />
        </SidebarSection>

        <SidebarSection title="Management">
          <SidebarItem
            href="/settings"
            icon={<Settings className="w-4 h-4" />}
            label="Settings"
          />
          <SidebarItem
            href="/team"
            icon={<UserCog className="w-4 h-4" />}
            label="Team Members"
          />
          <SidebarItem
            href="/billing"
            icon={<CreditCard className="w-4 h-4" />}
            label="Billing"
          />
        </SidebarSection>
      </div>

      {/* Usage Tracker */}
      <div className="border-t border-gray-200 bg-gray-50 p-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-medium mb-1">
            <span>Posts This Month</span>
            <span>23 / 30</span>
          </div>
          <Progress value={77} className="h-1.5" />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs font-medium mb-1">
            <span>AI Generations</span>
            <span>45 / 50</span>
          </div>
          <Progress value={90} className="h-1.5" />
        </div>
        <Button className="w-full gradient-orange text-white font-semibold shadow-md hover:shadow-lg transition-all">
          ↑ Upgrade Plan
        </Button>
      </div>
    </div>
  )
}
```

#### Step 2.2: Create Header Component (1-2 hours)

**File:** `components/layout/Header.tsx`

```typescript
'use client'

import { Search, Bell, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
  breadcrumbs?: string[]
}

export function Header({ user, breadcrumbs = ['Dashboard'] }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="fixed top-0 left-64 right-0 h-18 bg-white border-b border-gray-200 px-8 z-50">
      {/* Top Row */}
      <div className="flex items-center gap-4 pt-3 pb-2">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search everything..."
            className="pl-10 bg-gray-50 border-gray-200 h-10"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 ml-auto">
          <Button className="gradient-primary text-white font-semibold shadow-md hover:shadow-lg transition-all">
            + New
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Bell className="w-4 h-4" />
            </Button>
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
              3
            </Badge>
          </div>

          {/* Help */}
          <Button variant="outline" size="icon" className="h-10 w-10">
            <HelpCircle className="w-4 h-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="gradient-primary text-white">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/billing')}>
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex gap-2 text-xs text-gray-500 pb-3">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-300">→</span>}
            <span className={index === breadcrumbs.length - 1 ? 'text-gray-700 font-medium' : ''}>
              {crumb}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### Step 2.3: Create AppShell Layout (30 mins)

**File:** `components/layout/AppShell.tsx`

```typescript
import { PropsWithChildren } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps extends PropsWithChildren {
  user?: {
    name: string
    email: string
    avatar?: string
  }
  breadcrumbs?: string[]
}

export function AppShell({ children, user, breadcrumbs }: AppShellProps) {
  return (
    <div className="flex h-screen bg-[#F5F7FA]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header user={user} breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto mt-18 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
```

#### Step 2.4: Update Dashboard Layout (15 mins)

**File:** `app/(dashboard)/layout.tsx`

```typescript
import { PropsWithChildren } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const supabase = createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const userData = {
    name: user.user_metadata?.full_name || 'User',
    email: user.email || '',
    avatar: user.user_metadata?.avatar_url,
  }

  return (
    <AppShell user={userData}>
      {children}
    </AppShell>
  )
}
```

---

### Day 3: Dashboard Page (6-8 hours)

See next section for complete dashboard implementation...

---

## Quick Reference: Common Patterns

### 1. Creating a New Page

```typescript
// app/(dashboard)/your-page/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Page | DraggonnB CRMM',
  description: 'Description of your page',
}

export default function YourPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Your Page</h1>
      {/* Your content */}
    </div>
  )
}
```

### 2. Using shadcn/ui Components

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    <Button>Click Me</Button>
  </CardContent>
</Card>
```

### 3. Fetching Supabase Data

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function YourComponent() {
  const [data, setData] = useState([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: results } = await supabase
        .from('your_table')
        .select('*')
        .eq('organization_id', 'your-org-id')

      setData(results || [])
    }

    fetchData()
  }, [])

  return <div>{/* Render data */}</div>
}
```

### 4. Using Gradient Buttons

```typescript
<Button className="gradient-primary text-white">
  Primary Action
</Button>

<Button className="gradient-orange text-white">
  Upgrade Now
</Button>

<Button className="gradient-brand text-white">
  Brand Action
</Button>
```

---

## Testing Your Work

### After Day 1 (Auth):
```bash
npm run dev
# Visit http://localhost:3000/login
# Test signup flow
# Test login flow
```

### After Day 2 (Layout):
```bash
npm run dev
# Visit http://localhost:3000/dashboard
# Check sidebar navigation
# Check header with user menu
# Check responsive behavior
```

### After Day 3 (Dashboard):
```bash
npm run dev
# Visit http://localhost:3000/dashboard
# Verify all widgets render
# Check data displays correctly
```

---

## Next Steps After Phase 1

1. Build dashboard page components (Day 3)
2. Create content generation UI (Week 2)
3. Implement calendar view (Week 2)
4. Build contacts management (Week 3)
5. Create analytics dashboard (Week 3)

---

## Troubleshooting

### shadcn/ui components not found?
```bash
# Make sure you ran the add commands
npx shadcn@latest add button
npx shadcn@latest add card
# etc...
```

### Tailwind classes not working?
```bash
# Rebuild
npm run build
# Restart dev server
npm run dev
```

### Supabase errors?
```bash
# Check .env.local has correct values
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

**END OF QUICK START GUIDE**

**Status:** Ready to implement
**Estimated Time:** 2-3 days for Phase 1
