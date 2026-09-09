export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[340px]">{children}</div>
    </div>
  );
}
