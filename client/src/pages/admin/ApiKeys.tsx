import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  FileText,
} from "lucide-react";

const PERMISSION_OPTIONS = [
  { value: "*", label: "Full Access (All Permissions)" },
  { value: "meetups:read", label: "Meetups - Read" },
  { value: "registrations:read", label: "Registrations - Read" },
  { value: "registrations:write", label: "Registrations - Write" },
  { value: "flights:read", label: "Flights - Read" },
  { value: "vouchers:read", label: "Hotel Vouchers - Read" },
  { value: "tickets:read", label: "Flight Tickets - Read" },
  { value: "bookings:read", label: "Bookings - Read" },
  { value: "stats:read", label: "Statistics - Read" },
];

export default function ApiKeys() {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("1000");
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["*"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logStartDate, setLogStartDate] = useState("");
  const [logEndDate, setLogEndDate] = useState("");
  const [useFiltered, setUseFiltered] = useState(false);

  const apiKeysQuery = trpc.apiKeys.list.useQuery();
  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.apiKey);
      apiKeysQuery.refetch();
      toast.success("API key created successfully");
    },
    onError: (err) => toast.error(err.message),
  });
  const toggleMutation = trpc.apiKeys.toggle.useMutation({
    onSuccess: () => {
      apiKeysQuery.refetch();
      toast.success("API key updated");
    },
  });
  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      apiKeysQuery.refetch();
      toast.success("API key deleted");
    },
  });

  const logsQuery = trpc.apiKeys.logs.useQuery(
    { apiKeyId: selectedKeyId!, limit: 50 },
    { enabled: !!selectedKeyId && showLogs && !useFiltered }
  );
  const filteredLogsQuery = trpc.apiKeys.logsFiltered.useQuery(
    {
      apiKeyId: selectedKeyId!,
      startDate: logStartDate || undefined,
      endDate: logEndDate || undefined,
      limit: 100,
    },
    { enabled: !!selectedKeyId && showLogs && useFiltered }
  );
  const displayLogs = useFiltered ? filteredLogsQuery.data : logsQuery.data;
  const usageQuery = trpc.apiKeys.usage.useQuery(
    { apiKeyId: selectedKeyId! },
    { enabled: !!selectedKeyId && showLogs }
  );

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    const expiresInDays = newKeyExpiry === "never" ? undefined
      : newKeyExpiry === "30" ? 30
      : newKeyExpiry === "90" ? 90
      : newKeyExpiry === "365" ? 365
      : undefined;

    createMutation.mutate({
      name: newKeyName,
      permissions: selectedPermissions,
      rateLimit: parseInt(newKeyRateLimit) || 1000,
      expiresInDays,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setCreatedKey(null);
    setNewKeyName("");
    setNewKeyRateLimit("1000");
    setNewKeyExpiry("never");
    setSelectedPermissions(["*"]);
    setShowKey(false);
  };

  const togglePermission = (perm: string) => {
    if (perm === "*") {
      setSelectedPermissions(["*"]);
      return;
    }
    setSelectedPermissions((prev) => {
      const filtered = prev.filter((p) => p !== "*");
      if (filtered.includes(perm)) {
        return filtered.filter((p) => p !== perm);
      }
      return [...filtered, perm];
    });
  };

  const keys = apiKeysQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            {t("admin.apiKeys.title", "API Key Management")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("admin.apiKeys.description", "Manage API keys for external system integrations")}
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={(open) => { if (!open) handleCloseCreate(); else setShowCreate(true); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("admin.apiKeys.createKey", "Create API Key")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("admin.apiKeys.createKey", "Create API Key")}</DialogTitle>
              <DialogDescription>
                {t("admin.apiKeys.createDescription", "Generate a new API key for external integrations. The key will only be shown once.")}
              </DialogDescription>
            </DialogHeader>

            {createdKey ? (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-500">API Key Created!</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Copy this key now. It will not be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background/50 p-2 rounded text-xs font-mono break-all">
                      {showKey ? createdKey : "•".repeat(40)}
                    </code>
                    <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreate}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>{t("admin.apiKeys.keyName", "Key Name")}</Label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Partner CRM Integration"
                  />
                </div>

                <div>
                  <Label>{t("admin.apiKeys.permissions", "Permissions")}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PERMISSION_OPTIONS.map((perm) => (
                      <button
                        key={perm.value}
                        onClick={() => togglePermission(perm.value)}
                        className={`text-left text-xs p-2 rounded border transition-colors ${
                          selectedPermissions.includes(perm.value)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        {perm.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("admin.apiKeys.rateLimit", "Rate Limit (req/hour)")}</Label>
                    <Input
                      type="number"
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{t("admin.apiKeys.expiry", "Expiry")}</Label>
                    <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseCreate}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* API Endpoint Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("admin.apiKeys.apiEndpoint", "API Endpoint")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
            <code className="text-sm font-mono flex-1">
              {window.location.origin}/api/v1
            </code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${window.location.origin}/api/v1`)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Bearer Token Auth</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Rate Limited</span>
            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> JSON Response</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Usage Example:</p>
            <pre className="bg-muted/30 p-2 rounded text-[11px] overflow-x-auto">
{`curl -H "Authorization: Bearer mt_live_xxx..." \\
  ${window.location.origin}/api/v1/meetups`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.apiKeys.activeKeys", "Active Keys")}</CardTitle>
          <CardDescription>{keys.length} {t("admin.apiKeys.keysTotal", "keys total")}</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t("admin.apiKeys.noKeys", "No API keys created yet")}</p>
              <p className="text-sm mt-1">Create your first API key to enable external integrations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.apiKeys.name", "Name")}</TableHead>
                  <TableHead>{t("admin.apiKeys.keyPrefixCol", "Key Prefix")}</TableHead>
                  <TableHead>{t("admin.apiKeys.status", "Status")}</TableHead>
                  <TableHead>{t("admin.apiKeys.rateLimitCol", "Rate Limit")}</TableHead>
                  <TableHead>{t("admin.apiKeys.lastUsed", "Last Used")}</TableHead>
                  <TableHead>{t("admin.apiKeys.created", "Created")}</TableHead>
                  <TableHead className="text-right">{t("admin.apiKeys.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key: any) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.keyPrefix}...</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={key.isActive}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: key.id, isActive: checked })}
                        />
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Expired
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{key.rateLimit}/hr</TableCell>
                    <TableCell>
                      {key.lastUsedAt ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedKeyId(key.id);
                            setShowLogs(true);
                          }}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this API key? This action cannot be undone.")) {
                              deleteMutation.mutate({ id: key.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Usage Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={(open) => { setShowLogs(open); if (!open) { setUseFiltered(false); setLogStartDate(""); setLogEndDate(""); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Usage Logs</DialogTitle>
            <DialogDescription>Recent API requests for this key</DialogDescription>
          </DialogHeader>

          {/* Date Filter */}
          <div className="flex items-end gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">시작일</label>
              <Input type="date" value={logStartDate} onChange={(e) => setLogStartDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">종료일</label>
              <Input type="date" value={logEndDate} onChange={(e) => setLogEndDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <Button size="sm" variant={useFiltered ? "default" : "outline"} onClick={() => { setUseFiltered(true); filteredLogsQuery.refetch(); }} disabled={!logStartDate && !logEndDate}>
              필터 적용
            </Button>
            {useFiltered && (
              <Button size="sm" variant="ghost" onClick={() => { setUseFiltered(false); setLogStartDate(""); setLogEndDate(""); }}>
                초기화
              </Button>
            )}
          </div>

          {usageQuery.data && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Today</div>
                <div className="text-xl font-bold">{usageQuery.data.dailyRequests}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">This Hour</div>
                <div className="text-xl font-bold">{usageQuery.data.hourlyRequests}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-xl font-bold text-green-500">OK</div>
              </Card>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(displayLogs || []).map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.method}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-[200px] truncate">
                    {log.endpoint}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.statusCode < 400 ? "default" : "destructive"}>
                      {log.statusCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.responseTimeMs}ms</TableCell>
                </TableRow>
              ))}
              {(!displayLogs || displayLogs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No requests logged yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
