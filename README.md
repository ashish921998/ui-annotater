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
    markerLabel: "Annotate"
  });
  annotator.mount();
</script>
```

The script exposes `window.UIAnnotator`, so it can be used from plain HTML, React, Vue, Angular, server-rendered pages, or any frontend that can load a browser script.

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
- visual fingerprint for fuzzy fallback

This keeps the implementation practical for arbitrary websites where IDs and classes may not be perfectly stable.

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
      "colorHint": "rgb(15, 118, 110)",
      "borderRadius": 6,
      "hasImage": false
    }
  },
  "resolution": "resolved"
}
```
