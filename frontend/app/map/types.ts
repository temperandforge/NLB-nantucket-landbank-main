export type PropertyType = "beach" | "trail" | "conservation" | "harbor" | "pond";

export type Resource =
  | "parking"
  | "handicap_accessible"
  | "restrooms"
  | "lifeguard"
  | "picnic_area"
  | "dog_friendly";

export interface Property {
  id: string;
  name: string;
  propertyTypes: PropertyType[];
  resources: Resource[];
  coordinates: [number, number]; // [lng, lat]
  geojson?: GeoJSON.Geometry;
  image?: {
    url: string;
    alt?: string;
  },
  desc?: string;
  link?: string;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  beach: "Beach",
  trail: "Trail",
  conservation: "Conservation Land",
  harbor: "Harbor",
  pond: "Pond",
};

export const RESOURCE_LABELS: Record<Resource, string> = {
  parking: "Parking",
  handicap_accessible: "Handicap Accessible",
  restrooms: "Restrooms",
  lifeguard: "Lifeguard",
  picnic_area: "Picnic Area",
  dog_friendly: "Dog Friendly",
};
