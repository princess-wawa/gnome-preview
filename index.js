// ===== DEFAULTS =====
//window.customization = {
//    color: '#00497c',
//    theme: 'dark',
//    taskbar: 'dock',              // none | dock | panel
//    taskbarPosition: 'bottom',    // left | bottom | right
//    topPanel: true,
//    arcmenu: false
//};

window.customization = {
  color: '#00497c',
  theme: 'dark',
  taskbar: 'none',              // none | dock | panel
  taskbarPosition: 'bottom',    // left | bottom | right
  topPanel: false,
  arcmenu: true
};


// ===== THEMEABLE ICONS THEMING =====
// The icon pack used is tela-circle-icon, all of its themable icons are grayscale top parts that can be put on top of a colored background.
// this background color is window.customization.color
// this function will take this color and apply it to all themable icons, the background is pre set in the svg files using the currentColor value.
/**
 * updates all themable icons
 * @returns {Promise<void>} Resolves when all icons have been updated
 */
async function updateThemableIconColors() {
  const iconbackgroundcolor = window.customization.color;

  // function to set color on elements with a currentColor elements (aka all themeable icons)
  const paintCurrentColorElements = (root) => {
    // find all the elements that use currentColor
    root.querySelectorAll('[fill="currentColor"]').forEach(el => {
      //  Set the color style directly, overriding any previous color
      el.style.color = iconbackgroundcolor;
    });
  };

  // 1) Update SVGs we previously handled
  document.querySelectorAll('svg[data-themable-inline="true"]').forEach(svg => {
    paintCurrentColorElements(svg);
  });

  // 2) Find <img> tags that point to themable SVGs and inline them (only once)
  const imgs = Array.from(document.querySelectorAll('.icon--themable img, .themeable-icon img'))
    .filter(img => !img.dataset.themableProcessed); // ignore already processed icons

  await Promise.all(imgs.map(async img => {
    const src = img.getAttribute('src');  // Get the source URL of the SVG
    try {
      const res = await fetch(src); // Fetch the SVG content
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svgText = await res.text();

      // Parse the SVG text into a DOM element
      const tpl = document.createElement('template');
      tpl.innerHTML = svgText.trim();
      const svg = tpl.content.querySelector('svg');
      if (!svg) throw new Error('No <svg> in fetched content');

      // Ensure scalable, centered SVG content
      // If the SVG has no viewBox, derive it from width/height attributes
      if (!svg.hasAttribute('viewBox')) {
        const w = parseFloat(svg.getAttribute('width') || '0');
        const h = parseFloat(svg.getAttribute('height') || '0');
        if (w > 0 && h > 0) {
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        }
      }

      // Center and scale to fit preserving aspect ratio
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');


      // Mark and set sizing to match the original <img>
      svg.setAttribute('data-themable-inline', 'true');
      svg.setAttribute('aria-label', img.getAttribute('alt') || '');
      svg.style.display = 'block';

      // Copy width/height from computed <img> dimensions via CSS class sizing
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
    }
  }));
}

// ===== CUSTOMIZATION HANDLING =====
// a few things to note:
// both the right side and left side panels are the exact same element, just positioned differently 
// (at the exeption of the panel that has to changed from left:0% to right: 0% when the dash is on the right side)
// the bottom panel has an effect on the size of the arcmenu so when neither the dock or the panel is shown, we have to set their container to 0% height

/**
 * handles the position and visibility of all the elemtents that can be customized
 * @returns {void}
 */
