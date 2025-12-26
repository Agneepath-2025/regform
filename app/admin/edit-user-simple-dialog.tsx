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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  universityName: string;
  emailVerified?: boolean;
  registrationDone?: boolean;
  paymentDone?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submittedForms?: Record<string, any>;
}

interface Props {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditUserSimpleDialog({ user, onClose, onUpdate }: Props) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    universityName: user.universityName,
    emailVerified: user.emailVerified || false,
    registrationDone: user.registrationDone || false,
    paymentDone: user.paymentDone || false,
    submittedForms: user.submittedForms || {},
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/registrations/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      alert("User updated successfully! Syncing to Google Sheets...");
      onUpdate();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white text-xl">Edit Registration - {user.name}</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Manage user information, sport registrations, and payment status
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="dark:bg-gray-700 grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-gray-300">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="dark:text-gray-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="dark:text-gray-300">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="university" className="dark:text-gray-300">University *</Label>
                <Input
                  id="university"
                  value={formData.universityName}
                  onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div>
                  <Label className="dark:text-gray-300 font-semibold">Email Verified</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User has verified their email address</p>
                </div>
                <Switch
                  checked={formData.emailVerified}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, emailVerified: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div>
                  <Label className="dark:text-gray-300 font-semibold">Registration Completed</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User has completed registration process</p>
                </div>
                <Switch
                  checked={formData.registrationDone}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, registrationDone: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div>
                  <Label className="dark:text-gray-300 font-semibold">Payment Completed</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User has completed payment</p>
                </div>
                <Switch
                  checked={formData.paymentDone}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, paymentDone: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 border-t dark:border-gray-700 pt-4">

          <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
