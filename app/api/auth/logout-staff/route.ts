import { NextResponse } from 'next/server';
import { COACH_SESSION_COOKIE_NAME } from '@/lib/auth/staff-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COACH_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
