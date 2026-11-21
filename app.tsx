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
  Contact,
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
  contacts,
  demoOtherAccept,
  demoCandidateDecision,
  resetDemoCandidates,
  request,
  report,
  local,
  recordDemoEvent,
} from "./client";
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
            A McGill email address-format check. A few fictional demo
            questions. No verification emails sent.
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
            Your contact details stay hidden until you both say yes.
            <br />
            Pass whenever you like. Nobody can browse your profile.
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
        setHasLocalSession(!!state.user);
        setReturningProfile(
          state.user
            ? state.profiles.find((p) => p.uid === state.user!.uid) || null
            : null,
        );
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
          Use an @mail.mcgill.ca address, such as you@mail.mcgill.ca. This
          demo checks the address format and sends no emails.
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
        Only your match sees the answers shown on your match card. Nobody can
        browse profiles. Your contact details stay hidden until you both accept.
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
          <strong>Who sees this?</strong> Answers you save can appear on the
          match card shown to your assigned match. The demo cannot guarantee
          real account identity or browsing security. Contact sharing is a
          separate step only after mutual acceptance.
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
      <p className="lead">Now leave the introductions to us.</p>
      <p>
        We’ll email you when you have a match. You’ll see what you have in
        common, a few ways to start talking, and easy ideas for meeting up.
      </p>
      {demo && (
        <Note>
          Demo only: matching runs immediately using fictional students. The
          notification is logged in your browser console.
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
  async function load() {
    setError("");
    try {
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
  function decideCandidate(decision: "accept" | "pass") {
    if (!candidate || !user) return;
    demoCandidateDecision(user.uid, candidate.uid, decision);
    setIndex((current) => current + 1);
    load();
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
              onClick={() => decideCandidate("pass")}
            >
              No, pass
            </button>
            <button
              className="button yes-action"
              onClick={() => decideCandidate("accept")}
            >
              Yes, interested ↗
            </button>
          </div>
          <p className="micro">
            Your choice stays private. A Yes does not share contact details.
          </p>
        </article>
      ) : (
        <div className="empty-state">
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
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      const profile = await getProfile(user!.uid);
      setP(profile);
      setM(
        profile?.currentMatch
          ? await getMatch(profile.currentMatch, user!.uid)
          : null,
      );
      setLoaded(true);
    } catch {
      setError("Could not load your match. Try again.");
    }
  }
  useEffect(() => {
    if (user) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user]);
  async function act(decision: "accept" | "pass") {
    if (!m || !user) return;
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
      {error ? (
        <>
          <ErrorBox message={error} />
          <button className="button" onClick={load}>
            Try again
          </button>
        </>
      ) : !loaded ? (
        <p>Looking for your match…</p>
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
          <div className="chips">
            {m.sharedInterests.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <details className="candidate-details">
            <summary>See more about {m.cards[other].name}</summary>
            <div className="candidate-detail-grid">
              <div>
                <strong>They enjoy</strong>
                <p>{m.cards[other].interests.join(" · ")}</p>
              </div>
              <div>
                <strong>Usually free</strong>
                <p>
                  {m.sharedAvailability.length
                    ? m.sharedAvailability.join(" · ")
                    : "Ask what time works"}
                </p>
              </div>
            </div>
          </details>
          {error && <ErrorBox message={error} />}
          {m.decisions[user!.uid] === "pass" ||
          m.decisions[other] === "pass" ? (
            <Note>No contact details were shared. This match is closed.</Note>
          ) : bothAccepted(m) ? (
            <Link className="button full" href={`/matches/${m.id}/connected`}>
              You both said yes ↗
            </Link>
          ) : m.decisions[user!.uid] === "accept" ? (
            <>
              <Note>
                You said yes. We’re waiting for {m.cards[other].name}.
              </Note>
              {demo && (
                <button
                  className="text-btn"
                  onClick={() => {
                    demoOtherAccept(m.id, user!.uid);
                    load();
                  }}
                >
                  Demo: simulate their acceptance
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
            Your choice is private. Contact details stay hidden until you both
            say yes.
          </p>
        </article>
      ) : (
        <div className="empty-state">
          <div className="empty-circles" aria-hidden="true">
            <i />
            <i />
          </div>
          <h2>No match yet, we&apos;ll email you.</h2>
          <p>
            {p
              ? "You’re in the mix. Check back here after the team runs matching."
              : "Answer a few questions so we can find some common ground."}
          </p>
          <Link className="button secondary" href="/profile">
            {p ? "View My profile" : "Complete My profile"} ↗
          </Link>
        </div>
      )}
      <Note>
        You’re in control. Contact details are shared only when you both accept.{" "}
        <Link href="/staying-safe">Read Staying safe</Link>.
      </Note>
    </section>
  );
}
function MatchDetail({ id, connected }: { id: string; connected: boolean }) {
  const { user } = useSession(),
    [m, setM] = useState<Match | null>(null),
    [info, setInfo] = useState<Contact[]>([]),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      const x = await getMatch(id, user!.uid);
      setM(x);
      if (connected && x && bothAccepted(x)) setInfo(await contacts(x));
      setLoaded(true);
    } catch {
      setError("Could not load this match. Try again.");
    }
  }
  useEffect(() => {
    if (user) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user, id, connected]);
  async function act(decision: "accept" | "pass") {
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
            <Note>Contact details stay private until you both accept.</Note>
            <Link className="button" href={`/matches/${id}`}>
              Return to Your match
            </Link>
          </>
        ) : (
          <>
            <p className="lead">You and {card.name} have a place to start.</p>
            {info
              .filter((_, i) => m.members[i] === other)
              .map((c, i) => (
                <article className="panel" key={i}>
                  <h2>{c.name}</h2>
                  {c.instagram ? (
                    <p>
                      Instagram:{" "}
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.instagram.com/${encodeURIComponent(c.instagram.replace(/^@/, ""))}/`}
                      >
                        @{c.instagram.replace(/^@/, "")}
                      </a>
                    </p>
                  ) : (
                    <p>
                      Instagram was not shared. Keep contact sharing separate
                      and only after mutual consent.
                    </p>
                  )}
                  {c.phone && (
                    <p>
                      Phone:{" "}
                      <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>
                        {c.phone}
                      </a>
                    </p>
                  )}
                </article>
              ))}
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
              <li>What’s one campus spot you’d take a new friend to?</li>
              <li>
                {m.sharedInterests[0]
                  ? `How did you get into ${m.sharedInterests[0].toLowerCase()}?`
                  : "What would you love to try this semester?"}
              </li>
              <li>What’s been the best surprise about McGill so far?</li>
              <li>Got a go-to study-break ritual?</li>
            </ol>
          </article>
          <article className="panel">
            <h2>A first plan, kept simple</h2>
            <p className="field-help">
              These are low-cost starting points near campus. Check hours before
              you go.
            </p>
            <ul className="plans">
              {[
                "A short coffee at Café Olimpico on Saint-Laurent",
                "A 20-minute walk through the McGill campus paths",
                "A study break at the McLennan Library café",
                "A free visit to the Redpath Museum galleries",
                "A bring-your-own-snack break at Mount Royal Park",
                "A quick browse at Paragraphe Bookstore",
              ].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        </div>
        <aside>
          <div className="decision-panel">
            <p className="eyebrow">NO BIG FIRST MOVE</p>
            <h2>Want to say hi?</h2>
            <p>You’ll only swap contact details if you both accept.</p>
            {closed ? (
              <Note>
                {mine === "pass"
                  ? "You passed. No contact details were shared."
                  : "This match is closed. No contact details were shared."}{" "}
                You don’t need to do anything else.
              </Note>
            ) : bothAccepted(m) ? (
              <Link className="button full" href={`/matches/${id}/connected`}>
                You both said yes ↗
              </Link>
            ) : mine === "accept" ? (
              <>
                <Note>You said yes. We’re waiting for {card.name}.</Note>
                <button className="button secondary full" onClick={load}>
                  Check their response
                </button>
                {demo && (
                  <button
                    className="text-btn"
                    onClick={() => {
                      demoOtherAccept(id, user!.uid);
                      load();
                    }}
                  >
                    Demo: simulate their acceptance
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
                  {busy ? "Saving…" : "Accept"} ↗
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
    "Who sees my answers?",
    "In the demo, saved answers are stored only in this browser and can appear on the card shown to your assigned fictional match. Contact sharing is a separate step only after mutual acceptance. This demo cannot enforce real browsing or identity rules.",
  ],
  [
    "Why a McGill email?",
    "Join checks that the address format is exactly @mail.mcgill.ca. It does not verify ownership, send email, or establish identity.",
  ],
  [
    "How does matching work?",
    "We pair people who chose the same connection preference. Shared interests and overlapping availability each add to the score. When two people are each other’s best available option, they are paired. Ties use a consistent ordering.",
  ],
  [
    "Friends, dating, or either?",
    "Choose what feels right. Friends matches with friends, dating with dating, and either with either. You both set the pace.",
  ],
  [
    "What if I pass?",
    "Your contact details stay hidden, and the match closes. There is no rematch flow in this first version.",
  ],
  [
    "How do I delete my data?",
    "In demo mode, clear this site's browser storage to remove its local profile, decisions and reports. For a real-account request, use Contact & report a problem; no automated deletion is available.",
  ],
  [
    "How do I report someone?",
    "Use Contact & report a problem in the footer. Describe what happened without sharing unnecessary sensitive information. For immediate danger, contact local emergency services.",
  ],
  [
    "When will I get a match?",
    "Demo matching is simulated locally against fictional students. A match is not guaranteed. Check My matches; this demo sends no emails or notifications.",
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
          "Don’t share someone’s answers or contact details. Don’t send money or sensitive personal information.",
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
        <Link href="/matches">Go to My matches</Link>
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
            Use a fictional @mail.mcgill.ca-format address and fictional answers
            in this class demo. Be respectful. Do not harass, impersonate,
            discriminate, share another person’s details or misuse the service.
          </p>
          <h2>Your choices</h2>
          <p>
            You can accept or pass. A match is not guaranteed. The address check
            does not establish identity or guarantee safety. Meeting is always
            your choice.
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
            In demo mode, the browser stores the email-format input, required
            policy consent, optional reminder preference, short profile answers,
            fictional match decisions and reports. Instagram and phone are not
            collected in the short onboarding form.
          </p>
          <h2>Who sees what</h2>
          <p>
            The browser-local demo has no real-account visibility controls.
            Your answers can appear on the card shown to your assigned fictional
            match: first name, looking-for choice, interests, availability and
            optional bio. Instagram is intended to be asked only after mutual
            acceptance; the demo does not collect or share phone numbers.
          </p>
          <h2>Where data is kept</h2>
          <p>
            The demo stores fictional data in this browser’s local storage.
            It sends no emails and records no external analytics. Real Firebase
            accounts and Firestore storage are not configured unless the team
            adds and verifies separate environment settings.
          </p>
          <h2>Your data choices</h2>
          <p>
            In demo mode, clear this site's browser storage to remove the local
            demo profile and decisions. The site has no automated account
            deletion control. For a real-account request, use the course
            workspace or Contact & report a problem; no Dec 31 deletion is
            currently documented because no confirmed retention policy is active.
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
