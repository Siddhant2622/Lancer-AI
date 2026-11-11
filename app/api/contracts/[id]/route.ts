import { NextResponse } from 'next/server';
import {
  deleteContract,
  findContract,
  getLedger,
  getWebhookEvents,
  resetContractStore,
  saveContract,
} from '@/lib/store';
import { validateContractId, validatePositiveAmount, validateSplitRatios } from '@/lib/validation';
import { Milestone } from '@/lib/types';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!validateContractId(id)) {
    return NextResponse.json({ success: false, error: 'Invalid contract ID format' }, { status: 400 });
  }

  const contract = findContract(id);
  if (!contract) {
    return NextResponse.json({ success: false, error: `Contract ${id} not found` }, { status: 404 });
  }

  const ledger = getLedger(id);
  const webhooks = getWebhookEvents();

  return NextResponse.json({
    success: true,
    contract,
    ledger,
    webhooks,
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!validateContractId(id)) {
    return NextResponse.json({ success: false, error: 'Invalid contract ID format' }, { status: 400 });
  }

  try {
    const body = await req.json();
    if (body.action === 'reset') {
      const reset = resetContractStore(id);
      return NextResponse.json({ success: true, ...reset });
    }

    const current = findContract(id);
    if (!current) {
      return NextResponse.json({ success: false, error: `Contract ${id} not found` }, { status: 404 });
    }

    if (Array.isArray(body.contract?.milestones)) {
      for (const m of body.contract.milestones as Milestone[]) {
        if (m.amount !== undefined && validatePositiveAmount(m.amount) === null) {
          return NextResponse.json(
            { success: false, error: `Milestone ${m.id} requires a valid positive amount` },
            { status: 400 }
          );
        }
        if (Array.isArray(m.splitRatios) && !validateSplitRatios(m.splitRatios)) {
          return NextResponse.json(
            { success: false, error: `Milestone ${m.id} split ratios must sum to 100%` },
            { status: 400 }
          );
        }
      }
    }

    const updated = { ...current, ...body.contract, id };
    saveContract(updated);
    return NextResponse.json({ success: true, contract: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update contract' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!validateContractId(id)) {
    return NextResponse.json({ success: false, error: 'Invalid contract ID format' }, { status: 400 });
  }
  if (id === 'ESC-8842') {
    return NextResponse.json(
      { success: false, error: 'Flagship demo contract ESC-8842 cannot be deleted (use reset instead).' },
      { status: 400 }
    );
  }

  const deleted = deleteContract(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: `Contract ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({ success: true, deletedId: id });
}
