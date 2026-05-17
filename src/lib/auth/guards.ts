import { auth } from "./config";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

export async function requireModerator() {
  const session = await requireAuth();
  if (!["ADMIN", "MODERATOR"].includes(session.user.role as string)) redirect("/");
  return session;
}

/** Devuelve la sesión o null sin redirigir — para layouts que muestran contenido público y privado */
export async function getOptionalSession() {
  return auth();
}
