"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result: { message?: string; success?: boolean } =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ?? "Não foi possível entrar no painel."
        );
      }

      /*
       * IMPORTANTE:
       * usamos navegação completa em vez de router.push + router.refresh.
       *
       * Isso garante que o cookie httpOnly criado pela API seja utilizado
       * em uma nova requisição completa para /admin.
       */
      window.location.replace("/admin");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível entrar no painel."
      );

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
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-mail"
              autoComplete="email"
              required
              disabled={isSubmitting}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              required
              disabled={isSubmitting}
            />
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Entrando..." : "ENTRAR"}
          </button>
        </form>
      </div>
    </main>
  );
}