"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, AlertCircle, CalendarIcon, RefreshCw } from "lucide-react";
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

interface Player {
  name: string;
  email: string;
  phone: string;
  date: string;
  gender?: string;
  category1?: string;
  category2?: string;
  category3?: string;
  category4?: string;
  [key: string]: unknown;
}

interface CoachFields {
  name: string;
  email: string;
  contact: string;
  gender?: string;
  [key: string]: unknown;
}

// Sport configuration with min/max players and requirements
const sportConfig: Record<string, { min: number; max: number; requiresGender: boolean; requiresCategory: boolean; categoryType?: 'swimming' | 'shooting' }> = {
  "Badminton (Men)": { min: 5, max: 7, requiresGender: false, requiresCategory: false },
  "Badminton (Women)": { min: 5, max: 7, requiresGender: false, requiresCategory: false },
  "Basketball (Men)": { min: 7, max: 12, requiresGender: false, requiresCategory: false },
  "Basketball (Women)": { min: 7, max: 12, requiresGender: false, requiresCategory: false },
  "Cricket (Men)": { min: 12, max: 15, requiresGender: false, requiresCategory: false },
  "Football (Men)": { min: 11, max: 15, requiresGender: false, requiresCategory: false },
  "Futsal (Women)": { min: 7, max: 10, requiresGender: false, requiresCategory: false },
  "Volleyball (Men)": { min: 8, max: 12, requiresGender: false, requiresCategory: false },
  "Volleyball (Women)": { min: 8, max: 12, requiresGender: false, requiresCategory: false },
  "Table Tennis (Men)": { min: 4, max: 5, requiresGender: false, requiresCategory: false },
  "Table Tennis (Women)": { min: 4, max: 5, requiresGender: false, requiresCategory: false },
  "Squash (Men)": { min: 3, max: 5, requiresGender: false, requiresCategory: false },
  "Squash (Women)": { min: 3, max: 5, requiresGender: false, requiresCategory: false },
  "8 Ball Pool (Mixed)": { min: 3, max: 4, requiresGender: true, requiresCategory: false },
  "Snooker (Mixed)": { min: 3, max: 4, requiresGender: true, requiresCategory: false },
  "Chess (Mixed)": { min: 4, max: 5, requiresGender: true, requiresCategory: false },
  "Tennis (Mixed)": { min: 5, max: 9, requiresGender: true, requiresCategory: false },
  "Swimming (Men)": { min: 1, max: 8, requiresGender: false, requiresCategory: true, categoryType: 'swimming' },
  "Swimming (Women)": { min: 1, max: 8, requiresGender: false, requiresCategory: true, categoryType: 'swimming' },
  "Shooting": { min: 1, max: 10, requiresGender: true, requiresCategory: true, categoryType: 'shooting' },
};

const swimmingCategories = [
  "50m Freestyle (Individual)",
  "50m Butterfly (Individual)",
  "50m Breaststroke (Individual)",
  "50m Backstroke (Individual)",
  "100m Freestyle (Individual)",
  "200m Freestyle Relay",
  "200m Freestyle Relay (Mixed)",
];

const shootingCategories = [
  "10 Meter Air Rifle (Mixed) Individual",
  "10 Meter Air Pistol (Mixed) Individual"
];

