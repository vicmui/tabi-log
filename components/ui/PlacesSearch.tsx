'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, MapPin } from 'lucide-react'

export interface PlaceResult {
  label: string   // formattedAddress
  name: string    // displayName / first segment
  lat: number
  lng: number
}

interface Props {
  placeholder?: string
  onSelect: (result: PlaceResult) => void
  locationBias?: { lat: number; lng: number }
  compact?: boolean
}

/**
 * PlacesSearch
 * Uses the NEW google.maps.places.AutocompleteSuggestion API (2025+).
 * Drop-in replacement for react-google-places-autocomplete.
 * Place this file at: @/components/ui/PlacesSearch.tsx
 */
export default function PlacesSearch({
  placeholder = '搜尋地點...',
  onSelect,
  locationBias,
  compact = false,
}: Props) {
  const [query, setQuery]           = useState('')
  const [items, setItems]           = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [open, setOpen]             = useState(false)
  const tokenRef    = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const getToken = useCallback(() => {
    try {
      if (!tokenRef.current) {
        tokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken()
      }
    } catch (_) {}
    return tokenRef.current
  }, [])

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const fetch = useCallback(async (input: string) => {
    const g = (window as any).google?.maps?.places
    if (!g?.AutocompleteSuggestion || input.length < 2) { setItems([]); return }
    setLoading(true)
    try {
      const req: any = { input, sessionToken: getToken() }
      if (locationBias) {
        req.locationBias = new (window as any).google.maps.Circle({ center: locationBias, radius: 50000 })
      }
      const { suggestions } = await g.AutocompleteSuggestion.fetchAutocompleteSuggestions(req)
      setItems(suggestions ?? [])
      setOpen(true)
    } catch (_) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [getToken, locationBias])

  const handleChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetch(val), 300)
  }

  const handlePick = async (s: any) => {
    const pred = s.placePrediction
    if (!pred) return
    const text = pred.text?.toString() ?? pred.mainText?.toString() ?? ''
    setQuery(text)
    setOpen(false)
    try {
      const Place = (window as any).google.maps.places.Place
      const place = new Place({ id: pred.placeId })
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] })
      onSelect({
        label: place.formattedAddress ?? text,
        name:  place.displayName ?? text.split(',')[0],
        lat:   place.location?.lat() ?? 0,
        lng:   place.location?.lng() ?? 0,
      })
    } catch (_) {
      onSelect({ label: text, name: text.split(',')[0], lat: 0, lng: 0 })
    }
    tokenRef.current = null // reset session token after selection
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 border-b border-gray-200 focus-within:border-black transition-colors">
        {loading
          ? <Loader2 size={12} className="text-gray-300 animate-spin shrink-0" />
          : <Search size={12} className="text-gray-300 shrink-0" />
        }
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-transparent focus:outline-none placeholder:text-gray-300 text-sm ${compact ? 'py-1.5' : 'py-2'}`}
        />
      </div>

      {open && items.length > 0 && (
        <ul className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
          {items.map((s, i) => {
            const pred = s.placePrediction
            const main = pred?.mainText?.toString() ?? ''
            const sub  = pred?.secondaryText?.toString() ?? ''
            return (
              <li key={i}
                onMouseDown={e => { e.preventDefault(); handlePick(s) }}
                className="flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
              >
                <MapPin size={11} className="text-gray-300 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{main}</p>
                  {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
