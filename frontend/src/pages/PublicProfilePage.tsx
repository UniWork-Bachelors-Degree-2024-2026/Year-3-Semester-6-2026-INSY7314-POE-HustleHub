import { useCallback, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../profile.css";
import { AccessDenied } from "../components/AccessDenied.tsx";
import { CheckIcon, UserIcon } from "../components/Icons.tsx";
import { GigCard } from "../components/GigCard.tsx";
import { BackIcon, ShieldIcon } from "../components/MarketIcons.tsx";
import { ProfileCard } from "../components/ProfileCard.tsx";
import { ProgressRing } from "../components/ProfileEffects.tsx";
import { BuildingIcon, GlobeIcon, LinkedInIcon } from "../components/ProfileIcons.tsx";
import { BlurText, PageHeader, Reveal, SpotlightCard } from "../components/ReactBits.tsx";
import { ErrorBox, Loading } from "../components/StateViews.tsx";
import { StatusTag } from "../components/StatusTag.tsx";
import { useApi } from "../hooks/useApi.ts";
import { useSessionUser } from "../hooks/useProfile.ts";
import type { Booking, Gig } from "../models/market.ts";
import { AVAILABILITY, EMPTY_PROFILE, EXPERIENCE, type ProfileExtras, type PublicStats } from "../models/profile.ts";
import type { User, UserRole } from "../models/user.ts";
import { getBookings, getGigsBy, getPublicProfile } from "../services/marketApi.ts";
import { loadProfile, normaliseProfile } from "../services/profileStore.ts";
import { dlong, dshort, money } from "../utils/format.ts";
import { PATTERNS } from "../utils/patterns.ts";
import { safeUrl, strengthItems, strengthPercent } from "../utils/profileValidation.ts";
//React Bits (2026a) provides the Animated Content component (Reveal) which assisted this implementation.
//React Bits (2026b) provides the Blur Text component which assisted this implementation.
//React Bits (2026c) provides the Spotlight Card component which assisted this implementation.

interface Person {
  _id: string;
  username: string;
  role: UserRole;
}

interface Loaded {
  person: Person | null;
  /** null when the person is hidden or has not shared anything yet */
  extras: ProfileExtras | null;
  stats?: PublicStats;
  gigs: Gig[];
  shared: Booking[];
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({
  icon,
  title,
  sub,
  children,
  delay = 0,
  id,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  children: ReactNode;
  delay?: number;
  id?: string;
}) {
  return (
    <Reveal delay={delay}>
      <SpotlightCard className='panel pf-panel' id={id}>
        <div className='pf-panel-title'>
          <span className='info-icon'>{icon}</span>
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
        </div>
        {children}
      </SpotlightCard>
    </Reveal>
  );
}

// What the person chose to share, shown as a checklist so the viewer can judge how complete it is
function sharedChecks(p: ProfileExtras, role: UserRole): { label: string; ok: boolean }[] {
  const base = [
    { label: "Profile photo", ok: !!p.avatar },
    { label: "Headline", ok: !!p.headline },
    { label: "About section", ok: p.bio.length >= 40 },
    { label: "Location", ok: !!p.location },
    { label: "Website", ok: !!safeUrl(p.website) },
    { label: "LinkedIn", ok: !!safeUrl(p.linkedin, "linkedin.com") },
  ];
  if (role === "client") return [...base, { label: "Company name", ok: !!p.company }];
  if (role === "freelancer")
    return [
      ...base,
      { label: "Skills listed", ok: p.skills.length >= 3 },
      { label: "Rate shared", ok: !!p.hourlyRate },
    ];
  return base;
}

function NotFound() {
  return (
    <div className='mk empty' style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
      <span className='label'>404 · Not found</span>
      <h1 className='h-md'>We could not find that profile.</h1>
      <p>The member may not exist, or has not been active on HustleHub+ yet.</p>
      <Link className='btn' to='/dashboard'>
        Go to my dashboard
      </Link>
    </div>
  );
}

function PublicProfileView({ id, me }: { id: string; me: User }) {
  const navigate = useNavigate();
  const own = id === me._id;

  const fetcher = useCallback(async (): Promise<Loaded> => {
    // The profile and booking lookups are optional extras. Only the gig lookup must succeed.
    const [prof, gigs, bookings] = await Promise.all([
      own ? Promise.resolve(null) : getPublicProfile(id).catch(() => null),
      getGigsBy(id),
      me.role === "admin" || own ? Promise.resolve([] as Booking[]) : getBookings().catch(() => [] as Booking[]),
    ]);

    const shared = bookings.filter((b) => b.client?._id === id || b.freelancer?._id === id);
    let person: Person | null = null;
    if (own) person = { _id: me._id, username: me.username, role: me.role };
    else if (prof && PATTERNS.objectId.test(prof._id) && prof._id === id)
      person = { _id: id, username: String(prof.username).slice(0, 30), role: prof.role };
    else if (gigs[0]?.freelancer) person = { _id: id, username: gigs[0].freelancer.username, role: "freelancer" };
    else {
      const b = shared[0];
      if (b?.client?._id === id) person = { _id: id, username: b.client.username, role: "client" };
      else if (b?.freelancer?._id === id) person = { _id: id, username: b.freelancer.username, role: "freelancer" };
    }

    // Anything from another member is untrusted, so it goes through the same clean-up as stored data
    const extras = own ? loadProfile(me._id) : prof?.profile ? normaliseProfile(prof.profile) : null;
    const stats = prof?.stats && typeof prof.stats === "object" ? prof.stats : undefined;
    return { person, extras, stats, gigs, shared };
  }, [id, me._id, me.role, me.username, own]);

  const { data, error, loading, reload } = useApi(fetcher);

  if (loading && !data) return <Loading rows={2} height={220} />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data || !data.person) return <NotFound />;

  const { person, extras, stats, gigs, shared } = data;
  const role = person.role;
  const card = extras ?? EMPTY_PROFILE;
  const percent = strengthPercent(strengthItems({ ...card, username: person.username, email: "" }, role));
  const checks = sharedChecks(card, role);
  const site = safeUrl(card.website);
  const linkedin = safeUrl(card.linkedin, "linkedin.com");
  const canOpenGigs = me.role !== "freelancer";
  const doneTogether = shared.filter((b) => b.status === "completed").length;
  const availability = AVAILABILITY.find((a) => a.value === card.availability);
  const experience = EXPERIENCE.find((x) => x.value === card.experience);

  const goToGigs = () =>
    document.getElementById("pf-gigs")?.scrollIntoView({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });

  // Facts the platform knows itself, as opposed to details the person typed in
  const verified: { label: string; value: string }[] = [];
  if (stats?.memberSince && !Number.isNaN(Date.parse(stats.memberSince)))
    verified.push({ label: "Member since", value: dlong(stats.memberSince) });
  if (typeof stats?.completedBookings === "number")
    verified.push({ label: "Completed bookings", value: String(stats.completedBookings) });
  if (role === "freelancer") verified.push({ label: "Live gigs", value: String(gigs.length) });
  if (!own && shared.length > 0)
    verified.push({ label: "Bookings with you", value: `${shared.length} (${doneTogether} delivered)` });

  return (
    <>
      <PageHeader eyebrow={role} title={<BlurText text={person.username} />}>
        <button type='button' className='btn btn-ghost btn-sm' onClick={() => navigate(-1)}>
          <BackIcon /> Back
        </button>
        {own && (
          <Link className='btn btn-sm' to='/profile'>
            Edit profile
          </Link>
        )}
      </PageHeader>

      <div className='pf'>
        <aside className='pf-side' aria-label='Profile card'>
          <Reveal>
            <ProfileCard username={person.username} role={role} profile={card} />
          </Reveal>
          {own && (
            <div className={`alert ${extras?.visible ? "alert-info" : "alert-warn"}`} role='note'>
              {extras?.visible
                ? "This is how other members see you."
                : "Your profile is hidden. Other members cannot see your details."}
            </div>
          )}
          {!own && !extras && (
            <div className='alert alert-info' role='note'>
              {person.username} has not shared more details yet. What you see below comes from their activity on
              HustleHub+.
            </div>
          )}
          {role === "freelancer" && gigs.length > 0 && !own && (
            <button type='button' className='btn' onClick={goToGigs}>
              See their work
            </button>
          )}
        </aside>

        <div className='pf-main'>
          {extras && (extras.bio || extras.headline) && (
            <Section icon={<UserIcon />} title='About'>
              {extras.bio ? <p className='pf-about'>{extras.bio}</p> : <p className='pf-about'>{extras.headline}</p>}
            </Section>
          )}

          {extras &&
            role === "freelancer" &&
            (extras.category || extras.skills.length > 0 || extras.hourlyRate || experience) && (
              <Section icon={<CheckIcon />} title='Skills and rates' delay={60}>
                {extras.skills.length > 0 && (
                  <ul className='pf-chips pf-chips-lg' aria-label='Skills'>
                    {extras.skills.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
                <dl className='pf-facts'>
                  {extras.category && <Row label='Main category'>{extras.category}</Row>}
                  {experience && <Row label='Experience'>{experience.label}</Row>}
                  {extras.hourlyRate && <Row label='Hourly rate'>R{extras.hourlyRate}</Row>}
                  {availability && <Row label='Availability'>{availability.label}</Row>}
                </dl>
              </Section>
            )}

          {extras && role === "client" && (extras.company || extras.industry || extras.hiring.length > 0) && (
            <Section icon={<BuildingIcon size={18} />} title='Business' delay={60}>
              <dl className='pf-facts'>
                {extras.company && <Row label='Company'>{extras.company}</Row>}
                {extras.industry && <Row label='Industry'>{extras.industry}</Row>}
              </dl>
              {extras.hiring.length > 0 && (
                <>
                  <span className='label'>Usually hires for</span>
                  <ul className='pf-chips pf-chips-lg' aria-label='Hires for'>
                    {extras.hiring.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
            </Section>
          )}

          {role === "freelancer" && (
            <Section icon={<CheckIcon />} title='Work' sub='Gigs they currently offer.' delay={90} id='pf-gigs'>
              {gigs.length === 0 ? (
                <p className='pf-about muted'>No live gigs right now.</p>
              ) : (
                <div className={`grid-gigs ${canOpenGigs ? "" : "pf-gigs-static"}`}>
                  {gigs.map((g, i) => (
                    <GigCard
                      key={g._id}
                      index={i}
                      title={g.title}
                      category={g.category}
                      price={g.price}
                      days={g.deliveryTimeDays}
                      owner={person.username}
                      onOpen={canOpenGigs ? () => navigate(`/gigs/${g._id}`) : undefined}
                    />
                  ))}
                </div>
              )}
            </Section>
          )}

          <Section
            icon={<ShieldIcon />}
            title={role === "client" ? "Is this client legit?" : "Trust and details"}
            sub='Checked by HustleHub+ on the left, shared by them on the right.'
            delay={120}
          >
            <div className='pf-trust'>
              <div className='pf-trust-col'>
                <span className='label'>On HustleHub+</span>
                {verified.length > 0 ? (
                  <dl className='pf-facts pf-facts-col'>
                    {verified.map((v) => (
                      <Row key={v.label} label={v.label}>
                        {v.value}
                      </Row>
                    ))}
                  </dl>
                ) : (
                  <p className='pf-about muted'>No platform history yet. It builds up as they complete bookings.</p>
                )}
              </div>
              <div className='pf-trust-col'>
                <span className='label'>Shared by {own ? "you" : "them"}</span>
                <ul className='pf-checks'>
                  {checks.map((c) => (
                    <li key={c.label} className={c.ok ? "ok" : ""}>
                      <CheckIcon size={14} /> {c.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div className='pf-trust-ring'>
                <ProgressRing value={percent} size={92} stroke={8} />
                <span className='label'>Completeness</span>
              </div>
            </div>
            {(site || linkedin) && (
              <div className='pf-extlinks'>
                {site && (
                  <a href={site} target='_blank' rel='noopener noreferrer nofollow'>
                    <GlobeIcon /> {hostOf(site)}
                  </a>
                )}
                {linkedin && (
                  <a href={linkedin} target='_blank' rel='noopener noreferrer nofollow'>
                    <LinkedInIcon /> LinkedIn
                  </a>
                )}
              </div>
            )}
            <p className='hint'>
              Website and LinkedIn are written by the member. Open them to check the details match.
            </p>
          </Section>

          {!own && shared.length > 0 && (
            <Section
              icon={<CheckIcon />}
              title='Your history together'
              sub='Only you and this member can see these.'
              delay={150}
            >
              <ul className='pf-history'>
                {shared.map((b) => (
                  <li key={b._id}>
                    <span className='pf-history-title'>{b.gig?.title ?? "Gig"}</span>
                    <span className='pf-history-meta'>
                      <StatusTag status={b.status} />
                      <span className='mono'>{dshort(b.createdAt)}</span>
                      <span className='mono'>{money(b.price)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

export function PublicProfilePage() {
  const { id } = useParams();
  const me = useSessionUser();
  if (!me || !id || !PATTERNS.objectId.test(id)) return <AccessDenied />;
  return <PublicProfileView key={id} id={id} me={me} />;
}

//Reference List
//React Bits, 2026a. Animated Content. [online] Available at: <https://reactbits.dev/animations/animated-content> [Accessed 11 October 2026].
//React Bits, 2026b. Blur Text. [online] Available at: <https://reactbits.dev/text-animations/blur-text> [Accessed 11 October 2026].
//React Bits, 2026c. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
