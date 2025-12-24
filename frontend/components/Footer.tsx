"use client";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="container py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>FPL Analyser by Haider</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
