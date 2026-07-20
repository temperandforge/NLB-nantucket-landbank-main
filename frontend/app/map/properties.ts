import type { Property } from "./types";

export const NANTUCKET_CENTER: [number, number] = [-70.0995, 41.2835];

export const properties: Property[] = [
  {
    id: "surfside-beach",
    name: "Surfside Beach",
    propertyTypes: ["beach"],
    resources: ["parking", "handicap_accessible", "restrooms", "lifeguard", "dog_friendly"],
    coordinates: [-70.0942, 41.246],
    image: {
      url: '/images/properties/surfside-beach.jpg',
      alt: 'surfside beach',
    },
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    link: '#',
    geojson: {
      // Irregular strip hugging the south shore, following the curve of the coastline.
      type: "Polygon",
      coordinates: [
        [
          [-70.1012, 41.2432],
          [-70.0968, 41.2421],
          [-70.0918, 41.2427],
          [-70.0879, 41.2441],
          [-70.0871, 41.2461],
          [-70.0901, 41.2472],
          [-70.0949, 41.2469],
          [-70.0996, 41.2458],
          [-70.1012, 41.2432],
        ],
      ],
    },
  },
  {
    id: "jetties-beach",
    name: "Jetties Beach",
    propertyTypes: ["beach"],
    resources: ["parking", "handicap_accessible", "restrooms", "lifeguard", "picnic_area"],
    coordinates: [-70.1073, 41.2989],
    geojson: {
      // Narrower crescent along the harbor mouth.
      type: "Polygon",
      coordinates: [
        [
          [-70.1131, 41.2967],
          [-70.1098, 41.2959],
          [-70.1057, 41.2963],
          [-70.1021, 41.2977],
          [-70.1014, 41.2994],
          [-70.1043, 41.3006],
          [-70.1089, 41.3002],
          [-70.1123, 41.2988],
          [-70.1131, 41.2967],
        ],
      ],
    },
  },
  {
    id: "madaket-beach",
    name: "Madaket Beach",
    propertyTypes: ["beach"],
    resources: ["parking", "restrooms", "lifeguard"],
    coordinates: [-70.2153, 41.2637],
    geojson: {
      // Long thin strip along the western tip of the island.
      type: "Polygon",
      coordinates: [
        [
          [-70.2231, 41.2601],
          [-70.2189, 41.2589],
          [-70.2141, 41.2593],
          [-70.2097, 41.2609],
          [-70.2079, 41.2631],
          [-70.2094, 41.2652],
          [-70.2136, 41.2661],
          [-70.2184, 41.2657],
          [-70.2222, 41.2634],
          [-70.2231, 41.2601],
        ],
      ],
    },
  },
  {
    id: "sanford-farm-trail",
    name: "Sanford Farm, Ram Pasture & The Woods",
    propertyTypes: ["trail", "conservation"],
    resources: ["parking", "dog_friendly"],
    coordinates: [-70.1633, 41.2743],
    geojson: {
      // Winding multi-leg loop trail typical of the Sanford Farm walking path.
      type: "LineString",
      coordinates: [
        [-70.1633, 41.2743],
        [-70.1668, 41.2751],
        [-70.1701, 41.2721],
        [-70.1739, 41.2733],
        [-70.1789, 41.269],
        [-70.1821, 41.2668],
        [-70.1852, 41.2652],
        [-70.1889, 41.2661],
        [-70.1927, 41.2643],
      ],
    },
  },
  {
    id: "middle-moors-trail",
    name: "Middle Moors",
    propertyTypes: ["trail", "conservation"],
    resources: ["dog_friendly"],
    coordinates: [-70.0453, 41.2718],
    geojson: {
      // Braided moorland track segments.
      type: "LineString",
      coordinates: [
        [-70.0453, 41.2718],
        [-70.0481, 41.2731],
        [-70.0512, 41.2739],
        [-70.0541, 41.2717],
        [-70.0571, 41.2701],
        [-70.0599, 41.2712],
        [-70.0629, 41.2723],
        [-70.0661, 41.2704],
      ],
    },
  },
  {
    id: "nantucket-harbor",
    name: "Nantucket Harbor",
    propertyTypes: ["harbor"],
    resources: ["parking", "handicap_accessible", "restrooms"],
    coordinates: [-70.0968, 41.2865],
    geojson: {
      // Rounded harbor basin shape, wider at the mouth and narrowing inland.
      type: "Polygon",
      coordinates: [
        [
          [-70.1041, 41.2891],
          [-70.0999, 41.2911],
          [-70.0951, 41.2913],
          [-70.0908, 41.2898],
          [-70.0891, 41.2871],
          [-70.0904, 41.2843],
          [-70.0942, 41.2828],
          [-70.0987, 41.2831],
          [-70.1024, 41.2851],
          [-70.1041, 41.2891],
        ],
      ],
    },
  },
  {
    id: "long-pond",
    name: "Long Pond",
    propertyTypes: ["pond", "conservation"],
    resources: ["parking", "dog_friendly", "picnic_area"],
    coordinates: [-70.1911, 41.2764],
    geojson: {
      // Elongated kettle pond, narrow and stretched north-south.
      type: "Polygon",
      coordinates: [
        [
          [-70.1928, 41.2699],
          [-70.1908, 41.2698],
          [-70.1896, 41.2724],
          [-70.1901, 41.2751],
          [-70.1889, 41.2778],
          [-70.1898, 41.2804],
          [-70.1916, 41.2812],
          [-70.1931, 41.2793],
          [-70.1922, 41.2761],
          [-70.1934, 41.2731],
          [-70.1928, 41.2699],
        ],
      ],
    },
  },
  {
    id: "dionis-beach",
    name: "Dionis Beach",
    propertyTypes: ["beach"],
    resources: ["parking", "handicap_accessible", "restrooms", "picnic_area"],
    coordinates: [-70.1367, 41.3105],
    geojson: {
      // Curved north-shore beach following the bay-facing coastline.
      type: "Polygon",
      coordinates: [
        [
          [-70.1441, 41.3081],
          [-70.1401, 41.3071],
          [-70.1357, 41.3077],
          [-70.1318, 41.3092],
          [-70.1301, 41.3109],
          [-70.1324, 41.3124],
          [-70.1369, 41.3128],
          [-70.1412, 41.3117],
          [-70.1441, 41.3081],
        ],
      ],
    },
  },
];
