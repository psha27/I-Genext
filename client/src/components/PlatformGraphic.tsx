type Props = { kind: string; name: string }

export default function PlatformGraphic({ kind, name }: Props) {
  return <div className={'platform-graphic graphic-' + kind} aria-hidden="true">
    <div className="platform-graphic-top"><strong>{name}</strong><span>Illustrative workflow</span></div>
    {kind === 'plinari' && <>
      <div className="graphic-subtitle">One finance data backbone</div>
      <div className="finance-pipeline"><span>ERP data</span><i>→</i><span>Validate</span><i>→</i><span>Reconcile</span></div>
      <div className="finance-core"><span className="graphic-live-dot"/> Shared finance model</div>
      <svg className="graphic-branches" viewBox="0 0 300 40" fill="none"><path d="M150 0V14M45 40V14H255V40M150 14V40"/></svg>
      <div className="finance-modules"><span>Planning<small>AOP & scenarios</small></span><span>Treasury<small>Liquidity visibility</small></span><span>Closure<small>MIS & reporting</small></span></div>
      <div className="graphic-footer">Ask a question. Trace it to the numbers.</div>
    </>}
    {kind === 'edi' && <>
      <div className="graphic-subtitle">Explore the decision before you make it</div>
      <div className="scenario-legend"><span>Growth</span><span>Baseline</span><span>Pressure</span></div>
      <svg className="scenario-chart" viewBox="0 0 340 160" fill="none"><path className="chart-grid" d="M20 20H325M20 60H325M20 100H325M20 140H325M20 15V140"/><path className="scenario-growth" d="M20 115C65 100 75 120 120 87S180 98 220 60 275 50 325 20"/><path className="scenario-base" d="M20 115C70 98 85 115 130 98S220 95 260 79 295 83 325 67"/><path className="scenario-pressure" d="M20 115C70 98 85 115 130 110S210 119 250 112 295 129 325 126"/></svg>
      <div className="scenario-axis"><span>Today</span><span>Planning horizon →</span></div>
      <div className="decision-question">“What changes if our assumptions shift?”<small>Compare scenarios · Drill into drivers</small></div>
    </>}
    {kind === 'ccm' && <>
      <div className="graphic-subtitle">From exception to accountable action</div>
      <div className="control-table"><div className="control-table-labels"><span>Control check</span><span>Review state</span></div>{[['Vendor payments','Exception'],['Approval workflow','Validated'],['Lease billing','Review']].map(([label,status])=><div key={label}><span><i className="graphic-live-dot"/>{label}</span><b>{status}</b></div>)}</div>
      <div className="control-trail"><span>Detect</span><i>→</i><span>Evidence</span><i>→</i><span>Assign</span><i>→</i><span>Resolve</span></div>
      <div className="graphic-footer">Every exception has evidence and an owner.</div>
    </>}
    {kind === 'reiq' && <>
      <div className="graphic-subtitle">Independent modules. Connected operations.</div>
      <div className="property-map"><svg viewBox="0 0 320 210" preserveAspectRatio="none" fill="none"><path d="M65 30 160 105 255 30M65 105H255M65 180 160 105 255 180"/></svg><strong className="property-hub">REIQ<small>AI backbone</small></strong>{['Contracts','Sales','Projects','CRM','Receivables','Leasing'].map((label,index)=><span className={'property-node property-node-' + index} key={label}>{label}</span>)}</div>
      <div className="graphic-footer">Connect teams across the property lifecycle.</div>
    </>}
    {kind === 'vayam' && <>
      <div className="graphic-subtitle">A structured journey from role to offer</div>
      <div className="hiring-funnel">{[['01','Define the role'],['02','Score & shortlist'],['03','Assess & interview'],['04','Verify background'],['05','Approve & offer']].map(([step,label],index)=><div key={step} style={{width:(100-index*8)+'%'}}><span>{step}</span><strong>{label}</strong><i>↓</i></div>)}</div>
      <div className="graphic-footer">Recruiter + candidate · One auditable journey</div>
    </>}
    {kind === 'convex' && <>
      <div className="graphic-subtitle">Build a clearer path into AI answers</div>
      <div className="knowledge-sources"><span>Brand facts</span><span>Content</span><span>Schema</span></div>
      <svg className="graphic-branches" viewBox="0 0 300 40" fill="none"><path d="M45 0V16H255V0M150 16V40"/></svg>
      <div className="knowledge-core">Structured, trusted knowledge</div>
      <div className="answer-preview"><span className="answer-preview-label">AI answer</span><div/><div/><div/><p>Source attribution <b>[1] [2] [3]</b></p></div>
      <div className="knowledge-loop">↻ Track visibility · Review citations · Correct errors</div>
    </>}
  </div>
}