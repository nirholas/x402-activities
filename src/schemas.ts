/**
 * Per-route request/response schemas published in the x402 402 challenge.
 *
 * GENERATED from `openapi.json` — the runtime challenge and the OpenAPI
 * document must agree, and the runtime is authoritative for x402scan
 * discovery. Regenerate rather than hand-editing.
 *
 * Shape follows the x402 Bazaar convention:
 *   `input`  — how to call the route (`type: "http"`, method, query params /
 *              JSON body fields)
 *   `output` — the JSON-Schema of the 200 response body.
 *
 * Keys match the paywall route map in `src/server.ts` exactly.
 */

export type RouteSchema = {
  /** How an agent invokes this route. */
  input: Record<string, unknown>;
  /** JSON-Schema of the artifact returned in the 200 body. */
  output: Record<string, unknown>;
};

export const ROUTE_SCHEMAS: Record<string, RouteSchema> = {
  "GET /search": {
    "input": {
      "type": "http",
      "method": "GET",
      "queryParams": {
        "lat": {
          "type": "number",
          "description": "Latitude, -90…90.",
          "example": 41.3851
        },
        "lon": {
          "type": "number",
          "description": "Longitude, -180…180.",
          "example": 2.1734
        },
        "radius": {
          "type": "number",
          "description": "Search radius in kilometres, 0…20. Default 1.",
          "example": 2
        }
      },
      "queryParamsRequired": [
        "lat",
        "lon"
      ]
    },
    "output": {
      "type": "object",
      "required": [
        "source",
        "query",
        "count",
        "activities",
        "retrievedAt"
      ],
      "properties": {
        "source": {
          "type": "string",
          "enum": [
            "amadeus",
            "fixture"
          ],
          "description": "`amadeus` = live API; `fixture` = deterministic demo data."
        },
        "query": {
          "type": "object",
          "properties": {
            "latitude": {
              "type": "number"
            },
            "longitude": {
              "type": "number"
            },
            "radiusKm": {
              "type": "number"
            }
          }
        },
        "count": {
          "type": "integer"
        },
        "retrievedAt": {
          "type": "string",
          "format": "date-time"
        },
        "activities": {
          "type": "array",
          "items": {
            "type": "object",
            "required": [
              "id",
              "name"
            ],
            "properties": {
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "shortDescription": {
                "type": "string"
              },
              "latitude": {
                "type": "number"
              },
              "longitude": {
                "type": "number"
              },
              "price": {
                "type": [
                  "object",
                  "null"
                ],
                "properties": {
                  "amount": {
                    "type": "string"
                  },
                  "currencyCode": {
                    "type": "string"
                  }
                }
              },
              "rating": {
                "type": [
                  "number",
                  "null"
                ]
              },
              "pictures": {
                "type": "array",
                "items": {
                  "type": "string",
                  "format": "uri"
                }
              },
              "bookingLink": {
                "type": [
                  "string",
                  "null"
                ],
                "format": "uri"
              },
              "minimumDuration": {
                "type": [
                  "string",
                  "null"
                ],
                "description": "ISO 8601 duration, e.g. PT2H30M."
              }
            }
          }
        }
      }
    }
  }
};
