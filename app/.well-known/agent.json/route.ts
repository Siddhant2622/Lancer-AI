import { NextResponse } from 'next/server';
import { buildAgentManifest } from '@/app/api/agent/capabilities/route';

export async function GET() {
  return NextResponse.json(buildAgentManifest());
}

