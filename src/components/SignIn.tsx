import { useState } from "react";
import { supabase } from "../lib/store";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setState("error");
      setMsg(error.message);
    } else setState("sent");
  }

  return (
    <div className="wrap narrow">
      <div className="brand">
        <img src="/icon.svg" alt="" width={44} height={44} />
        <h1>Training Hub</h1>
      </div>
      <p className="lead">A 4-week training block built around your goal, schedule and equipment, with a log for your lifts, food and bodyweight.</p>
      {state === "sent" ? (
        <div className="card">
          <h2>Check your email</h2>
          <p>
            We sent a sign-in link to <b>{email}</b>. Open it on this device to continue.
          </p>
          <button className="btn ghost" type="button" onClick={() => setState("idle")}>
            Use a different email
          </button>
        </div>
      ) : (
        <form className="card form" onSubmit={submit}>
          <label>
            Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <button className="btn" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state === "error" && <p className="err">{msg}</p>}
          <p className="fine">No password needed. New here? The same link creates your account.</p>
        </form>
      )}
      <Disclaimer />
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="fine">
      Training Hub gives general fitness and nutrition guidance, not medical advice. Check with a doctor before starting a new program, especially with an injury or health condition. Your log
      is private to your account.
    </p>
  );
}