function applyCustomization() {
  const cfg = window.customization;  // get the config
  const root = document.documentElement;
  const taskbarType = String(cfg.taskbar || '').toLowerCase();
  const taskbarPos = String(cfg.taskbarPosition || '').toLowerCase();

  // Query elements
  const topBar = document.querySelector('.shell-top-bar, .top-bar');
  const bottomDash = document.querySelector('.bottom-panel');
  const bottomDock = document.querySelector('.dock--bottom, .bottom-dock');
  const horizontalDock = document.querySelector('.sidebar-dock, .vertical-dock');
  const verticalPanel = document.querySelector('.sidebar-panel, .vertical-panel');
  const bottomLauncherIcon = document.getElementById('bottom-launcher-icon');
  const verticalLauncherIcon = document.getElementById('vertical-launcher-icon');
  const topBarArcIcon = document.querySelector('.top-bar-activities img, .arcmenu-in-top-bar img');
  const container = document.querySelector('.preview, .preview-container');
  const bottomArea = document.querySelector('.bottom-bar-area, .bottom-area');
  const dashContainer = document.querySelector('.sidebars, .dash-container');
  const arcmenuContainer = document.querySelector(".arcmenu-ui");

  // Apply customization settings to root element
  root.dataset.theme = cfg.theme;
  root.dataset.taskbar = taskbarType;
  root.dataset.taskbarPosition = taskbarPos;

  // mirror color to CSS var for potential styling
  root.style.setProperty('--customization-color', cfg.color || '#ffffff');

  // toggle top bar via utility class
  topBar.classList.toggle('hidden', !cfg.topPanel);

  // the bottom area is flattened when there's nothing to show
  const showBottomArea = taskbarPos === 'bottom' && taskbarType !== 'none';
  if (bottomArea) bottomArea.classList.toggle('flattened', !showBottomArea);

  // vertical dash visibility
  if (dashContainer) {
    dashContainer.classList.remove('left', 'right');
    // visible if it's on either side and not none
    const showDash = (taskbarPos === 'left' || taskbarPos === 'right') && taskbarType !== 'none';
    dashContainer.classList.toggle('hidden', !showDash);
    if (showDash) {
      dashContainer.classList.add(taskbarPos === 'left' ? 'left' : 'right');
    }
  }

  // Vertical dock visibility
  if (horizontalDock) {
    const showVDock = (taskbarPos === 'left' || taskbarPos === 'right') && taskbarType === 'dock';
    horizontalDock.classList.toggle('hidden', !showVDock);
  }

  // Vertical panel visibility and side
  if (verticalPanel) {
    const showVPanel = (taskbarPos === 'left' || taskbarPos === 'right') && taskbarType === 'panel';
    verticalPanel.classList.toggle('hidden', !showVPanel);
    verticalPanel.classList.remove('left', 'right');
    if (showVPanel) verticalPanel.classList.add(taskbarPos === 'right' ? 'right' : 'left');
  }

  // Bottom: show dock or panel
  if (bottomDash) bottomDash.classList.toggle('hidden', !(taskbarPos === 'bottom' && taskbarType === 'panel'));
  if (bottomDock) bottomDock.classList.toggle('hidden', !(taskbarPos === 'bottom' && taskbarType === 'dock'));

  // update top bar icon: ArcMenu vs Activities
  if (topBarArcIcon) {
    const useActivities = !cfg.arcmenu || taskbarType === 'panel';
    topBarArcIcon.src = useActivities
      ? 'images/customization/icons/activities.png'
      : 'images/customization/icons/arch.svg';
    topBarArcIcon.alt = useActivities ? 'Activities' : 'ArcMenu';
  }

  // update arcmenu visibility
  if (arcmenuContainer) {
    const arcmenustate = cfg.arcmenu
    arcmenuContainer.classList.toggle("hidden", !arcmenustate)
  }

  // update launcher icons based on ArcMenu state
  if (bottomLauncherIcon) {
    bottomLauncherIcon.src = cfg.arcmenu
      ? 'images/customization/icons/arch.svg'
      : 'images/customization/icons/view-app.svg';
    bottomLauncherIcon.alt = cfg.arcmenu ? 'ArcMenu' : 'Launcher';
  }
  if (verticalLauncherIcon) {
    verticalLauncherIcon.src = cfg.arcmenu
      ? 'images/customization/icons/arch.svg'
      : 'images/customization/icons/view-app.svg';
    verticalLauncherIcon.alt = cfg.arcmenu ? 'ArcMenu' : 'Launcher';
  }

  // switch background image based on theme via utility classes
  if (container) {
    container.classList.remove('theme-dark', 'theme-light');
    container.classList.add(cfg.theme === 'dark' ? 'theme-dark' : 'theme-light');
  }

  // Re-apply themable icon colors when customization changes
  updateThemableIconColors();
}

// time formatting
function formatTimestamp(d) {
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
  const day = d.getDate();
  let hour = d.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${month} ${day}  ${hour}:${minute}${ampm}`;
}

function formatVerticalTime(d) {
  let hour = d.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  const minute = String(d.getMinutes()).padStart(2, '0');
  // 3 lines: time, two centered dots under the colon, AM/PM
  return `${hour}:${minute}\n••\n${ampm}`;
}

function isVerticalPanelActive() {
  const cfg = window.customization;
  const taskbarType = String(cfg.taskbar || '').toLowerCase();
  const pos = String(cfg.taskbarPosition || '').toLowerCase();
  return (taskbarType === 'panel') && (pos === 'left' || pos === 'right');
}

function updateTime() {
  const now = new Date();
  const formatted = formatTimestamp(now);
  const timeEl = document.getElementById('current-time');
  const bottomTimeEl = document.getElementById('current-time-bottom');
  const verticalTimeEl = document.getElementById('current-time-vertical');

  if (timeEl) timeEl.textContent = formatted;
  if (bottomTimeEl) bottomTimeEl.textContent = formatted;

  if (verticalTimeEl) {
    if (isVerticalPanelActive()) {
      verticalTimeEl.textContent = formatVerticalTime(now);
    } else {
      verticalTimeEl.textContent = '';
    }
  }
}

// ===== SETTINGS HANDLERS =====
window.toggleTopPanel = function () {
  window.customization.topPanel = !window.customization.topPanel;
  applyCustomization();
  updateTime();
};

window.toggleArcMenu = function () {
  window.customization.arcmenu = !window.customization.arcmenu;
  applyCustomization();
  updateTime();
};

window.toggleTheme = function () {
  window.customization.theme = window.customization.theme === 'dark' ? 'light' : 'dark';
  applyCustomization();
  updateTime();
};

window.setTaskbarPosition = function (pos) {
  window.customization.taskbarPosition = String(pos);
  applyCustomization();
  updateTime();
};

window.setTaskbarType = function (type) {
  window.customization.taskbar = String(type);
  applyCustomization();
  updateTime();
};

window.setColor = function (hex) {
  window.customization.color = String(hex);
  applyCustomization();
  updateTime();
};

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  applyCustomization();
  updateTime();
  setInterval(updateTime, 30 * 1000);
  updateThemableIconColors();
});
