"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Property } from "./types";
import { NANTUCKET_CENTER } from "./properties";
import "../../css/popup.css";

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
      style: "mapbox://styles/tfdev/cmrmj301k000p01rdcrzp6qxr",
      center: NANTUCKET_CENTER,
      zoom: 11,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  /**
   * Helper function to build popup html
   * @param property
   * @returns html string
   */
  function buildPopupHtml(property: Property): string {
    const accessible = property.resources.includes("handicap_accessible")
      ? '<div class="map-popup--is-accessible">Handicap Accessible</div>'
      : "";

    const image = property.image
      ? `<img class="map-popup-image" src="${encodeURI(property.image.url)}" alt="${property.image.alt ?? ""}" />`
      : "";

    const desc = property.desc
      ? `<p class="map-popup-desc">${property.desc}</p>`
      : "";

    const parking = property.resources.includes("parking")
      ? '<div class="map-popup--is-parking">Parking Availability</div>'
      : "";

    const link = property.link
      ? `<a class="map-popup-link" href="${encodeURI(property.link)}">Find out more</a>`
      : "";

    return `
      ${accessible}
      ${image}
      <div class="map-popup--content">
        <div class="map-popup--content__inner">
          <div class="map-popup--content__headline">
            <p class="map-popup-title">${property.name}</p>
            ${desc}
          </div>
          ${parking}
        </div>
        ${link}
      </div>
    `;
  }
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
        const html = buildPopupHtml(property);
        const popup = new mapboxgl.Popup({ offset: 24 }).setHTML(html);

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
