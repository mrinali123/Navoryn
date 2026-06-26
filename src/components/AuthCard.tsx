interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              Navoryn
            </span>
          </a>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-navy-800 p-8 shadow-2xl">
          <h1 className="mb-1 text-2xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="mb-6 text-sm text-slate-400">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
