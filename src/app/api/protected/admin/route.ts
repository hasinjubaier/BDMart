import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/require-role';
import { AuthError } from '@/lib/auth/types';

export async function GET(request: NextRequest) {
  try {
    // Check cookie or Authorization Bearer header
    const authHeader = request.headers.get('authorization');
    const tokenOverride = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    const user = await requireRole(['admin'], tokenOverride);

    return NextResponse.json({
      status: 'authorized',
      message: 'Access granted to platform administrator resource.',
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
