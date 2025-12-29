"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditUserSimpleDialog from "./edit-user-simple-dialog";
import EditUserAdvancedDialog from "./edit-user-advanced-dialog";
import EditFormDialog from "./edit-form-dialog";
import EditFormAdvancedDialog from "./edit-form-advanced-dialog";
import EditPaymentDialog from "./edit-payment-dialog";
import { LogOut, Users, FileText, Moon, Sun, CreditCard, Search, Trash2, RotateCcw, FileText as FileTextIcon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Input } from "@/components/ui/input";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  universityName: string;
  emailVerified?: boolean;
  registrationDone?: boolean;
  paymentDone?: boolean;
  submittedForms?: Record<string, unknown>;
  createdAt?: string;
  deleted?: boolean;
  deletedAt?: string;
}

interface Form {
  _id: string;
  title: string;
  status: string;
  fields?: Record<string, unknown>;
  owner?: {
    name: string;
    email: string;
    universityName: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Payment {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  universityName?: string;
  transactionId?: string;
  amount?: number;
  status: string;
  sendEmail?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface DuePayment {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  universityName: string;
  paymentId: string;
  transactionId: string;
  originalPlayerCount: number;
  currentPlayerCount: number;
  playerDifference: number;
  amountDue: number;
  status: string;
  resolutionStatus?: string; // 'pending' | 'in_progress' | 'resolved'
  lastUpdated: string;
  forms: Array<{
    formId: string;
    sport: string;
    originalPlayers: number;
    currentPlayers: number;
    difference: number;
  }>;
}

interface AuditLog {
  _id: string;
  timestamp: string;
  action: string;
  collection: string;
  recordId: string;
  userId?: string;
  userEmail?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedDuePayment, setSelectedDuePayment] = useState<DuePayment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [duePaymentSearchQuery, setDuePaymentSearchQuery] = useState("");
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  const fetchData = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [usersRes, formsRes, paymentsRes, duePaymentsRes, logsRes] = await Promise.all([
        fetch("/api/admin/registrations"),
        fetch("/api/admin/forms"),
        fetch("/api/admin/payments"),
        fetch("/api/admin/due-payments"),
        fetch("/api/admin/logs?limit=200"),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data || []);
      }

      if (formsRes.ok) {
        const formsData = await formsRes.json();
        setForms(formsData.data || []);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.data || []);
      }

      if (duePaymentsRes.ok) {
        const duePaymentsData = await duePaymentsRes.json();
        setDuePayments(duePaymentsData.data || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      if (isInitialLoad) {
        setIsInitialLoad(false);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true); // Show loading on initial load
    
    // Auto-reload every 2 seconds without showing loading state
    const interval = setInterval(() => {
      fetchData(false);
    }, 2000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: true }),
      });

      if (response.ok) {
        fetchData(true);
      } else {
        console.error("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleted: false }),
      });

