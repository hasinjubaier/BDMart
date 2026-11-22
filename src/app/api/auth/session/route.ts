import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyFirebaseIdToken } from '@/lib/auth/admin';
import { syncFirebaseUser } from '@/lib/auth/sync-user';
import { createSessionToken, getSessionUser, sessionCookieOptions } from '@/lib/auth/session';

const sessionRequestSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
  name: z.string().optional(),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { idToken, name, phone } = parsed.data;

    // Verify Firebase ID Token
    const verifiedFirebaseUser = await verifyFirebaseIdToken(idToken);

    // Sync user with PostgreSQL database
    const user = await syncFirebaseUser({
      uid: verifiedFirebaseUser.uid,
      phone: phone || verifiedFirebaseUser.phone,
      email: verifiedFirebaseUser.email,
      name: name || verifiedFirebaseUser.name,
    });

    // Create signed session token
    const sessionToken = createSessionToken(user);

    // Set HttpOnly, Secure, SameSite=Lax cookie
    const response = NextResponse.json({
      status: 'success',
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        locale: user.locale,
      },
    });

    response.cookies.set({
      ...sessionCookieOptions,
      value: sessionToken,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        locale: user.locale,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    ...sessionCookieOptions,
    value: '',
    maxAge: 0,
  });
  return response;
}
