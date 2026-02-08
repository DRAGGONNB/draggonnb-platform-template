'use client'

import { useEffect, useState } from 'react'
import { Building2, Plus, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Property {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  province: string | null
  amenities: string[]
  status: string
  check_in_time: string
  check_out_time: string
  accommodation_units: { count: number }[]
  created_at: string
}

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'guesthouse', label: 'Guesthouse' },
  { value: 'bnb', label: 'B&B' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'resort', label: 'Resort' },
  { value: 'other', label: 'Other' },
]

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newProperty, setNewProperty] = useState({ name: '', type: 'guesthouse', city: '', province: '' })

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/accommodation/properties')
      if (res.status === 403) {
        setError('Accommodation module requires Growth tier or above.')
        return
      }
      const data = await res.json()
      setProperties(data.properties || [])
    } catch {
      setError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProperties() }, [])

  const handleCreate = async () => {
    if (!newProperty.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/accommodation/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewProperty({ name: '', type: 'guesthouse', city: '', province: '' })
        fetchProperties()
      }
    } catch {
      setError('Failed to create property')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Properties
          </h1>
          <p className="text-muted-foreground mt-2">Manage your accommodation properties</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> Add Property
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {showCreate && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New Property</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={newProperty.name} onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })} placeholder="e.g., Seaside Guesthouse" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newProperty.type} onValueChange={(v) => setNewProperty({ ...newProperty, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={newProperty.city} onChange={(e) => setNewProperty({ ...newProperty, city: e.target.value })} placeholder="e.g., Cape Town" />
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                <Input value={newProperty.province} onChange={(e) => setNewProperty({ ...newProperty, province: e.target.value })} placeholder="e.g., Western Cape" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Property
            </Button>
          </CardContent>
        </Card>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No properties yet. Add your first property to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{property.name}</CardTitle>
                  <span className={`px-2 py-1 rounded-full text-xs ${property.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {property.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">{property.type}</p>
              </CardHeader>
              <CardContent>
                {(property.city || property.province) && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3" />
                    {[property.city, property.province].filter(Boolean).join(', ')}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {property.accommodation_units?.[0]?.count || 0} units
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Check-in: {property.check_in_time} | Check-out: {property.check_out_time}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
