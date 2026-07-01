import { NextResponse } from "next/server";

export type ApiErrorBody = { error: string };

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message } satisfies ApiErrorBody, { status });
}

export function successResponse<T>(data: T, status?: number, extraHeaders?: Record<string, string>) {
  return NextResponse.json(data, {
    status: status ?? 200,
    headers: extraHeaders,
  });
}
