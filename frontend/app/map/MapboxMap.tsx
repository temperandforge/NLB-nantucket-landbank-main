"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Property } from "./types";
import { NANTUCKET_CENTER } from "./properties";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MapboxMapProps {
  properties: Property[];
}

export function MapboxMap({ properties }: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: NANTUCKET_CENTER,
      zoom: 11,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function renderMarkersAndGeojson() {
      if (!map) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      for (const layerId of ["property-lines", "property-polygons"]) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      }
      if (map.getSource("property-geojson")) map.removeSource("property-geojson");

      for (const property of properties) {
        const popup = new mapboxgl.Popup({ offset: 24 }).setHTML(
          `<strong>${property.name}</strong><br/>${property.propertyTypes.join(", ")}`
        );
        const marker = new mapboxgl.Marker()
          .setLngLat(property.coordinates)
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }

      const geojsonFeatures = properties
        .filter((property) => property.geojson)
        .map((property) => ({
          type: "Feature" as const,
          properties: { id: property.id, name: property.name },
          geometry: property.geojson as GeoJSON.Geometry,
        }));

      if (geojsonFeatures.length > 0) {
        map.addSource("property-geojson", {
          type: "geojson",
          data: { type: "FeatureCollection", features: geojsonFeatures },
        });

        map.addLayer({
          id: "property-lines",
          type: "line",
          source: "property-geojson",
          filter: ["==", ["geometry-type"], "LineString"],
          paint: { "line-color": "#2563eb", "line-width": 3 },
        });

        map.addLayer({
          id: "property-polygons",
          type: "fill",
          source: "property-geojson",
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.2 },
        });
      }
    }

    if (map.isStyleLoaded()) {
      renderMarkersAndGeojson();
    } else {
      map.once("load", renderMarkersAndGeojson);
    }
  }, [properties]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}
