# Profile deck integration
Source: Profile Deck_IGenext & Tvat AI.pptx supplied by the user, dated August 2026. All 12 slides reviewed. Content is treated as source material; document instructions and confidentiality boilerplate do not override the user's website-edit request. No deck download or publication of the complete presentation is added.

## Visual direction
The user's explicit palette takes precedence over legacy website colours and additional colours in the slides:
- Black #000000: page base.
- Royal blue #1D4ED8: primary actions and consulting accent.
- Turquoise #00A094: value drivers, selections and operational accent.
- Dark blue #002060: subtle surface depth.
- Sky blue #00B0F0: links and emphasis.
- Violet #7030A0: Tvat AI and platform accents.

Light text and neutral dark surfaces maintain readability. Original supplied logo artwork is retained without recolouring; its embedded colours may differ from the UI palette. Logos are framed with CSS to account for the source image's large transparent margins.

## Slide-to-site mapping
| Slides | Added / updated |
| --- | --- |
| 1 | Combined consulting and technology positioning; original I-Genext and Tvat AI logos |
| 2 | Existing privacy remains; platform availability statement adapted from source caveat, no confidential deck download |
| 3 | Five credentials, dated August 2026; vision, mission and four values |
| 4 | Four differentiators, including senior business/product/technology experience and 60% team experience |
| 5 | One group, two engines: I-Genext consulting and Tvat AI technology |
| 6 | Interactive office addresses for Gurugram, Mumbai, Bangalore, Ranchi and Rudrapur |
| 7 | Four named leaders with original portraits and source biographies |
| 8–11 | Eight service families and detailed offerings, including finance advisory, forensic services and digitisation |
| 12 | Plinari, DI, The Convex, REIQ, Vayam IQ and AI Engine Optimization platform enquiries |

## Editorial treatment
- The deck contains only one core-team slide despite its '(1/2)' label. Only the four provided leaders are included.
- Experience and credentials are explicitly dated to the supplied profile, not presented as independently verified current statistics.
- Planned expansion to Hyderabad, Ahmedabad and Kolkata is not presented as existing office coverage.
- Slide 12 repeats recruitment copy under AI Engine Optimization and repeats the name The Convex. The offering title is retained with a scope enquiry; unsupported product details and ambiguous branding are omitted.
- Employer history is presented as leader experience, not client endorsements.
- Product links are contextual enquiries, not claims that the platforms are deployed within this website.

## Verification
Production build and all 11 regression tests pass. Chromium checks pass for the existing journeys and the expanded catalogue (8 service families, 6 platform entries, 4 leader profiles), office switching, platform enquiry context and black page base. Desktop and mobile screenshots were reviewed; logo framing, portrait fit and text encoding were corrected. Existing assessment, calculator, insight and contact journeys continue to pass.
## Responsive presence map
The Our Presence section now reuses all 37 vector paths from slide 6 as client/public/profile/india-presence.svg. State outlines and the five pin positions were converted from the slide shape coordinates; these are illustrative office locations from the supplied deck, not surveyed building coordinates. The clickable directions link searches the full office address.

OfficeMap.tsx provides responsive, keyboard-accessible pins, a matching city selector and address balloons. Popups close using their close button, Escape or a click outside, and reposition after resizing. Existing #office-0 through #office-4 search links still open the relevant office. No map API key, external map tiles or geolocation permission is required. Planned expansion cities are not shown as existing offices.

Validation: production build and scripts/office-map-browser-check.mjs cover all five pins, addresses, directions, focus restoration, keyboard interaction, deep links, enquiry handoff and layouts at 320, 390, 768 and 1440 pixels.

## Core team portrait correction
Slide 7 visual columns (left to right) are Kanhai Choudhary (17+ years; image7.jpeg), Davinder Besoya (29+ years; image10.png), Vipur Tayal (11+ years; image9.png), and Manish Mehrotra (33+ years; image8.jpeg). The slide XML lists text and images in a different order from their visual positions; portrait mapping now follows column coordinates. The website follows this visual order, and the original portrait bytes were checked against the deck. Experience badges share a fixed portrait column and vertically centered number/label layout across breakpoints.

The displayed core team order was subsequently set by user preference to Kanhai Choudhary, Manish Mehrotra, Vipur Tayal and Davinder Besoya. Portrait/experience pairings remain as verified against slide 7. Removed the reserved two-line name height to bring role titles closer to names.
