"use client";

import { useState } from "react";
import { ShieldCheck, Mail, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { TextField, Field } from "@/components/ui/field";

export default function LoginOtpPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/auth_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No fue posible enviar el código.");
        setPending(false);
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

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/auth_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", email, code, challenge }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Código incorrecto.");
        setPending(false);
        return;
      }
      localStorage.setItem("unal_token", data.token);
      window.location.href = "/dashboard-internos";
    } catch {
      setError("Error al validar el código.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-10">
      <div className="mb-6 text-center">
        <span className="inline-block rounded-full bg-[#eef3e0] p-3 text-[#466b3f]">
          <ShieldCheck className="size-8" />
        </span>
        <h1 className="font-heading mt-3 text-2xl text-[#4f4f4f]">Validación Institucional</h1>
        <p className="mt-1 text-sm text-ink-muted">Sistema de Reconocimiento de Internos · Facultad de Medicina UNAL</p>
      </div>

      <Card className="border-t-4 border-t-[#94b43b]">
        <CardBody className="px-6 py-7">
          {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
              <Field label="Correo institucional (@unal.edu.co)">
                <div className="relative">
                  <Mail aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
                  <TextField label="" type="email" required placeholder="tu_correo@unal.edu.co" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                </div>
              </Field>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Enviando código…" : "Solicitar código de acceso"} <ArrowRight aria-hidden className="size-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <p className="text-sm text-ink-soft">Código enviado a <strong>{email}</strong>.</p>
              <Field label="Código de acceso">
                <div className="relative">
                  <KeyRound aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
                  <TextField label="" type="text" required maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} className="pl-9 text-center font-mono text-xl tracking-widest" />
                </div>
              </Field>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Verificando…" : "Ingresar al Tablero"}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