export default function EditFormDialog({ form, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState(form.status);
  const [saving, setSaving] = useState(false);
  
  // Parse fields data
  const initialFields = form.fields || {};
  const [players, setPlayers] = useState<Player[]>(
    Array.isArray(initialFields.playerFields) ? initialFields.playerFields as Player[] : []
  );
  const [coach, setCoach] = useState<CoachFields>(
    initialFields.coachFields ? initialFields.coachFields as CoachFields : {
      name: "",
      email: "",
      contact: "",
      gender: ""
    }
  );

  // Get sport config
  const sportTitle = form.title;
  const config = sportConfig[sportTitle] || { min: 1, max: 20, requiresGender: false, requiresCategory: false };

  // Validation state
  const [validationError, setValidationError] = useState<string>("");
  
  // Swap player state
  const [swapPlayerIndex, setSwapPlayerIndex] = useState<number | null>(null);
  const [swapPlayerData, setSwapPlayerData] = useState({
    name: "",
    email: "",
    phone: "",
    date: ""
  });

  useEffect(() => {
    // Validate player count
    if (players.length < config.min) {
      setValidationError(`Minimum ${config.min} players required for ${sportTitle}`);
    } else if (players.length > config.max) {
      setValidationError(`Maximum ${config.max} players allowed for ${sportTitle}`);
    } else {
      setValidationError("");
    }
  }, [players.length, config.min, config.max, sportTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show warning but allow admin to proceed
    if (validationError) {
      const confirmed = confirm(
        `⚠️ ${validationError}\n\nDo you want to save anyway? The form will be updated but may not meet registration requirements.`
      );
      if (!confirmed) return;
    }
    
    setSaving(true);

    try {
      // Reconstruct fields with updated data
      const updatedFields = {
        ...form.fields,
        playerFields: players,
        coachFields: coach
      };

      const response = await fetch(`/api/admin/forms/${form._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status,
          fields: updatedFields
        }),
      });

      if (response.ok) {
        alert("Form updated successfully! Syncing to Google Sheets...");
        onUpdate();
      } else {
        alert("Failed to update form");
      }
    } catch (error) {
      console.error("Error updating form:", error);
      alert("Failed to update form");
    } finally {
      setSaving(false);
    }
  };

  const updatePlayer = (index: number, field: string, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const initiateSwapPlayer = (index: number) => {
    const player = players[index];
    setSwapPlayerIndex(index);
    setSwapPlayerData({
      name: player.name || "",
      email: player.email || "",
      phone: player.phone || "",
      date: player.date || ""
    });
  };

  const handleSwapPlayer = async () => {
    if (swapPlayerIndex === null) return;

    const oldPlayer = players[swapPlayerIndex];
    
    // Validate new player data
    if (!swapPlayerData.name || !swapPlayerData.email || !swapPlayerData.phone) {
      alert("Please fill in all required fields (Name, Email, Phone)");
      return;
    }

    const confirmed = confirm(
      `⚠️ Swap Player Confirmation\n\n` +
      `Old: ${oldPlayer.name} (${oldPlayer.email})\n` +
      `New: ${swapPlayerData.name} (${swapPlayerData.email})\n\n` +
      `This will:\n` +
      `• Update MongoDB\n` +
      `• Sync to Google Sheets\n` +
      `• Update DMZ API (if team owner)\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/forms/${form._id}/swap-player`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerIndex: swapPlayerIndex,
          oldPlayerData: {
            email: oldPlayer.email,
            name: oldPlayer.name,
            phone: oldPlayer.phone
          },
          newPlayerData: swapPlayerData
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Player swapped successfully!\n\n${result.message}`);
        
        // Update local state
        const newPlayers = [...players];
        newPlayers[swapPlayerIndex] = { ...oldPlayer, ...swapPlayerData };
        setPlayers(newPlayers);
        
        // Reset swap state
        setSwapPlayerIndex(null);
        setSwapPlayerData({ name: "", email: "", phone: "", date: "" });
        
        onUpdate();
      } else {
        const error = await response.json();
        alert(`❌ Failed to swap player: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error swapping player:", error);
      alert("❌ Failed to swap player");
    } finally {
      setSaving(false);
    }
  };

  const cancelSwap = () => {
    setSwapPlayerIndex(null);
    setSwapPlayerData({ name: "", email: "", phone: "", date: "" });
  };

  const addPlayer = () => {
    if (players.length >= config.max) {
      alert(`Maximum ${config.max} players allowed for ${sportTitle}`);
      return;
    }
    const newPlayer: Player = {
      name: "",
      email: "",
      phone: "",
      date: "",
    };
    if (config.requiresGender) {
      newPlayer.gender = "";
    }
    if (config.requiresCategory) {
      newPlayer.category1 = "";
      if (config.categoryType === 'swimming') {
        newPlayer.category2 = "";
        newPlayer.category3 = "";
        newPlayer.category4 = "";
      }
    }
    setPlayers([...players, newPlayer]);
  };

  const updateCoach = (field: string, value: string) => {
    setCoach({ ...coach, [field]: value });
  };

  const renderFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      if (value instanceof Date) return value.toLocaleDateString();
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderOtherFields = (fields: Record<string, unknown>) => {
    return Object.entries(fields)
      .filter(([key]) => key !== "playerFields" && key !== "coachFields")
      .map(([key, value]) => (
        <div key={key} className="space-y-1">
          <Label className="text-sm font-medium dark:text-gray-300">{key}</Label>
          <p className="text-sm text-gray-700 dark:text-gray-400">{renderFieldValue(value)}</p>
        </div>
      ));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Form Details - {sports[form.title as keyof typeof sports] || form.title}</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            View and manage form submission
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="dark:bg-gray-700">
            <TabsTrigger value="details">Form Details</TabsTrigger>
            <TabsTrigger value="owner">Owner Info</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="dark:text-gray-300">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                    <SelectItem value="draft" className="dark:text-gray-300 dark:hover:bg-gray-600">Draft</SelectItem>
                    <SelectItem value="submitted" className="dark:text-gray-300 dark:hover:bg-gray-600">Submitted</SelectItem>
                    <SelectItem value="confirmed" className="dark:text-gray-300 dark:hover:bg-gray-600">Confirmed</SelectItem>
                    <SelectItem value="rejected" className="dark:text-gray-300 dark:hover:bg-gray-600">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Coach Details Section */}
              <div className="space-y-4 border-t dark:border-gray-700 pt-4">
                <h3 className="font-semibold dark:text-white">Coach Details</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="space-y-2">
                    <Label className="dark:text-gray-300">Name</Label>
                    <Input
                      value={coach.name}
                      onChange={(e) => updateCoach("name", e.target.value)}
                      className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-gray-300">Email</Label>
                    <Input
                      type="email"
                      value={coach.email}
                      onChange={(e) => updateCoach("email", e.target.value)}
                      className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-gray-300">Phone</Label>
                    <Input
                      value={coach.contact}
                      onChange={(e) => updateCoach("contact", e.target.value)}
                      className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-gray-300">Gender</Label>
                    <Select value={coach.gender || ""} onValueChange={(val) => updateCoach("gender", val === "none" ? "" : val)}>
                      <SelectTrigger className="dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectItem value="none">None (Remove)</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Players Section */}
              <div className="space-y-4 border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold dark:text-white">Players ({players.length}/{config.max})</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Min: {config.min} | Max: {config.max}
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={addPlayer} 
                    size="sm" 
                    variant="outline" 
                    className="dark:border-gray-600"
                    disabled={players.length >= config.max}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Player
                  </Button>
                </div>

                {validationError && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      ⚠️ {validationError} (You can still save, but the team may not meet competition requirements)
                    </span>
                  </div>
                )}
                
                {players.map((player, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm dark:text-gray-300">Player {idx + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removePlayer(idx)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 dark:hover:bg-gray-600"
                        title="Remove Player"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm dark:text-gray-300">Name</Label>
                        <Input
                          value={player.name}
                          onChange={(e) => updatePlayer(idx, "name", e.target.value)}
                          className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm dark:text-gray-300">Email</Label>
                        <Input
                          type="email"
                          value={player.email}
                          onChange={(e) => updatePlayer(idx, "email", e.target.value)}
                          className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm dark:text-gray-300">Phone</Label>
                        <Input
                          value={player.phone}
                          onChange={(e) => updatePlayer(idx, "phone", e.target.value)}
                          className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm dark:text-gray-300">Date of Birth</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal dark:bg-gray-600 dark:border-gray-500 dark:text-white",
                                !player.date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {player.date ? format(new Date(player.date), "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              selected={player.date ? new Date(player.date) : undefined}
                              onSelect={(date) => updatePlayer(idx, "date", date ? date.toISOString() : "")}
                              disabled={(date) => date < new Date(2001, 1, 2) || date > new Date(2009, 1, 1)}
                              fromYear={2001}
                              toYear={2009}
                              defaultMonth={new Date(2005, 5, 15)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* Conditional Gender Field */}
                      {config.requiresGender && (
                        <div className="space-y-1">
                          <Label className="text-sm dark:text-gray-300">Gender</Label>
                          <Select value={player.gender || ""} onValueChange={(val) => updatePlayer(idx, "gender", val)}>
                            <SelectTrigger className="dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Conditional Category Fields */}
                      {config.requiresCategory && config.categoryType === 'swimming' && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-sm dark:text-gray-300">Category 1</Label>
                            <Select value={player.category1 || ""} onValueChange={(val) => updatePlayer(idx, "category1", val)}>
                              <SelectTrigger className="dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                                {swimmingCategories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm dark:text-gray-300">Category 2 (Optional)</Label>
                            <Select value={player.category2 || ""} onValueChange={(val) => updatePlayer(idx, "category2", val)}>
                              <SelectTrigger className="dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                                <SelectItem value="">None</SelectItem>
                                {swimmingCategories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm dark:text-gray-300">Category 3 (Optional)</Label>
                            <Select value={player.category3 || ""} onValueChange={(val) => updatePlayer(idx, "category3", val)}>
                              <SelectTrigger className="dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                                <SelectItem value="">None</SelectItem>
                                {swimmingCategories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm dark:text-gray-300">Category 4 - Relay (Optional)</Label>
                            <Select value={player.category4 || ""} onValueChange={(val) => updatePlayer(idx, "category4", val)}>
                              <SelectTrigger className="dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <SelectValue placeholder="Select relay category" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                                <SelectItem value="">None</SelectItem>
                                {swimmingCategories.filter(cat => ["200m Freestyle Relay", "200m Freestyle Relay (Mixed)"].includes(cat)).map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {config.requiresCategory && config.categoryType === 'shooting' && (
                        <div className="space-y-1">
                          <Label className="text-sm dark:text-gray-300">Category</Label>
                          <Select value={player.category1 || ""} onValueChange={(val) => updatePlayer(idx, "category1", val)}>
                            <SelectTrigger className="dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                              {shootingCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Other Fields (read-only) */}
              {form.fields && Object.keys(form.fields).filter(k => k !== "playerFields" && k !== "coachFields").length > 0 && (
                <div className="space-y-4 border-t dark:border-gray-700 pt-4">
                  <h3 className="font-semibold dark:text-white">Other Form Fields</h3>
                  <div className="space-y-3">
                    {renderOtherFields(form.fields)}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="owner" className="space-y-4">
            {form.owner ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium dark:text-gray-300">Name</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400">{form.owner.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium dark:text-gray-300">Email</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400">{form.owner.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium dark:text-gray-300">University</Label>
                  <p className="text-sm text-gray-700 dark:text-gray-400">
                    {form.owner.universityName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No owner information available</p>
            )}

            <div className="space-y-3 border-t dark:border-gray-700 pt-4">
              <div>
                <Label className="text-sm font-medium dark:text-gray-300">Created At</Label>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  {form.createdAt
                    ? new Date(form.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium dark:text-gray-300">Updated At</Label>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  {form.updatedAt
                    ? new Date(form.updatedAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
