import { useEffect, useState } from "react";
import type { Session as AuthSession } from "@supabase/supabase-js";
import { cloudStore, configError, demoStore, supabase, type Store } from "./lib/store";
import type { Profile } from "./lib/types";
import SignIn from "./components/SignIn";
import Intake from "./components/Intake";
import Dashboard from "./components/Dashboard";

export default function App() {
  if (configError) return <SetupProblem message={configError} />;
  return <Main />;
}

export function SetupProblem({ message }: { message: string }) {
  return (
    <div className="wrap narrow">
      <div className="brand">
        <img src="/icon.svg" alt="" width={36} height={36} />
        <h1>Training Hub</h1>
      </div>
      <div className="card">
        <h2>Setup problem</h2>
        <p className="err">{message}</p>
        <p className="muted">
          Fix it in Vercel → your project → Settings → Environment Variables, then go to Deployments and redeploy the latest one.
        </p>
      </div>
    </div>
  );
}

function Main() {
  const [auth, setAuth] = useState<AuthSession | null | undefined>(supabase ? undefined : null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuth(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const store: Store | null = !supabase ? demoStore : auth ? cloudStore(supabase, auth.user.id) : null;
  const storeId = store ? (store.mode === "demo" ? "demo" : auth!.user.id) : null;

  useEffect(() => {
    if (!store) return;
    setProfile(undefined);
    store
      .loadProfile()
      .then(setProfile)
      .catch((e) => setError(String(e.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  if (supabase && auth === undefined) return <Loading />;
  if (supabase && !auth) return <SignIn />;
  if (error) return <div className="wrap"><p className="err">Couldn't load your account: {error}</p></div>;
  if (!store || profile === undefined) return <Loading />;

  if (!profile || editing)
    return (
      <Intake
        initial={profile?.intake}
        hasLogs={!!profile}
        onCancel={profile ? () => setEditing(false) : undefined}
        onDone={async (p, clearLogs) => {
          if (clearLogs) await store.clearLogs();
          await store.saveProfile(p);
          setProfile(p);
          setEditing(false);
        }}
      />
    );

  return (
    <Dashboard
      key={storeId! + profile.plan.createdAt}
      store={store}
      profile={profile}
      email={auth?.user.email}
      onEditPlan={() => setEditing(true)}
      onSignOut={supabase ? () => supabase!.auth.signOut() : undefined}
    />
  );
}

function Loading() {
  return (
    <div className="wrap">
      <p className="muted">Loading…</p>
    </div>
  );
}
