import { NextResponse } from "next/server";

// ─── Standard API error codes ─────────────────────────────────────────────────

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_BODY"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "DB_ERROR"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED";

// ─── Helper: return a typed JSON error response ───────────────────────────────

export function apiError(
  message: string,
  code: ApiErrorCode,
  status: number,
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

// ─── Common shortcuts ─────────────────────────────────────────────────────────

export const unauthorized = () =>
  apiError("No autorizado.", "UNAUTHORIZED", 401);

export const forbidden = () =>
  apiError("Acceso denegado.", "FORBIDDEN", 403);

export const notFound = (entity = "Recurso") =>
  apiError(`${entity} no encontrado.`, "NOT_FOUND", 404);

export const invalidBody = () =>
  apiError("El cuerpo de la solicitud no es válido.", "INVALID_BODY", 400);

export const validationError = (msg: string) =>
  apiError(msg, "VALIDATION_ERROR", 422);

export const conflict = (msg: string) =>
  apiError(msg, "CONFLICT", 409);

export const dbError = () =>
  apiError("Error de base de datos.", "DB_ERROR", 500);

export const internalError = () =>
  apiError("Error interno del servidor.", "INTERNAL_ERROR", 500);
