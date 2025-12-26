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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { sports } from "@/app/utils/forms/schema";
import { Trash2, Plus, Save } from "lucide-react";

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

export default function EditUserAdvancedDialog({ user, onClose, onUpdate }: Props) {
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
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [editingSportData, setEditingSportData] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update user in MongoDB
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

  const addSportRegistration = () => {
    if (!selectedSport) {
      alert("Please select a sport");
      return;
    }
    if (formData.submittedForms[selectedSport]) {
      alert("This sport is already registered");
      return;
    }

    setFormData({
      ...formData,
      submittedForms: {
        ...formData.submittedForms,
        [selectedSport]: {
          fields: {
            playerFields: [],
            coachFields: {},
          },
          status: "draft",
          title: sports[selectedSport as keyof typeof sports],
          createdAt: new Date().toISOString(),
        },
      },
    });
  };

  const removeSportRegistration = (sportKey: string) => {
    if (!confirm(`Are you sure you want to remove ${sports[sportKey as keyof typeof sports]}?`)) {
      return;
    }

    const newSubmittedForms = { ...formData.submittedForms };
    delete newSubmittedForms[sportKey];
    setFormData({
      ...formData,
      submittedForms: newSubmittedForms,
    });
  };

  const updateSportData = (sportKey: string) => {
    try {
      const parsed = JSON.parse(editingSportData);
      setFormData({
        ...formData,
        submittedForms: {
          ...formData.submittedForms,
          [sportKey]: parsed,
        },
      });
      alert("Sport data updated successfully!");
    } catch (error) {
      alert("Invalid JSON format: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Edit User Registration (Advanced)</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Comprehensive user and form data management
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="dark:bg-gray-700 grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="sports">Sport Registrations</TabsTrigger>
            <TabsTrigger value="status">Status Flags</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-gray-300">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <Label htmlFor="university" className="dark:text-gray-300">University Name</Label>
                <Input
                  id="university"
                  value={formData.universityName}
                  onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </form>
          </TabsContent>

          <TabsContent value="sports" className="space-y-4 mt-4">
            <div className="flex gap-2 mb-4">
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select a sport to add" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  {Object.entries(sports).map(([key, value]) => (
                    <SelectItem key={key} value={key} className="dark:text-gray-300 dark:hover:bg-gray-600">
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={addSportRegistration}
                variant="outline"
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sport
              </Button>
            </div>

            <div className="space-y-4">
              {Object.keys(formData.submittedForms).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No sport registrations yet
                </p>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Object.entries(formData.submittedForms).map(([sportKey, sportData]: [string, any]) => (
                  <div
                    key={sportKey}
                    className="border dark:border-gray-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold dark:text-white">
                          {sports[sportKey as keyof typeof sports] || sportKey}
                        </h4>
                        <Badge variant={sportData.status === "submitted" ? "default" : "secondary"}>
                          {sportData.status}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeSportRegistration(sportKey)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="dark:text-gray-300">Form Data (JSON)</Label>
                      <Textarea
                        value={editingSportData || JSON.stringify(sportData, null, 2)}
                        onChange={(e) => setEditingSportData(e.target.value)}
                        className="font-mono text-sm h-64 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Edit JSON data..."
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateSportData(sportKey)}
                        className="w-full"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Update Sport Data
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <p>Players: {sportData.fields?.playerFields?.length || 0}</p>
                      <p>Created: {sportData.createdAt ? new Date(sportData.createdAt).toLocaleString() : "N/A"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div>
                  <Label htmlFor="emailVerified" className="dark:text-gray-300 font-semibold">Email Verified</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User has verified their email address</p>
                </div>
                <Switch
                  id="emailVerified"
                  checked={formData.emailVerified}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, emailVerified: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div>
                  <Label htmlFor="registrationDone" className="dark:text-gray-300 font-semibold">Registration Completed</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User has completed registration process</p>
                </div>
                <Switch
                  id="registrationDone"
                  checked={formData.registrationDone}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, registrationDone: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div>
                  <Label htmlFor="paymentDone" className="dark:text-gray-300 font-semibold">Payment Completed</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">User has completed payment</p>
                </div>
                <Switch
                  id="paymentDone"
                  checked={formData.paymentDone}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, paymentDone: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
