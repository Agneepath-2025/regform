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

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  universityName: string;
  emailVerified?: boolean;
  registrationDone?: boolean;
  paymentDone?: boolean;
}

interface Props {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditUserDialog({ user, onClose, onUpdate }: Props) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    universityName: user.universityName,
    emailVerified: user.emailVerified || false,
    registrationDone: user.registrationDone || false,
    paymentDone: user.paymentDone || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/registrations/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onUpdate();
      } else {
        alert("Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Edit User Registration</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Make changes to user registration details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="dark:text-gray-300">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="dark:text-gray-300">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="university" className="dark:text-gray-300">University Name</Label>
            <Input
              id="university"
              value={formData.universityName}
              onChange={(e) =>
                setFormData({ ...formData, universityName: e.target.value })
              }
              required
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-4 pt-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailVerified" className="dark:text-gray-300">Email Verified</Label>
              <Switch
                id="emailVerified"
                checked={formData.emailVerified}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, emailVerified: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="registrationDone" className="dark:text-gray-300">Registration Completed</Label>
              <Switch
                id="registrationDone"
                checked={formData.registrationDone}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, registrationDone: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="paymentDone" className="dark:text-gray-300">Payment Completed</Label>
              <Switch
                id="paymentDone"
                checked={formData.paymentDone}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, paymentDone: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
