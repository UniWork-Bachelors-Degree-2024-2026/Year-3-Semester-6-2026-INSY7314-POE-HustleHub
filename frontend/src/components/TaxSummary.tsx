import { useApi } from "../hooks/useApi.ts";
import { getTaxEstimate } from "../services/marketApi.ts";
import { dlong, money } from "../utils/format.ts";
import { ErrorBox, Loading } from "./StateViews.tsx";
import { SpotlightCard } from "./ReactBits.tsx";
//React Bits (2026) provides the Spotlight Card component which assisted this implementation.
//The server works the figures out from the SARS tax tables (South African Revenue Service, 2026).

const percent = (rate: number): string => `${(rate * 100).toFixed(1)}%`;

// The tax estimate and insights for the current tax year, worked out by the API so there is one source of truth
export function TaxSummary() {
  const { data, error, loading, reload } = useApi(getTaxEstimate);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading rows={1} height={200} />;
  if (!data) return null;

  const { insights } = data;

  let taxNote = `${percent(data.effectiveRate)} of your income so far`;
  if (data.belowThreshold) {
    taxNote = `No tax is estimated at or below ${money(insights.threshold.amount)}`;
  }

  let thresholdNote = `${money(insights.threshold.remaining)} to go to the ${money(insights.threshold.amount)} tax threshold`;
  if (insights.threshold.reached) {
    thresholdNote = `You are past the ${money(insights.threshold.amount)} tax threshold`;
  }

  let paymentWord = "payments";
  if (data.paymentCount === 1) {
    paymentWord = "payment";
  }

  let bracketValue = `Top bracket, ${Math.round(data.bracket.rate * 100)}%`;
  let bracketNote = "There is no higher bracket";
  if (insights.nextBracket) {
    bracketValue = `${Math.round(insights.nextBracket.rate * 100)}% from ${money(insights.nextBracket.startsAt)}`;
    bracketNote = `${money(insights.nextBracket.remaining)} to go`;
  }

  return (
    <section aria-label='Estimated tax' className='tax-section'>
      <div className='tax-head'>
        <h2 className='h-md'>Income and tax estimate</h2>
        <span className='label'>
          {data.taxYear.label} | {dlong(data.taxYear.startsOn)} to {dlong(data.taxYear.endsOn)}
        </span>
      </div>

      {data.rates.outOfDate && (
        <div className='alert alert-warn' role='note'>
          These figures use the SARS rates for the {data.rates.label}, which may be out of date for the{" "}
          {data.taxYear.label}.
        </div>
      )}

      <div className='stats'>
        <SpotlightCard className='stat'>
          <span className='label'>Income this tax year</span>
          <span className='money-xl glow-num' style={{ fontSize: 34 }}>
            {money(data.income)}
          </span>
          <span className='sub'>
            Before tax, from {data.paymentCount} completed {paymentWord}
          </span>
        </SpotlightCard>
        <SpotlightCard className='stat hot'>
          <span className='label'>Estimated tax</span>
          <span className='money-xl glow-num' style={{ fontSize: 34 }}>
            {money(data.tax)}
          </span>
          <span className='sub'>{taxNote}</span>
        </SpotlightCard>
        <SpotlightCard className='stat'>
          <span className='label'>After tax</span>
          <span className='money-xl glow-num' style={{ fontSize: 34 }}>
            {money(data.afterTax)}
          </span>
          <span className='sub'>Income minus the estimated tax</span>
        </SpotlightCard>
      </div>

      <div className='bar tax' role='img' aria-label={`Estimated tax is ${percent(data.effectiveRate)} of income`}>
        <span style={{ width: `${Math.min(100, data.effectiveRate * 100)}%` }} />
      </div>

      <h3 className='h-sm' style={{ margin: "6px 0 0" }}>
        Insights
      </h3>
      <div className='stats'>
        <SpotlightCard className='stat'>
          <span className='label'>Projected tax this year</span>
          <span className='money-xl glow-num' style={{ fontSize: 28 }}>
            {money(insights.projectedAnnualTax)}
          </span>
          <span className='sub'>If you keep this pace, on about {money(insights.projectedAnnualIncome)} of income</span>
        </SpotlightCard>
        <SpotlightCard className='stat'>
          <span className='label'>Tax threshold</span>
          <span className='money-xl glow-num' style={{ fontSize: 28 }}>
            {insights.threshold.progressPercent.toFixed(1)}%
          </span>
          <div
            className='bar tax'
            role='progressbar'
            aria-label='Progress towards the tax threshold'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={insights.threshold.progressPercent}
          >
            <span style={{ width: `${insights.threshold.progressPercent}%` }} />
          </div>
          <span className='sub'>{thresholdNote}</span>
        </SpotlightCard>
        <SpotlightCard className='stat'>
          <span className='label'>Set aside</span>
          <span className='money-xl glow-num' style={{ fontSize: 28 }}>
            {money(insights.setAsidePerThousand)}
          </span>
          <span className='sub'>
            For every {money(1000)} you earn, about {insights.setAsidePercent.toFixed(1)}% of each payment
          </span>
        </SpotlightCard>
        <SpotlightCard className='stat'>
          <span className='label'>Next tax bracket</span>
          <span className='money-xl glow-num' style={{ fontSize: 28 }}>
            {bracketValue}
          </span>
          <span className='sub'>{bracketNote}</span>
        </SpotlightCard>
      </div>

      <p className='note' style={{ margin: 0 }}>
        {data.disclaimer} Uses the SARS individuals&apos; tax table for the {data.rates.label}, the primary rebate and
        the under 65 tax threshold. The projection continues the pace of the year so far, so it is only as reliable as
        that pace.
      </p>
    </section>
  );
}

//Reference List
//React Bits, 2026. Spotlight Card. [online] Available at: <https://reactbits.dev/components/spotlight-card> [Accessed 11 October 2026].
//South African Revenue Service, 2026. Rates of tax for individuals. [online] Available at: <https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/> [Accessed 11 October 2026].
