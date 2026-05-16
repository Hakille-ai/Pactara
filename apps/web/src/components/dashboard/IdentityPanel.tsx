import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { Identity, IdentityKind } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Fingerprint, KeyRound } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"
import { toast } from "sonner"

export function IdentityPanel() {
  const { identity, setIdentity } = useAppStore()
  const { runAction } = useAction()

  const [label, setLabel] = useState("Amadou")
  const [kind, setKind] = useState<IdentityKind>("person")
  const [isLoading, setIsLoading] = useState(false)

  async function createIdentity() {
    setIsLoading(true)
    const created = await runAction(
      () =>
        pactaraFetch<Identity>("/v1/identities", {
          method: "POST",
          body: JSON.stringify({ label, kind }),
        }),
      "Identity created successfully."
    )
    if (created) {
      setIdentity(created)
      toast.success("Identity Created", {
        description: `Successfully created ${kind} identity for ${label}.`,
      })
    }
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Identity Management</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage your sovereign identities on the PACTARA protocol.
        </p>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Create Identity</CardTitle>
              <CardDescription>Provision a new identity entity on the network.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div className="space-y-2">
              <Label htmlFor="label">Public Label</Label>
              <Input 
                id="label" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                placeholder="Enter identity name..."
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kind" className="text-white/70">Identity Kind</Label>
              <Select value={kind} onValueChange={(val) => setKind(val as IdentityKind)}>
                <SelectTrigger id="kind" className="glass-input">
                  <SelectValue placeholder="Select kind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="place">Place</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={() => void createIdentity()} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {isLoading ? "Creating..." : "Create Identity"}
          </Button>

          {identity && (
            <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-sm font-medium text-muted-foreground">Current Identity</h3>
              <JsonBlock value={identity} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
