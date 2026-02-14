import type { PropertyTypeConfig, PropertyConfigMap, PriceBasis, MealPlan, GuestCategory } from '../types'

/**
 * Default configuration per property type.
 * Controls which features are shown/hidden in the UI.
 * New property types = new config entry, no code changes.
 */
export const PROPERTY_TYPE_DEFAULTS: Record<PropertyTypeConfig, PropertyConfigMap> = {
  game_lodge: {
    price_basis: 'per_person',
    has_room_layer: true,
    has_room_assignment: true,
    age_bands: ['adult', 'teenager', 'child', 'infant', 'senior'],
    waiver_required: true,
    default_meal_plan: 'full_board',
    features: {
      show_room_management: true,
      show_room_assignment: true,
      show_game_activities: true,
      show_waiver_section: true,
      show_conservation_levy: true,
      show_meal_plan_selector: true,
      show_transfer_services: true,
    },
  },

  guest_house: {
    price_basis: 'per_unit',
    has_room_layer: false,
    has_room_assignment: false,
    age_bands: ['adult', 'child'],
    waiver_required: false,
    default_meal_plan: 'bed_and_breakfast',
    features: {
      show_room_management: false,
      show_room_assignment: false,
      show_game_activities: false,
      show_waiver_section: false,
      show_conservation_levy: false,
      show_meal_plan_selector: true,
      show_transfer_services: false,
    },
  },

  vacation_rental: {
    price_basis: 'per_unit',
    has_room_layer: false,
    has_room_assignment: false,
    age_bands: ['adult', 'child'],
    waiver_required: false,
    default_meal_plan: 'self_catering',
    features: {
      show_room_management: false,
      show_room_assignment: false,
      show_game_activities: false,
      show_waiver_section: false,
      show_conservation_levy: false,
      show_meal_plan_selector: false,
      show_transfer_services: false,
    },
  },

  lodge: {
    price_basis: 'per_person',
    has_room_layer: true,
    has_room_assignment: true,
    age_bands: ['adult', 'teenager', 'child', 'infant'],
    waiver_required: false,
    default_meal_plan: 'half_board',
    features: {
      show_room_management: true,
      show_room_assignment: true,
      show_game_activities: false,
      show_waiver_section: false,
      show_conservation_levy: false,
      show_meal_plan_selector: true,
      show_transfer_services: true,
    },
  },
}

/**
 * Get the config map for a given property type, falling back to guest_house.
 */
export function getPropertyTypeDefaults(typeConfig: PropertyTypeConfig): PropertyConfigMap {
  return PROPERTY_TYPE_DEFAULTS[typeConfig] ?? PROPERTY_TYPE_DEFAULTS.guest_house
}

/**
 * All config keys that can be stored in accommodation_property_config.
 * These override the defaults from PROPERTY_TYPE_DEFAULTS.
 */
export const CONFIG_KEYS = [
  'price_basis',
  'has_room_layer',
  'has_room_assignment',
  'age_bands',
  'waiver_required',
  'default_meal_plan',
  'show_room_management',
  'show_room_assignment',
  'show_game_activities',
  'show_waiver_section',
  'show_conservation_levy',
  'show_meal_plan_selector',
  'show_transfer_services',
] as const

export type ConfigKey = (typeof CONFIG_KEYS)[number]

/**
 * Merge default config with per-property overrides from DB.
 */
export function mergePropertyConfig(
  typeConfig: PropertyTypeConfig,
  overrides: Array<{ config_key: string; config_value: unknown }>
): PropertyConfigMap {
  const defaults = getPropertyTypeDefaults(typeConfig)
  const merged = { ...defaults, features: { ...defaults.features } }

  for (const override of overrides) {
    const key = override.config_key as ConfigKey
    const value = override.config_value

    if (key === 'price_basis') merged.price_basis = value as PriceBasis
    else if (key === 'has_room_layer') merged.has_room_layer = value as boolean
    else if (key === 'has_room_assignment') merged.has_room_assignment = value as boolean
    else if (key === 'age_bands') merged.age_bands = value as GuestCategory[]
    else if (key === 'waiver_required') merged.waiver_required = value as boolean
    else if (key === 'default_meal_plan') merged.default_meal_plan = value as MealPlan
    else if (key in merged.features) merged.features[key] = value as boolean
  }

  return merged
}
