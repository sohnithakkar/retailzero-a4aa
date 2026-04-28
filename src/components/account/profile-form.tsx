"use client";

import { useState, useEffect, useCallback } from "react";

type UserRole = "student" | "admin";
type GradeLevel = "K" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";

interface ProfileData {
  name: string;
  email: string;
  role: UserRole;
  gradeLevel?: GradeLevel;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  preferences: {
    newsletter: boolean;
    theme: "light" | "dark";
  };
}

const GRADE_LEVELS: GradeLevel[] = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

interface ProfileFormProps {
  initialData: ProfileData;
  onSave: (data: Partial<ProfileData>) => Promise<void>;
}

interface GoogleConnectionStatus {
  connected: boolean;
  accountId?: string | null;
  scopes?: string[] | null;
}

export function ProfileForm({ initialData, onSave }: ProfileFormProps) {
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/connect/google/status");
      if (res.ok) {
        setGoogleStatus(await res.json());
      }
    } catch {
      // Non-critical -- just leave status unknown
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/connect/google/status", { method: "DELETE" });
      if (res.ok) {
        setGoogleStatus({ connected: false });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to disconnect.");
      }
    } catch {
      alert("Failed to disconnect Google account.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSave({
        name: form.name,
        role: form.role,
        ...(form.role === "student" ? { gradeLevel: form.gradeLevel } : {}),
        address: form.address,
        preferences: form.preferences,
      });
      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Failed to update profile.");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          value={form.email}
          disabled
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Role</label>
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as UserRole })
            }
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="student">Student</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        {form.role === "student" && (
          <div>
            <label className="text-sm font-medium">Grade Level</label>
            <select
              value={form.gradeLevel || "8"}
              onChange={(e) =>
                setForm({ ...form, gradeLevel: e.target.value as GradeLevel })
              }
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade === "K" ? "Kindergarten" : `Grade ${grade}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Address</legend>
        <input
          type="text"
          placeholder="Street"
          value={form.address.street}
          onChange={(e) =>
            setForm({
              ...form,
              address: { ...form.address, street: e.target.value },
            })
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="City"
            value={form.address.city}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, city: e.target.value },
              })
            }
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="State"
            value={form.address.state}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, state: e.target.value },
              })
            }
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="ZIP"
            value={form.address.zip}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, zip: e.target.value },
              })
            }
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="newsletter"
          checked={form.preferences.newsletter}
          onChange={(e) =>
            setForm({
              ...form,
              preferences: { ...form.preferences, newsletter: e.target.checked },
            })
          }
          className="h-4 w-4"
        />
        <label htmlFor="newsletter" className="text-sm">
          Subscribe to newsletter
        </label>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.includes("success")
              ? "text-green-600"
              : "text-destructive"
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* Connected Accounts */}
      <fieldset className="space-y-3 border-t border-input pt-6 mt-6">
        <legend className="text-sm font-medium">Connected Accounts</legend>
        <div className="flex items-center justify-between rounded-md border border-input bg-background px-4 py-3">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <div>
              <p className="text-sm font-medium">Google</p>
              {googleLoading ? (
                <p className="text-xs text-muted-foreground">Checking...</p>
              ) : googleStatus?.connected ? (
                <p className="text-xs text-muted-foreground">Connected</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>
          <div>
            {!googleLoading && googleStatus?.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            )}
            {!googleLoading && !googleStatus?.connected && (
              <a
                href="/connect/google"
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Connect
              </a>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
