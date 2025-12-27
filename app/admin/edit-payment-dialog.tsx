"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

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

interface Props {
  payment: Payment;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditPaymentDialog({ payment, onClose, onUpdate }: Props) {
  const [formData, setFormData] = useState({
    transactionId: payment.transactionId || "",
    amount: payment.amount || 0,
    status: payment.status || "pending",
    sendEmail: payment.sendEmail || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/payments/${payment._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update payment");
      }

      alert("Payment updated successfully! Syncing to Google Sheets...");
      onUpdate();
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Edit Payment Record</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Update payment details and verification status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Information (Read-only) */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
            <h3 className="font-semibold dark:text-white">User Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Name:</span>
                <span className="ml-2 dark:text-white">{payment.userName || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="ml-2 dark:text-white">{payment.userEmail || "N/A"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">University:</span>
                <span className="ml-2 dark:text-white">{payment.universityName || "N/A"}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactionId" className="dark:text-gray-300">
                  Transaction ID *
                </Label>
                <Input
                  id="transactionId"
                  value={formData.transactionId}
                  onChange={(e) =>
                    setFormData({ ...formData, transactionId: e.target.value })
                  }
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter transaction ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="dark:text-gray-300">
                  Amount (₹) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) })
                  }
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">Send Email?</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.sendEmail}
                  onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })}
                />
                <span className="text-sm dark:text-gray-300">
                  {formData.sendEmail ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="dark:text-gray-300">
                Payment Status *
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger
                  id="status"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectItem value="pending" className="dark:text-gray-300 dark:hover:bg-gray-600">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Pending</Badge>
                      <span className="text-sm text-gray-500">- Awaiting verification</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="verified" className="dark:text-gray-300 dark:hover:bg-gray-600">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Verified</Badge>
                      <span className="text-sm text-gray-500">- Payment confirmed</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected" className="dark:text-gray-300 dark:hover:bg-gray-600">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Rejected</Badge>
                      <span className="text-sm text-gray-500">- Payment invalid</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Note:</strong> Setting status to &quot;Verified&quot; will automatically mark the user&apos;s payment as completed.
              </p>
            </div>

            {payment.createdAt && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>Created: {new Date(payment.createdAt).toLocaleString()}</p>
                {payment.updatedAt && (
                  <p>Last Updated: {new Date(payment.updatedAt).toLocaleString()}</p>
                )}
              </div>
            )}
          </form>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
