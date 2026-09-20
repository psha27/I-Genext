const visuals: Record<string, { label: string; points: string[]; path: string }> = {
  ai: { label: 'Connected intelligence', points: ['Data', 'Intelligence', 'Automation'], path: 'M-28-25H28V25H-28ZM-12-39V-25M12-39V-25M-12 25V39M12 25V39M-42-12H-28M28-12H42M-42 12H-28M28 12H42M5-15-9 4H7L-4 18' },
  grc: { label: 'Governance by design', points: ['Controls', 'Visibility', 'Confidence'], path: 'M0-40 32-27V0C32 22 0 40 0 40S-32 22-32 0V-27ZM-16-2-4 11 18-15' },
  finance: { label: 'Capital with direction', points: ['Capital', 'Scenarios', 'Decisions'], path: 'M-34-32V32H36M-20 18V5M0 18V-7M20 18V-22M-21-12-2-25 14-20 34-38M21-38H34V-25' },
  strategy: { label: 'A clear path forward', points: ['Insight', 'Direction', 'Growth'], path: 'M0-38A38 38 0 1 0 0 38A38 38 0 1 0 0-38M16-16 7 7-16 16-7-7ZM0-46V-38M0 38V46M-46 0H-38M38 0H46' },
  audit: { label: 'Evidence into assurance', points: ['Evidence', 'Review', 'Assurance'], path: 'M-26-36H14L29-21V36H-26ZM14-36V-21H29M-14-10H12M-14 2H12M-14 17-5 26 15 9' },
  'finance-advisory': { label: 'Finance in sync', points: ['Records', 'Reporting', 'Clarity'], path: 'M-31-32H31V32H-31ZM-31-14H31M-18-24H-11M-3-24H4M-19-2H-10M2-2H19M-19 10H-10M2 10H19M-19 22H-10M2 22H19' },
  forensic: { label: 'See beyond the surface', points: ['Signals', 'Analysis', 'Findings'], path: 'M-7-33A27 27 0 1 0-7 21A27 27 0 1 0-7-33M13 14 37 38M-22-5-12 5 1-17 10-8' },
  'tech-solutions': { label: 'Systems that work together', points: ['Connect', 'Build', 'Scale'], path: 'M0-35 35-16 0 4-35-16ZM-35-1 0 19 35-1M-35 14 0 34 35 14M0 4V34' }
}

export default function ServiceIllustration({ service }: { service: string }) {
  const visual = visuals[service] || visuals.ai
  return <figure className="service-illustration" aria-label={visual.label}>
    <svg viewBox="0 0 320 260" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={'service-glow-' + service}><stop stopColor="#19afe0" stopOpacity=".24"/><stop offset="1" stopColor="#19afe0" stopOpacity="0"/></radialGradient>
        <linearGradient id={'service-line-' + service} x1="40" y1="30" x2="280" y2="230" gradientUnits="userSpaceOnUse"><stop stopColor="#9beaff"/><stop offset=".5" stopColor="#29b5e2"/><stop offset="1" stopColor="#00a094"/></linearGradient>
      </defs>
      <ellipse cx="160" cy="126" rx="150" ry="123" fill={'url(#service-glow-' + service + ')'}/>
      <g stroke={'url(#service-line-' + service + ')'}>
        <ellipse cx="160" cy="126" rx="139" ry="57" transform="rotate(-26 160 126)" opacity=".28"/>
        <ellipse cx="160" cy="126" rx="120" ry="89" transform="rotate(27 160 126)" opacity=".18"/>
        <circle cx="160" cy="126" r="78" strokeDasharray="2 9" opacity=".35"/>
        <path d="M33 170Q72 186 99 163M223 87Q251 59 278 76M203 184Q232 208 258 192" opacity=".6"/>
      </g>
      <g className="service-illustration-core" transform="translate(160 126)">
        <circle r="59" fill="#061920" fillOpacity=".7" stroke="#64dfff" strokeOpacity=".3"/>
        <path d={visual.path} stroke={'url(#service-line-' + service + ')'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <g fill="#97ebff"><circle cx="33" cy="170" r="4"/><circle cx="278" cy="76" r="4"/><circle cx="258" cy="192" r="4"/></g>
      <g fill="#031019" stroke="#4ad1df" strokeOpacity=".4"><circle cx="75" cy="49" r="12"/><circle cx="103" cy="219" r="9"/></g>
      <path d="M70 49H80M75 44V54M100 219H106" stroke="#84dcf6" strokeWidth="1.5"/>
      <circle className="service-signal-pulse" cx="278" cy="76" r="10" stroke="#74e7ff" opacity=".5"/>
    </svg>
    <figcaption><strong>{visual.label}</strong><span>{visual.points.join(' / ')}</span></figcaption>
  </figure>
}