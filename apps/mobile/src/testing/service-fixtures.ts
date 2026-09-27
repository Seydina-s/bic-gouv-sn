import type { PublicService, StateServicesResponse } from "@bgs/shared-types";

// Test data with placeholder names and positions, not real services.
const BASE: Omit<PublicService, "id" | "category" | "name" | "location"> = {
  address: null,
  town: null,
  phone: null,
  website: null,
  openingHours: null,
  verifiedAt: "2026-09-27T04:00:00Z",
  origin: "osm",
};

export const STATE_SERVICES: StateServicesResponse = {
  services: [
    {
      ...BASE,
      id: "osm-n1",
      category: "mairie",
      name: "Mairie de test loin",
      location: { lat: 14.8, lng: -17.4 },
    },
    {
      ...BASE,
      id: "osm-n2",
      category: "police",
      name: "Commissariat de test proche",
      location: { lat: 14.701, lng: -17.4 },
      address: "Rue de test",
      openingHours: "Mo-Fr 08:00-17:00",
      phone: "+221 00 000 00 00",
    },
    {
      ...BASE,
      id: "osm-n3",
      category: "tribunal",
      name: "Tribunal de test",
      location: { lat: 14.75, lng: -17.4 },
    },
  ],
  places: [
    { id: "osm-n9", name: "Ville de test", kind: "city", location: { lat: 14.7, lng: -17.4 } },
    { id: "osm-n10", name: "Village de test", kind: "town", location: { lat: 15, lng: -16 } },
  ],
};
