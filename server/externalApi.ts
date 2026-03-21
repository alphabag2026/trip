/**
 * External REST API for third-party integrations
 * 
 * Base path: /api/v1
 * Authentication: Bearer token (API Key)
 * 
 * Endpoints:
 *   GET  /api/v1/meetups              - List meetups
 *   GET  /api/v1/meetups/:id          - Get meetup detail
 *   GET  /api/v1/registrations        - List registrations (filterable by meetupId)
 *   GET  /api/v1/registrations/:id    - Get registration detail
 *   POST /api/v1/registrations        - Create registration
 *   PUT  /api/v1/registrations/:id    - Update registration
 *   GET  /api/v1/flights              - List flight schedules
 *   GET  /api/v1/hotel-vouchers       - List hotel vouchers
 *   GET  /api/v1/flight-tickets       - List flight tickets
 *   GET  /api/v1/bookings/search      - Search flights/hotels (affiliate)
 *   GET  /api/v1/organizations        - List organizations
 *   GET  /api/v1/stats                - Platform statistics
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import {
  getApiKeyByHash,
  updateApiKeyLastUsed,
  createApiRequestLog,
  getApiUsageStats,
  getMeetups,
  getMeetupById,
  getRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistration,
  getFlightSchedules,
  getAllHotelVouchers,
  getHotelVouchersByMeetup,
  getAllFlightTickets,
  getFlightTicketsByMeetup,
  getBookingSearches,
  getPlatformStats,
} from "./db";
import type { ApiKey } from "../drizzle/schema";

// Extend Express Request to include apiKey
interface AuthenticatedRequest extends Request {
  apiKey?: ApiKey;
}

// ── API Key Authentication Middleware ──────────────────────
async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
    });
    return;
  }

  const apiKeyRaw = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(apiKeyRaw).digest("hex");

  try {
    const apiKey = await getApiKeyByHash(keyHash);
    if (!apiKey) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid API key" });
      return;
    }

    if (!apiKey.isActive) {
      res.status(403).json({ error: "Forbidden", message: "API key is deactivated" });
      return;
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      res.status(403).json({ error: "Forbidden", message: "API key has expired" });
      return;
    }

    // Rate limiting check
    const usage = await getApiUsageStats(apiKey.id);
    if (apiKey.rateLimit && usage.hourlyRequests >= apiKey.rateLimit) {
      res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Limit: ${apiKey.rateLimit}/hour`,
        retryAfter: 3600,
      });
      return;
    }

    // Update last used timestamp
    await updateApiKeyLastUsed(apiKey.id);

    // Log request
    const originalEnd = res.end.bind(res);
    (res as any).__originalEnd = originalEnd;
    const capturedApiKeyId = apiKey.id;
    const capturedMethod = req.method;
    const capturedUrl = req.originalUrl;
    const capturedIp = req.ip || req.socket.remoteAddress || "unknown";
    res.on("finish", () => {
      createApiRequestLog({
        apiKeyId: capturedApiKeyId,
        method: capturedMethod,
        endpoint: capturedUrl,
        statusCode: res.statusCode,
        responseTimeMs: Date.now() - startTime,
        ipAddress: capturedIp,
      }).catch(() => {}); // fire-and-forget
    });

    req.apiKey = apiKey;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: "Authentication failed" });
  }
}

// ── Permission Check Helper ──────────────────────
function hasPermission(apiKey: ApiKey, permission: string): boolean {
  if (!apiKey.permissions) return true; // no restrictions = full access
  try {
    const perms: string[] = JSON.parse(apiKey.permissions);
    return perms.includes(permission) || perms.includes("*");
  } catch {
    return false;
  }
}

function checkPermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey || !hasPermission(req.apiKey, permission)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Missing permission: ${permission}`,
      });
      return;
    }
    next();
  };
}

// ── Pagination Helper ──────────────────────
function getPagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginatedResponse(data: any[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

// ── Create Router ──────────────────────────────────
export function createExternalApiRouter(): Router {
  const router = Router();

  // Apply authentication to all routes
  router.use(authenticateApiKey as any);

  // ── GET /meetups ──────────────────────
  router.get("/meetups", checkPermission("meetups:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, status } = req.query as { type?: string; status?: string };
      const meetups = await getMeetups({ type, status });
      
      // Filter by organization if API key is org-scoped
      const filtered = req.apiKey?.organizationId
        ? meetups.filter((m: any) => m.organizationId === req.apiKey!.organizationId)
        : meetups;

      res.json({ data: filtered, total: filtered.length });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch meetups" });
    }
  });

  // ── GET /meetups/:id ──────────────────────
  router.get("/meetups/:id", checkPermission("meetups:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meetup = await getMeetupById(parseInt(req.params.id));
      if (!meetup) {
        res.status(404).json({ error: "Not Found", message: "Meetup not found" });
        return;
      }
      // Check org scope
      if (req.apiKey?.organizationId && (meetup as any).organizationId !== req.apiKey.organizationId) {
        res.status(403).json({ error: "Forbidden", message: "Access denied to this meetup" });
        return;
      }
      res.json({ data: meetup });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch meetup" });
    }
  });

  // ── GET /registrations ──────────────────────
  router.get("/registrations", checkPermission("registrations:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { meetupId, status } = req.query as { meetupId?: string; status?: string };
      const filters: any = {};
      if (meetupId) filters.meetupId = parseInt(meetupId);
      if (status) filters.status = status;
      
      const registrations = await getRegistrations(filters);
      res.json({ data: registrations, total: registrations.length });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch registrations" });
    }
  });

  // ── GET /registrations/:id ──────────────────────
  router.get("/registrations/:id", checkPermission("registrations:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const registration = await getRegistrationById(parseInt(req.params.id));
      if (!registration) {
        res.status(404).json({ error: "Not Found", message: "Registration not found" });
        return;
      }
      res.json({ data: registration });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch registration" });
    }
  });

  // ── POST /registrations ──────────────────────
  router.post("/registrations", checkPermission("registrations:write") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { meetupId, name, nameEn, phone, email, nationality, passportNumber, organization, role, dietaryRestrictions, specialRequests, notes } = req.body;
      
      if (!meetupId || !name || !phone) {
        res.status(400).json({
          error: "Bad Request",
          message: "Required fields: meetupId, name, phone",
        });
        return;
      }

      const regData: any = {
        meetupId: parseInt(meetupId),
        name,
        phone,
        messengerId: "",
        status: "pending" as const,
      };
      if (nameEn) regData.nameEn = nameEn;
      if (email) regData.email = email;
      if (nationality) regData.nationality = nationality;
      if (passportNumber) regData.passportNumber = passportNumber;
      if (organization) regData.organization = organization;
      if (role) regData.role = role;
      if (dietaryRestrictions) regData.dietaryRestrictions = dietaryRestrictions;
      if (specialRequests) regData.specialRequests = specialRequests;
      if (notes) regData.notes = notes;

      const id = await createRegistration(regData);

      res.status(201).json({ data: { id }, message: "Registration created successfully" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to create registration" });
    }
  });

  // ── PUT /registrations/:id ──────────────────────
  router.put("/registrations/:id", checkPermission("registrations:write") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await getRegistrationById(id);
      if (!existing) {
        res.status(404).json({ error: "Not Found", message: "Registration not found" });
        return;
      }

      // Only allow updating specific fields
      const allowedFields = ["name", "nameEn", "phone", "email", "nationality", "passportNumber", "organization", "role", "dietaryRestrictions", "specialRequests", "notes", "status"];
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      await updateRegistration(id, updates);
      res.json({ data: { id }, message: "Registration updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to update registration" });
    }
  });

  // ── GET /flights ──────────────────────
  router.get("/flights", checkPermission("flights:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { meetupId, registrationId, direction } = req.query as { meetupId?: string; registrationId?: string; direction?: string };
      const filters: any = {};
      if (meetupId) filters.meetupId = parseInt(meetupId);
      if (registrationId) filters.registrationId = parseInt(registrationId);
      if (direction) filters.direction = direction;
      
      const flights = await getFlightSchedules(filters);
      res.json({ data: flights, total: flights.length });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch flights" });
    }
  });

  // ── GET /hotel-vouchers ──────────────────────
  router.get("/hotel-vouchers", checkPermission("vouchers:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { meetupId } = req.query as { meetupId?: string };
      const vouchers = meetupId
        ? await getHotelVouchersByMeetup(parseInt(meetupId))
        : await getAllHotelVouchers();
      res.json({ data: vouchers, total: vouchers.length });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch hotel vouchers" });
    }
  });

  // ── GET /flight-tickets ──────────────────────
  router.get("/flight-tickets", checkPermission("tickets:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { meetupId } = req.query as { meetupId?: string };
      const tickets = meetupId
        ? await getFlightTicketsByMeetup(parseInt(meetupId))
        : await getAllFlightTickets();
      res.json({ data: tickets, total: tickets.length });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch flight tickets" });
    }
  });

  // ── GET /bookings/search-history ──────────────────────
  router.get("/bookings/search-history", checkPermission("bookings:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { meetupId, searchType, limit } = req.query as { meetupId?: string; searchType?: string; limit?: string };
      const filters: any = {};
      if (meetupId) filters.meetupId = parseInt(meetupId);
      if (searchType) filters.searchType = searchType;
      if (limit) filters.limit = parseInt(limit);
      
      const searches = await getBookingSearches(filters);
      res.json({ data: searches, total: searches.length });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch booking history" });
    }
  });

  // ── GET /stats ──────────────────────
  router.get("/stats", checkPermission("stats:read") as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await getPlatformStats();
      res.json({ data: stats });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch stats" });
    }
  });

  // ── API Documentation ──────────────────────
  router.get("/", (_req: Request, res: Response) => {
    res.json({
      name: "Meetup Travel External API",
      version: "1.0.0",
      documentation: "https://docs.meetup-travel.com/api",
      endpoints: [
        { method: "GET", path: "/api/v1/meetups", description: "List meetups", permission: "meetups:read" },
        { method: "GET", path: "/api/v1/meetups/:id", description: "Get meetup detail", permission: "meetups:read" },
        { method: "GET", path: "/api/v1/registrations", description: "List registrations", permission: "registrations:read" },
        { method: "GET", path: "/api/v1/registrations/:id", description: "Get registration detail", permission: "registrations:read" },
        { method: "POST", path: "/api/v1/registrations", description: "Create registration", permission: "registrations:write" },
        { method: "PUT", path: "/api/v1/registrations/:id", description: "Update registration", permission: "registrations:write" },
        { method: "GET", path: "/api/v1/flights", description: "List flight schedules", permission: "flights:read" },
        { method: "GET", path: "/api/v1/hotel-vouchers", description: "List hotel vouchers", permission: "vouchers:read" },
        { method: "GET", path: "/api/v1/flight-tickets", description: "List flight tickets", permission: "tickets:read" },
        { method: "GET", path: "/api/v1/bookings/search-history", description: "Booking search history", permission: "bookings:read" },
        { method: "GET", path: "/api/v1/stats", description: "Platform statistics", permission: "stats:read" },
      ],
      authentication: "Bearer token in Authorization header",
      rateLimit: "1000 requests/hour (configurable per key)",
    });
  });

  return router;
}
