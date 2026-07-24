/** Centered single-card layout for authentication screens. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 pt-safe pb-safe">
      {children}
    </main>
  );
}
