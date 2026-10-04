"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result: { message?: string } = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível entrar no painel.");
      }

      router.push("/admin");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível entrar no painel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <div className="admin-login-card">
        <p className="eyebrow">Painel administrativo</p>
        <h1>Entrar</h1>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" autoComplete="email" required />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" autoComplete="current-password" required />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "ENTRAR"}
          </button>
        </form>
      </div>
    </main>
  );
}