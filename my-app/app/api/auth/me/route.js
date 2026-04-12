import { NextResponse } from 'next/server';
import { getTokenCookie } from '../../../utils/auth';

export async function GET(request) {
  try {
    const decoded = getTokenCookie(request);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ userId: decoded.userId });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
