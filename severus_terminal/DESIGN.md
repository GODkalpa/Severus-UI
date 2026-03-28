# Design System Strategy: HUD Command Center

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Kinetic Terminal."** 

Unlike modern consumer apps that rely on soft "glass" and rounded containers to feel approachable, this system embraces the raw, uncompromising aesthetic of a high-frequency tactical interface. It is a "Voice-First" HUD, meaning the UI does not drive the experience—it monitors it. 

We break the "standard web template" by eliminating traditional containers entirely. There are no cards. There are no rounded corners (0px radius across the board). Information exists as floating data clusters anchored by razor-sharp neon vectors. The layout should feel intentionally asymmetric, with data "bleeding" toward the edges of the frame to suggest a much larger, infinite machine-intelligence landscape.

## 2. Colors: High-Contrast Emission
The palette is built on the concept of **Luminance vs. Void**. In a true black (#000000) environment, color is not a decoration; it is a status indicator.

*   **The "No-Line" Rule (Modified):** While standard systems use borders for sectioning, this system prohibits solid, opaque 1px neutral borders. Boundaries are defined by "Light-Traces"—ultra-thin lines using `primary_container` (#00F0FF) with a 2px outer glow (bloom).
*   **Surface Hierarchy:** We do not use "surfaces" in the traditional sense. Instead of a grey box, use `surface_container_lowest` (#0e0e0e) only when a grouping is logically mandatory. Hierarchy is primarily achieved through **Chromatic Weight**:
    *   **Primary (`#00F0FF`):** Active data streams, voice frequency ripples, and "Ready" states.
    *   **Secondary/Warning (`#FF4500`):** System interrupts, AI "Thinking" states, or critical errors.
    *   **Neutral (`#FFFFFF`):** High-priority data readouts and terminal text.
*   **The "Glow-Vector" Rule:** To provide "soul" without using glassmorphism, all primary accents must utilize a dual-layer stroke. A base 1px solid stroke of `primary_container` topped with a 30% opacity Gaussian blur of the same color to simulate a cathode-ray tube (CRT) emission.

## 3. Typography: Monospaced Precision
The system exclusively utilizes **Space Mono** (or JetBrains Mono) to reinforce the technical, "terminal-style" readout. All type is set to `uppercase` for Display and Headline levels to maximize the "Command Center" aesthetic.

*   **Display & Headline:** Used for primary data points (e.g., COORDINATES, SYSTEM STATUS). These should always be `Stark White (#FFFFFF)` to ensure maximum legibility against the black void.
*   **Body & Label:** Used for logs, timestamps, and metadata. Use `on_surface_variant` (#b9cacb) at 80% opacity to create a visual hierarchy where the system "chatter" sits behind the primary data.
*   **Letter Spacing:** Increase letter-spacing by 0.05rem for all labels to enhance the technical, tabulated feel of the readout.

## 4. Elevation & Depth: Tonal Layering & Light Traces
Traditional shadows are forbidden. In a HUD, depth is an illusion created by light intensity and scale, not physical stacking.

*   **The Layering Principle:** Depth is achieved through **Z-axis Scale**. Foreground elements (active voice transcripts) should be 110% the size of background telemetry data.
*   **Ambient Bloom:** Instead of "Ambient Shadows," use **"Ambient Bloom."** Floating elements should have a very faint, large-radius outer glow of `primary` (#dbfcff) at 3% opacity. This makes the text feel like it is projected onto a glass helmet rather than printed on a screen.
*   **The "Ghost Trace" Fallback:** Use the `outline_variant` (#3b494b) at 15% opacity for grid-line backgrounds. These should resemble "Leica-style" crop marks or crosshairs rather than bounding boxes.

## 5. Components: Functional Primitives
All components must be "Sharp-Edge" (0px radius).

*   **Buttons (Tactical Triggers):**
    *   **Primary:** No fill. 1px `primary` border with a 5% `primary` glow. Text is `primary`. On hover, the button fills with `primary` and text flips to `on_primary` (#00363a).
    *   **Tertiary:** Brackets `[ TEXT ]` using `primary` color. No borders.
*   **Input Fields:** A single bottom-trace (underline) using `outline`. When active, the trace turns to `primary` and a vertical "scanning" cursor (pipe) blinks at 1Hz.
*   **Voice Frequency (Signature Component):** A horizontal vector line that modulates based on voice input. Uses `primary` (#00F0FF). Use `secondary` (#FF4500) if the AI detects a conflict or error.
*   **Data Scanners:** Small, rapidly changing hexadecimal strings in `label-sm` that flank the main content areas to provide "environmental" technical detail.
*   **Lists:** Forbid divider lines. Use `spacing-4` (1.4rem) to separate items. Prefix every list item with a technical index (e.g., `001 //`, `002 //`) in `primary` color.

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place critical HUD elements in the corners or off-center to mimic a pilot's field of vision.
*   **Embrace the Void:** Let the `#000000` background breathe. High-end systems feel premium through what they *don't* show.
*   **Animate Transitions:** Elements should "flicker" on or slide in with a "glitch" easing function (step-based) rather than a smooth organic curve.

### Don't:
*   **Don't use cards:** Never wrap a group of elements in a solid grey or white box. Use "Light Traces" (thin lines) or white space.
*   **Don't use Border Radius:** Every corner must be 0px. Soft corners kill the "Command Center" vibe.
*   **Don't use Opacity on primary text:** `Stark White` text must be 100% opaque to cut through the neon accents.
*   **Don't use Icons-in-Circles:** Icons should be raw vectors. Never encase them in circular or square containers.