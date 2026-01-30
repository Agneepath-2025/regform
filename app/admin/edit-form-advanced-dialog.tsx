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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { sports } from "@/app/utils/forms/schema";

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

interface Props {
  form: Form;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditFormAdvancedDialog({ form, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState(form.status);
  const [fieldsJson, setFieldsJson] = useState(
    JSON.stringify(form.fields || {}, null, 2)
  );
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string>("");

  // Player management
  const [playerName, setPlayerName] = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [playerDOB, setPlayerDOB] = useState("");

  // Coach management
  const [coachName, setCoachName] = useState("");
  const [coachContact, setCoachContact] = useState("");
  const [coachEmail, setCoachEmail] = useState("");

  const validateJson = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      setJsonError("");
      return true;
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
      return false;
    }
  };

  const handleJsonChange = (value: string) => {
    setFieldsJson(value);
    validateJson(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateJson(fieldsJson)) {
      alert("Please fix JSON errors before saving");
      return;
    }

    setSaving(true);

    try {
      const parsedFields = JSON.parse(fieldsJson);

      const response = await fetch(`/api/admin/forms/${form._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status,
          fields: parsedFields,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update form");
      }

      alert("Form updated successfully! Syncing to Google Sheets...");
      onUpdate();
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Failed to update form: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const addPlayer = () => {
    try {
      const fields = JSON.parse(fieldsJson);
      const playerFields = fields.playerFields || [];

      playerFields.push({
        name: playerName,
        email: playerEmail,
        phone: playerPhone,
        date: playerDOB,
      });

      fields.playerFields = playerFields;
      const newJson = JSON.stringify(fields, null, 2);
      setFieldsJson(newJson);
      
      // Clear form
      setPlayerName("");
      setPlayerEmail("");
      setPlayerPhone("");
      setPlayerDOB("");
    } catch (error) {
      alert("Error adding player: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const removePlayer = (index: number) => {
    try {
      const fields = JSON.parse(fieldsJson);
      const playerFields = fields.playerFields || [];
      
      if (index >= 0 && index < playerFields.length) {
        playerFields.splice(index, 1);
        fields.playerFields = playerFields;
        const newJson = JSON.stringify(fields, null, 2);
        setFieldsJson(newJson);
      }
    } catch (error) {
      alert("Error removing player: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const getPlayersList = () => {
    try {
      const fields = JSON.parse(fieldsJson);
      return fields.playerFields || [];
    } catch {
      return [];
    }
  };

  const getCoachData = () => {
    try {
      const fields = JSON.parse(fieldsJson);
      return fields.coachFields || {};
    } catch {
      return {};
    }
  };

  const updateCoach = () => {
    if (!coachName || !coachContact) {
      alert("Please fill in coach name and contact");
      return;
    }

    try {
      const fields = JSON.parse(fieldsJson);
      fields.coachFields = {
        name: coachName,
        contact: coachContact,
        email: coachEmail
      };
      setFieldsJson(JSON.stringify(fields, null, 2));
      setCoachName("");
      setCoachContact("");
      setCoachEmail("");
    } catch (error) {
      alert("Error updating coach: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            Edit Form - {sports[form.title as keyof typeof sports] || form.title} (Advanced)
          </DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            Full control over form data with JSON editing and player management
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="players" className="w-full">
          <TabsList className="dark:bg-gray-700 grid w-full grid-cols-5">
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="coach">Coach</TabsTrigger>
            <TabsTrigger value="json">Raw JSON</TabsTrigger>
            <TabsTrigger value="owner">Owner Info</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="border dark:border-gray-700 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold dark:text-white">Add New Player</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="dark:text-gray-300">Name</Label>
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Player name"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-gray-300">Email</Label>
                    <Input
                      type="email"
                      value={playerEmail}
                      onChange={(e) => setPlayerEmail(e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="player@example.com"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-gray-300">Phone</Label>
                    <Input
                      value={playerPhone}
                      onChange={(e) => setPlayerPhone(e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-gray-300">Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal dark:bg-gray-700 dark:border-gray-600 dark:text-white",
                            !playerDOB && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {playerDOB ? format(new Date(playerDOB), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={playerDOB ? new Date(playerDOB) : undefined}
                          onSelect={(date) => setPlayerDOB(date ? date.toISOString() : "")}
                          disabled={(date) => date < new Date(2001, 1, 2) || date > new Date(2009, 1, 1)}
                          fromYear={2001}
                          toYear={2009}
                          defaultMonth={new Date(2005, 5, 15)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button onClick={addPlayer} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Player
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold dark:text-white">
                  Current Players ({getPlayersList().length})
                </h4>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {getPlayersList().map((player: any, index: number) => (
                  <div
                    key={index}
                    className="border dark:border-gray-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium dark:text-white">{player.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{player.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {player.phone} | DOB: {player.date ? new Date(player.date).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePlayer(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coach" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="border dark:border-gray-700 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold dark:text-white">Edit Coach Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="dark:text-gray-300">Coach Name *</Label>
                    <Input
                      value={coachName}
                      onChange={(e) => setCoachName(e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Coach name"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-gray-300">Contact Number *</Label>
                    <Input
                      value={coachContact}
                      onChange={(e) => setCoachContact(e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="dark:text-gray-300">Coach Email</Label>
                    <Input
                      type="email"
                      value={coachEmail}
                      onChange={(e) => setCoachEmail(e.target.value)}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="coach@example.com"
                    />
                  </div>
                </div>
                <Button onClick={updateCoach} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Update Coach
                </Button>
              </div>

              <div className="border dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold dark:text-white mb-3">Current Coach Details</h4>
                {Object.keys(getCoachData()).length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                      <span className="text-sm font-medium dark:text-white">{getCoachData().name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Contact:</span>
                      <span className="text-sm font-medium dark:text-white">{getCoachData().contact || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                      <span className="text-sm font-medium dark:text-white">{getCoachData().email || "N/A"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No coach assigned yet</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Form Fields (JSON)</Label>
                <Textarea
                  value={fieldsJson}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="font-mono text-sm h-96 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Edit JSON data..."
                />
                {jsonError && (
                  <p className="text-sm text-red-500 dark:text-red-400">{jsonError}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Edit the form data in JSON format. Make sure to maintain valid JSON structure.
                </p>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="owner" className="space-y-4 mt-4">
            {form.owner ? (
              <div className="space-y-3">
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <Label className="text-sm font-medium dark:text-gray-300">Name</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">{form.owner.name}</p>
                </div>
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <Label className="text-sm font-medium dark:text-gray-300">Email</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">{form.owner.email}</p>
                </div>
                <div className="border dark:border-gray-700 rounded-lg p-4">
                  <Label className="text-sm font-medium dark:text-gray-300">University</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                    {form.owner.universityName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No owner information available</p>
            )}

            <div className="space-y-3 border-t dark:border-gray-700 pt-4">
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <Label className="text-sm font-medium dark:text-gray-300">Created At</Label>
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                  {form.createdAt
                    ? new Date(form.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <Label className="text-sm font-medium dark:text-gray-300">Updated At</Label>
                <p className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                  {form.updatedAt
                    ? new Date(form.updatedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="dark:text-gray-300">Form Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                  <SelectItem value="draft" className="dark:text-gray-300 dark:hover:bg-gray-600">
                    <Badge variant="secondary">Draft</Badge>
                  </SelectItem>
                  <SelectItem value="submitted" className="dark:text-gray-300 dark:hover:bg-gray-600">
                    <Badge variant="default">Submitted</Badge>
                  </SelectItem>
                  <SelectItem value="confirmed" className="dark:text-gray-300 dark:hover:bg-gray-600">
                    <Badge className="bg-green-500">Confirmed</Badge>
                  </SelectItem>
                  <SelectItem value="rejected" className="dark:text-gray-300 dark:hover:bg-gray-600">
                    <Badge variant="destructive">Rejected</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Change the status of this registration form
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !!jsonError}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
