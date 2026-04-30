# Embeddable UI Annotator

A small vanilla JavaScript annotator that can be plugged into any regular web page with one script and one initialization call. It injects its own UI styles, so host apps do not need a separate CSS import.

## Run the Demo

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Embed It

```html
<script src="annotator.js"></script>
<script>
  const annotator = new UIAnnotator({
    storageKey: "review-session",
    markerLabel: "Annotate",
    pageKey: () => location.pathname + location.hash
  });
  annotator.mount();
</script>
```

The script exposes `window.UIAnnotator`, so it can be used from plain HTML, React, Vue, Angular, server-rendered pages, or any frontend that can load a browser script.

## Agent Prompt

Use this prompt when you want an agent to embed the annotator into another frontend repository:

```text
Add the embeddable UI annotator from this repo:

https://github.com/ashish921998/ui-annotater

Goal:
Make the annotator available in this frontend app during local development. It should load on every page, inject its own styles, show a floating "Annotate" button, let me click UI elements, save comments in sessionStorage, and export JSON.

Please do this end-to-end:

1. Fetch or copy `annotator.js` from:
   https://github.com/ashish921998/ui-annotater

2. Put it in the right public/static location for this app.
   - For Next.js, prefer `public/annotator.js`.
   - For Vite/React, prefer `public/annotator.js`.
   - For plain static apps, place it next to the main HTML or in the existing static assets folder.

3. Detect the frontend framework/router structure.
   - For Next.js App Router, use `app/layout.tsx` or an appropriate client-only wrapper.
   - For Next.js Pages Router, use `pages/_app.tsx` or `pages/_document.tsx`.
   - For Vite/React, use the root app entry or `index.html`, matching the existing style.
   - For other frameworks, choose the smallest global integration point.

4. Add the script so it loads globally on every page.

5. Initialize it only in the browser, never during server rendering.

6. Use this config:

   {
     storageKey: "ui-review-session",
     markerLabel: "Annotate"
   }

7. Make it development-only unless there is an obvious existing env/config pattern for enabling internal tools.
   Prefer `process.env.NODE_ENV === "development"` when applicable.

8. If this project has a strict Content Security Policy, update it minimally so the local annotator can run.

9. Add a short README section or nearby code comment explaining how to use it.

10. Run the app's lint, typecheck, or build command if available.

11. Start the dev server if it is not already running.

12. Verify in the browser that:
   - the floating Annotate button appears
   - clicking Annotate enters annotation mode
   - clicking a page element opens the comment box
   - saving creates a numbered marker
   - reload preserves the marker for the session
   - Export JSON works and includes:
     - `anchor`
     - `page`
     - `strategyVersion`
     - `cssSelector`
     - `indexPath`
     - `textSnippet`
     - any `data-annotator-id` attributes
     - any `data-testid` attributes

Important:
- Keep the integration small and reversible.
- Do not convert app architecture.
- Do not add a backend.
- Do not install a package unless absolutely necessary.
- Prefer loading `/annotator.js` from `public`.
- If the app already has useful stable element attributes like `data-testid`, leave them alone.
- If obvious primary buttons, cards, or key UI regions lack stable attributes, add `data-annotator-id` only where useful.
- If there are multiple reasonable integration points, choose the one that matches the existing project style and explain why in the final response.

After finishing, summarize:
- files changed
- how to use the annotator
- how to remove it later
- verification commands run
- any limitations or follow-up suggestions
```

## What It Does

- Adds a floating annotation toggle to the page.
- Lets the user click any DOM element while annotation mode is active.
- Opens a comment editor for that element.
- Stores comments in `sessionStorage` for the current browser session.
- Shows numbered markers pinned near annotated elements.
- Supports view, edit, delete, clear, and JSON export.

## Stored Data

Each annotation stores the comment and a multi-signal element reference:

- page key and full URL
- strategy version
- shortest unique CSS selector
- DOM index path as the last-resort fallback
- sibling context
- tag, id, and classes
- allowlisted data attributes like `data-testid`, `data-cy`, and `data-annotator-id`
- stable element attributes like `type`, `name`, `href`, `src`, `alt`, `title`, and `placeholder`
- visible text snippet and normalized text signature
- ARIA label and role
- parent context
- element bounds and scroll position at annotation time
- visual fingerprint for fuzzy fallback, including size, color, background, radius, and image presence

This keeps the implementation practical for arbitrary websites where IDs and classes may not be perfectly stable.

`pageKey` can be overridden when query parameters represent real page state, for example `?tab=billing`. The default ignores `location.search` to avoid splitting one page into many copies because of tracking parameters.

Example export shape:

```json
{
  "id": "annotation-id",
  "page": {
    "key": "/dashboard#billing",
    "href": "https://example.com/dashboard#billing"
  },
  "comment": "Make this label clearer",
  "createdAt": 1777545123000,
  "updatedAt": 1777545123000,
  "strategyVersion": 2,
  "anchor": {
    "type": "element",
    "tagName": "button",
    "id": null,
    "classList": ["primary"],
    "dataAttributes": {
      "data-testid": "create-report"
    },
    "attributes": {
      "type": "button"
    },
    "cssSelector": "button.primary[data-testid=\"create-report\"]",
    "indexPath": [1, 1, 0, 0, 2, 0],
    "siblingContext": {
      "parentSelector": "div.actions",
      "indexInParent": 0,
      "previousSibling": null,
      "nextSibling": {
        "tagName": "button",
        "textSnippet": "Invite reviewer",
        "textSignature": "invite-reviewer"
      }
    },
    "textSnippet": "Create report",
    "textSignature": "create-report",
    "ariaLabel": null,
    "role": null,
    "parentContext": {
      "tagName": "div",
      "id": null,
      "cssSelector": "main > section.hero > div.hero-copy > div.actions",
      "textSnippet": "Create report Invite reviewer"
    },
    "bounds": {
      "x": 219,
      "y": 564,
      "width": 113,
      "height": 36,
      "scrollX": 0,
      "scrollY": 0
    },
    "visual": {
      "width": 113,
      "height": 36,
      "backgroundColor": "rgb(15, 118, 110)",
      "color": "rgb(255, 255, 255)",
      "colorHint": "rgb(15, 118, 110)",
      "borderRadius": 6,
      "hasImage": false
    }
  },
  "resolution": "resolved"
}
```
