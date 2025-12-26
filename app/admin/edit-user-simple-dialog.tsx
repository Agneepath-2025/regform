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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sports } from "@/app/utils/forms/schema";
import { Trash2, Plus, Save, RefreshCw, Check, X } from "lucide-react";

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

interface Player {
  name: string;
  email: string;
  phone: string;
  date: string | Date;
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
  const [selectedSport, setSelectedSport] = useState<string>("");
  const [editingSport, setEditingSport] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState<Player>({ name: "", email: "", phone: "", date: "" });

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
    setSelectedSport("");
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

  const addPlayer = (sportKey: string) => {
    if (!newPlayer.name || !newPlayer.email || !newPlayer.phone) {
      alert("Please fill in all player details");
      return;
    }

    const sport = formData.submittedForms[sportKey];
    const playerFields = sport.fields?.playerFields || [];
    playerFields.push({ ...newPlayer });

    setFormData({
      ...formData,
      submittedForms: {
        ...formData.submittedForms,
        [sportKey]: {
          ...sport,
          fields: {
            ...sport.fields,
            playerFields,
          },
        },
      },
    });

    setNewPlayer({ name: "", email: "", phone: "", date: "" });
    setEditingSport(null);
  };

  const removePlayer = (sportKey: string, index: number) => {
    if (!confirm("Are you sure you want to remove this player?")) {
      return;
    }

    const sport = formData.submittedForms[sportKey];
    const playerFields = [...(sport.fields?.playerFields || [])];
    playerFields.splice(index, 1);

    setFormData({
      ...formData,
      submittedForms: {
        ...formData.submittedForms,
        [sportKey]: {
          ...sport,
          fields: {
            ...sport.fields,
            playerFields,
          },
        },
      },
    });
  };

  const updateSportStatus = (sportKey: string, status: string) => {
    const sport = formData.submittedForms[sportKey];
    setFormData({
      ...formData,
      submittedForms: {
        ...formData.submittedForms,
        [sportKey]: {
          ...sport,
          status,
        },
      },
    });
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
          <TabsList className="dark:bg-gray-700 grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="sports">Sports ({Object.keys(formData.submittedForms).length})</TabsTrigger>
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

          {/* Sports Tab */}
          <TabsContent value="sports" className="space-y-4 mt-4">
            <div className="flex gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Select a sport to add" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600 max-h-64">
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
                className="dark:border-gray-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sport
              </Button>
            </div>

            <div className="space-y-4">
              {Object.keys(formData.submittedForms).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No sport registrations yet. Add one above!
                </p>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Object.entries(formData.submittedForms).map(([sportKey, sportData]: [string, any]) => (
                  <div
                    key={sportKey}
                    className="border dark:border-gray-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-lg dark:text-white">
                          {sports[sportKey as keyof typeof sports] || sportKey}
                        </h4>
                        <Select
                          value={sportData.status}
                          onValueChange={(value) => updateSportStatus(sportKey, value)}
                        >
                          <SelectTrigger className="w-32 h-8 dark:bg-gray-700 dark:border-gray-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
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

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="dark:text-gray-300 font-semibold">
                          Players ({sportData.fields?.playerFields?.length || 0})
                        </Label>
                        {editingSport !== sportKey && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSport(sportKey)}
                            className="dark:border-gray-600 dark:text-gray-300"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Player
                          </Button>
                        )}
                      </div>

                      {/* Add Player Form */}
                      {editingSport === sportKey && (
                        <div className="grid grid-cols-4 gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Input
                            placeholder="Name"
                            value={newPlayer.name}
                            onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={newPlayer.email}
                            onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <Input
                            placeholder="Phone"
                            value={newPlayer.phone}
                            onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <Input
                            placeholder="DOB"
                            type="date"
                            value={typeof newPlayer.date === 'string' ? newPlayer.date : newPlayer.date?.toISOString().split('T')[0] || ''}
                            onChange={(e) => setNewPlayer({ ...newPlayer, date: e.target.value })}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                          <div className="col-span-4 flex gap-2">
                            <Button
                              type="button"
                              onClick={() => addPlayer(sportKey)}
                              size="sm"
                              className="flex-1"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingSport(null);
                                setNewPlayer({ name: "", email: "", phone: "", date: "" });
                              }}
                              size="sm"
                              className="dark:border-gray-600 dark:text-gray-300"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Players Table */}
                      {sportData.fields?.playerFields?.length > 0 && (
                        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="dark:border-gray-700">
                                <TableHead className="dark:text-gray-300">#</TableHead>
                                <TableHead className="dark:text-gray-300">Name</TableHead>
                                <TableHead className="dark:text-gray-300">Email</TableHead>
                                <TableHead className="dark:text-gray-300">Phone</TableHead>
                                <TableHead className="dark:text-gray-300">DOB</TableHead>
                                <TableHead className="dark:text-gray-300">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {sportData.fields.playerFields.map((player: any, idx: number) => (
                                <TableRow key={idx} className="dark:border-gray-700">
                                  <TableCell className="dark:text-gray-300">{idx + 1}</TableCell>
                                  <TableCell className="dark:text-white">{player.name}</TableCell>
                                  <TableCell className="dark:text-gray-300">{player.email}</TableCell>
                                  <TableCell className="dark:text-gray-300">{player.phone}</TableCell>
                                  <TableCell className="dark:text-gray-300">
                                    {player.date ? new Date(player.date).toLocaleDateString() : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removePlayer(sportKey, idx)}
                                      className="dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Payment Tab */}
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
          <Button
            type="button"
            variant="outline"
            onClick={syncToGoogleSheets}
            disabled={syncing}
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync to Sheets"}
          </Button>
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
