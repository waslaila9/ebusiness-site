"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, ReactNode } from "react";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { auth, demo, incomplete } from "./firebase";
import {
  Profile,
  Match,
  blankProfile,
  isMcGill,
  safeNext,
  validateProfile,
  interests,
  days,
  times,
  bothAccepted,
} from "./model";
import {
  demoLogin,
  getProfile,
  getCandidates,
  saveProfile,
  getMatch,
  decide,
  saveMatchInstagram,
  demoOtherAccept,
  demoCandidateDecision,
  resetDemoCandidates,
  getDemoScenario,
  setDemoScenario,
  request,
  report,
  local,
  recordDemoEvent,
} from "./client";
import {
  conversationStarter,
  firstPlanSuggestion,
  reasons,
} from "./matching";
import { useSession } from "./session";
const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const supportHref = support ? `mailto:${support}` : "/contact";
function Back({
  href = "/",
  children = "Home",
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Link className="back" href={href}>
      ← {children}
    </Link>
  );
}
function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <span className="note-mark" aria-hidden="true">
        i
      </span>
      <div>{children}</div>
    </div>
  );
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <p className="error" role="alert">
      {message} <span>Try again using the button below.</span>
    </p>
  ) : null;
}
function MatchConversation({
  sharedInterests,
  sharedAvailability,
}: {
  sharedInterests: string[];
  sharedAvailability: string[];
}) {
  const opener = conversationStarter(sharedInterests);
  const plan = firstPlanSuggestion(sharedAvailability);
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copied" | "manual"
  >("idle");

  async function copyOpener() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Unavailable");
      await navigator.clipboard.writeText(opener);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("manual");
    }
  }

  return (
    <div className="match-conversation">
      <section className="why-you-matched" aria-labelledby="why-matched">
        <p className="eyebrow">WHY YOU MATCHED</p>
        <h2 id="why-matched">A little common ground</h2>
        {sharedInterests.length ? (
          <p>You both enjoy {sharedInterests.join(", ")}.</p>
        ) : (
          <p>
            No shared interests were listed. Looking for compatibility still
            brought you together.
          </p>
        )}
        {sharedAvailability.length ? (
          <p className="shared-time">
            <strong>Shared time:</strong> {sharedAvailability.join(", ")}
          </p>
        ) : (
          <p className="shared-time">No shared time is listed.</p>
        )}
      </section>
      <section className="conversation-opener" aria-labelledby="conversation-opener">
        <h3 id="conversation-opener">A ready-to-copy first line</h3>
        <blockquote>{opener}</blockquote>
        <button
          type="button"
          className="button secondary"
          onClick={copyOpener}
          aria-label="Copy the first-line conversation starter"
        >
          {copyStatus === "copied" ? "Copied" : "Copy opener"}
        </button>
        <p className="copy-status" role="status" aria-live="polite">
          {copyStatus === "copied"
            ? "Copied. Paste it wherever you want to say hello."
            : copyStatus === "manual"
              ? "Copy did not work. Select the opener below and copy it manually."
              : ""}
        </p>
        {copyStatus === "manual" && (
          <textarea
            className="manual-copy"
            readOnly
            value={opener}
            aria-label="Conversation opener for manual copying"
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </section>
      {plan && (
        <aside className="first-plan" aria-label="First plan suggestion">
          <h3>Simple first-plan idea</h3>
          <p>{plan}</p>
        </aside>
      )}
    </div>
  );
}
function Member({ children }: { children: ReactNode }) {
  const { user, ready } = useSession(),
    router = useRouter();
  useEffect(() => {
    if (ready && !user)
      router.replace(
        "/join?next=" + encodeURIComponent(window.location.pathname),
      );
  }, [ready, user, router]);
  return !ready || !user ? (
    <section className="narrow page" aria-live="polite">
      <p>Checking your sign-in…</p>
      <Link href="/join">Go to Join</Link>
    </section>
  ) : (
    children
  );
}
function Home() {
  const { user } = useSession();
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="tiny-dot" /> FOR NEW MCGILL STUDENTS
          </p>
          <h1>
            Your people.
            <br />A little closer.
          </h1>
          <p className="hero-description">
            Find a suggested person who shares your interests or has time
            when you do. Make a low-pressure start—for friendship, or for
            dating if that is what you are looking for.
          </p>
          <div className="actions">
            <Link href={user ? "/matches" : "/join"} className="button">
              {user ? "My matches" : "Join"} <span aria-hidden="true">↗</span>
            </Link>
            <Link className="quiet-link" href="#how-it-works">
              A simple way to meet <span aria-hidden="true">↓</span>
            </Link>
          </div>
          <p className="micro">
            The class demo checks only @mail.mcgill.ca address format. It
            delivers no verification, reminder, or match emails.
          </p>
        </div>
        <div
          className="hero-art"
          role="img"
          aria-label="Two illustrated student cards meet over shared interests and a free afternoon"
        >
          <span className="art-caption top-caption">
            LESS SCROLLING. MORE HELLO.
          </span>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="paper-card card-back">
            <div className="abstract-person person-one">
              <span />
            </div>
            <div className="fake-line long" />
            <div className="fake-line short" />
            <div className="chips">
              <span>Music</span>
              <span>Coffee walks</span>
            </div>
          </div>
          <div className="paper-card card-front">
            <div className="abstract-person person-two">
              <span />
            </div>
            <p>A little common ground.</p>
            <div className="chips">
              <span>Curiosity</span>
              <span>Wednesday afternoons</span>
            </div>
          </div>
          <div className="hello-stamp">
            A good place
            <br />
            to start.<span aria-hidden="true">↗</span>
          </div>
          <span className="art-caption bottom-caption">
            ONE MATCH. NO ENDLESS SWIPING.
          </span>
        </div>
      </section>
      <div className="promise-bar">
        <span>@mail.mcgill.ca format checked</span>
        <span>Compatibility comes first</span>
        <span>Fictional, browser-local demo</span>
      </div>
      <section id="how-it-works" className="wrap how-section">
        <div className="section-heading">
          <p className="eyebrow">SMALL STEPS. REAL CONNECTION.</p>
          <h2>
            Making the first move,
            <br />a little easier.
          </h2>
          <p>
            No endless profiles. No pressure to be interesting on command.
            <br />
            Just a little help finding your starting point.
          </p>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Join with a student email",
              "Use an @mail.mcgill.ca address. This demo checks the format only; it does not send or verify email.",
            ],
            [
              "02",
              "Answer a few questions",
              "Tell us what you enjoy and when you’re free. It only takes a few minutes.",
            ],
            [
              "03",
              "Get a match and an easy way to say hi",
              "See what you share, pick a conversation starter, and decide if you’d like to connect.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="wrap closing">
        <div>
          <p className="eyebrow">AT YOUR OWN PACE</p>
          <h2>A hello, on your terms.</h2>
          <p>
            Instagram sharing is optional and available for this match only
            after you both say yes.
            <br />
            Pass whenever you like. The class demo keeps answers in this
            browser.
          </p>
          <Link className="quiet-link" href="/staying-safe">
            A little about staying safe ↗
          </Link>
        </div>
        <div className="closing-symbol" aria-hidden="true">
          <i />
          <i />
        </div>
      </section>
    </>
  );
}
function Join() {
  const router = useRouter(),
    { user } = useSession();
  const [email, setEmail] = useState(""),
    [consent, setConsent] = useState(false),
    [reminder, setReminder] = useState(false),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [login, setLogin] = useState(false),
    [returningProfile, setReturningProfile] = useState<Profile | null>(null),
    [hasLocalSession, setHasLocalSession] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setLogin(q.has("login"));
    try {
      setEmail(sessionStorage.getItem("join-email") || "");
      setConsent(sessionStorage.getItem("join-consent") === "true");
      setReminder(sessionStorage.getItem("join-reminder") === "true");
      if (demo) {
        const state = local();
        const profile =
          state.profiles.find((p) => p.uid === "demo-you") ||
          (state.user
            ? state.profiles.find((p) => p.uid === state.user!.uid) || null
            : null);
        setHasLocalSession(!!profile);
        setReturningProfile(profile);
      }
    } catch {}
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    const errs: Record<string, string> = {};
    if (!normalizedEmail) {
      errs.email = "Add your McGill email.";
      recordDemoEvent("join_error");
      recordDemoEvent("join_error:non_mcgill_email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errs.email = "Enter a complete email address, such as you@mail.mcgill.ca.";
      recordDemoEvent("join_error");
      recordDemoEvent("join_error:non_mcgill_email");
    } else if (!isMcGill(normalizedEmail)) {
      errs.email =
        "Use the exact @mail.mcgill.ca student domain, such as you@mail.mcgill.ca.";
      recordDemoEvent("join_error");
      recordDemoEvent("join_error:non_mcgill_email");
    }
    if (!consent) {
      errs.consent =
        "Consent is required. Agree to the Privacy policy and Terms of use.";
      recordDemoEvent("join_error");
      recordDemoEvent("join_error:consent_unticked");
    }
    setErrors(errs);
    setError("");
    if (Object.keys(errs).length) {
      requestAnimationFrame(() =>
        document
          .getElementById(errs.email ? "email" : "consent")
          ?.focus(),
      );
      return;
    }
    setBusy(true);
    try {
      sessionStorage.setItem("join-email", normalizedEmail);
      sessionStorage.setItem("join-consent", consent ? "true" : "false");
      sessionStorage.setItem("join-reminder", reminder ? "true" : "false");
      const next = safeNext(new URLSearchParams(location.search).get("next"));
      sessionStorage.setItem("join-next", next);
      recordDemoEvent("sign_up");
      if (demo) {
        demoLogin(normalizedEmail);
        router.push(next);
        return;
      }
      if (!auth || incomplete)
        throw new Error(
          "Firebase setup is incomplete. Ask your team to check it.",
        );
      await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || location.origin}/join/check-inbox?next=${encodeURIComponent(next)}`,
        handleCodeInApp: true,
      });
      localStorage.setItem("emailForSignIn", email.trim().toLowerCase());
      router.push("/join/check-inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="narrow page">
      <Back />
      <p className="eyebrow">YOUR FIRST HELLO STARTS HERE</p>
      <h1>Join</h1>
      <p className="lead">
        {login
          ? "Welcome back. Resume your browser-local demo if you left a profile or match here."
          : "A familiar face can change your whole week."}
      </p>
      {login && demo && (
        <div className="panel">
          {hasLocalSession ? (
            <>
              <h2>Your demo profile is here</h2>
              <p>
                {returningProfile?.completed
                  ? "Resume your completed profile and My matches."
                  : "Resume the profile you started in this browser."}
              </p>
              <button
                type="button"
                className="button"
                onClick={() =>
                  router.push(
                    returningProfile?.completed ? "/matches" : "/profile",
                  )
                }
              >
                Resume my demo
              </button>
            </>
          ) : (
            <>
              <h2>No demo session is saved here yet</h2>
              <p>You can join below to create a fictional browser-local profile.</p>
            </>
          )}
        </div>
      )}
      {user && (
        <Note>
          You’re already signed in.{" "}
          <Link href="/matches">Go to My matches</Link>.
        </Note>
      )}
      <form noValidate onSubmit={submit}>
        <label htmlFor="email">McGill email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@mail.mcgill.ca"
          value={email}
          onBlur={(e) =>
            setEmail(e.target.value.trim().toLowerCase())
          }
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby="email-help email-error"
        />
        <p id="email-help" className="field-help">
          Use an @mail.mcgill.ca address, such as you@mail.mcgill.ca. The class
          demo checks its format only; it does not verify ownership or send
          emails.
        </p>
        <div id="email-error" role="alert">
          {errors.email && (
            <p className="error">
              {errors.email} <Link href="/join/error">Need help?</Link>
            </p>
          )}
        </div>
        <label className="check">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-invalid={!!errors.consent}
            aria-describedby="consent-error"
          />
          <span>
            I agree to the{" "}
            <Link target="_blank" rel="noreferrer" href="/privacy">
              Privacy policy
            </Link>{" "}
            and{" "}
            <Link target="_blank" rel="noreferrer" href="/terms">
              Terms of use
            </Link>
            .
          </span>
        </label>
        {errors.consent && (
          <p id="consent-error" className="error" role="alert">
            {errors.consent}
          </p>
        )}
        <label className="check">
          <input
            id="reminder"
            type="checkbox"
            checked={reminder}
            onChange={(e) => setReminder(e.target.checked)}
            aria-describedby="reminder-help"
          />
          <span>
            Send me a profile reminder
            <small id="reminder-help">
              Optional. This demo sends no reminders or emails.
            </small>
          </span>
        </label>
        <ErrorBox message={error} />
        <button className="button full" disabled={busy}>
          {busy
            ? "Sending…"
            : demo
              ? "Continue in demo mode"
              : "Send my sign-in link"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </form>
      <Note>
        In the class demo, your answers stay in this browser and appear on a
        fictional match card shown to you. No other student receives them.
        Instagram can be shared for a match only after you both say yes.
      </Note>
      <p className="micro">Independent student project for INSY 440.</p>
    </section>
  );
}
function Inbox() {
  const router = useRouter(),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [needsEmail, setNeedsEmail] = useState(false),
    [consent, setConsent] = useState(false);
  async function finish(address: string) {
    if (!isMcGill(address)) {
      router.replace("/join/error");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signInWithEmailLink(auth!, address, location.href);
      await request("register", { consent: true });
      localStorage.removeItem("emailForSignIn");
      router.replace(
        safeNext(
          new URLSearchParams(location.search).get("next") ||
            sessionStorage.getItem("join-next"),
        ),
      );
    } catch {
      router.replace("/join/error");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    setEmail(
      sessionStorage.getItem("join-email") ||
        localStorage.getItem("emailForSignIn") ||
        "",
    );
    setConsent(sessionStorage.getItem("join-consent") === "true");
    if (!demo && auth && isSignInWithEmailLink(auth, location.href)) {
      // Require explicit consent again when opening on a different browser.
      setNeedsEmail(true);
      setStatus(
        "Your sign-in link is ready. Confirm your email and agreement to finish.",
      );
    }
  }, []);
  async function resend() {
    setBusy(true);
    setError("");
    try {
      if (!isMcGill(email))
        throw new Error("Go back to Join and enter your McGill email.");
      if (demo)
        setStatus("Demo only: no email was sent. Use the button below.");
      else {
        await sendSignInLinkToEmail(auth!, email, {
          url: `${process.env.NEXT_PUBLIC_SITE_URL || location.origin}/join/check-inbox?next=${encodeURIComponent(safeNext(new URLSearchParams(location.search).get("next") || sessionStorage.getItem("join-next")))}`,
          handleCodeInApp: true,
        });
        setStatus("A new link is on its way. Use the most recent email.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="narrow page">
      <Back href="/join">Join</Back>
      <p className="eyebrow">ONE QUICK CHECK</p>
      <h1>Check your McGill inbox</h1>
      <p className="lead">
        {demo
          ? "This is the demo inbox step. No verification email has been sent."
          : needsEmail
            ? "Let’s finish signing you in."
            : `We sent a verification link${email ? " to " + email : ""}. Open it to continue.`}
      </p>
      <p>
        Check your spam folder too. The link is just for you, so please don’t
        forward it.
      </p>
      {needsEmail && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (consent) finish(email);
            else setError("Please agree to continue.");
          }}
        >
          <label htmlFor="confirm-email">Confirm your McGill email</label>
          <input
            id="confirm-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link target="_blank" rel="noreferrer" href="/privacy">
                Privacy policy
              </Link>{" "}
              and{" "}
              <Link target="_blank" rel="noreferrer" href="/terms">
                Terms of use
              </Link>
              .
            </span>
          </label>
          <button className="button" disabled={busy}>
            Finish signing in
          </button>
        </form>
      )}
      {demo && (
        <button
          className="button"
          disabled={busy}
          onClick={() => {
            if (busy) return;
            if (!isMcGill(email) || !consent) {
              router.push("/join");
              return;
            }
            setBusy(true);
            demoLogin(email);
            router.push(safeNext(sessionStorage.getItem("join-next")));
          }}
        >
          Simulate verified sign-in ↗
        </button>
      )}
      <p role="status">{status}</p>
      <ErrorBox message={error} />
      <button className="text-btn" disabled={busy} onClick={resend}>
        {busy ? "Sending…" : "Resend link"}
      </button>
      <p>
        <Link href="/join">Use a different McGill email</Link>
      </p>
    </section>
  );
}
function JoinError() {
  return (
    <section className="narrow page">
      <Back href="/join">Join</Back>
      <p className="eyebrow">LET’S TRY THAT AGAIN</p>
      <h1>Link expired or not a McGill email</h1>
      <p className="lead">
        That link may have expired, already been used, or belong to an email we
        can’t verify.
      </p>
      <p>
        Use an @mail.mcgill.ca address and open the newest link in your inbox.
      </p>
      <Link href="/join" className="button">
        Send a new link ↗
      </Link>
    </section>
  );
}
function ProfileForm() {
  const { user } = useSession(),
    router = useRouter();
  const [p, setP] = useState<Profile>(blankProfile("")),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [saved, setSaved] = useState(false),
    [editing, setEditing] = useState(false),
    [formStarted, setFormStarted] = useState(false);
  const visibilityRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user) return;
    getProfile(user.uid)
      .then((x) => {
        if (x) {
          setP({ ...blankProfile(user.uid), ...x, uid: user.uid });
          setSaved(x.completed && Object.keys(validateProfile(x)).length === 0);
        } else {
          try {
            const draft = JSON.parse(
              sessionStorage.getItem("profile-draft-" + user.uid) || "null",
            );
            setP(
              draft
                ? { ...blankProfile(user.uid), ...draft, uid: user.uid }
                : blankProfile(user.uid),
            );
          } catch {
            setP(blankProfile(user.uid));
          }
        }
        setLoaded(true);
      })
      .catch(() => {
        setError("Could not load your profile. Refresh to try again.");
      });
  }, [user]);
  useEffect(() => {
    if (!loaded || !visibilityRef.current) return;
    const element = visibilityRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          recordDemoEvent("visibility_note_view");
          observer.disconnect();
        }
      },
      { threshold: 0.8 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loaded]);
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    if (!formStarted) {
      setFormStarted(true);
      recordDemoEvent("form_start");
    }
    const next = { ...p, [key]: value };
    setP(next);
    try {
      sessionStorage.setItem(
        "profile-draft-" + user!.uid,
        JSON.stringify(next),
      );
    } catch {}
  }
  function toggle(key: "interests" | "values" | "availability", v: string) {
    const isSelected = p[key].includes(v);
    if (!isSelected && key === "interests" && p.interests.length >= 10) {
      setErrors((current) => ({
        ...current,
        interests: "Choose up to 10 interests.",
      }));
      return;
    }
    setErrors((current) => {
      const next = { ...current };
      delete next.interests;
      return next;
    });
    update(
      key,
      isSelected ? p[key].filter((x) => x !== v) : [...p[key], v],
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = validateProfile(p);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveProfile(p);
      sessionStorage.removeItem("profile-draft-" + user!.uid);
      recordDemoEvent("profile_complete");
      router.push("/matches");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const err = (key: string) =>
    errors[key] ? (
      <p id={key + "-error"} className="error">
        {errors[key]}
      </p>
    ) : null;
  return (
    <section className="form-page page">
      <Back href="/matches">My matches</Back>
      <h1>My profile</h1>
      <div ref={visibilityRef}>
        <Note>
          <strong>Who sees this?</strong> In the class demo, your answers stay
          in this browser and appear on the fictional suggestion card shown to
          you. Instagram is not part of your profile; it is optional for each
          match and available only after mutual acceptance.
        </Note>
      </div>
      <p className="lead">A few things about you. A better starting point.</p>
      {!loaded ? (
        <>
          <ErrorBox message={error} />
          <p>Loading your profile…</p>
        </>
      ) : saved && !editing ? (
        <div className="panel">
          <h2>You’re all set.</h2>
          <p>
            Your profile is saved. You can update your answers whenever they
            change.
          </p>
          <div className="profile-summary">
            <p>
              <strong>{p.name}</strong>
            </p>
            <p>Looking for: {p.looking}</p>
            <p>Interests: {p.interests.join(" · ")}</p>
            <p>Availability: {p.availability.join(" · ")}</p>
            {p.about && <p>{p.about}</p>}
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => setEditing(true)}
          >
            Edit my profile
          </button>
          <Link className="button" href="/matches">
            Go to My matches ↗
          </Link>
          <p>
            <Link href="/contact">Request a profile change</Link>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="form-question">
            <label htmlFor="name">
              <span>01</span> First name <span aria-hidden="true">(required)</span>
            </label>
            <input
              id="name"
              autoComplete="given-name"
              maxLength={60}
              value={p.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby="name-error"
            />
            {err("name")}
          </div>
          <fieldset
            className="form-question"
            id="looking"
            tabIndex={-1}
            aria-describedby="looking-error"
          >
            <legend>
              <span>02</span> Looking for <span aria-hidden="true">(required)</span>
            </legend>
            <div className="choices">
              {(["friends", "dating", "either"] as const).map((x) => (
                <label key={x}>
                  <input
                    type="radio"
                    name="looking"
                    checked={p.looking === x}
                    onChange={() => update("looking", x)}
                  />
                  <span>
                    {x === "friends"
                      ? "Friends"
                      : x === "dating"
                        ? "Dating"
                        : "Either"}
                  </span>
                </label>
              ))}
            </div>
            {err("looking")}
          </fieldset>
          <fieldset
            className="form-question"
            id="interests"
            tabIndex={-1}
            aria-describedby="interests-error"
          >
            <legend>
              <span>03</span> Interests <span aria-hidden="true">(required)</span>
            </legend>
            <p className="field-help">Choose up to 10.</p>
            <div className="choices">
              {interests.map((x) => (
                <label key={x}>
                  <input
                    type="checkbox"
                    checked={p.interests.includes(x)}
                    onChange={() => toggle("interests", x)}
                  />
                  <span>{x}</span>
                </label>
              ))}
            </div>
            {err("interests")}
          </fieldset>
          <fieldset
            className="form-question"
            id="availability"
            tabIndex={-1}
            aria-describedby="availability-error"
          >
            <legend>
              <span>04</span> Availability <span aria-hidden="true">(required)</span>
            </legend>
            <p className="field-help">
              Select the days and times that usually work. These are
              approximate, not bookings.
            </p>
            <div className="availability">
              <span />
              <span>Morning</span>
              <span>Afternoon</span>
              <span>Evening</span>
              {days.map((d) => (
                <div key={d} className="day-row">
                  <span>{d}</span>
                  {times.map((t) => (
                    <label key={t}>
                      <input
                        type="checkbox"
                        aria-label={`${d} ${t}`}
                        checked={p.availability.includes(`${d} ${t}`)}
                        onChange={() => toggle("availability", `${d} ${t}`)}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {err("availability")}
          </fieldset>
          <div className="form-question">
            <label htmlFor="about">
              <span>05</span> About me <small>(optional)</small>
            </label>
            <textarea
              id="about"
              rows={4}
              maxLength={280}
              placeholder="A small detail your match could ask you about..."
              value={p.about}
              onChange={(e) => update("about", e.target.value)}
              aria-describedby="about-help about-error"
            />
            <p id="about-help" className="field-help">
              280 characters maximum. A blank bio is okay.
            </p>
            {err("about")}
          </div>
          <ErrorBox message={error} />
          {editing && (
            <button
              className="button secondary"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel editing
            </button>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save my profile"} ↗
          </button>
          <p className="micro">
            You can request changes or{" "}
            <Link href={supportHref}>delete your data</Link> through the team.
          </p>
        </form>
      )}
    </section>
  );
}
function Saved() {
  return (
    <section className="narrow page">
      <Back href="/profile">My profile</Back>
      <p className="eyebrow">YOU DID YOUR PART</p>
      <h1>Profile saved</h1>
      <p className="lead">
        {demo
          ? "Your profile is saved and ready for a suggestion."
          : "Now leave the introductions to us."}
      </p>
      <p>
        {demo
          ? "Open My matches to see one fictional student suggestion based on your Looking for choice, interests, and availability."
          : "We’ll email you when you have a match. You’ll see what you have in common, a few ways to start talking, and easy ideas for meeting up."}
      </p>
      {demo && (
        <Note>
          Demo only: suggestions use fictional students in this browser. No
          notification email is sent.
        </Note>
      )}
      <Link className="button" href="/matches">
        Go to My matches ↗
      </Link>
    </section>
  );
}
function FindMatches() {
  const { user } = useSession();
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [hasCurrentMatch, setHasCurrentMatch] = useState(false);
  async function load() {
    setError("");
    try {
      const profile = await getProfile(user!.uid);
      setHasCurrentMatch(!!profile?.currentMatch);
      setCandidates(await getCandidates(user!.uid));
      setIndex(0);
      setLoaded(true);
    } catch {
      setError("Could not load more matches. Try again.");
    }
  }
  useEffect(() => {
    if (user) load();
  }, [user]);
  const candidate = candidates[index];
  async function decideCandidate(decision: "accept" | "pass") {
    if (!candidate || !user || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = demoCandidateDecision(user.uid, candidate.uid, decision);
      if (result !== "saved")
        throw new Error(
          result === "stale"
            ? "This suggestion is no longer active. Refresh to see the latest one."
            : "You already decided on this suggestion.",
        );
      setNotice(
        decision === "pass"
          ? `Passed on ${candidate.name}. Showing your next suggestion.`
          : `You said yes to ${candidate.name}. Check My matches for their response.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your choice.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="content-page page">
      <div className="member-switcher" role="tablist" aria-label="Match views">
        <Link href="/matches">My matches</Link>
        <Link className="active" href="/find" aria-current="page">
          Find more
        </Link>
      </div>
      <p className="eyebrow">TAKE YOUR TIME</p>
      <h1>Find more matches</h1>
      <p className="lead">
        Look through one profile at a time. Say yes or pass, then keep going.
      </p>
      {notice && <p className="decision-notice" role="status">{notice}</p>}
      {error ? (
        <>
          <ErrorBox message={error} />
          <button className="button" onClick={load}>
            Try again
          </button>
        </>
      ) : !loaded ? (
        <p>Finding compatible students…</p>
      ) : candidate ? (
        <article className="candidate-card browse-card">
          <div className="candidate-topline">
            <span className="eyebrow">COMPATIBLE STUDENT</span>
            <span className="candidate-count">
              {index + 1} of {candidates.length}
            </span>
          </div>
          <div className="candidate-identity">
            <div className="monogram" aria-hidden="true">
              {candidate.name.slice(0, 1)}
            </div>
            <div>
              <h2>{candidate.name}</h2>
              <p>Looking for {candidate.looking}</p>
            </div>
          </div>
          <p className="candidate-intro">
            {candidate.about ||
              "A McGill student looking for a thoughtful, low-pressure connection."}
          </p>
          <div className="chips">
            {candidate.interests.slice(0, 4).map((interest) => (
              <span key={interest}>{interest}</span>
            ))}
          </div>
          <details className="candidate-details">
            <summary>Open profile details</summary>
            <div className="candidate-detail-grid">
              <div>
                  <strong>Usually free</strong>
                  <p>{candidate.availability.join(" · ")}</p>
              </div>
              <div>
                <strong>Looking for</strong>
                <p>
                  {candidate.looking === "friends"
                    ? "Friends"
                    : candidate.looking === "dating"
                      ? "Low-stakes dating"
                      : "Friends or dating"}
                </p>
              </div>
              <div>
                <strong>Availability</strong>
                <p>{candidate.availability.slice(0, 3).join(" · ")}</p>
              </div>
            </div>
          </details>
          <div className="decision-actions">
            <button
              className="button pass-action"
              disabled={busy}
              onClick={() => decideCandidate("pass")}
            >
              {busy ? "Saving…" : "No, pass"}
            </button>
            <button
              className="button yes-action"
              disabled={busy}
              onClick={() => decideCandidate("accept")}
            >
              {busy ? "Saving…" : "Yes, interested"} ↗
            </button>
          </div>
          <p className="micro">
            Your choice stays private. A yes does not share an Instagram handle.
          </p>
        </article>
      ) : (
        <div className="empty-state">
          {hasCurrentMatch ? (
            <>
              <h2>Your response is saved.</h2>
              <p>Open My matches to see whether the other student has replied.</p>
              <Link className="button" href="/matches">
                Go to My matches
              </Link>
            </>
          ) : (
            <>
              <h2>You’ve seen everyone in this demo.</h2>
              <p>Reset the fictional candidate list and try the flow again.</p>
              <button
                className="button"
                onClick={() => {
                  resetDemoCandidates();
                  load();
                }}
              >
                Start over
              </button>
            </>
          )}
        </div>
      )}
      <Note>
        These are fictional demo profiles. Real students will only appear
        through verified, server-assigned matches.
      </Note>
    </section>
  );
}
function Matches() {
  const { user } = useSession(),
    [p, setP] = useState<Profile | null>(null),
    [m, setM] = useState<Match | null>(null),
    [suggestion, setSuggestion] = useState<Profile | null>(null),
    [scenario, setScenario] = useState<"compatible" | "waiting" | "no-eligible">("compatible"),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function load() {
    setError("");
    try {
      const profile = await getProfile(user!.uid);
      setP(profile);
      const existing = profile?.currentMatch
        ? await getMatch(profile.currentMatch, user!.uid)
        : null;
      setM(existing);
      if (demo && profile && profile.completed && !existing) {
        setScenario(getDemoScenario());
        const candidates = await getCandidates(user!.uid);
        setSuggestion(candidates[0] || null);
      } else {
        setSuggestion(null);
        if (demo) setScenario(getDemoScenario());
      }
      setLoaded(true);
    } catch {
      setError("Could not load your match. Try again.");
    }
  }
  useEffect(() => {
    if (user) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user]);
  async function act(decision: "accept" | "pass") {
    if (!m || !user || busy) return;
    setBusy(true);
    setError("");
    try {
      await decide(m.id, user.uid, decision);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your choice.");
    } finally {
      setBusy(false);
    }
  }
  async function actSuggestion(decision: "accept" | "pass") {
    if (!suggestion || !user || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = demoCandidateDecision(
        user.uid,
        suggestion.uid,
        decision,
      );
      if (result !== "saved")
        throw new Error(
          result === "stale"
            ? "This suggestion is no longer active. Refresh to see the latest one."
            : "You already decided on this suggestion.",
        );
      setNotice(
        decision === "pass"
          ? `Passed on ${suggestion.name}. Showing your next suggestion.`
          : "",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your choice.");
    } finally {
      setBusy(false);
    }
  }
  async function simulateOtherYes() {
    if (!m || !user || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!demoOtherAccept(m.id, user.uid))
        throw new Error("The other student’s answer is no longer pending.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the demo response.");
    } finally {
      setBusy(false);
    }
  }
  const other = m?.members.find((x) => x !== user?.uid);
  return (
    <section className="content-page page">
      <div className="member-switcher" role="tablist" aria-label="Match views">
        <Link className="active" href="/matches" aria-current="page">
          My matches
        </Link>
        <Link href="/find">Find more</Link>
      </div>
      <Back />
      <p className="eyebrow">ONE THOUGHTFUL INTRODUCTION</p>
      <h1>My matches</h1>
      <p className="lead">A little common ground is a good place to start.</p>
      {notice && <p className="decision-notice" role="status">{notice}</p>}
      {demo && p?.completed && (
        <div className="demo-scenarios">
          <p className="micro">Demo scenarios</p>
          {(["compatible", "waiting", "no-eligible"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="text-btn"
              aria-pressed={scenario === option}
              onClick={() => {
                setDemoScenario(option);
                setNotice("");
                load();
              }}
            >
              {option === "compatible"
                ? "Show compatible suggestion"
                : option === "waiting"
                  ? "Show waiting state"
                  : "Show no-eligible state"}
            </button>
          ))}
        </div>
      )}
      {error ? (
        <>
          <ErrorBox message={error} />
          <button className="button" onClick={load}>
            Try again
          </button>
        </>
      ) : !loaded ? (
        <p>Looking for your match…</p>
      ) : suggestion && p ? (
        <article className="candidate-card">
          <div className="candidate-topline">
            <span className="eyebrow">FICTIONAL STUDENT SUGGESTION</span>
            <span className="candidate-count">1 of 1</span>
          </div>
          <div className="candidate-identity">
            <div className="monogram" aria-hidden="true">
              {suggestion.name.slice(0, 1)}
            </div>
            <div>
              <h2>{suggestion.name}</h2>
              <p>Looking for {suggestion.looking}</p>
            </div>
          </div>
          <p className="candidate-intro">
            {suggestion.about ||
              "A fictional McGill student open to a low-pressure hello."}
          </p>
          <MatchConversation
            sharedInterests={reasons(p, suggestion).sharedInterests}
            sharedAvailability={reasons(p, suggestion).sharedAvailability}
          />
          <div className="decision-actions">
            <button
              className="button pass-action"
              disabled={busy}
              onClick={() => actSuggestion("pass")}
            >
              {busy ? "Saving…" : "No, pass"}
            </button>
            <button
              className="button yes-action"
              disabled={busy}
              onClick={() => actSuggestion("accept")}
            >
              {busy ? "Saving…" : "Yes, connect"} ↗
            </button>
          </div>
          <p className="micro">
            Passing excludes this student from the next suggestion. Reloading will keep the ranked result stable.
          </p>
        </article>
      ) : m && other ? (
        <article className="candidate-card">
          <div className="candidate-topline">
            <span className="eyebrow">PRIVATE STUDENT MATCH</span>
            <span className="candidate-count">1 of 1</span>
          </div>
          <div className="candidate-identity">
            <div className="monogram" aria-hidden="true">
              {m.cards[other].name.slice(0, 1)}
            </div>
            <div>
              <h2>{m.cards[other].name}</h2>
              <p>Looking for {m.cards[other].looking}</p>
            </div>
          </div>
          <p className="candidate-intro">
            {m.cards[other].about ||
              "Someone who shares a little common ground and is open to a low-pressure hello."}
          </p>
          <MatchConversation
            sharedInterests={m.sharedInterests}
            sharedAvailability={m.sharedAvailability}
          />
          {error && <ErrorBox message={error} />}
          {m.decisions[user!.uid] === "pass" ||
          m.decisions[other] === "pass" ? (
            <Note>
              {m.decisions[user!.uid] === "pass"
                ? "You passed on this match."
                : `${m.cards[other].name} passed on this match.`}{" "}
              It’s closed, and no Instagram handles were shared.
            </Note>
          ) : bothAccepted(m) ? (
            <>
              <Note>
                <strong>Mutual yes:</strong> you both accepted. Instagram
                sharing is now available for this match.
              </Note>
              <Link className="button full" href={`/matches/${m.id}/connected`}>
                Continue to Instagram ↗
              </Link>
            </>
          ) : m.decisions[user!.uid] === "accept" ? (
            <>
              <Note>
                <strong>Pending:</strong> your yes is saved. We’re waiting for{" "}
                {m.cards[other].name}. Instagram stays unavailable until they
                also say yes.
              </Note>
              {demo && (
                <button
                  className="text-btn"
                  disabled={busy}
                  onClick={simulateOtherYes}
                >
                  Demo: simulate {m.cards[other].name}&apos;s second yes
                </button>
              )}
            </>
          ) : (
            <div className="decision-actions">
              <button
                className="button pass-action"
                disabled={busy}
                onClick={() => act("pass")}
              >
                No, pass
              </button>
              <button
                className="button yes-action"
                disabled={busy}
                onClick={() => act("accept")}
              >
                {busy ? "Saving…" : "Yes, connect"} ↗
              </button>
            </div>
          )}
          <p className="micro">
            Your choice is private. Instagram stays unavailable until you both
            say yes.
          </p>
        </article>
      ) : (
        <div className="empty-state">
          <div className="empty-circles" aria-hidden="true">
            <i />
            <i />
          </div>
          <h2>
            {!p || !p.completed
              ? "Finish My profile before finding a match."
              : scenario === "waiting"
                ? "A suggestion is on its way."
                : scenario === "no-eligible"
                  ? "No eligible match right now."
                  : "No eligible match right now."}
          </h2>
          <p>
            {!p || !p.completed
              ? "Complete your interests, availability, and Looking for selection first."
              : scenario === "waiting"
                ? "This demo is waiting before a suggestion is available. Come back later; your profile is saved."
                : "This demo scenario has no eligible suggestions. Edit your interests or availability, then choose Show compatible suggestion above, or return later."}
          </p>
          <Link className="button secondary" href="/profile">
            {p?.completed ? "View My profile" : "Complete My profile"} ↗
          </Link>
        </div>
      )}
      <Note>
        You’re in control. Instagram is available only after mutual acceptance.{" "}
        <Link href="/staying-safe">Read Staying safe</Link>.
      </Note>
    </section>
  );
}
function MatchDetail({ id, connected }: { id: string; connected: boolean }) {
  const { user } = useSession(),
    [m, setM] = useState<Match | null>(null),
    [instagramInput, setInstagramInput] = useState(""),
    [instagramSaved, setInstagramSaved] = useState(false),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      const x = await getMatch(id, user!.uid);
      setM(x);
      setInstagramInput(x?.instagram?.[user!.uid] || "");
      setLoaded(true);
    } catch {
      setError("Could not load this match. Try again.");
    }
  }
  useEffect(() => {
    if (user) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user, id, connected]);
  async function act(decision: "accept" | "pass") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await decide(id, user!.uid, decision);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function submitInstagram(event: FormEvent) {
    event.preventDefault();
    if (!user || !m || !bothAccepted(m) || busy) return;
    setBusy(true);
    setError("");
    setInstagramSaved(false);
    try {
      await saveMatchInstagram(m.id, user.uid, instagramInput);
      setInstagramSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your Instagram.");
    } finally {
      setBusy(false);
    }
  }
  async function simulateOtherYes() {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!demoOtherAccept(id, user.uid))
        throw new Error("The other student’s answer is no longer pending.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the demo response.");
    } finally {
      setBusy(false);
    }
  }
  if (!loaded)
    return (
      <section className="narrow page">
        <Back href="/matches">My matches</Back>
        <p>Loading your match…</p>
        <ErrorBox message={error} />
        {error && (
          <button className="button" onClick={load}>
            Try again
          </button>
        )}
      </section>
    );
  if (!m)
    return (
      <section className="narrow page">
        <Back href="/matches">My matches</Back>
        <h1>Match not found</h1>
        <p>This match isn’t available to your account.</p>
        <Link href="/matches">Go to My matches</Link>
      </section>
    );
  const other = m.members.find((x) => x !== user!.uid)!,
    card = m.cards[other],
    mine = m.decisions[user!.uid],
    closed = Object.values(m.decisions).includes("pass");
  if (connected)
    return (
      <section className="narrow page">
        <Back href={`/matches/${id}`}>Your match</Back>
        <p className="eyebrow">A HELLO IS UP TO YOU</p>
        <h1>You both said yes</h1>
        {!bothAccepted(m) ? (
          <>
            <Note>
              This match is still pending. Instagram stays unavailable until
              you both say yes.
            </Note>
            <Link className="button" href={`/matches/${id}`}>
              Return to Your match
            </Link>
          </>
        ) : (
          <>
            <p className="lead">You and {card.name} have a place to start.</p>
            <article className="panel">
              <h2>Your Instagram for this match</h2>
              <p>
                Share a handle for this match only. You can update or remove it
                later; it is not part of your profile.
              </p>
              <form onSubmit={submitInstagram}>
                <label htmlFor="match-instagram">Your Instagram username</label>
                <input
                  id="match-instagram"
                  name="instagram"
                  autoComplete="off"
                  maxLength={31}
                  placeholder="@your_handle"
                  value={instagramInput}
                  onChange={(event) => {
                    setInstagramSaved(false);
                    setInstagramInput(event.target.value);
                  }}
                  disabled={busy}
                />
                <button className="button" disabled={busy}>
                  {busy ? "Saving…" : instagramInput ? "Save handle" : "Remove handle"}
                </button>
                {instagramSaved && (
                  <p className="success" role="status">
                    Your match-specific Instagram handle was saved.
                  </p>
                )}
              </form>
            </article>
            <article className="panel">
              <h2>{card.name}&apos;s Instagram</h2>
              {m.instagram?.[other] ? (
                <p>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.instagram.com/${encodeURIComponent(m.instagram[other])}/`}
                  >
                    @{m.instagram[other]}
                  </a>
                </p>
              ) : (
                <p>
                  {card.name} hasn’t shared an Instagram handle for this match.
                </p>
              )}
            </article>
            <ErrorBox message={error} />
            {error && (
              <button className="button" onClick={load}>
                Try again
              </button>
            )}
            <p>
              Try: “Hey! Looks like we both like{" "}
              {m.sharedInterests[0] || "trying new things"}. Want to say hi over
              a coffee?”
            </p>
            <Note>
              Start with a short meet-up in a public place.{" "}
              <Link href="/staying-safe">Read Staying safe</Link>.
            </Note>
            <Link href="/matches">Back to My matches</Link>
          </>
        )}
      </section>
    );
  return (
    <section className="content-page page">
      <Back href="/matches">My matches</Back>
      <p className="eyebrow">YOUR NEXT FAMILIAR FACE</p>
      <h1>Your match</h1>
      <div className="match-title">
        <div className="monogram" aria-hidden="true">
          {card.name[0]}
        </div>
        <div>
          <h2>{card.name}</h2>
          <p>Looking for {card.looking}</p>
        </div>
      </div>
      <MatchConversation
        sharedInterests={m.sharedInterests}
        sharedAvailability={m.sharedAvailability}
      />
      <div className="match-layout">
        <div>
          <article className="panel">
            <h2>Why you matched</h2>
            <h3>Some common ground</h3>
            <p>
              {m.sharedInterests.length
                ? `You both enjoy ${m.sharedInterests.join(", ")}.`
                : "You chose the same kind of connection. Your interests are different—a chance to try something new."}
            </p>
            <div className="chips">
              {m.sharedInterests.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
            <h3>A time that works</h3>
            <p>
              {m.sharedAvailability.length
                ? `You’re both usually free: ${m.sharedAvailability.join(", ")}.`
                : "No overlapping time yet. Ask which short break could work before planning to meet."}
            </p>
            <h3>From their answers</h3>
            <p>Interests: {card.interests.join(", ")}.</p>
          </article>
          <article className="panel">
            <h2>A few ways to say hi</h2>
            <ol className="starters">
              <li>
                {m.sharedInterests[0]
                  ? conversationStarter(m.sharedInterests)
                  : "What would you love to try this semester?"}
              </li>
              <li>What’s been the best surprise about McGill so far?</li>
              <li>Got a go-to study-break ritual?</li>
            </ol>
          </article>
        </div>
        <aside>
          <div className="decision-panel">
            <p className="eyebrow">NO BIG FIRST MOVE</p>
            <h2>Want to say hi?</h2>
            <p>You can share Instagram handles only if you both accept.</p>
            {closed ? (
              <Note>
                {mine === "pass"
                  ? "You passed. No Instagram handles were shared."
                  : "This match is closed. No Instagram handles were shared."}{" "}
                You don’t need to do anything else.
              </Note>
            ) : bothAccepted(m) ? (
              <Link className="button full" href={`/matches/${id}/connected`}>
                You both said yes ↗
              </Link>
            ) : mine === "accept" ? (
              <>
                <Note>You said yes. We’re waiting for {card.name}.</Note>
                <button
                  className="button secondary full"
                  disabled={busy}
                  onClick={load}
                >
                  Check their response
                </button>
                {demo && (
                  <button
                    className="text-btn"
                    disabled={busy}
                    onClick={simulateOtherYes}
                  >
                    Demo: simulate {card.name}&apos;s second yes
                  </button>
                )}
              </>
            ) : (
              <>
                <ErrorBox message={error} />
                <button
                  className="button full"
                  disabled={busy}
                  onClick={() => act("accept")}
                >
                  {busy ? "Saving…" : "Say yes"} ↗
                </button>
                <button
                  className="button secondary full"
                  disabled={busy}
                  onClick={() => act("pass")}
                >
                  Pass
                </button>
                <p className="micro">Your choice is final for this match.</p>
              </>
            )}
            <Link href="/contact">Report a problem</Link>
            <p>
              <Link href="/matches">Back to My matches</Link>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
const faqs = [
  [
    "Who sees my profile answers?",
    "In the class demo, your answers stay in this browser and appear on the fictional suggestion card shown to you; no other student receives them. In a configured matching service, only your assigned match would see the approved card answers: first name, Looking for choice, interests, availability, and optional bio. The demo is not real-account or multi-user privacy protection.",
  ],
  [
    "What does the @mail.mcgill.ca check do?",
    "Join checks that the address is formatted with the exact @mail.mcgill.ca domain. The class demo does not verify that you own the address or establish your identity.",
  ],
  [
    "Will the class demo send me email?",
    "No. Email delivery is off in the class demo: it sends no sign-in links, profile reminders, match notifications, or report emails. The address is used only for the local demo sign-in flow.",
  ],
  [
    "How is a suggestion chosen?",
    "Eligibility follows the Looking for answers: the same selection is compatible, and Either is compatible with Friends, Dating, or Either. Eligible candidates are ranked by shared interests and overlapping availability; ties use a stable order. The demo shows one fictional suggestion at a time.",
  ],
  [
    "Friends, dating, or either?",
    "Choose what feels right. Friends is compatible with Friends, Dating with Dating, and Either with all three selections. You both set the pace.",
  ],
  [
    "What if I pass?",
    "Pass is saved and that person is excluded from this suggestion flow; the next eligible candidate is shown. If you pass an already-assigned match, that match closes and no new match is created automatically.",
  ],
  [
    "What does pending mean?",
    "Your yes has been saved, but the other student has not answered yet. Refreshing keeps the same pending result. Instagram is not available until you both say yes. The demo has a clearly labelled button to simulate the fictional student's second yes.",
  ],
  [
    "When can I share Instagram?",
    "Only after both people say yes. You can enter, update, or remove your own handle for that match; the other student's handle appears only if they shared one. Phone numbers are not collected or shared.",
  ],
  [
    "What if there is no eligible match?",
    "There may be no eligible suggestion right now, and a match is never guaranteed. Review or edit your Looking for choice, interests, or availability, then check again later. The demo does not email you when a suggestion becomes available.",
  ],
  [
    "How do I delete my data?",
    "In demo mode, clear this site's browser storage to remove the local profile, decisions, reports, and match-specific Instagram handles. For a real-account request, use Contact & report a problem; no automated deletion is available.",
  ],
  [
    "How do I report someone?",
    "Use Contact & report a problem in the footer. Describe what happened without sharing unnecessary sensitive information. For immediate danger, contact local emergency services.",
  ],
  [
    "When will I get a match?",
    "The class demo checks fictional students in this browser. A match is not guaranteed. Check My matches; the demo sends no emails or notifications.",
  ],
];
function Questions() {
  const { user } = useSession();
  return (
    <section className="narrow page">
      <Back />
      <p className="eyebrow">A FEW THINGS YOU MIGHT WONDER</p>
      <h1>Questions</h1>
      <p className="lead">A little clarity before you say hello.</p>
      <div className="faq">
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
      <p>
        Need to report a concern?{" "}
        <Link href="/contact">Contact &amp; report a problem</Link>.
      </p>
      <p>
        {user ? (
          <Link href="/matches">Back to My matches ↗</Link>
        ) : (
          <>
            Ready when you are. <Link href="/join">Join ↗</Link>
          </>
        )}
      </p>
    </section>
  );
}
function Safe() {
  const { user } = useSession();
  return (
    <section className="narrow page">
      <Back />
      <p className="eyebrow">LOOK OUT FOR YOURSELF. AND EACH OTHER.</p>
      <h1>Staying safe</h1>
      <p className="lead">A good hello should feel comfortable.</p>
      <Note>
        Keep first meetings public, simple, and fully optional. This student
        project is a connection tool, not an identity or safety check.
      </Note>
      {[
        [
          "Respect the pace",
          "Be kind. Ask rather than assume. A match or an acceptance never creates an obligation to meet, date or continue talking.",
        ],
        [
          "Keep the first plan simple",
          "Meet in a public place near campus, arrange your own transport and tell someone you trust where you’re going.",
        ],
        [
          "Keep private things private",
          "Don’t share someone else’s answers. Share your own Instagram for this match only after you both say yes. Don’t send money or sensitive personal information.",
        ],
        [
          "Trust your comfort level",
          "You can leave a conversation or meet-up whenever you want. Report harassment, pressure, discrimination or other concerning behaviour.",
        ],
      ].map(([h, p]) => (
        <article className="guideline" key={h}>
          <h2>{h}</h2>
          <p>{p}</p>
        </article>
      ))}
      <Link className="button secondary" href="/contact">
        Report a problem ↗
      </Link>
      <p>
        {user ? (
          <Link href="/matches">Go to My matches</Link>
        ) : (
          <Link href="/join?login=1&next=%2Fmatches">
            Join or log in to see My matches
          </Link>
        )}
      </p>
    </section>
  );
}
function Legal({ terms }: { terms: boolean }) {
  return (
    <section className="narrow page legal">
      <Back />
      <h1>{terms ? "Terms of use" : "Privacy policy"}</h1>
      <Note>
        This is a student-project version for INSY 440. Read the choices below
        before joining. The team should review this copy with the course
        requirements before collecting real data.
      </Note>
      {terms ? (
        <>
          <h2>A respectful place to meet</h2>
          <p>
            Use a fictional address in the @mail.mcgill.ca format and fictional
            answers in this class demo. The address check does not verify
            ownership, and no emails are sent. Be respectful. Do not harass,
            impersonate, discriminate, share another person’s details or misuse
            the service.
          </p>
          <h2>Your choices</h2>
          <p>
            You can accept or pass. A yes is pending until the other person
            responds; Instagram is offered only after a mutual yes. A match is
            not guaranteed. The address check does not establish identity or
            guarantee safety. Meeting is always your choice.
          </p>
          <h2>Student project</h2>
          <p>
            This is an independent INSY 440 project, not an official McGill
            service. Availability and support are limited. The team may restrict
            access following a report.
          </p>
        </>
      ) : (
        <>
          <h2>What we collect</h2>
          <p>
            In the class demo, this browser stores the email-format input,
            required policy consent, optional reminder preference, profile
            answers, fictional match decisions, reports, and match-specific
            Instagram handles. The address is not verified and no emails are
            sent. Instagram is requested only after a mutual yes.
          </p>
          <h2>Who sees what</h2>
          <p>
            In the class demo, the fictional suggestion card is shown only in
            this browser; no other student receives your answers. In a
            configured matching service, the assigned match sees only the
            approved card fields: first name, Looking for choice, interests,
            availability, and optional bio. Instagram can be shared for a match
            only after both people accept. Phone numbers are not collected or
            shared.
          </p>
          <h2>Where data is kept</h2>
          <p>
            The demo stores fictional data in this browser’s storage, including
            local storage. It sends no emails and records no external analytics.
            Real Firebase accounts and Firestore storage are not configured
            unless the team adds and verifies separate environment settings.
            The demo is not a secure multi-user service.
          </p>
          <h2>Your data choices</h2>
          <p>
            In demo mode, clear this site's browser storage to remove the local
            profile, decisions, reports, and match-specific Instagram handles.
            The site has no automated account deletion control. For a real-
            account request, use the course workspace or Contact &amp; report a
            problem; no automated deletion is currently available.
          </p>
        </>
      )}
      <p>
        <Link href={supportHref}>Request deletion of my data</Link> ·{" "}
        <Link href="/contact">Contact &amp; report a problem</Link>
      </p>
      <Link className="button secondary" href="/join">
        Back to Join ↗
      </Link>
    </section>
  );
}
function ContactPage() {
  const { user } = useSession(),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe the problem.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await report(message);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="narrow page">
      <Back />
      <h1>Contact &amp; report a problem</h1>
      <p className="lead">Something doesn’t feel right? Tell us.</p>
      <p>
        Support email:{" "}
        {support ? (
          <a href={`mailto:${support}`}>{support}</a>
        ) : (
          <strong>Use the project team email in your course workspace.</strong>
        )}
      </p>
      {!support && (
        <Note>
          For this class demo, send support questions to the project team
          through the course workspace.
        </Note>
      )}
      <p>
        For profile changes or a deletion request, use the established course
        workspace channel. Please avoid sending unnecessary sensitive details.
        Demo reports are stored only in this browser and are not sent.
      </p>
      {sent ? (
        <div className="panel" role="status">
          <h2>{demo ? "Demo report saved" : "Report received"}</h2>
          <p>
            {demo
              ? "This report stays in this browser. It has not been sent to the team."
              : "The team can review your report. This is not an emergency service."}
          </p>
          <Link href="/matches">Go to My matches</Link>
        </div>
      ) : user ? (
        <form onSubmit={send} noValidate>
          <label htmlFor="report">What happened?</label>
          <textarea
            id="report"
            rows={6}
            maxLength={3000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-describedby="report-error"
          />
          <ErrorBox message={error} />
          <button className="button" disabled={busy}>
            {busy ? "Sending…" : "Send report"} ↗
          </button>
        </form>
      ) : (
        <Note>
          <Link href="/join?login=1">Log in</Link> to send an account-linked
          report, or use the support email above.
        </Note>
      )}
    </section>
  );
}
export function App({ path }: { path: string }) {
  if (path === "/") return <Home />;
  if (path === "/join") return <Join />;
  if (path === "/join/check-inbox") return <Inbox />;
  if (path === "/join/error") return <JoinError />;
  if (path === "/profile")
    return (
      <Member>
        <ProfileForm />
      </Member>
    );
  if (path === "/profile/saved")
    return (
      <Member>
        <Saved />
      </Member>
    );
  if (path === "/matches")
    return (
      <Member>
        <Matches />
      </Member>
    );
  if (path === "/find")
    return (
      <Member>
        <FindMatches />
      </Member>
    );
  if (path.startsWith("/matches/"))
    return (
      <Member>
        <MatchDetail
          id={path.split("/")[2]}
          connected={path.endsWith("/connected")}
        />
      </Member>
    );
  if (path === "/staying-safe") return <Safe />;
  if (path === "/questions") return <Questions />;
  if (path === "/privacy" || path === "/terms")
    return <Legal terms={path === "/terms"} />;
  return <ContactPage />;
}
