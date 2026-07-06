import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  defaultUserPreferences,
  type PublicUser,
  type UserPreferences
} from "@/lib/user-types";

type SessionRecord = {
  tokenHash: string;
  createdAt: string;
};

type StoredUser = {
  id: string;
  name: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  preferences: UserPreferences;
  sessions: SessionRecord[];
};

type UserDatabase = {
  users: StoredUser[];
};

const dataDirectory = process.env.TOOLBOX_DATA_DIR
  ? path.resolve(process.env.TOOLBOX_DATA_DIR)
  : path.join(process.cwd(), ".toolbox-data");
const databasePath = path.join(dataDirectory, "users.json");

function normalizeUserName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function hashSecret(value: string, salt: string) {
  return scryptSync(value, salt, 64).toString("hex");
}

function createSalt() {
  return randomBytes(16).toString("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    createdAt: user.createdAt,
    preferences: user.preferences
  };
}

async function readDatabase(): Promise<UserDatabase> {
  try {
    const content = await readFile(databasePath, "utf8");
    return JSON.parse(content) as UserDatabase;
  } catch {
    return { users: [] };
  }
}

async function writeDatabase(database: UserDatabase) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(databasePath, JSON.stringify(database, null, 2), "utf8");
}

function mergePreferences(preferences?: Partial<UserPreferences>): UserPreferences {
  return {
    ...defaultUserPreferences,
    ...preferences,
    customAiLinks: Array.isArray(preferences?.customAiLinks) ? preferences.customAiLinks : [],
    customWebLinks: Array.isArray(preferences?.customWebLinks) ? preferences.customWebLinks : [],
    wallpaperOpacity:
      typeof preferences?.wallpaperOpacity === "number"
        ? Math.min(85, Math.max(15, preferences.wallpaperOpacity))
        : defaultUserPreferences.wallpaperOpacity
  };
}

function createSession(user: StoredUser) {
  const token = createSessionToken();
  user.sessions = [
    ...user.sessions.slice(-9),
    {
      tokenHash: hashSecret(token, user.passwordSalt),
      createdAt: new Date().toISOString()
    }
  ];
  return token;
}

export async function registerUser(
  name: string,
  password: string,
  preferences?: Partial<UserPreferences>
) {
  const normalizedName = normalizeUserName(name);
  if (!normalizedName) {
    return { ok: false, message: "请输入用户名。" };
  }

  if (password.length < 4) {
    return { ok: false, message: "密码至少需要 4 位。" };
  }

  const database = await readDatabase();
  const existingUser = database.users.find(
    (user) => user.name.toLowerCase() === normalizedName.toLowerCase()
  );
  if (existingUser) {
    return { ok: false, message: "这个用户名已经存在。" };
  }

  const salt = createSalt();
  const user: StoredUser = {
    id: randomUUID(),
    name: normalizedName,
    passwordSalt: salt,
    passwordHash: hashSecret(password, salt),
    createdAt: new Date().toISOString(),
    preferences: mergePreferences(preferences),
    sessions: []
  };
  const sessionToken = createSession(user);

  database.users.push(user);
  await writeDatabase(database);

  return { ok: true, user: toPublicUser(user), sessionToken };
}

export async function loginUser(name: string, password: string) {
  const normalizedName = normalizeUserName(name);
  const database = await readDatabase();
  const user = database.users.find(
    (item) => item.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (!user) {
    return {
      ok: false,
      message:
        "没有找到这个用户。请确认当前设备访问的是同一个已部署站点；如果是在本机分别运行，账号数据不会自动同步。"
    };
  }

  if (!safeEqual(hashSecret(password, user.passwordSalt), user.passwordHash)) {
    return { ok: false, message: "密码不正确。" };
  }

  user.preferences = mergePreferences(user.preferences);
  const sessionToken = createSession(user);
  await writeDatabase(database);

  return { ok: true, user: toPublicUser(user), sessionToken };
}

export async function updateUserPreferences(sessionToken: string, preferences: Partial<UserPreferences>) {
  const database = await readDatabase();
  const user = database.users.find((item) =>
    item.sessions.some((session) => safeEqual(hashSecret(sessionToken, item.passwordSalt), session.tokenHash))
  );

  if (!user) {
    return { ok: false, message: "登录已失效，请重新登录。" };
  }

  user.preferences = mergePreferences({
    ...user.preferences,
    ...preferences
  });
  await writeDatabase(database);

  return { ok: true, user: toPublicUser(user) };
}
