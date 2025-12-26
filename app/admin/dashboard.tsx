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
import { LogOut, Users, FileText, RefreshCw, Moon, Sun, CreditCard } from "lucide-react";
import { useTheme } from "./theme-provider";

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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);

  const fetchData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = {
    totalRegistrations: users.length,
    verifiedUsers: users.filter((u) => u.emailVerified).length,
    completedRegistrations: users.filter((u) => u.registrationDone).length,
    completedPayments: users.filter((u) => u.paymentDone).length,
    totalPayments: payments.length,
    verifiedPayments: payments.filter((p) => p.status === "verified").length,
    totalForms: forms.length,
    submittedForms: forms.filter((f) => f.status === "submitted").length,
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Total Users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats.totalRegistrations}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Verified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats.verifiedUsers}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Registered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {stats.completedRegistrations}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardDescription className="dark:text-gray-400">Paid</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {stats.completedPayments}
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
              <CardDescription className="dark:text-gray-400">Total Payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{stats.totalPayments}</div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="dark:border-gray-600"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
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
                  <div className="flex items-center gap-2">
                    <Label className="text-sm dark:text-gray-300">JSON Mode</Label>
                    <Switch
                      checked={advancedMode}
                      onCheckedChange={setAdvancedMode}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                        {users.map((user) => (
                          <TableRow key={user._id} className="dark:border-gray-700">
                            <TableCell className="font-medium dark:text-white">
                              {user.name}
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                        {forms.map((form) => (
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
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="dark:text-gray-300">User Name</TableHead>
                          <TableHead className="dark:text-gray-300">Email</TableHead>
                          <TableHead className="dark:text-gray-300">University</TableHead>
                          <TableHead className="dark:text-gray-300">Transaction ID</TableHead>
                          <TableHead className="dark:text-gray-300">Amount</TableHead>
                          <TableHead className="dark:text-gray-300">Status</TableHead>
                          <TableHead className="dark:text-gray-300">Date</TableHead>
                          <TableHead className="dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
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
            fetchData();
          }}
        />
      )}

      {selectedUser && advancedMode && (
        <EditUserAdvancedDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={() => {
            setSelectedUser(null);
            fetchData();
          }}
        />
      )}

      {selectedForm && !advancedMode && (
        <EditFormDialog
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          onUpdate={() => {
            setSelectedForm(null);
            fetchData();
          }}
        />
      )}

      {selectedForm && advancedMode && (
        <EditFormAdvancedDialog
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          onUpdate={() => {
            setSelectedForm(null);
            fetchData();
          }}
        />
      )}
      
      {selectedPayment && (
        <EditPaymentDialog
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onUpdate={() => {
            setSelectedPayment(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