      if (response.ok) {
        fetchData(true);
      } else {
        console.error("Failed to restore user");
      }
    } catch (error) {
      console.error("Error restoring user:", error);
    }
  };

  const handleToggleSendEmail = async (paymentId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: !currentValue }),
      });

      if (response.ok) {
        fetchData(true);
      } else {
        console.error("Failed to update sendEmail");
      }
    } catch (error) {
      console.error("Error updating sendEmail:", error);
    }
  };

  const handleSyncDuePayments = async () => {
    try {
      const response = await fetch("/api/sync/due-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Successfully synced ${result.count} due payment records to Google Sheets!`);
      } else {
        alert("❌ Failed to sync due payments to Google Sheets");
      }
    } catch (error) {
      console.error("Error syncing due payments:", error);
      alert("❌ Error syncing due payments to Google Sheets");
    }
  };

  const stats = {
    totalUsersVerified: users.filter((u) => !u.deleted && u.emailVerified).length,
    registered: users.filter((u) => !u.deleted && u.registrationDone).length,
    paidUnverified: payments.filter((p) => p.status !== "verified").length,
    totalForms: forms.length,
    verifiedPayments: payments.filter((p) => p.status === "verified").length,
    duePaymentsCount: duePayments.filter(dp => dp.amountDue > 0).length,
    overpaidCount: duePayments.filter(dp => dp.amountDue < 0).length,
    unpaidCount: duePayments.filter(dp => dp.status === "unpaid" || dp.status === "unverified").length,
    totalAmountDue: duePayments.reduce((sum, dp) => sum + (dp.amountDue > 0 ? dp.amountDue : 0), 0),
    totalOverpaid: Math.abs(duePayments.reduce((sum, dp) => sum + (dp.amountDue < 0 ? dp.amountDue : 0), 0)),
  };

  // Filter users based on search query and deleted status
  const filteredUsers = users.filter((user) => {
    // Filter by deleted status
    if (showDeletedUsers && !user.deleted) return false;
    if (!showDeletedUsers && user.deleted) return false;
    
    const searchLower = userSearchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower) ||
      user.universityName.toLowerCase().includes(searchLower) ||
      user._id.toLowerCase().includes(searchLower)
    );
  });

  // Filter forms based on search query
  const filteredForms = forms.filter((form) => {
    const searchLower = formSearchQuery.toLowerCase();
    return (
      form.title.toLowerCase().includes(searchLower) ||
      form.status.toLowerCase().includes(searchLower) ||
      form.owner?.name.toLowerCase().includes(searchLower) ||
      form.owner?.email.toLowerCase().includes(searchLower) ||
      form.owner?.universityName.toLowerCase().includes(searchLower) ||
      form._id.toLowerCase().includes(searchLower)
    );
  });

  // Filter payments based on search query
  const filteredPayments = payments.filter((payment) => {
    const searchLower = paymentSearchQuery.toLowerCase();
    return (
      payment.userName?.toLowerCase().includes(searchLower) ||
      payment.userEmail?.toLowerCase().includes(searchLower) ||
      payment.universityName?.toLowerCase().includes(searchLower) ||
      payment.transactionId?.toLowerCase().includes(searchLower) ||
      payment.status.toLowerCase().includes(searchLower) ||
      payment._id.toLowerCase().includes(searchLower)
    );
  });

  // Filter due payments based on search query
  const filteredDuePayments = duePayments.filter((duePayment) => {
    const searchLower = duePaymentSearchQuery.toLowerCase();
    return (
      duePayment.userName.toLowerCase().includes(searchLower) ||
      duePayment.userEmail.toLowerCase().includes(searchLower) ||
      duePayment.universityName.toLowerCase().includes(searchLower) ||
      duePayment.transactionId.toLowerCase().includes(searchLower) ||
      duePayment._id.toLowerCase().includes(searchLower) ||
      duePayment.forms.some(f => f.sport.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Portal
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Agneepath Registration Management
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="dark:border-gray-600"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="dark:border-gray-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Total Users (Verified)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats.totalUsersVerified}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Registered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats.registered}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Paid (Unverified)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {stats.paidUnverified}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Total Forms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats.totalForms}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Verified Payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats.verifiedPayments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList className="dark:bg-gray-800 dark:border-gray-700">
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="forms">
                <FileText className="h-4 w-4 mr-2" />
                Forms
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="h-4 w-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="due-payments" className="relative">
                <CreditCard className="h-4 w-4 mr-2" />
                Due Payments
                {(stats.duePaymentsCount > 0 || stats.overpaidCount > 0) && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {stats.duePaymentsCount + stats.overpaidCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="logs">
                <FileTextIcon className="h-4 w-4 mr-2" />
                Logs
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span>Auto-refresh every 2s</span>
            </div>
          </div>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="dark:text-white">Registered Users</CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Manage all user registrations
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm dark:text-gray-300">Show Deleted</Label>
                      <Switch
                        checked={showDeletedUsers}
                        onCheckedChange={setShowDeletedUsers}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm dark:text-gray-300">JSON Mode</Label>
                      <Switch
                        checked={advancedMode}
                        onCheckedChange={setAdvancedMode}
                      />
                    </div>
                  </div>
                </div>
                {/* Search Bar */}
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, phone, university, or ID..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No users found matching your search.
                      </div>
                    ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="dark:text-gray-300">Name</TableHead>
                          <TableHead className="dark:text-gray-300">Email</TableHead>
                          <TableHead className="dark:text-gray-300">Phone</TableHead>
                          <TableHead className="dark:text-gray-300">University</TableHead>
                          <TableHead className="dark:text-gray-300">Verified</TableHead>
                          <TableHead className="dark:text-gray-300">Registered</TableHead>
                          <TableHead className="dark:text-gray-300">Paid</TableHead>
                          <TableHead className="dark:text-gray-300">Forms</TableHead>
                          <TableHead className="dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user._id} className={`dark:border-gray-700 ${user.deleted ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <TableCell className="font-medium dark:text-white">
                              <div className="flex items-center gap-2">
                                {user.name}
                                {user.deleted && (
                                  <Badge variant="destructive" className="text-xs">Deleted</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="dark:text-gray-300">{user.email}</TableCell>
                            <TableCell className="dark:text-gray-300">{user.phone || "N/A"}</TableCell>
                            <TableCell className="max-w-xs truncate dark:text-gray-300">
                              {user.universityName}
                            </TableCell>
                            <TableCell>
                              {user.emailVerified ? (
                                <Badge variant="default">Yes</Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.registrationDone ? (
                                <Badge variant="default">Yes</Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.paymentDone ? (
                                <Badge variant="default">Yes</Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.submittedForms
                                ? Object.keys(user.submittedForms).length
                                : 0}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!user.deleted ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedUser(user)}
                                      className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user._id)}
                                      className="dark:bg-red-600 dark:hover:bg-red-700"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestoreUser(user._id)}
                                    className="dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900"
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Restore
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="dark:text-white">Registration Forms</CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Manage all submitted forms
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm dark:text-gray-300">JSON Mode</Label>
                    <Switch
                      checked={advancedMode}
                      onCheckedChange={setAdvancedMode}
                    />
                  </div>
                </div>
                {/* Search Bar */}
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by sport, status, owner name, email, university, or ID..."
                    value={formSearchQuery}
                    onChange={(e) => setFormSearchQuery(e.target.value)}
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {filteredForms.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No forms found matching your search.
                      </div>
                    ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="dark:text-gray-300">Sport/Event</TableHead>
                          <TableHead className="dark:text-gray-300">Status</TableHead>
                          <TableHead className="dark:text-gray-300">User Name</TableHead>
                          <TableHead className="dark:text-gray-300">Email</TableHead>
                          <TableHead className="dark:text-gray-300">University</TableHead>
                          <TableHead className="dark:text-gray-300">Created At</TableHead>
                          <TableHead className="dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredForms.map((form) => (
                          <TableRow key={form._id} className="dark:border-gray-700">
                            <TableCell className="font-medium dark:text-white">
                              {form.title}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  form.status === "submitted"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {form.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="dark:text-gray-300">{form.owner?.name || "N/A"}</TableCell>
                            <TableCell className="dark:text-gray-300">{form.owner?.email || "N/A"}</TableCell>
                            <TableCell className="max-w-xs truncate dark:text-gray-300">
                              {form.owner?.universityName || "N/A"}
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              {form.createdAt
                                ? new Date(form.createdAt).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedForm(form)}
                                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                View/Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Payment Records</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Manage all payment transactions and verification
                </CardDescription>
                {/* Search Bar */}
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, university, transaction ID, status, or ID..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {filteredPayments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No payments found matching your search.
                      </div>
                    ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="dark:text-gray-300">User Name</TableHead>
                          <TableHead className="dark:text-gray-300">Email</TableHead>
                          <TableHead className="dark:text-gray-300">University</TableHead>
                          <TableHead className="dark:text-gray-300">Transaction ID</TableHead>
                          <TableHead className="dark:text-gray-300">Amount</TableHead>
                          <TableHead className="dark:text-gray-300">Status</TableHead>
                          <TableHead className="dark:text-gray-300">Send Email?</TableHead>
                          <TableHead className="dark:text-gray-300">Date</TableHead>
                          <TableHead className="dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment._id} className="dark:border-gray-700">
                            <TableCell className="font-medium dark:text-white">
                              {payment.userName || "N/A"}
                            </TableCell>
                            <TableCell className="dark:text-gray-300">{payment.userEmail || "N/A"}</TableCell>
                            <TableCell className="max-w-xs truncate dark:text-gray-300">
                              {payment.universityName || "N/A"}
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              {payment.transactionId || "N/A"}
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              ₹{payment.amount || 0}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payment.status === "verified"
                                    ? "default"
                                    : payment.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={payment.sendEmail || false}
                                onCheckedChange={() => handleToggleSendEmail(payment._id, payment.sendEmail || false)}
                              />
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              {payment.createdAt
                                ? new Date(payment.createdAt).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPayment(payment)}
                                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Due Payments Tab */}
          <TabsContent value="due-payments">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Due Payments</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Track unpaid registrations and outstanding payments from player changes (₹800 per player)
                </CardDescription>
                {/* Search Bar */}
                <div className="mt-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, university, transaction ID, sport, or ID..."
                    value={duePaymentSearchQuery}
                    onChange={(e) => setDuePaymentSearchQuery(e.target.value)}
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                {(stats.duePaymentsCount > 0 || stats.overpaidCount > 0 || stats.unpaidCount > 0) && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.unpaidCount > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                          🚨 Unpaid/Unverified: {stats.unpaidCount} {stats.unpaidCount === 1 ? 'user' : 'users'}
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Full registration amount due
                        </p>
                      </div>
                    )}
                    {stats.duePaymentsCount > 0 && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                          ⚠️ Additional Due: {stats.duePaymentsCount} {stats.duePaymentsCount === 1 ? 'user' : 'users'}
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                          Total: ₹{stats.totalAmountDue.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {stats.overpaidCount > 0 && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                          💰 Overpaid: {stats.overpaidCount} {stats.overpaidCount === 1 ? 'user' : 'users'}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          Total: ₹{stats.totalOverpaid.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {filteredDuePayments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        {duePayments.length === 0 ? (
                          <div>
                            <p className="text-lg font-semibold mb-2">✅ No Due Payments</p>
                            <p className="text-sm">All registrations are fully paid!</p>
                          </div>
                        ) : (
                          "No due payments found matching your search."
                        )}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:border-gray-700">
                            <TableHead className="dark:text-gray-300">User</TableHead>
                            <TableHead className="dark:text-gray-300">Sports & Changes</TableHead>
                            <TableHead className="dark:text-gray-300">Amount</TableHead>
                            <TableHead className="dark:text-gray-300">Payment Status</TableHead>
                            <TableHead className="dark:text-gray-300">Resolution</TableHead>
                            <TableHead className="dark:text-gray-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDuePayments.map((duePayment) => (
                            <TableRow key={duePayment._id} className="dark:border-gray-700">
                              <TableCell className="dark:text-gray-300">
                                <div>
                                  <p className="font-medium dark:text-white">{duePayment.userName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{duePayment.userEmail}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{duePayment.universityName}</p>
                                </div>
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                <div className="space-y-1">
                                  {duePayment.forms.map((form, idx) => (
                                    <div key={idx} className="text-sm">
                                      <span className="font-medium">{form.sport}</span>{" "}
                                      <Badge variant="outline" className={form.difference > 0 ? "text-green-600" : "text-red-600"}>
                                        {form.difference > 0 ? "+" : ""}{form.difference} players
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                <div>
                                  <span className={`font-bold text-lg ${duePayment.amountDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {duePayment.amountDue > 0 ? "₹" : "-₹"}{Math.abs(duePayment.amountDue).toLocaleString()}
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {duePayment.originalPlayerCount} → {duePayment.currentPlayerCount} players
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="default" 
                                  className={
                                    duePayment.status === "unpaid" ? "bg-red-600" :
                                    duePayment.status === "unverified" ? "bg-yellow-600" :
                                    duePayment.status === "overpaid" ? "bg-green-600" :
                                    "bg-orange-600"
                                  }
                                >
                                  {duePayment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={duePayment.resolutionStatus || "pending"}
                                  onValueChange={async (value) => {
                                    try {
                                      await fetch(`/api/admin/due-payments/${duePayment._id}/status`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ resolutionStatus: value }),
                                      });
                                      fetchData(true);
                                    } catch (error) {
                                      console.error("Failed to update status:", error);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDuePayment(duePayment)}
                                  className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Audit Logs</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Track all admin panel changes and form/payment modifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border dark:border-gray-800 overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-gray-800 dark:hover:bg-gray-800/50">
                        <TableHead className="dark:text-gray-300">Timestamp</TableHead>
                        <TableHead className="dark:text-gray-300">Action</TableHead>
                        <TableHead className="dark:text-gray-300">Collection</TableHead>
                        <TableHead className="dark:text-gray-300">User</TableHead>
                        <TableHead className="dark:text-gray-300">Admin</TableHead>
                        <TableHead className="dark:text-gray-300">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 dark:text-gray-400">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log._id} className="dark:border-gray-800 dark:hover:bg-gray-800/50">
                            <TableCell className="font-mono text-xs dark:text-gray-300">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              <Badge
                                variant="outline"
                                className={
                                  log.action === "FORM_EDITED"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : log.action === "PAYMENT_VERIFIED"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : log.action === "PAYMENT_STATUS_UPDATED"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                                }
                              >
                                {log.action.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {log.collection}
                              </code>
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              <div className="text-sm">
                                <div className="font-mono text-xs text-gray-500 dark:text-gray-500">
                                  {log.userId?.substring(0, 8)}...
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                              {(log.metadata?.adminEmail as string) || log.userEmail || "N/A"}
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View Changes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialogs */}
      {selectedUser && !advancedMode && (
        <EditUserSimpleDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            setSelectedUser(null);
            fetchData(true);
          }}
        />
      )}

      {selectedUser && advancedMode && (
        <EditUserAdvancedDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            setSelectedUser(null);
            fetchData(true);
          }}
        />
      )}

      {selectedForm && !advancedMode && (
        <EditFormDialog
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          onUpdate={() => {
            setSelectedForm(null);
            fetchData(true);
          }}
        />
      )}

      {selectedForm && advancedMode && (
        <EditFormAdvancedDialog
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          onUpdate={() => {
            setSelectedForm(null);
            fetchData(true);
          }}
        />
      )}
      
      {selectedPayment && (
        <EditPaymentDialog
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onUpdate={() => {
            setSelectedPayment(null);
            fetchData(true);
          }}
        />
      )}

      {/* Due Payment Detail Dialog */}
      {selectedDuePayment && (
        <Dialog open={true} onOpenChange={() => setSelectedDuePayment(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-white">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Due Payment Details</DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                Complete information about outstanding payment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* User Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3 dark:text-white">User Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium dark:text-white">{selectedDuePayment.userName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium dark:text-white">{selectedDuePayment.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">University</p>
                    <p className="font-medium dark:text-white">{selectedDuePayment.universityName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Transaction ID</p>
                    <p className="font-medium dark:text-white">{selectedDuePayment.transactionId}</p>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div>
                <h3 className="font-semibold text-lg mb-3 dark:text-white">Payment Summary</h3>
                <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Original Players</p>
                    <p className="text-2xl font-bold dark:text-white">{selectedDuePayment.originalPlayerCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Players</p>
                    <p className="text-2xl font-bold dark:text-white">{selectedDuePayment.currentPlayerCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Difference</p>
                    <p className={`text-2xl font-bold ${selectedDuePayment.playerDifference > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {selectedDuePayment.playerDifference > 0 ? "+" : ""}{selectedDuePayment.playerDifference}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Due */}
              <div className={`p-6 rounded-lg border ${selectedDuePayment.amountDue > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {selectedDuePayment.amountDue > 0 ? 'Amount Due' : 'Overpaid Amount'}
                </p>
                <p className={`text-4xl font-bold ${selectedDuePayment.amountDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {selectedDuePayment.amountDue > 0 ? "₹" : "-₹"}{Math.abs(selectedDuePayment.amountDue).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  @ ₹800 per player
                </p>
              </div>

              {/* Sports Breakdown */}
              <div>
                <h3 className="font-semibold text-lg mb-3 dark:text-white">Sports Breakdown</h3>
                <div className="space-y-3">
                  {selectedDuePayment.forms.map((form, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium dark:text-white">{form.sport}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {form.originalPlayers} → {form.currentPlayers} players
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={form.difference > 0 ? "text-orange-600 border-orange-600 dark:text-orange-400 dark:border-orange-400" : "text-green-600 border-green-600 dark:text-green-400 dark:border-green-400"}>
                            {form.difference > 0 ? "+" : ""}{form.difference}
                          </Badge>
                          <p className="text-sm font-medium mt-1 dark:text-white">
                            {form.difference > 0 ? "₹" : "-₹"}{Math.abs(form.difference * 800).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3 dark:text-white">Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Payment Status</p>
                    <Badge 
                      variant="default" 
                      className={
                        selectedDuePayment.status === "unpaid" ? "bg-red-600" :
                        selectedDuePayment.status === "unverified" ? "bg-yellow-600" :
                        selectedDuePayment.status === "overpaid" ? "bg-green-600" :
                        "bg-orange-600"
                      }
                    >
                      {selectedDuePayment.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Last Updated</p>
                    <p className="text-sm dark:text-white">{new Date(selectedDuePayment.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Audit Log Details Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Audit Log Details</DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                {selectedLog.action.replace(/_/g, " ")} - {new Date(selectedLog.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Action</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedLog.action === "FORM_EDITED"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : selectedLog.action === "PAYMENT_VERIFIED"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : selectedLog.action === "PAYMENT_STATUS_UPDATED"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                    }
                  >
                    {selectedLog.action.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Collection</p>
                  <code className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded dark:text-white">
                    {selectedLog.collection}
                  </code>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Admin</p>
                  <p className="text-sm dark:text-white">
                    {(selectedLog.metadata?.adminEmail as string) || selectedLog.userEmail || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Record ID</p>
                  <p className="text-xs font-mono dark:text-white">{selectedLog.recordId}</p>
                </div>
              </div>

              {/* Changes Section */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">What Changed:</h3>
                  <div className="space-y-4">
                    {Object.entries(selectedLog.changes).map(([field, change]) => {
                      const changeData = change as { before: unknown; after: unknown };
                      const formatValue = (value: unknown): string => {
                        if (value === null || value === undefined) return "(empty)";
                        if (typeof value === "object") return JSON.stringify(value, null, 2);
                        if (typeof value === "boolean") return value ? "Yes" : "No";
                        return String(value);
                      };
                      
                      return (
                        <div key={field} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 mb-3">
                            <FileTextIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                              {field.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim()}
                            </h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Old Value</span>
                              </div>
                              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-md">
                                <pre className="text-sm text-red-800 dark:text-red-400 whitespace-pre-wrap break-words font-mono">
                                  {formatValue(changeData.before)}
                                </pre>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Value</span>
                              </div>
                              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-md">
                                <pre className="text-sm text-green-800 dark:text-green-400 whitespace-pre-wrap break-words font-mono">
                                  {formatValue(changeData.after)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No field changes recorded for this action
                </div>
              )}

              {/* Metadata Section */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 dark:text-white">Additional Information:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(selectedLog.metadata).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm dark:text-white">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
