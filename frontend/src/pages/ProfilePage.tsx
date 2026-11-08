import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import "../profile.css";
import { AccessDenied } from "../components/AccessDenied.tsx";
import { AvatarCropper } from "../components/AvatarCropper.tsx";
import { MailIcon, UserIcon, CheckIcon, LockIcon } from "../components/Icons.tsx";
import { PasswordField } from "../components/PasswordField.tsx";
import { ProfileCard } from "../components/ProfileCard.tsx";
import { ProgressRing, SparkBurst } from "../components/ProfileEffects.tsx";
import {
  BellIcon,
  BuildingIcon,
  CameraIcon,
  GlobeIcon,
  KeyIcon,
  LinkedInIcon,
  PinIcon,
  SaveIcon,
  UploadIcon,
} from "../components/ProfileIcons.tsx";
import { BlurText, PageHeader, Reveal, ShinyText, SpotlightCard } from "../components/ReactBits.tsx";
import { ErrorList } from "../components/StateViews.tsx";
import { TagInput } from "../components/TagInput.tsx";
import { useToast } from "../components/ToastContext.ts";
import { Toggle } from "../components/Toggle.tsx";
import { useSessionUser } from "../hooks/useProfile.ts";
import { AVAILABILITY, BANNERS, EXPERIENCE, SKILL_SUGGESTIONS, type ProfileExtras } from "../models/profile.ts";
import type { User } from "../models/user.ts";
import { ApiError, changePassword, getProfile, setTwoFactor, updateProfile } from "../services/api.ts";
import { savePublicProfile } from "../services/marketApi.ts";
import { clearProfile, loadProfile, saveProfile } from "../services/profileStore.ts";
import { clearSession, getToken, replaceToken, updateSessionUser } from "../services/session.ts";
import { CATEGORIES } from "../utils/categories.ts";
import { readImageFile } from "../utils/image.ts";
import { digitsOnly, liveClean, liveUsername } from "../utils/sanitize.ts";
import {
  cleanDraft,
  strengthItems,
  strengthPercent,
  validateProfile,
  type ProfileDraft,
} from "../utils/profileValidation.ts";
import { passwordRules, validatePassword } from "../utils/validation.ts";
//React (2026) documents rendering a pop-up outside its parent element which assisted this implementation.
//React Bits (2026a) provides the Animated Content component (Reveal) which assisted this implementation.
//React Bits (2026b) provides the Blur Text component which assisted this implementation.
//React Bits (2026c) provides the Click Spark component which assisted this implementation.
//React Bits (2026d) provides the Shiny Text component which assisted this implementation.
//React Bits (2026e) provides the Spotlight Card component which assisted this implementation.

type TabId = "profile" | "work" | "account";

// Which tab each field lives on, so a failed save can jump to the first problem
const FIELD_TAB: Partial<Record<keyof ProfileDraft, TabId>> = {
  username: "profile",
  email: "profile",
  headline: "profile",
  bio: "profile",
  location: "profile",
  website: "profile",
  linkedin: "profile",
  skills: "work",
  hourlyRate: "work",
  company: "work",
  industry: "work",
  hiring: "work",
};

const sameDraft = (a: ProfileDraft, b: ProfileDraft) => JSON.stringify(a) === JSON.stringify(b);

