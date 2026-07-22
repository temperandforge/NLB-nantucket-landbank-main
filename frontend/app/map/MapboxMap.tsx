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



    mapRef.current.on('load', async () => {
      try {
        if (!mapRef.current) return;
        const map = mapRef.current;

        // 2. Fetch the pre-converted GeoJSON from /public/route.geojson
        const response = await fetch('/geojson/sample.geojson');
        const geojsonData = await response.json(); 

        // Assign ID's to map elements
        geojsonData.features.forEach((feature: Record<string, unknown>, index: number) => {
          feature.id = index;
        });

        // 3. Add the GeoJSON directly as a Mapbox source
        mapRef.current.addSource('gpx-route', {
          type: 'geojson',
          data: geojsonData,
        });

        // 4. Add a line layer to render the track
        mapRef.current.addLayer({
          id: 'gpx-route-line',
          type: 'line',
          source: 'gpx-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#c60024',
            'line-width': 1,
          },
        });

        // 5. Fit the map bounds around the GeoJSON feature coordinates
        const coordinates = geojsonData.features.flatMap((feature: Record<string, unknown>) => {
          if (feature.geometry.type === 'LineString') {
            return feature.geometry.coordinates;
          }
          if (feature.geometry.type === 'MultiLineString') {
            return feature.geometry.coordinates.flat();
          }
          return [];
        });

        if (coordinates.length > 0) {
          const bounds = coordinates.reduce(
            (acc: mapboxgl.LngLatBounds, coord: [number, number]) => acc.extend(coord),
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );

          map.fitBounds(bounds, { padding: 40 });
        }
      } catch (error) {
        console.error('Failed to load route.geojson:', error);
      }
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

      let hoveredStateId: number | undefined = undefined;

      for (const [index, property] of properties.entries()) {
        const html = buildPopupHtml(property);
        const popup = new mapboxgl.Popup({ offset: 24 }).setHTML(html);

        const marker = new mapboxgl.Marker()
          .setLngLat(property.coordinates)
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);

        const markerDiv = marker.getElement();

        markerDiv.addEventListener('mouseenter', () => {
          // If the mouse moved from another feature, remove its hover state
          if (hoveredStateId !== undefined) {
            map.setFeatureState(
              { source: 'property-geojson', id: hoveredStateId },
              { hover: false }
            );
          }
          // Set  hover state for new feature
          hoveredStateId = index;
          map.setFeatureState(
              { source: 'property-geojson', id: hoveredStateId },
              { hover: true }
          );

          // Marker  hover effect
          markerDiv.style.transition = 'top .2s ease';
          markerDiv.style.top = '-6px';
          markerDiv.style.cursor = 'pointer';
        });

        markerDiv.addEventListener('mouseleave', () => {
          if (hoveredStateId === undefined) return;

          map.setFeatureState(
              { source: 'property-geojson', id: hoveredStateId },
              { hover: false }
          );
          // Marker hover effect
          markerDiv.style.top = 0;
          markerDiv.style.cursor = 'auto';
        });
      }

      const geojsonFeatures = properties
        .filter((property) => property.geojson)
        .map((property, index) => ({
          id: index,
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
          paint: {
            "fill-color": "#2563eb",
            "fill-opacity": [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.4, // hover
              0.2, // default
            ],
            'fill-opacity-transition': {
                'duration': 300,
            }
          },
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
