"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className="rounded-lg px-3 py-1.5 text-sm text-stone-300 transition hover:bg-white/10 hover:text-white"
    >
      Sign out
    </button>
  );
}
