"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";

const entrada = "h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-[#466b3f] focus:ring-2 focus:ring-[#466b3f]/25";
const boton = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#466b3f] px-4 text-sm font-bold text-white transition hover:bg-[#365331] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#466b3f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginOtpPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/auth_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No fue posible enviar el código.");
        return;
      }
      if (data.challenge == null) {
        setError("El servidor no devolvió el identificador de verificación.");
        return;
      }
      setChallenge(data.challenge);
      setStep("code");
    } catch {
      setError("Error de conexión con el servidor.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/auth_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", email: email.trim().toLowerCase(), code, challenge }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Código incorrecto.");
        return;
      }
      if (typeof data.token !== "string" || !data.token.trim()) {
        setError("El servidor no devolvió un token de sesión.");
        return;
      }
      localStorage.setItem("unal_token", data.token);
      window.location.replace("/dashboard-internos");
    } catch {
      setError("Error al validar el código.");
    } finally {
      setPending(false);
    }
  }

  function cambiarCorreo() {
    setStep("email");
    setCode("");
    setChallenge(null);
    setError(null);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 pt-16 pb-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-flex rounded-full bg-[#eef3e0] p-3 text-[#466b3f]">
            <ShieldCheck aria-hidden className="h-8 w-8" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Validación institucional</h1>
          <p className="mt-1 text-sm text-gray-600">Sistema de Reconocimiento de Internos · Facultad de Medicina UNAL</p>
        </div>
        <div className="rounded-lg border border-gray-200 border-t-4 border-t-[#94b43b] bg-white px-6 py-7 shadow-sm">
          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
              <p>{error}</p>
            </div>
          )}
          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="flex flex-col gap-5">
              <div>
                <label htmlFor="correo" className="mb-1.5 block text-sm font-medium text-gray-700">Correo institucional (@unal.edu.co)</label>
                <div className="relative">
                  <Mail aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input id="correo" type="email" required autoComplete="email" placeholder="tu_correo@unal.edu.co" value={email} onChange={(e) => setEmail(e.target.value)} className={entrada} />
                </div>
              </div>
              <button type="submit" disabled={pending} className={boton}>
                {pending ? "Enviando código…" : "Solicitar código de acceso"}
                {!pending && <ArrowRight aria-hidden className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
              <p className="text-sm text-gray-600">Enviamos un código a <strong className="text-gray-900">{email}</strong>.</p>
              <div>
                <label htmlFor="codigo" className="mb-1.5 block text-sm font-medium text-gray-700">Código de acceso</label>
                <div className="relative">
                  <KeyRound aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input id="codigo" type="text" required maxLength={6} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} className={`${entrada} text-center font-mono text-xl tracking-[0.4em]`} />
                </div>
              </div>
              <button type="submit" disabled={pending} className={boton}>{pending ? "Verificando…" : "Ingresar al tablero"}</button>
              <button type="button" onClick={cambiarCorreo} className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#466b3f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#466b3f]/40">
                <ArrowLeft aria-hidden className="h-4 w-4" /> Usar otro correo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
