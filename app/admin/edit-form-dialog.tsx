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

export default function EditFormDialog({ form, onClose, onUpdate }: Props) {
  const [status, setStatus] = useState(form.status);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/forms/${form._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
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

  const renderFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      if (value instanceof Date) return value.toLocaleDateString();
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const renderFields = (fields: Record<string, unknown>) => {
    return Object.entries(fields).map(([key, value]) => {
      if (key === "playerFields" && Array.isArray(value)) {
        return (
          <div key={key} className="space-y-2">
            <h4 className="font-semibold text-sm">Players ({value.length})</h4>
            {value.map((player, idx) => (
              <div key={idx} className="ml-4 p-3 bg-gray-50 rounded space-y-1">
                <p className="font-medium text-sm">Player {idx + 1}</p>
                {Object.entries(player as Record<string, unknown>).map(
                  ([pKey, pValue]) => (
                    <div key={pKey} className="text-sm">
                      <span className="font-medium">{pKey}:</span>{" "}
                      {renderFieldValue(pValue)}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        );
      } else if (key === "coachFields" && typeof value === "object") {
        return (
          <div key={key} className="space-y-2">
            <h4 className="font-semibold text-sm">Coach Details</h4>
            <div className="ml-4 p-3 bg-gray-50 rounded space-y-1">
              {Object.entries(value as Record<string, unknown>).map(
                ([cKey, cValue]) => (
                  <div key={cKey} className="text-sm">
                    <span className="font-medium">{cKey}:</span>{" "}
                    {renderFieldValue(cValue)}
                  </div>
                )
              )}
            </div>
          </div>
        );
      } else {
        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm font-medium">{key}</Label>
            <p className="text-sm text-gray-700">{renderFieldValue(value)}</p>
          </div>
        );
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Details - {form.title}</DialogTitle>
          <DialogDescription>
            View and manage form submission
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Form Details</TabsTrigger>
            <TabsTrigger value="owner">Owner Info</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.fields && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Form Fields</h3>
                  <div className="space-y-3">
                    {renderFields(form.fields)}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
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
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-700">{form.owner.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-gray-700">{form.owner.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">University</Label>
                  <p className="text-sm text-gray-700">
                    {form.owner.universityName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No owner information available</p>
            )}

            <div className="space-y-3 border-t pt-4">
              <div>
                <Label className="text-sm font-medium">Created At</Label>
                <p className="text-sm text-gray-700">
                  {form.createdAt
                    ? new Date(form.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Updated At</Label>
                <p className="text-sm text-gray-700">
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
