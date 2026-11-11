import { Suspense } from 'react';
import LiveWorkspace from '@/components/workspace/LiveWorkspace';

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-6">
          <div className="glass-panel rounded-2xl px-6 py-4 text-xs font-semibold text-slate-600">
            Initializing Real Project Execution Workspace...
          </div>
        </div>
      }
    >
      <LiveWorkspace />
    </Suspense>
  );
}

