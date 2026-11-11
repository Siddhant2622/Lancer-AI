import { NextResponse } from 'next/server';
import { generateSmartContractWithAI } from '@/lib/ai-engine';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { key: 'agent:generate_contract', max: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const prompt = String(body.prompt || '').trim();
    if (!prompt || prompt.length < 5 || prompt.length > 4000) {
      return NextResponse.json(
        { success: false, error: 'Project prompt must be between 5 and 4,000 characters.' },
        { status: 400 }
      );
    }

    const plan = await generateSmartContractWithAI(prompt);
    return NextResponse.json({
      success: true,
      ...plan,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Contract generation failed' },
      { status: 500 }
    );
  }
}

