import { NextResponse } from 'next/server'

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message,
    },
    { status: 200 }
  )
}

/**
 * Created response (201)
 */
export function createdResponse<T>(data: T, message?: string) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message,
    },
    { status: 201 }
  )
}

/**
 * Bad request response (400)
 */
export function badRequestResponse(error: string) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
    },
    { status: 400 }
  )
}

/**
 * Unauthorized response (401)
 */
export function unauthorizedResponse(error: string = 'Unauthorized') {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
    },
    { status: 401 }
  )
}

/**
 * Forbidden response (403)
 */
export function forbiddenResponse(error: string = 'Forbidden') {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
    },
    { status: 403 }
  )
}

/**
 * Not found response (404)
 */
export function notFoundResponse(error: string = 'Resource not found') {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
    },
    { status: 404 }
  )
}

/**
 * Conflict response (409)
 */
export function conflictResponse(error: string) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
    },
    { status: 409 }
  )
}

/**
 * Internal server error response (500)
 */
export function serverErrorResponse(error: string = 'Internal server error') {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error,
    },
    { status: 500 }
  )
}

/**
 * Validation error response
 */
export function validationErrorResponse(errors: Record<string, string>) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: 'Validation failed',
      data: errors,
    },
    { status: 400 }
  )
}