function Field({
  id,
  label,
  error,
  hint,
  count,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <div className='field-wrap'>
      <div className='pf-label-row'>
        <label className='label' htmlFor={id}>
          {label}
        </label>
        {count && <span className='hint mono'>{count}</span>}
      </div>
      {children}
      {error ? (
        <span className='err-text' id={`${id}-note`}>
          {error}
        </span>
      ) : hint ? (
        <span className='hint' id={`${id}-note`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function PanelTitle({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className='pf-panel-title'>
      <span className='info-icon'>{icon}</span>
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- password

function PasswordPanel() {
  const navigate = useNavigate();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; errors: string[] } | null>(null);
  const [info, setInfo] = useState("");

  const problems = {
    current: !current ? "Enter your current password." : "",
    next: validatePassword(next) ?? (next === current && next ? "Choose a password you have not used before." : ""),
    again: next !== again ? "The passwords do not match." : "",
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setErr(null);
    setInfo("");
    if (problems.current || problems.next || problems.again) return;
    const token = getToken();
    if (!token) return navigate("/login", { replace: true });
    setBusy(true);
    try {
      const result = await changePassword(token, { currentPassword: current, newPassword: next });
      if (result.token) replaceToken(result.token);
      toast("Password updated");
      setCurrent("");
      setNext("");
      setAgain("");
      setTried(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !error.message.toLowerCase().includes("password")) {
        clearSession();
        navigate("/login", { replace: true });
      } else if (error instanceof ApiError && [404, 405, 501].includes(error.status)) {
        setInfo("Changing your password is not switched on for this server yet. Your password has not been changed.");
      } else {
        const apiError = error instanceof ApiError ? error : new ApiError("Something went wrong.");
        setErr({ message: apiError.message, errors: apiError.errors ?? [] });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal delay={80}>
      <SpotlightCard className='panel pf-panel'>
        <PanelTitle icon={<KeyIcon />} title='Password' sub='Use a long password you do not use anywhere else.' />
        <form className='pf-form' onSubmit={submit} noValidate aria-label='Change password'>
          {err && <ErrorList message={err.message} errors={err.errors} />}
          {info && (
            <div className='alert alert-warn' role='status'>
              {info}
            </div>
          )}
          <Field id='pf-cur' label='Current password' error={tried ? problems.current : ""}>
            <PasswordField
              id='pf-cur'
              value={current}
              onChange={setCurrent}
              autoComplete='current-password'
              invalid={tried && !!problems.current}
              placeholder='Your current password'
            />
          </Field>
          <div className='pf-two'>
            <Field id='pf-new' label='New password' error={tried ? problems.next : ""}>
              <PasswordField
                id='pf-new'
                value={next}
                onChange={setNext}
                autoComplete='new-password'
                invalid={tried && !!problems.next}
                placeholder='A new password'
              />
            </Field>
            <Field id='pf-again' label='Confirm new password' error={tried ? problems.again : ""}>
              <PasswordField
                id='pf-again'
                value={again}
                onChange={setAgain}
                autoComplete='new-password'
                invalid={tried && !!problems.again}
                placeholder='Repeat it'
              />
            </Field>
          </div>
          <ul className='pf-rules' aria-label='Password rules'>
            {passwordRules.map((r) => (
              <li key={r.label} className={r.test(next) ? "ok" : ""}>
                <CheckIcon size={13} /> {r.label}
              </li>
            ))}
          </ul>
          <div>
            <button type='submit' className='btn' disabled={busy}>
              {busy ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </SpotlightCard>
    </Reveal>
  );
}

// ------------------------------------------------------------- two-factor

// Own security feature: optional two-factor login with a code emailed at every login.
function TwoFactorPanel() {
  const navigate = useNavigate();
  const toast = useToast();
  // null while the current setting is still being loaded from the server
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; errors: string[] } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let active = true;
    getProfile(token)
      .then((account) => {
        if (active) setEnabled(Boolean(account.twoFactorEnabled));
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const problem = !password ? "Enter your current password." : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setErr(null);
    if (problem || enabled === null) return;
    const token = getToken();
    if (!token) return navigate("/login", { replace: true });
    setBusy(true);
    try {
      const result = await setTwoFactor(token, { enabled: !enabled, password });
      setEnabled(result.twoFactorEnabled);
      toast(result.twoFactorEnabled ? "Two-factor login switched on" : "Two-factor login switched off");
      setPassword("");
      setTried(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !error.message.toLowerCase().includes("password")) {
        clearSession();
        navigate("/login", { replace: true });
      } else {
        const apiError = error instanceof ApiError ? error : new ApiError("Something went wrong.");
        setErr({ message: apiError.message, errors: apiError.errors ?? [] });
      }
    } finally {
      setBusy(false);
    }
  };

  let status = "Checking your current setting...";
  if (loadFailed) status = "We could not check your current setting. Please refresh the page.";
  if (enabled === true) status = "Two-factor login is on. We email you a code every time you log in.";
  if (enabled === false)
    status = "Two-factor login is off. Switch it on so a stolen password alone cannot open your account.";

  let buttonLabel = "Turn on two-factor login";
  if (enabled === true) buttonLabel = "Turn off two-factor login";
  if (busy) buttonLabel = "Saving...";

  return (
    <Reveal delay={110}>
      <SpotlightCard className='panel pf-panel'>
        <PanelTitle icon={<LockIcon />} title='Two-factor login' sub='Add a code from your email to every login.' />
        <form className='pf-form' onSubmit={submit} noValidate aria-label='Two-factor login'>
          {err && <ErrorList message={err.message} errors={err.errors} />}
          <p className='pf-readonly' role='status'>
            {status}
          </p>
          <Field id='pf-2fa-pass' label='Current password' error={tried ? problem : ""}>
            <PasswordField
              id='pf-2fa-pass'
              value={password}
              onChange={setPassword}
              autoComplete='current-password'
              invalid={tried && !!problem}
              placeholder='Confirm with your password'
            />
          </Field>
          <div>
            <button type='submit' className='btn' disabled={busy || enabled === null}>
              {buttonLabel}
            </button>
          </div>
        </form>
      </SpotlightCard>
    </Reveal>
  );
}

// ------------------------------------------------------------------ editor

function ProfileEditor({ user }: { user: User }) {
  const navigate = useNavigate();
  const toast = useToast();
  const role = user.role;

  const [baseline, setBaseline] = useState<ProfileDraft>(() => ({
    ...loadProfile(user._id),
    username: user.username,
    email: user.email,
  }));
  const [draft, setDraft] = useState<ProfileDraft>(baseline);
  const [tab, setTab] = useState<TabId>("profile");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState("");
  const [spark, setSpark] = useState(0);
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [over, setOver] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const tabs: { id: TabId; label: string }[] = [
    { id: "profile", label: "Profile" },
    ...(role === "freelancer" ? [{ id: "work" as const, label: "Skills & rates" }] : []),
    ...(role === "client" ? [{ id: "work" as const, label: "Company" }] : []),
    { id: "account", label: "Account" },
  ];

  const dirty = useMemo(() => !sameDraft(draft, baseline), [draft, baseline]);
  const cleaned = useMemo(() => cleanDraft(draft), [draft]);
  const errors = useMemo(() => (tried ? validateProfile(cleaned, role) : {}), [tried, cleaned, role]);
  const tabsWithErrors = new Set(Object.keys(errors).map((k) => FIELD_TAB[k as keyof ProfileDraft]));
  const steps = useMemo(() => strengthItems(cleaned, role), [cleaned, role]);
  const percent = strengthPercent(steps);
  const todo = steps.filter((s) => !s.done).slice(0, 3);

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const text = (key: "headline" | "location" | "website" | "linkedin" | "company" | "industry") => ({
    value: draft[key],
    onChange: (e: { target: { value: string } }) => set(key, liveClean(e.target.value)),
  });

  // moves the highlight pill under the selected tab, like the main nav bar
  useEffect(() => {
    const box = tabsRef.current;
    if (!box) return;
    const place = () => {
      const active = box.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) return;
      box.style.setProperty("--pill-x", `${active.offsetLeft}px`);
      box.style.setProperty("--pill-w", `${active.offsetWidth}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [tab, tabs.length]);

  // warn before closing the tab with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.id === tab);
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    setTab(n.id);
    tabsRef.current?.querySelector<HTMLElement>(`#pf-tab-${n.id}`)?.focus();
  };

  // ---- photo ----
  const pickPhoto = async (file?: File | null) => {
    if (!file) return;
    setPhotoError("");
    try {
      setCropImage(await readImageFile(file));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "We could not use that image.");
    }
  };
  const closeCrop = useCallback(() => setCropImage(null), []);
  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setOver(false);
    void pickPhoto(e.dataTransfer.files?.[0]);
  };

  // ---- save ----
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    setServerErr(null);
    setNotice("");

    const problems = validateProfile(cleaned, role);
    const first = Object.keys(problems)[0] as keyof ProfileDraft | undefined;
    if (first) {
      setTab(FIELD_TAB[first] ?? "profile");
      toast("Please fix the highlighted fields");
      return;
    }

    setBusy(true);
    let username = baseline.username;
    let email = baseline.email;
    const accountChanged = cleaned.username !== baseline.username || cleaned.email !== baseline.email;

    if (accountChanged) {
      const token = getToken();
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const updated = await updateProfile(token, { username: cleaned.username, email: cleaned.email });
        username = updated.username;
        email = updated.email;
        updateSessionUser({ username, email });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          navigate("/login", { replace: true });
          return;
        }
        if (error instanceof ApiError && [404, 405, 501].includes(error.status)) {
          setNotice(
            "Your profile details were saved, but your username and email were left as they were. The server does not accept account changes yet.",
          );
        } else {
          setServerErr(error instanceof ApiError ? error : new ApiError("Something went wrong."));
          setBusy(false);
          return;
        }
      }
    }

    const { username: _u, email: _e, ...extras } = cleaned;
    void _u;
    void _e;
    if (!saveProfile(user._id, extras as ProfileExtras)) {
      setServerErr(
        new ApiError("Your browser would not store the profile. Check that storage is allowed and has space."),
      );
      setBusy(false);
      return;
    }

    // Share with other members (best effort: it is skipped quietly until the server supports it)
    savePublicProfile(extras as ProfileExtras).catch(() => undefined);

    const next: ProfileDraft = { ...cleaned, username, email };
    setBaseline(next);
    setDraft(next);
    setTried(false);
    setBusy(false);
    setSpark((n) => n + 1);
    toast("Profile saved");
  };

  const discard = () => {
    setDraft(baseline);
    setTried(false);
    setServerErr(null);
    setNotice("");
  };

  const wipe = () => {
    if (!confirmClear) return setConfirmClear(true);
    clearProfile(user._id);
    const blank = { ...loadProfile(user._id), username: baseline.username, email: baseline.email };
    setBaseline(blank);
    setDraft(blank);
    setConfirmClear(false);
    toast("Profile data cleared from this device");
  };

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const e = errors;
  const aria = (id: string, bad?: string) => ({
    id,
    "aria-invalid": bad ? true : undefined,
    "aria-describedby": bad ? `${id}-note` : undefined,
  });

  return (
    <>
      <PageHeader eyebrow='Profile' title={<BlurText text='Your profile' />}>
        <Link className='btn btn-ghost btn-sm' to={`/u/${user._id}`}>
          View as others see it
        </Link>
        <span className={`api-pill ${dirty ? "wait" : "ok"}`} role='status'>
          <span className='api-dot' aria-hidden='true' />
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
      </PageHeader>

      <div className='pf'>
        {/* ---------------------------------------------------- left: live preview */}
        <aside className='pf-side' aria-label='Preview and profile strength'>
          <Reveal>
            <span className='label pf-preview-label'>
              <span className='api-dot ok' aria-hidden='true' /> Live preview
            </span>
            <ProfileCard username={cleaned.username || user.username} role={role} profile={cleaned} />
          </Reveal>

          <Reveal delay={100}>
            <SpotlightCard className='panel pf-strength'>
              <ProgressRing value={percent} />
              <div className='pf-strength-copy'>
                <h2>
                  <ShinyText>Profile strength</ShinyText>
                </h2>
                {todo.length === 0 ? (
                  <p>All set. Your profile looks great.</p>
                ) : (
                  <ul>
                    {todo.map((t) => (
                      <li key={t.key}>
                        <button type='button' onClick={() => setTab(t.tab)}>
                          {t.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SpotlightCard>
          </Reveal>
        </aside>

        {/* ---------------------------------------------------- right: editor */}
        <div className='pf-main'>
          <div className='pf-tabs' role='tablist' aria-label='Profile sections' ref={tabsRef} onKeyDown={onTabKey}>
            <span className='pf-tab-pill' aria-hidden='true' />
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`pf-tab-${t.id}`}
                type='button'
                role='tab'
                aria-selected={tab === t.id}
                aria-controls={`pf-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className='pf-tab'
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {tabsWithErrors.has(t.id) && <span className='pf-tab-dot' aria-label='has errors' />}
              </button>
            ))}
          </div>

          <form id='pf-form' className='pf-stack' onSubmit={save} noValidate>
            {serverErr && <ErrorList message={serverErr.message} errors={serverErr.errors ?? []} />}
            {notice && (
              <div className='alert alert-warn' role='status'>
                {notice}
              </div>
            )}

            {tab === "profile" && (
              <div
                key='profile'
                className='pf-stack pf-fade'
                role='tabpanel'
                id='pf-panel-profile'
                aria-labelledby='pf-tab-profile'
              >
                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle
                    icon={<CameraIcon />}
                    title='Photo and banner'
                    sub='This is how people see you across HustleHub+.'
                  />
                  <div className='pf-photo'>
                    <label
                      className={`pf-drop ${over ? "over" : ""}`}
                      htmlFor='pf-file'
                      onDragOver={(ev) => {
                        ev.preventDefault();
                        setOver(true);
                      }}
                      onDragLeave={() => setOver(false)}
                      onDrop={onDrop}
                    >
                      <span className='pf-drop-av'>
                        {draft.avatar ? <img src={draft.avatar} alt='' /> : <UserIcon size={42} />}
                        <span className='pf-drop-cam'>
                          <CameraIcon size={20} />
                        </span>
                      </span>
                      <span className='pf-drop-copy'>
                        <strong>{draft.avatar ? "Change your photo" : "Add a profile photo"}</strong>
                        <small>Drag one here or click to browse. JPG, PNG or WebP, up to 5 MB.</small>
                      </span>
                    </label>
                    <input
                      id='pf-file'
                      className='sr'
                      type='file'
                      accept='image/jpeg,image/png,image/webp'
                      onChange={(ev) => {
                        void pickPhoto(ev.target.files?.[0]);
                        ev.target.value = "";
                      }}
                    />
                    <div className='pf-photo-actions'>
                      <label htmlFor='pf-file' className='btn btn-ghost btn-sm'>
                        <UploadIcon size={16} /> Upload
                      </label>
                      {draft.avatar && (
                        <button type='button' className='btn btn-ghost btn-sm' onClick={() => set("avatar", "")}>
                          Remove photo
                        </button>
                      )}
                    </div>
                    {photoError && (
                      <span className='err-text' role='alert'>
                        {photoError}
                      </span>
                    )}
                  </div>

                  <fieldset className='pf-fieldset'>
                    <legend className='label'>Card banner</legend>
                    <div className='pf-banners'>
                      {BANNERS.map((b) => (
                        <button
                          key={b.id}
                          type='button'
                          className={`pf-swatch pf-banner-${b.id}`}
                          aria-pressed={draft.banner === b.id}
                          aria-label={`${b.label} banner`}
                          onClick={() => set("banner", b.id)}
                        >
                          <span>{b.label}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </SpotlightCard>

                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle
                    icon={<UserIcon />}
                    title='About you'
                    sub='A clear headline and a friendly bio help people trust you.'
                  />
                  <div className='pf-two'>
                    <Field
                      id='pf-username'
                      label='Username'
                      error={e.username}
                      hint='Letters, numbers, spaces and . _ - only.'
                    >
                      <div className='input-wrap'>
                        <span className='input-icon'>
                          <UserIcon />
                        </span>
                        <input
                          {...aria("pf-username", e.username)}
                          className={`field ${e.username ? "bad" : ""}`}
                          autoComplete='username'
                          maxLength={30}
                          value={draft.username}
                          onChange={(ev) => set("username", liveUsername(ev.target.value))}
                        />
                      </div>
                    </Field>
                    <Field id='pf-email' label='Email' error={e.email}>
                      <div className='input-wrap'>
                        <span className='input-icon'>
                          <MailIcon />
                        </span>
                        <input
                          {...aria("pf-email", e.email)}
                          className={`field ${e.email ? "bad" : ""}`}
                          type='email'
                          autoComplete='email'
                          maxLength={254}
                          value={draft.email}
                          onChange={(ev) => set("email", ev.target.value.replace(/[\s<>{}\\$`]/g, ""))}
                        />
                      </div>
                    </Field>
                  </div>
                  <Field id='pf-headline' label='Headline' error={e.headline} count={`${draft.headline.length} / 80`}>
                    <input
                      {...aria("pf-headline", e.headline)}
                      className={`field ${e.headline ? "bad" : ""}`}
                      maxLength={80}
                      placeholder={
                        role === "freelancer"
                          ? "Brand designer helping startups look established"
                          : "Founder hiring for my growing online shop"
                      }
                      {...text("headline")}
                    />
                  </Field>
                  <Field
                    id='pf-bio'
                    label='Bio'
                    error={e.bio}
                    count={`${draft.bio.length} / 500`}
                    hint='Plain text only. HTML and scripts are removed.'
                  >
                    <textarea
                      {...aria("pf-bio", e.bio)}
                      className={`field ${e.bio ? "bad" : ""}`}
                      rows={5}
                      maxLength={500}
                      placeholder='Who you are, what you care about and how you like to work.'
                      value={draft.bio}
                      onChange={(ev) => set("bio", liveClean(ev.target.value))}
                    />
                  </Field>
                </SpotlightCard>

                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle icon={<GlobeIcon size={18} />} title='Location and links' />
                  <Field id='pf-location' label='Location' error={e.location}>
                    <div className='input-wrap'>
                      <span className='input-icon'>
                        <PinIcon />
                      </span>
                      <input
                        {...aria("pf-location", e.location)}
                        className={`field ${e.location ? "bad" : ""}`}
                        maxLength={60}
                        placeholder='Cape Town, South Africa'
                        {...text("location")}
                      />
                    </div>
                  </Field>
                  <div className='pf-two'>
                    <Field id='pf-website' label='Website' error={e.website}>
                      <div className='input-wrap'>
                        <span className='input-icon'>
                          <GlobeIcon />
                        </span>
                        <input
                          {...aria("pf-website", e.website)}
                          className={`field ${e.website ? "bad" : ""}`}
                          inputMode='url'
                          autoComplete='url'
                          maxLength={200}
                          placeholder='yoursite.co.za'
                          {...text("website")}
                        />
                      </div>
                    </Field>
                    <Field id='pf-linkedin' label='LinkedIn' error={e.linkedin}>
                      <div className='input-wrap'>
                        <span className='input-icon'>
                          <LinkedInIcon />
                        </span>
                        <input
                          {...aria("pf-linkedin", e.linkedin)}
                          className={`field ${e.linkedin ? "bad" : ""}`}
                          inputMode='url'
                          maxLength={200}
                          placeholder='linkedin.com/in/you'
                          {...text("linkedin")}
                        />
                      </div>
                    </Field>
                  </div>
                </SpotlightCard>
              </div>
            )}

            {tab === "work" && role === "freelancer" && (
              <div
                key='work-f'
                className='pf-stack pf-fade'
                role='tabpanel'
                id='pf-panel-work'
                aria-labelledby='pf-tab-work'
              >
                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle
                    icon={<CheckIcon />}
                    title='What you do'
                    sub='Pick your main category, then add the skills clients search for.'
                  />
                  <Field id='pf-cat' label='Main category'>
                    <select
                      id='pf-cat'
                      className='field'
                      value={draft.category}
                      onChange={(ev) => set("category", ev.target.value)}
                    >
                      <option value=''>Choose a category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id='pf-skills' label='Skills' error={e.skills} count={`${draft.skills.length} / 12`}>
                    <TagInput
                      id='pf-skills'
                      value={draft.skills}
                      onChange={(v) => set("skills", v)}
                      suggestions={SKILL_SUGGESTIONS[draft.category] ?? []}
                      invalid={!!e.skills}
                    />
                  </Field>
                </SpotlightCard>

                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle icon={<BriefcaseMini />} title='Rates and availability' />
                  <div className='pf-two'>
                    <Field
                      id='pf-rate'
                      label='Hourly rate (R)'
                      error={e.hourlyRate}
                      hint='Whole rand. Leave blank if you quote per gig.'
                    >
                      <input
                        {...aria("pf-rate", e.hourlyRate)}
                        className={`field mono ${e.hourlyRate ? "bad" : ""}`}
                        inputMode='numeric'
                        placeholder='450'
                        value={draft.hourlyRate}
                        onChange={(ev) => set("hourlyRate", digitsOnly(ev.target.value, 5))}
                      />
                    </Field>
                  </div>
                  <fieldset className='pf-fieldset'>
                    <legend className='label'>Experience</legend>
                    <div className='pf-chips-pick'>
                      {EXPERIENCE.map((x) => (
                        <button
                          key={x.value}
                          type='button'
                          className='chip'
                          aria-pressed={draft.experience === x.value}
                          onClick={() => set("experience", draft.experience === x.value ? "" : x.value)}
                        >
                          {x.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className='pf-fieldset'>
                    <legend className='label'>Availability</legend>
                    <div className='pf-chips-pick'>
                      {AVAILABILITY.map((a) => (
                        <button
                          key={a.value}
                          type='button'
                          className='chip'
                          aria-pressed={draft.availability === a.value}
                          onClick={() => set("availability", a.value)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </SpotlightCard>
              </div>
            )}

            {tab === "work" && role === "client" && (
              <div
                key='work-c'
                className='pf-stack pf-fade'
                role='tabpanel'
                id='pf-panel-work'
                aria-labelledby='pf-tab-work'
              >
                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle
                    icon={<BuildingIcon size={18} />}
                    title='Your business'
                    sub='Freelancers see this when you send a booking.'
                  />
                  <div className='pf-two'>
                    <Field id='pf-company' label='Company or brand' error={e.company}>
                      <input
                        {...aria("pf-company", e.company)}
                        className={`field ${e.company ? "bad" : ""}`}
                        maxLength={60}
                        placeholder='Karoo Coffee Co.'
                        autoComplete='organization'
                        {...text("company")}
                      />
                    </Field>
                    <Field id='pf-industry' label='Industry' error={e.industry}>
                      <input
                        {...aria("pf-industry", e.industry)}
                        className={`field ${e.industry ? "bad" : ""}`}
                        maxLength={60}
                        placeholder='Food and beverage'
                        {...text("industry")}
                      />
                    </Field>
                  </div>
                  <fieldset className='pf-fieldset'>
                    <legend className='label'>I usually hire for (pick up to 4)</legend>
                    <div className='pf-chips-pick'>
                      {CATEGORIES.map((c) => {
                        const on = draft.hiring.includes(c);
                        return (
                          <button
                            key={c}
                            type='button'
                            className='chip'
                            aria-pressed={on}
                            disabled={!on && draft.hiring.length >= 4}
                            onClick={() =>
                              set("hiring", on ? draft.hiring.filter((h) => h !== c) : [...draft.hiring, c])
                            }
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    {e.hiring && <span className='err-text'>{e.hiring}</span>}
                  </fieldset>
                </SpotlightCard>
              </div>
            )}

            {tab === "account" && (
              <div
                key='account'
                className='pf-stack pf-fade'
                role='tabpanel'
                id='pf-panel-account'
                aria-labelledby='pf-tab-account'
              >
                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle icon={<BellIcon />} title='Notifications' sub='Choose what lands in your inbox.' />
                  <Toggle
                    id='pf-n-book'
                    label='Booking updates'
                    hint='New requests, status changes and receipts.'
                    checked={draft.notifyBookings}
                    onChange={(v) => set("notifyBookings", v)}
                  />
                  <Toggle
                    id='pf-n-news'
                    label='Tips and product news'
                    hint='Occasional ideas to get more out of HustleHub+.'
                    checked={draft.notifyNews}
                    onChange={(v) => set("notifyNews", v)}
                  />
                </SpotlightCard>

                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle
                    icon={<GlobeIcon size={18} />}
                    title='Visibility'
                    sub='Like a CV, but only for members of HustleHub+.'
                  />
                  <Toggle
                    id='pf-visible'
                    label='Let other members view my profile'
                    hint='Your photo, bio, details and gigs. Your email is never shown.'
                    checked={draft.visible}
                    onChange={(v) => set("visible", v)}
                  />
                </SpotlightCard>

                <SpotlightCard className='panel pf-panel'>
                  <PanelTitle icon={<LockIcon />} title='Account type' />
                  <p className='pf-readonly'>
                    You joined as a <strong className='capitalize'>{role}</strong>. Your account type is fixed so
                    bookings and payments stay accurate.
                  </p>
                </SpotlightCard>
              </div>
            )}
          </form>

          {tab === "account" && (
            <div className='pf-stack pf-fade'>
              <PasswordPanel />
              <TwoFactorPanel />
              <Reveal delay={140}>
                <SpotlightCard className='panel pf-panel pf-device'>
                  <PanelTitle
                    icon={<SaveIcon size={18} />}
                    title='This device'
                    sub='Photo and profile details are kept in this browser.'
                  />
                  <div className='pf-device-actions'>
                    <button
                      type='button'
                      className={`btn btn-sm ${confirmClear ? "btn-danger" : "btn-ghost"}`}
                      onClick={wipe}
                    >
                      {confirmClear ? "Click again to confirm" : "Clear profile data"}
                    </button>
                    <button type='button' className='btn btn-ghost btn-sm' onClick={logout}>
                      Log out
                    </button>
                  </div>
                </SpotlightCard>
              </Reveal>
            </div>
          )}
        </div>
      </div>

      {cropImage && (
        <AvatarCropper
          image={cropImage}
          onCancel={closeCrop}
          onSave={(url) => {
            set("avatar", url);
            setCropImage(null);
          }}
        />
      )}

      {/* save bar: on the body so it stays pinned to the screen (see AvatarCropper) */}
      {createPortal(
        <div className='mk'>
          <div className={`pf-savebar ${dirty ? "dirty" : ""}`} role='region' aria-label='Save changes'>
            <span className='pf-savebar-text'>{dirty ? "You have unsaved changes" : "Everything is saved"}</span>
            <button type='button' className='btn btn-ghost btn-sm' onClick={discard} disabled={!dirty || busy}>
              Discard
            </button>
            <SparkBurst fire={spark}>
              <button type='submit' form='pf-form' className='btn btn-sm' disabled={!dirty || busy}>
                <SaveIcon /> {busy ? "Saving..." : "Save changes"}
              </button>
            </SparkBurst>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// small briefcase glyph so the page does not depend on extra icon exports
function BriefcaseMini() {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <rect x='3' y='7' width='18' height='13' rx='2' />
      <path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18' />
    </svg>
  );
}

export function ProfilePage() {
  const user = useSessionUser();
  if (!user) return <AccessDenied />;
  return <ProfileEditor key={user._id} user={user} />;
}

//Reference List
//React, 2026. createPortal. [online] Available at: <https://react.dev/reference/react-dom/createPortal> [Accessed 11 October 2026].
//React Bits, 2026a. Animated Content. [online] Available at: <https://reactbits.dev/animations/animated-content> [Accessed 11 October 2026].
//React Bits, 2026b. Blur Text. [online] Available at: <https://reactbits.dev/text-animations/blur-text> [Accessed 11 October 2026].
//React Bits, 2026c. Click Spark. [online] Available at: <https://reactbits.dev/animations/click-spark> [Accessed 11 October 2026].
//React Bits, 2026d. Shiny Text. [online] Available at: <https://reactbits.dev/text-animations/shiny-text> [Accessed 11 October 2026].
//React Bits, 2026e. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
