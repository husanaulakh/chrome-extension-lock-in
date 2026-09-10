# Business report — Lock in

Prepared 6 September 2026. This is a product thesis and a validation plan, not evidence of product-market fit. No customer interviews, retention study, or revenue test has been conducted for this demo.

## Decision

Build a free browser tool for students and independent knowledge workers who need the web but want to stop changing tasks. Test whether people can start faster and recover from missing resources without abandoning their sessions.

The product promise is specific: **Choose the task, keep its resources, and decide the exit rules before starting.** Stronger desktop enforcement can wait until browser use shows that people return voluntarily.

All features remain free. That removes a purchase decision at the moment someone wants to focus, but it is not a defensible advantage by itself. LeechBlock already offers a free browser blocker. The opportunity is a useful combination of task-first setup, understandable commitment rules, temporary resource access, and private records. Whether customers prefer that combination remains unproven. [LeechBlock](https://www.proginosko.com/leechblock/)

## Customer problems and the demo’s response

These pain points come from the supplied brief. Treat them as hypotheses to validate, rather than measured population findings.

| Customer situation | Cost to the customer | Response in this demo | What to measure |
| --- | --- | --- | --- |
| A student needs online course material but keeps opening entertainment | Repeated context switches | Start from a task and allowed websites | Time to first session; voluntary second session |
| A writer turns off a blocker as soon as work becomes difficult | A commitment disappears at the first impulse | Exit rules chosen before starting; countdown survives reload | Escape requests that are abandoned versus completed |
| A developer needs a missing documentation site mid-session | Work stalls, or the entire block is disabled | A reason grants one hostname for a configurable period (five minutes by default) | Requests followed by continuing the original session |
| A new user finds configuration overwhelming | Setup is abandoned | Three levels and a small resource list | Unassisted setup completion; support questions |
| Someone mistrusts broad browser permissions | They avoid installation or worry about sensitive records | No backend; narrow stored statistics; visible permission explanation | Permission-screen abandonment and interview concerns |
| A rule blocks urgent work or the software fails | Lost access and loss of trust | Separate technical recovery and a documented disable route | Recovery frequency and causes |

The tradeoff is explicit: recovery makes circumvention easy for a determined user. This product serves voluntary commitment. It does not promise to control a person who no longer consents to using it.

## Competitive reality

| Product | Verified offer | Implication for Lock in |
| --- | --- | --- |
| LeechBlock | Free extension organized around websites and blocking times; available in several browsers | “Free blocker” is already occupied. Compare setup and task completion, not just price. |
| Cold Turkey | Free timed website blocking, exceptions, and statistics; Pro includes app blocking, schedules, locking features, and allowances | Free access to commitment and temporary permissions may appeal to users who do not need desktop coverage. It does not replace app blocking. |
| Freedom | Documents a Locked Mode that restricts changing active sessions | Commitment is established competition, not a new invention. Avoid claiming exclusive ownership of controlled exits. |

Sources: [LeechBlock](https://www.proginosko.com/leechblock/), [Cold Turkey pricing and feature split](https://getcoldturkey.com/pricing/), [Freedom Locked Mode](https://support.freedom.to/en/articles/1802927-locked-mode). Pages checked for this report. Exact prices are omitted because they can depend on offers or location and are unnecessary to the decision.

The brief’s Chrome install counts and reported September product changes have not been independently established here. They are not used to estimate market size. Store installs do not measure active use, willingness to switch, or willingness to fund a free alternative.

## Keep every feature free without hiding the costs

Use voluntary donations, disclosed project sponsorship, and grants. Sponsors can fund maintenance or accessibility work; they do not receive user data, a say in blocking policy, or promotional placements inside focus sessions. Optional training or installation help can fund the project without restricting software features. No payment or donation collection is implemented in this demo.

A local extension avoids per-session server and inference costs. Maintenance, browser regression testing, support, and distribution still require work. The following is an illustrative monthly budget in CAD, not a supplier quote or forecast:

| Cost | Assumption | Monthly amount |
| --- | --- | ---: |
| Maintenance and support | 20 hours × $60 | $1,200 |
| Infrastructure and tooling allowance | Fixed planning estimate | $50 |
| Total before taxes and fees | | $1,250 |

At $5 per donor per month, that requires 250 recurring donors before payment fees and taxes. At hypothetical donor conversion of 0.5%, 1%, or 2%, it requires 50,000, 25,000, or 12,500 active users respectively. These are arithmetic scenarios, not expected conversion rates. They exclude acquisition costs and initial development. Sponsor or grant funding would lower the donor requirement; it can also disappear.

Start with a maintenance budget that the owner can sustain without donations. Publish the actual costs and funding received. If the project cannot support a feature reliably, reduce its scope rather than introduce a surprise paywall.

## First validation cycle

Recruit 12–15 consenting participants: approximately half students and half writers, developers, or researchers. Include people who tried and stopped using another blocker. This is a usability sample, not a statistically representative market survey.

1. Observe a real setup task without coaching. Record time, errors, and whether the person understands the exit rules.
2. Give a task that needs one unexpected website. Observe whether temporary access solves it without explaining the feature in advance.
3. Ask each person to use the extension for one week. Request a short diary or voluntary summary export; do not collect browsing history automatically.
4. Ask what they disabled, what they worked around, and whether they would keep the tool if the study ended.

Precommit to pilot decision thresholds: at least 80% complete setup unaided within 60 seconds; at least half choose to use it on three separate days; no unrecoverable lockout or unreported data loss; fewer than 10% of sessions need technical recovery. These are internal go/no-go targets, not industry benchmarks. Record the denominator and reasons for every failure. A small sample can reveal usability defects but cannot validate a broad effectiveness claim.

Distractions stopped is a descriptive count. It can increase because someone is struggling more, because the extension is working, or because instrumentation changed. Pair it with self-reported task progress and voluntary reuse. Do not optimize for time trapped in the app.

## Distribution and release gates

After the pilot, publish clear installation and permission explanations and a short demonstration of the resource-request flow. Invite student groups and relevant open-source communities to test it where their posting rules allow. No outreach has been sent during this build.

Before a public store release, test supported Chrome and Edge versions on Windows and macOS, browser restart and sleep/wake, signed-in work apps, downloads, multiple windows, other extensions, keyboard-only use, and a screen reader. Review store requirements and privacy disclosures at submission time. Publish the source and a reproducible ZIP; do not imply that local demo tests establish production reliability.

## Scope after evidence

The brief’s V1 is represented by task selection, a timer, destination rejection, allowed resources, commitment levels, escape, temporary access, and a report. This demo supports exact hostnames, full URLs and explicit blocked domains, and redirects instead of closing tabs.

Saved workspaces would reduce repeat setup if users ask for them. Schedules, quotas, URL patterns, trusted-person codes, emergency-credit schemes, a desktop companion, and cross-device synchronization are not implemented. None is reserved for a paid tier. Add only what observed work requires, with the same free access policy.

The longest-lived advantage would be trust earned through reliable releases, understandable limits, and maintenance. Competitors can copy a delay timer. A free product still needs to be the one people prefer to keep installed.

## Version 0.2 product decisions

Exact-page rules address exams and document work where an entire site is too broad. Add time avoids ending a useful session just to change its deadline. Resources open on request so setup stays short. Private-window coverage closes a practical bypass when the user enables browser permission, while private attempts remain outside reports. Dashboard is available on demand and contains only actual recorded sessions.

All features remain available without payment. Removing pricing language from the working interface changes presentation, not access. Cross-browser packages reduce switching costs, but store availability, reliable authentication flows and customer retention still require validation. Free access alone is easy to copy; the product must earn use through predictable rules, low setup effort and honest recovery.

Two small follow-ups address repeat use: restoring the last setup reduces re-entry for recurring work, and a visible finish time helps users avoid running into their next commitment. Neither requires an account or a larger setup form. Validate their usefulness through observed repeat sessions rather than adding presets or calendar access in advance.

A pre-session URL check addresses a common installation disappointment: a user discovers missing work resources only after locking in. It lets them test the boundary before committing, using the same engine as enforcement. A countdown in the tab title reduces the need to reopen the focus page to check time. Neither feature introduces new permissions, tracking or a paid tier.
