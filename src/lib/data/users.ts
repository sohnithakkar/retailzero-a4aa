import fs from "fs";
import path from "path";
import { getDataPath } from "../config";

function getDataDir(): string {
  return path.join(process.cwd(), getDataPath());
}

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface UserPreferences {
  newsletter: boolean;
  theme: "light" | "dark";
}

export type UserRole = "student" | "admin";

export type GradeLevel =
  | "K" | "1" | "2" | "3" | "4" | "5" | "6"
  | "7" | "8" | "9" | "10" | "11" | "12";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  gradeLevel?: GradeLevel; // Only for students
  address: UserAddress;
  preferences: UserPreferences;
}

function readUsers(): User[] {
  const raw = fs.readFileSync(path.join(getDataDir(), "users.json"), "utf-8");
  return JSON.parse(raw);
}

function writeUsers(users: User[]): void {
  fs.writeFileSync(
    path.join(getDataDir(), "users.json"),
    JSON.stringify(users, null, 2)
  );
}

export function getUser(id: string): User | undefined {
  return readUsers().find((u) => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return readUsers().find((u) => u.email === email);
}

export function createUser(
  id: string,
  email: string,
  name: string,
  role: UserRole = "student",
  gradeLevel?: GradeLevel
): User {
  const users = readUsers();
  const user: User = {
    id,
    email,
    name,
    role,
    ...(role === "student" && gradeLevel ? { gradeLevel } : {}),
    address: { street: "", city: "", state: "", zip: "" },
    preferences: { newsletter: false, theme: "light" },
  };
  users.push(user);
  writeUsers(users);
  return user;
}

export function updateUser(
  id: string,
  attrs: Partial<Omit<User, "id">>
): User | undefined {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return undefined;
  users[index] = { ...users[index], ...attrs };
  writeUsers(users);
  return users[index];
}
