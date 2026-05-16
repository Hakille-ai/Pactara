export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-4 text-xs leading-relaxed text-foreground/90 font-mono scrollbar-thin scrollbar-thumb-muted-foreground/20">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
