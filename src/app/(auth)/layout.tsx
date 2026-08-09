export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-xl font-semibold text-zinc-900">
          Spending Tracker
        </h1>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
