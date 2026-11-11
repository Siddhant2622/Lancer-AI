import { Suspense } from 'react';
import LandingInteractive from '@/components/landing/LandingInteractive';

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F8FC] text-slate-500 flex items-center justify-center font-mono text-xs">
          Loading Lancer AI...
        </div>
      }
    >
      <LandingInteractive />
    </Suspense>
  );
}
