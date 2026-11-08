import { useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createGig, getGig, updateGig } from "../services/marketApi.ts";
import { toApiError } from "../services/marketApi.ts";
import type { ApiError } from "../services/api.ts";
import { useApi } from "../hooks/useApi.ts";
import type { Gig, GigStatus } from "../models/market.ts";
import { getUser } from "../services/session.ts";
import { GigCard } from "../components/GigCard.tsx";
import { ShieldIcon, WarnIcon } from "../components/MarketIcons.tsx";
import { ErrorBox, ErrorList, Loading } from "../components/StateViews.tsx";
import { useToast } from "../components/ToastContext.ts";
import { CATEGORIES, GIG_STATUSES } from "../utils/categories.ts";
import { PATTERNS } from "../utils/patterns.ts";
import { digitsOnly, liveClean, sanitizeDecimal } from "../utils/sanitize.ts";
import { cleanGigDraft, validateGigDraft, type GigDraft, type GigErrors } from "../utils/gigValidation.ts";
import { AccessDenied } from "../components/AccessDenied.tsx";

function GigForm({ gig }: { gig: Gig | null }) {
  const nav = useNavigate();
  const toast = useToast();
  const user = getUser();
  const [d, setD] = useState<GigDraft>({
    title: gig?.title ?? "",
    description: gig?.description ?? "",
    category: gig?.category ?? CATEGORIES[0],
    price: gig ? String(gig.price) : "",
    deliveryTimeDays: gig ? String(gig.deliveryTimeDays) : "",
  });
  const [status, setStatus] = useState<GigStatus>(gig?.status ?? "active");
  const [errors, setErrors] = useState<GigErrors>({});
  const [serverErr, setServerErr] = useState<ApiError | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  // Live filters: markup and injection characters can never be typed or pasted, and number fields only take digits
  const set = (k: keyof GigDraft, v: string) => {
    const next = k === "price" ? sanitizeDecimal(v) : k === "deliveryTimeDays" ? digitsOnly(v, 2) : liveClean(v);
    setD((p) => ({ ...p, [k]: next }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs = validateGigDraft(d, CATEGORIES);
    setErrors(errs);
    setServerErr(null);
    if (Object.keys(errs).length) {
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      return;
    }
    // Only the sanitised values are sent to the API
    const clean = cleanGigDraft(d);
    const payload = {
      title: clean.title,
      description: clean.description,
      category: clean.category,
      price: Number(clean.price),
      deliveryTimeDays: Number(clean.deliveryTimeDays),
      status,
    };
    setBusy(true);
    try {
      if (gig) await updateGig(gig._id, payload);
      else await createGig(payload);
      toast(gig ? "Changes saved." : status === "active" ? "Gig published. Clients can book it now." : "Gig saved.");
      nav("/my-gigs");
    } catch (err) {
      setServerErr(toApiError(err));
      setBusy(false);
    }
  }

  const count = Object.keys(errors).length;
  const previewPrice = Number(d.price.replace(/\s/g, ""));
  const previewDays = Number(d.deliveryTimeDays);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className='label'>{gig ? "Edit listing" : "New listing"}</span>
        <h1 className='h-xl'>{gig ? "Edit gig" : "Launch a gig"}</h1>
      </div>
      <div className='split'>
        <form
          className={`main ${shake ? "shake" : ""}`}
          onSubmit={submit}
          noValidate
          aria-label='Gig details'
          style={{ gap: 22 }}
        >
          {count > 0 && (
            <div className='alert alert-danger' role='alert'>
              <WarnIcon />
              <span>
                {count} {count === 1 ? "field needs" : "fields need"} fixing before this gig can be saved.
              </span>
            </div>
          )}
          {serverErr && <ErrorList message={serverErr.message} errors={serverErr.errors} />}

          <div className='field-wrap'>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label className='label' htmlFor='ed-title'>
                Gig title
              </label>
              <span className='hint mono'>{d.title.length} / 100</span>
            </div>
            <input
              className={`field ${errors.title ? "bad" : ""}`}
              id='ed-title'
              maxLength={100}
              placeholder='Brand identity kit: logo, palette and type system'
              value={d.title}
              onChange={(e) => set("title", e.target.value)}
            />
            {errors.title && <span className='err-text'>{errors.title}</span>}
          </div>

          <div className='field-wrap'>
            <label className='label' htmlFor='ed-cat'>
              Category
            </label>
            <select className='field' id='ed-cat' value={d.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.category && <span className='err-text'>{errors.category}</span>}
          </div>

          <div className='field-wrap'>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label className='label' htmlFor='ed-desc'>
                Description
              </label>
              <span className='hint mono'>{d.description.length} / 2000</span>
            </div>
            <textarea
              className={`field ${errors.description ? "bad" : ""}`}
              id='ed-desc'
              rows={6}
              maxLength={2000}
              placeholder='What the client gets, how you work, and what you need from them to start.'
              value={d.description}
              onChange={(e) => set("description", e.target.value)}
            />
            {errors.description ? (
              <span className='err-text'>{errors.description}</span>
            ) : (
              <span className='hint'>Plain text only. HTML and scripts are stripped before saving.</span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
            <div className='field-wrap'>
              <label className='label' htmlFor='ed-price'>
                Price (R)
              </label>
              <input
                className={`field mono ${errors.price ? "bad" : ""}`}
                id='ed-price'
                inputMode='decimal'
                placeholder='2500'
                value={d.price}
                onChange={(e) => set("price", e.target.value)}
              />
              {errors.price && <span className='err-text'>{errors.price}</span>}
            </div>
            <div className='field-wrap'>
              <label className='label' htmlFor='ed-days'>
                Delivery (days)
              </label>
              <input
                className={`field mono ${errors.deliveryTimeDays ? "bad" : ""}`}
                id='ed-days'
                inputMode='numeric'
                placeholder='5'
                value={d.deliveryTimeDays}
                onChange={(e) => set("deliveryTimeDays", e.target.value)}
              />
              {errors.deliveryTimeDays && <span className='err-text'>{errors.deliveryTimeDays}</span>}
            </div>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className='label' style={{ padding: 0, marginBottom: 10 }}>
              Visibility
            </legend>
            <div className='status-pick'>
              {GIG_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type='button'
                  className='chip'
                  aria-pressed={status === s.value}
                  onClick={() => setStatus(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 20, borderTop: "1px solid var(--line)" }}
          >
            <button className='btn' type='submit' disabled={busy}>
              {busy ? "Saving..." : gig ? "Save changes" : status === "active" ? "Publish gig" : "Save gig"}
            </button>
            <Link className='navlink' to='/my-gigs' style={{ display: "inline-flex", alignItems: "center" }}>
              Cancel
            </Link>
          </div>
        </form>

        <aside
          className='aside'
          aria-label='Live preview'
          style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 24 }}
        >
          <span className='label' style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className='dot' />
            Live preview
          </span>
          <GigCard
            preview
            title={d.title || "Your gig title"}
            category={d.category}
            price={Number.isFinite(previewPrice) ? previewPrice : 0}
            days={Number.isFinite(previewDays) ? previewDays : 0}
            owner={user?.username ?? "You"}
          />
          <div className='alert alert-info' style={{ border: "1px solid var(--line)" }}>
            <span style={{ color: "var(--cyan)", display: "flex" }}>
              <ShieldIcon />
            </span>
            <span>Only you can edit or delete this gig. Ownership is checked on the server.</span>
          </div>
        </aside>
      </div>
    </>
  );
}

export function GigEditorPage() {
  const { id } = useParams();
  const user = getUser();
  // The route id is checked against the ObjectId pattern before any request is made
  const validId = !id || PATTERNS.objectId.test(id);
  const fetcher = useCallback(async () => (id && validId ? await getGig(id) : null), [id, validId]);
  const { data, error, loading, reload } = useApi(fetcher);

  if (!validId) return <AccessDenied />;
  if (loading && data === undefined) return <Loading rows={2} height={200} />;
  if (error)
    return error.status === 404 || error.status === 400 ? (
      <AccessDenied />
    ) : (
      <ErrorBox error={error} onRetry={reload} />
    );
  if (id && data && data.freelancer?._id !== user?._id) return <AccessDenied />;
  return <GigForm key={id ?? "new"} gig={data ?? null} />;
}
