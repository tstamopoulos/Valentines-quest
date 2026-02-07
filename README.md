# Valentine Quest (Static Site)

A single-page gag mini-game built with plain HTML, CSS, and vanilla JavaScript. It escalates through 6 playful levels and ends with a sincere final reveal.

## Project Structure

- `index.html`
- `styles.css`
- `app.js`
- `assets/` (optional, currently not required)

## Local Run

No build tools needed.

### Option 1: Open directly

1. Open `index.html` in a browser.

### Option 2: Serve with a tiny static server (recommended)

1. From the project root, run one of:
   - `python3 -m http.server 8080`
   - `npx serve .`
2. Visit `http://localhost:8080`.

## Configuration

Edit the `CONFIG` object at the top of `app.js` to customize:

- Name
- Final date/time/location
- Messages and level copy
- Memory-check question + accepted answers
- Timing settings

## Deploy (No Build Step)

### GitHub Pages

1. Push this folder to a GitHub repository.
2. In GitHub: `Settings -> Pages`.
3. Under `Build and deployment`, select:
   - Source: `Deploy from a branch`
   - Branch: `main` (or your default branch), folder `/ (root)`
4. Save and wait for the Pages URL.

### Netlify (Drag and Drop)

1. Go to Netlify dashboard.
2. Use `Add new site -> Deploy manually`.
3. Drag the project folder (or a zip of it).
4. Netlify serves `index.html` as the entry.

### Vercel (Static Deployment)

1. Run `vercel` in this project folder (or import repo in Vercel UI).
2. Framework preset: `Other`.
3. Build command: leave empty.
4. Output directory: leave empty (root static files).
5. Deploy.

## Manual QA Checklist

Test on Desktop (Chrome + Safari) and Mobile (iOS Safari/Android Chrome):

1. Level 1
   - `No` dodges near pointer/finger proximity.
   - After 3 dodges, `No` can be clicked and still advances with "Interesting choice. Proceeding."
   - `No` stays in viewport and does not fully overlap `Yes`.
2. Level 2
   - `Yes/No` outcomes are swapped.
   - Hint is subtle but present.
3. Level 3
   - Clicking `No` opens modal chain (3 steps total).
   - Modal is keyboard navigable (Tab cycles focus).
4. Level 4
   - Countdown runs from configured seconds.
   - Buttons appear in last second.
   - `No` fades quickly.
   - Timeout auto-advances with "Time's up. That's a Yes."
5. Level 5
   - Memory answer matching is case-insensitive.
   - Two playful wrong responses, then `I give up` appears on third attempt.
6. Level 6
   - Only `YES` is visible.
   - Hover/focus shakes button and updates message.
   - Click shows fake error overlay then advances.
7. Final
   - Typed reveal lines appear in order.
   - Date/time/location display from config.
   - `.ics` download works and includes configured details.
   - Copy details button copies reveal text.
8. Accessibility/UX
   - Focus rings visible on controls.
   - Live region announces status updates.
   - Reduced motion preference minimizes movement.
   - Sound toggle defaults off and SFX only play when enabled.
9. Session behavior
   - Progress persists while page is open.
   - `Reset` returns to Level 1.

## Notes

- Uses Pointer Events for unified mouse/touch behavior.
- Uses requestAnimationFrame for smooth dodge and countdown updates.
- No external dependencies or assets required.
- Final weather widget uses Open-Meteo geocoding + forecast APIs (no key) when the event is within forecast range (~16 days).
- Outside forecast range, it shows a placeholder with days remaining and a live weather link.
