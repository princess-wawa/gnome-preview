// Global customization settings defined in JS instead of CSS custom properties
window.customization = {
  color: '#XXXXXX',
  theme: 'dark',
  taskbar: 'Dock',              // Dock or Panel
  taskbarPosition: 'bottom',    // left | bottom | right (focus on bottom for now)
  topPanel: true,      // boolean for showing/hiding the top panel
  arcmenu: false       // boolean flag for arcmenu availability
};

// Time display: format like "Aug 10  3:04PM" and UI controls to modify customization

document.addEventListener('DOMContentLoaded', () => {
  const timeEl = document.getElementById('current-time');
  const topBar = document.querySelector('.top-bar');
  const bottomDash = document.querySelector('.bottom-panel[aria-label="Panel"]'); // Panel (bottom)
  const bottomDock = document.querySelector('.bottom-dock[aria-label="Dock"]'); // Dock (centered vertically)
  const arcMenu = document.querySelector('.arcmenu');
  const container = document.querySelector('.preview-container');

  // Resolve the intended button background color from CSS variable or computed styles
  const resolveButtonBackground = () => {
    const root = document.documentElement;
    let val = getComputedStyle(root).getPropertyValue('--button-background');
    if (val) val = val.trim();
    if (!val) {
      // Fallback to computed background color of a sample button
      const sampleBtn = document.querySelector('.controls button');
      if (sampleBtn) {
        val = getComputedStyle(sampleBtn).backgroundColor;
      }
    }
    if (!val) {
      // Final fallback matches the CSS fallback in styles.css
      val = '#00497c';
    }
    return val;
  };

  // Inject and recolor themable SVG icons so their circle (fill=currentColor) matches --button-background
  const updateThemableIconColors = async () => {
    const buttonColor = resolveButtonBackground();

    // Helper to apply color directly to elements that use currentColor
    const paintCurrentColorElements = (root) => {
      // Update any element that relies on currentColor (like the circle)
      root.querySelectorAll('[fill="currentColor"]').forEach(el => {
        // Overwrite inline style color to ensure it takes effect over any existing inline style
        el.style.color = buttonColor;
      });
      // Also set the root svg color to cover any other uses of currentColor
      if (root instanceof SVGElement) {
        root.style.color = buttonColor;
      }
    };

    // 1) Update already inlined SVGs we previously handled
    document.querySelectorAll('svg[data-themable-inline="true"]').forEach(svg => {
      paintCurrentColorElements(svg);
    });

    // 2) Find <img> tags that point to themable SVGs and inline them (only once)
    const imgs = Array.from(document.querySelectorAll('img'))
      .filter(img => !img.dataset.themableProcessed && /\/icons\/themable\//.test(img.getAttribute('src') || ''));

    await Promise.all(imgs.map(async img => {
      const src = img.getAttribute('src');
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const svgText = await res.text();

        // Parse the SVG text into a DOM element
        const tpl = document.createElement('template');
        tpl.innerHTML = svgText.trim();
        const svg = tpl.content.querySelector('svg');
        if (!svg) throw new Error('No <svg> in fetched content');

        // Mark and set sizing to match the original <img>
        svg.setAttribute('data-themable-inline', 'true');
        svg.setAttribute('aria-label', img.getAttribute('alt') || '');
        svg.style.display = 'block';
        // Copy width/height from computed <img> dimensions via CSS class sizing
        // The dock uses CSS to size images; preserve class and styles
        if (img.getAttribute('class')) svg.setAttribute('class', img.getAttribute('class'));
        if (img.getAttribute('style')) svg.setAttribute('style', img.getAttribute('style'));

        // Apply the resolved color so elements using currentColor update
        paintCurrentColorElements(svg);

        // Replace the <img> with inline <svg>
        img.dataset.themableProcessed = 'true';
        img.replaceWith(svg);
      } catch (e) {
        // Mark as processed to avoid retry loops, but keep the <img> in place
        img.dataset.themableProcessed = 'true';
        // Optional: console.warn('Failed to inline themable SVG:', src, e);
      }
    }));
  };

  const applyCustomization = () => {
    const cfg = window.customization;
    const root = document.documentElement;
    // reflect on data attributes
    root.dataset.theme = cfg.theme;
    root.dataset.taskbar = cfg.taskbar;
    root.dataset.taskbarPosition = cfg.taskbarPosition;
    // mirror color to CSS var for potential styling
    root.style.setProperty('--customization-color', cfg.color || '#ffffff');

    // toggle top bar
    if (topBar) topBar.style.display = cfg.topPanel ? '' : 'none';
    // Taskbar overlays visibility (focus on bottom for now)
    if (cfg.taskbarPosition === 'bottom') {
      if (bottomDash) bottomDash.style.display = cfg.taskbar === 'Panel' ? '' : 'none';
      if (bottomDock) bottomDock.style.display = cfg.taskbar === 'Dock' ? '' : 'none';
    } else {
      if (bottomDash) bottomDash.style.display = 'none';
      if (bottomDock) bottomDock.style.display = 'none';
    }
    // show/hide arcmenu icon
    if (arcMenu) arcMenu.style.display = cfg.arcmenu ? '' : 'none';
    // switch background image based on theme
    if (container) {
      if (cfg.theme === 'dark') {
        container.style.backgroundImage = "url('images/customization/background-dark.png')";
      } else {
        container.style.backgroundImage = "url('images/customization/background-light.jpg')";
      }
      // keep other background properties the same via CSS
    }

    // Re-apply themable icon colors when customization changes
    updateThemableIconColors();
  };

  // time formatting
  const formatTimestamp = (d) => {
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
    const day = d.getDate();
    let hour = d.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${month} ${day}  ${hour}:${minute}${ampm}`;
  };

  const updateTime = () => {
    if (timeEl) timeEl.textContent = formatTimestamp(new Date());
  };

  // initial apply and time
  applyCustomization();
  updateTime();
  setInterval(updateTime, 30 * 1000);

  // Also recolor themable icons on initial load (in case applyCustomization doesn't run)
  updateThemableIconColors();

  // Wire controls
  const byId = (id) => document.getElementById(id);
  const btnToggleTop = byId('btn-toggle-top');
  const btnToggleArc = byId('btn-toggle-arcmenu');
  const btnToggleTheme = byId('btn-toggle-theme');
  const btnToggleTaskbarPos = byId('btn-toggle-taskbar-pos');
  const btnCycleTaskbar = byId('btn-cycle-taskbar');

  if (btnToggleTop) btnToggleTop.addEventListener('click', () => {
    window.customization.topPanel = !window.customization.topPanel;
    applyCustomization();
  });

  if (btnToggleArc) btnToggleArc.addEventListener('click', () => {
    window.customization.arcmenu = !window.customization.arcmenu;
    applyCustomization();
  });

  if (btnToggleTheme) btnToggleTheme.addEventListener('click', () => {
    window.customization.theme = window.customization.theme === 'dark' ? 'light' : 'dark';
    applyCustomization();
  });

  if (btnToggleTaskbarPos) btnToggleTaskbarPos.addEventListener('click', () => {
    const order = ['left', 'bottom', 'right'];
    const cur = window.customization.taskbarPosition;
    const idx = (order.indexOf(cur) + 1) % order.length;
    window.customization.taskbarPosition = order[idx];
    applyCustomization();
  });

  if (btnCycleTaskbar) btnCycleTaskbar.addEventListener('click', () => {
    const order = ['Dock', 'Panel'];
    const cur = window.customization.taskbar;
    const idx = (order.indexOf(cur) + 1) % order.length;
    window.customization.taskbar = order[idx];
    applyCustomization();
  });

  document.querySelectorAll('.controls .color').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const color = e.currentTarget.getAttribute('data-color');
      window.customization.color = color;
      applyCustomization();
    });
  });

});
