import { cookies } from "next/headers";

const COOKIE = "cable_skies_admin";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "changeme";
}

export async function isAdminAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token === sign(getAdminPassword());
}

export function sign(password: string): string {
  // Lightweight local token — not cryptographic auth for production secrets
  return Buffer.from(`cs:${password}`).toString("base64url");
}

export { COOKIE as ADMIN_COOKIE };
