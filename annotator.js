(function () {
  "use strict";

  const STORAGE_PREFIX = "ui-annotator:";
  const STYLE_ID = "ui-annotator-styles";
  const STRATEGY_VERSION = 1;
  const DATA_ATTRIBUTE_ALLOWLIST = [
    "data-annotator-id",
    "data-testid",
    "data-test",
    "data-cy",
    "data-qa",
    "data-id",
    "data-component",
  ];
  const INTERNAL_SELECTOR = ".ui-annotator-root, .ui-annotator-capture, .ui-annotator-highlight, .ui-annotator-marker, .ui-annotator-panel, .ui-annotator-toast";
  const STYLE_TEXT = `
    .ui-annotator-root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px}
    .ui-annotator-toggle{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:0 14px;border:1px solid #1f2937;border-radius:8px;background:#111827;color:#fff;box-shadow:0 12px 34px rgba(15,23,42,.26);cursor:pointer;font:inherit;font-weight:700}
    .ui-annotator-toggle[aria-pressed=true]{background:#f59e0b;border-color:#b45309;color:#1f2937}
    .ui-annotator-toolbar{position:fixed;right:20px;bottom:74px;z-index:2147483000;display:flex;gap:8px;padding:8px;border:1px solid #d1d5db;border-radius:8px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.18)}
    .ui-annotator-button{min-height:34px;padding:0 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#111827;cursor:pointer;font:inherit;font-weight:650}
    .ui-annotator-button:hover{background:#f3f4f6}
    .ui-annotator-capture{position:fixed;inset:0;z-index:2147482997;background:transparent;cursor:crosshair;touch-action:none}
    .ui-annotator-highlight{position:fixed;z-index:2147482998;pointer-events:none;border:2px solid #f59e0b;border-radius:6px;background:rgba(245,158,11,.12);box-shadow:0 0 0 99999px rgba(17,24,39,.08)}
    .ui-annotator-marker{position:fixed;z-index:2147482999;display:grid;place-items:center;width:24px;height:24px;border:2px solid #fff;border-radius:999px;background:#dc2626;color:#fff;box-shadow:0 8px 22px rgba(15,23,42,.26);cursor:pointer;font:700 12px/1 Inter,ui-sans-serif,system-ui,sans-serif}
    .ui-annotator-panel{position:fixed;z-index:2147483001;width:min(360px,calc(100vw - 32px));border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#111827;box-shadow:0 20px 48px rgba(15,23,42,.25);overflow:hidden}
    .ui-annotator-panel-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#f9fafb;font-weight:750}
    .ui-annotator-close{display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:#4b5563;cursor:pointer;font-size:20px;line-height:1}
    .ui-annotator-close:hover{background:#e5e7eb}
    .ui-annotator-panel-body{display:grid;gap:12px;padding:14px}
    .ui-annotator-textarea{width:100%;min-height:112px;resize:vertical;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:10px;color:#111827;font:inherit}
    .ui-annotator-meta{display:grid;gap:4px;max-height:120px;overflow:auto;padding:10px;border-radius:6px;background:#f3f4f6;color:#374151;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
    .ui-annotator-actions{display:flex;justify-content:flex-end;gap:8px}
    .ui-annotator-danger{border-color:#fecaca;color:#b91c1c}
    .ui-annotator-danger:hover{background:#fef2f2}
    .ui-annotator-toast{position:fixed;left:50%;bottom:22px;z-index:2147483002;transform:translateX(-50%);padding:10px 12px;border-radius:8px;background:#111827;color:#fff;box-shadow:0 12px 34px rgba(15,23,42,.22);font:650 13px/1.3 Inter,ui-sans-serif,system-ui,sans-serif}
  `;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.append(style);
  }

  class UIAnnotator {
    constructor(options = {}) {
      this.options = {
        storageKey: options.storageKey || `${STORAGE_PREFIX}${this.getPageKey()}`,
        markerLabel: options.markerLabel || "Annotate",
        dataAttributeAllowlist: options.dataAttributeAllowlist || DATA_ATTRIBUTE_ALLOWLIST,
      };
      this.annotations = this.load();
      this.isActive = false;
      this.root = null;
      this.capture = null;
      this.highlight = null;
      this.panel = null;
      this.markers = new Map();
      this.lastSelectionAt = 0;

      this.onCapturePointerDown = this.onCapturePointerDown.bind(this);
      this.onCaptureMouseDown = this.onCaptureMouseDown.bind(this);
      this.onCaptureTouchStart = this.onCaptureTouchStart.bind(this);
      this.onCaptureClick = this.onCaptureClick.bind(this);
      this.onCaptureMove = this.onCaptureMove.bind(this);
      this.onScrollOrResize = this.onScrollOrResize.bind(this);
    }

    mount() {
      if (this.root) return;
      injectStyles();

      this.root = document.createElement("div");
      this.root.className = "ui-annotator-root";

      this.toolbar = document.createElement("div");
      this.toolbar.className = "ui-annotator-toolbar";

      this.exportButton = document.createElement("button");
      this.exportButton.type = "button";
      this.exportButton.className = "ui-annotator-button";
      this.exportButton.textContent = "Export JSON";
      this.exportButton.addEventListener("click", () => this.exportJson());

      this.clearButton = document.createElement("button");
      this.clearButton.type = "button";
      this.clearButton.className = "ui-annotator-button ui-annotator-danger";
      this.clearButton.textContent = "Clear";
      this.clearButton.addEventListener("click", () => this.clearAll());

      this.toolbar.append(this.exportButton, this.clearButton);

      this.toggle = document.createElement("button");
      this.toggle.type = "button";
      this.toggle.className = "ui-annotator-toggle";
      this.toggle.setAttribute("aria-pressed", "false");
      this.toggle.textContent = this.options.markerLabel;
      this.toggle.addEventListener("click", () => this.setActive(!this.isActive));

      this.root.append(this.toolbar, this.toggle);
      document.body.append(this.root);
      this.renderMarkers();
      window.addEventListener("scroll", this.onScrollOrResize, true);
      window.addEventListener("resize", this.onScrollOrResize);
    }

    destroy() {
      this.setActive(false);
      this.closePanel();
      window.removeEventListener("scroll", this.onScrollOrResize, true);
      window.removeEventListener("resize", this.onScrollOrResize);
      for (const marker of this.markers.values()) marker.remove();
      this.markers.clear();
      this.root?.remove();
      this.root = null;
    }

    setActive(active) {
      this.isActive = active;
      this.toggle.setAttribute("aria-pressed", String(active));
      this.toggle.textContent = active ? "Click an element" : this.options.markerLabel;

      if (active) {
        this.capture = document.createElement("div");
        this.capture.className = "ui-annotator-capture";
        this.capture.addEventListener("pointermove", this.onCaptureMove);
        this.capture.addEventListener("pointerdown", this.onCapturePointerDown);
        this.capture.addEventListener("mousedown", this.onCaptureMouseDown);
        this.capture.addEventListener("touchstart", this.onCaptureTouchStart, { passive: false });
        this.capture.addEventListener("click", this.onCaptureClick);
        this.highlight = document.createElement("div");
        this.highlight.className = "ui-annotator-highlight";
        document.body.append(this.capture);
        document.body.append(this.highlight);
      } else {
        this.capture?.remove();
        this.capture = null;
        this.highlight?.remove();
        this.highlight = null;
      }
    }

    onCaptureMove(event) {
      const target = this.getElementAtPoint(event.clientX, event.clientY);
      if (!target || !this.highlight) return;
      this.positionBox(this.highlight, target.getBoundingClientRect());
    }

    onCapturePointerDown(event) {
      this.selectTargetFromEvent(event);
    }

    onCaptureMouseDown(event) {
      this.selectTargetFromEvent(event);
    }

    onCaptureTouchStart(event) {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      this.selectTargetAtPoint(event, touch.clientX, touch.clientY);
    }

    onCaptureClick(event) {
      this.selectTargetFromEvent(event);
    }

    selectTargetFromEvent(event) {
      this.selectTargetAtPoint(event, event.clientX, event.clientY);
    }

    selectTargetAtPoint(event, x, y) {
      if (Date.now() - this.lastSelectionAt < 250) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const target = this.getElementAtPoint(x, y);
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      this.lastSelectionAt = Date.now();
      this.openEditor({ element: target, annotation: null, anchorRect: target.getBoundingClientRect() });
    }

    getElementAtPoint(x, y) {
      if (this.capture) this.capture.style.pointerEvents = "none";
      const element = document.elementFromPoint(x, y);
      if (this.capture) this.capture.style.pointerEvents = "";
      return this.getAnnotatableTarget(element);
    }

    getAnnotatableTarget(node) {
      if (!(node instanceof Element)) return null;
      if (node.closest(INTERNAL_SELECTOR)) return null;
      if (node === document.documentElement || node === document.body) return null;
      return node;
    }

    closePanel() {
      this.panel?.remove();
      this.panel = null;
    }

    openEditor({ element, annotation, anchorRect }) {
      this.closePanel();

      const isEditing = Boolean(annotation);
      const anchor = annotation?.anchor || this.createElementAnchor(element);
      const rect = this.normalizeRect(anchorRect || element?.getBoundingClientRect() || anchor?.bounds);

      this.panel = document.createElement("form");
      this.panel.className = "ui-annotator-panel";
      this.panel.innerHTML = `
        <div class="ui-annotator-panel-header">
          <span>${isEditing ? "Edit annotation" : "New annotation"}</span>
          <button class="ui-annotator-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="ui-annotator-panel-body">
          <textarea class="ui-annotator-textarea" name="comment" placeholder="Write a comment about this element..."></textarea>
          <div class="ui-annotator-meta" aria-label="Element metadata"></div>
          <div class="ui-annotator-actions">
            ${isEditing ? '<button class="ui-annotator-button ui-annotator-danger" type="button" data-delete>Delete</button>' : ""}
            <button class="ui-annotator-button" type="button" data-cancel>Cancel</button>
            <button class="ui-annotator-button" type="submit">${isEditing ? "Save" : "Add"}</button>
          </div>
        </div>
      `;

      const textarea = this.panel.querySelector("textarea");
      const meta = this.panel.querySelector(".ui-annotator-meta");
      textarea.value = annotation?.comment || "";
      meta.textContent = this.formatAnchor(anchor);

      this.panel.querySelector(".ui-annotator-close").addEventListener("click", () => this.closePanel());
      this.panel.querySelector("[data-cancel]").addEventListener("click", () => this.closePanel());
      this.panel.querySelector("[data-delete]")?.addEventListener("click", () => {
        this.deleteAnnotation(annotation.id);
        this.closePanel();
      });
      this.panel.addEventListener("submit", (event) => {
        event.preventDefault();
        const comment = textarea.value.trim();
        if (!comment) {
          textarea.focus();
          return;
        }

        if (isEditing) {
          this.updateAnnotation(annotation.id, { comment });
        } else {
          this.addAnnotation({ comment, anchor });
          this.setActive(false);
        }
        this.closePanel();
      });

      document.body.append(this.panel);
      this.positionPanel(rect);
      textarea.focus();
    }

    addAnnotation(annotation) {
      const now = Date.now();
      this.annotations.push({
        id: this.createId(),
        page: {
          key: this.getPageKey(),
          href: location.href,
        },
        comment: annotation.comment,
        createdAt: now,
        updatedAt: now,
        strategyVersion: STRATEGY_VERSION,
        anchor: annotation.anchor,
        resolution: "resolved",
      });
      this.persist();
      this.renderMarkers();
    }

    updateAnnotation(id, patch) {
      this.annotations = this.annotations.map((annotation) =>
        annotation.id === id ? { ...annotation, ...patch, updatedAt: Date.now() } : annotation
      );
      this.persist();
      this.renderMarkers();
    }

    deleteAnnotation(id) {
      this.annotations = this.annotations.filter((annotation) => annotation.id !== id);
      this.persist();
      this.renderMarkers();
    }

    clearAll() {
      if (!this.annotations.length) return;
      this.annotations = [];
      this.persist();
      this.renderMarkers();
      this.closePanel();
      this.showToast("Annotations cleared");
    }

    renderMarkers() {
      for (const marker of this.markers.values()) marker.remove();
      this.markers.clear();

      this.annotations.forEach((annotation, index) => {
        const element = this.resolveElement(annotation.anchor);
        const rect = this.normalizeRect(element?.getBoundingClientRect() || annotation.anchor.bounds);
        if (!rect) return;

        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = "ui-annotator-marker";
        marker.textContent = String(index + 1);
        marker.title = annotation.comment;
        marker.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.openEditor({ element, annotation, anchorRect: rect });
        });
        document.body.append(marker);
        this.positionMarker(marker, rect);
        this.markers.set(annotation.id, marker);
      });
    }

    onScrollOrResize() {
      this.renderMarkers();
      if (this.panel) this.closePanel();
    }

    createElementAnchor(element) {
      const rect = element.getBoundingClientRect();
      const parent = element.parentElement && element.parentElement !== document.body
        ? {
            tagName: element.parentElement.tagName.toLowerCase(),
            id: element.parentElement.id || null,
            cssSelector: this.getCssSelector(element.parentElement),
            textSnippet: this.getTextSnippet(element.parentElement),
          }
        : null;

      return {
        type: "element",
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        classList: this.getStableClassList(element),
        dataAttributes: this.getDataAttributes(element),
        cssSelector: this.getCssSelector(element),
        indexPath: this.getIndexPath(element),
        textSnippet: this.getTextSnippet(element),
        ariaLabel: element.getAttribute("aria-label"),
        role: element.getAttribute("role"),
        parentContext: parent,
        bounds: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollX: Math.round(window.scrollX),
          scrollY: Math.round(window.scrollY),
        },
      };
    }

    resolveElement(anchor) {
      const attempts = [
        () => this.resolveByDataAttributes(anchor),
        () => anchor.cssSelector && document.querySelector(anchor.cssSelector),
        () => this.resolveIndexPath(anchor.indexPath),
      ];

      for (const attempt of attempts) {
        try {
          const element = attempt();
          if (element instanceof Element && !element.closest(INTERNAL_SELECTOR)) return element;
        } catch (_) {
          // Ignore stale selectors; the next signal may still resolve.
        }
      }
      return null;
    }

    resolveByDataAttributes(anchor) {
      const entries = Object.entries(anchor.dataAttributes || {});
      for (const [name, value] of entries) {
        const selector = `[${CSS.escape(name)}="${CSS.escape(value)}"]`;
        const element = document.querySelector(selector);
        if (element) return element;
      }
      return null;
    }

    getCssSelector(element) {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const parts = [];
      let current = element;

      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        const stableClasses = this.getStableClassList(current).slice(0, 3);
        if (stableClasses.length) selector += stableClasses.map((className) => `.${CSS.escape(className)}`).join("");

        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
          if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
        parts.unshift(selector);
        current = parent;
      }

      return parts.join(" > ");
    }

    getIndexPath(element) {
      const path = [];
      let current = element;

      while (current && current.parentElement) {
        path.unshift(Array.from(current.parentElement.children).indexOf(current));
        current = current.parentElement;
      }

      return path;
    }

    resolveIndexPath(path) {
      if (!Array.isArray(path)) return null;
      let current = document.documentElement;
      for (const index of path) {
        current = current?.children?.[index];
      }
      return current || null;
    }

    getStableClassList(element) {
      return Array.from(element.classList)
        .filter((className) => !className.startsWith("ui-annotator"))
        .slice(0, 12);
    }

    getDataAttributes(element) {
      return this.options.dataAttributeAllowlist.reduce((attributes, name) => {
        const value = element.getAttribute(name);
        if (value) attributes[name] = value;
        return attributes;
      }, {});
    }

    getTextSnippet(element) {
      const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      return text ? text.slice(0, 80) : null;
    }

    positionBox(box, rect) {
      Object.assign(box.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    }

    normalizeRect(rect) {
      if (!rect) return null;
      const left = rect.left ?? rect.x ?? 0;
      const top = rect.top ?? rect.y ?? 0;
      const width = rect.width ?? 0;
      const height = rect.height ?? 0;
      return {
        left,
        top,
        right: rect.right ?? left + width,
        bottom: rect.bottom ?? top + height,
        x: rect.x ?? left,
        y: rect.y ?? top,
        width,
        height,
      };
    }

    positionMarker(marker, rect) {
      const x = Math.min(window.innerWidth - 32, Math.max(8, rect.left + rect.width - 12));
      const y = Math.min(window.innerHeight - 32, Math.max(8, rect.top - 12));
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
    }

    positionPanel(rect) {
      const panelRect = this.panel.getBoundingClientRect();
      const left = Math.min(window.innerWidth - panelRect.width - 16, Math.max(16, rect.left));
      const preferredTop = rect.bottom + 12;
      const top = preferredTop + panelRect.height < window.innerHeight
        ? preferredTop
        : Math.max(16, rect.top - panelRect.height - 12);

      this.panel.style.left = `${left}px`;
      this.panel.style.top = `${top}px`;
    }

    formatAnchor(anchor) {
      return [
        `type: ${anchor.type}`,
        `tag: ${anchor.tagName}`,
        `id: ${anchor.id || "-"}`,
        `classes: ${anchor.classList.join(" ") || "-"}`,
        `data: ${JSON.stringify(anchor.dataAttributes)}`,
        `selector: ${anchor.cssSelector}`,
        `indexPath: ${anchor.indexPath.join(".")}`,
        `text: ${anchor.textSnippet || "-"}`,
        `parent: ${anchor.parentContext?.cssSelector || "-"}`,
      ].join("\n");
    }

    exportJson() {
      const payload = JSON.stringify(this.annotations, null, 2);
      navigator.clipboard?.writeText(payload).then(
        () => this.showToast("Annotation JSON copied"),
        () => this.downloadJson(payload)
      );
      if (!navigator.clipboard) this.downloadJson(payload);
      console.info("UI Annotator export", this.annotations);
    }

    downloadJson(payload) {
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "annotations.json";
      anchor.click();
      URL.revokeObjectURL(url);
      this.showToast("Annotation JSON downloaded");
    }

    showToast(message) {
      const toast = document.createElement("div");
      toast.className = "ui-annotator-toast";
      toast.textContent = message;
      document.body.append(toast);
      setTimeout(() => toast.remove(), 1800);
    }

    load() {
      try {
        return JSON.parse(sessionStorage.getItem(this.options.storageKey) || "[]").map((annotation) => this.normalizeAnnotation(annotation));
      } catch (_) {
        return [];
      }
    }

    normalizeAnnotation(annotation) {
      if (annotation.anchor) return annotation;

      const legacyElement = annotation.element || {};
      const createdAt = typeof annotation.createdAt === "number" ? annotation.createdAt : Date.parse(annotation.createdAt) || Date.now();
      const updatedAt = typeof annotation.updatedAt === "number" ? annotation.updatedAt : Date.parse(annotation.updatedAt) || createdAt;

      return {
        id: annotation.id || this.createId(),
        page: annotation.page || {
          key: this.getPageKey(),
          href: location.href,
        },
        comment: annotation.comment || "",
        createdAt,
        updatedAt,
        strategyVersion: STRATEGY_VERSION,
        anchor: {
          type: "element",
          tagName: legacyElement.tagName || "unknown",
          id: legacyElement.id || null,
          classList: legacyElement.classList || [],
          dataAttributes: legacyElement.dataAttributes || {},
          cssSelector: legacyElement.cssSelector || "",
          indexPath: legacyElement.indexPath || legacyElement.domPath || [],
          textSnippet: legacyElement.textSnippet || null,
          ariaLabel: legacyElement.ariaLabel || null,
          role: legacyElement.role || null,
          parentContext: legacyElement.parentContext || null,
          bounds: legacyElement.bounds || { x: 0, y: 0, width: 0, height: 0, scrollX: 0, scrollY: 0 },
        },
        resolution: "unresolved",
      };
    }

    persist() {
      sessionStorage.setItem(this.options.storageKey, JSON.stringify(this.annotations));
    }

    getPageKey() {
      return `${location.pathname}${location.hash}`;
    }

    createId() {
      return crypto.randomUUID ? crypto.randomUUID() : `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  window.UIAnnotator = UIAnnotator;
})();
