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
import EditUserSimpleDialog from "./edit-user-simple-dialog";
import EditUserAdvancedDialog from "./edit-user-advanced-dialog";
import EditFormDialog from "./edit-form-dialog";
import EditFormAdvancedDialog from "./edit-form-advanced-dialog";
import EditPaymentDialog from "./edit-payment-dialog";
import { LogOut, Users, FileText, Moon, Sun, CreditCard, Search, Trash2, RotateCcw } from "lucide-react";
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

export default function AdminDashboard() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  const fetchData = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [usersRes, formsRes, paymentsRes] = await Promise.all([
        fetch("/api/admin/registrations"),
        fetch("/api/admin/forms"),
        fetch("/api/admin/payments"),
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

  const stats = {
    totalUsersVerified: users.filter((u) => !u.deleted && u.emailVerified).length,
    registered: users.filter((u) => !u.deleted && u.registrationDone).length,
    paidUnverified: payments.filter((p) => p.status !== "verified").length,
    totalForms: forms.length,
    verifiedPayments: payments.filter((p) => p.status === "verified").length,
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
    </div>
  );
}
