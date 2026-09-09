let canvas, currentPageId, currentMagazineId, pages = [], currentTool = 'select';
let saveTimer = null;
let customFonts = [];
let contextMenuTarget = null;
let galleryImageSizes = [];
const SHAPE_FILLS = ['#e91e63', '#8b5cf6', '#3498db', '#2ecc71', '#f39c12', '#34495e', '#ffffff', '#000000'];

const SYSTEM_FONTS = [
    'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
    'Impact', 'Lucida Console', 'Tahoma', 'Times New Roman', 'Trebuchet MS',
    'Verdana', 'Helvetica', 'Trebuchet MS', 'Palatino Linotype', 'Book Antiqua'
];

const PAGE_FORMATS = {
    a4:       { name: 'A4',                   wmm: 210,  hmm: 297 },
    a5:       { name: 'A5',                   wmm: 148,  hmm: 210 },
    letter:   { name: 'Carta',                win: 8.5,  hin: 11 },
    legal:    { name: 'Oficio',               win: 8.5,  hin: 14 },
    a3:       { name: 'A3',                   wmm: 297,  hmm: 420 },
    square:   { name: 'Cuadrado 1:1',         wpx: 1080, hpx: 1080 },
    photo:    { name: 'Foto',                 win: 4,    hin: 6 },
    igpost:   { name: 'Instagram Post',       wpx: 1080, hpx: 1080 },
    igstory:  { name: 'Instagram Historia',   wpx: 1080, hpx: 1920 },
    revista800:{ name: 'Revista',             wpx: 800,  hpx: 1100 }
};

function allFontList() {
    return [...SYSTEM_FONTS, ...customFonts.map(f => f.name)];
}

function getStoredDpi() {
    const v = localStorage.getItem(`revista_dpi_${currentMagazineId || ''}`);
    return v ? parseInt(v) : 150;
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!api.token) {
        window.location.href = 'home.html';
        return;
    }

    try {
        await api.me();
    } catch {
        api.clearToken();
        window.location.href = 'home.html';
        return;
    }

    initCanvas();
    initToolbar();
    initImageUpload();
    initFontSection();
    initFormatSection();
    initKeyboardShortcuts();
    initContextMenu();
    initTopbarButtons();
    initCollapsiblePanels();
    initImageResolution();
    initPageBackground();
    loadMagazine();
});

const PAGE_BG_COLORS = ['#ffffff', '#fdf6e3', '#f4f6fa', '#fdeef0', '#eef4fd', '#eef8f1', '#f7f0fa', '#333333', '#1a1a2e', '#8b5cf6', '#3498db', '#2ecc71'];

function initPageBackground() {
    const swatchesEl = document.getElementById('bgColorSwatches');
    const picker = document.getElementById('bgColorPicker');
    const resetBtn = document.getElementById('bgColorResetBtn');
    if (!swatchesEl || !picker) return;
    PAGE_BG_COLORS.forEach(color => {
        const sw = document.createElement('button');
        sw.className = 'bg-swatch';
        sw.style.background = color;
        sw.title = color;
        sw.addEventListener('click', () => applyPageBackground(color));
        swatchesEl.appendChild(sw);
    });
    picker.addEventListener('change', () => applyPageBackground(picker.value));
    if (resetBtn) resetBtn.addEventListener('click', () => applyPageBackground('#ffffff'));
    swatchesEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('bg-swatch')) {
            swatchesEl.querySelectorAll('.bg-swatch').forEach(sw => sw.classList.toggle('active', sw === e.target));
        }
    });
}

function syncBgPicker(color) {
    const picker = document.getElementById('bgColorPicker');
    const swatchesEl = document.getElementById('bgColorSwatches');
    if (picker) picker.value = color;
    if (swatchesEl) {
        const c = (color || '#ffffff').toLowerCase();
        swatchesEl.querySelectorAll('.bg-swatch').forEach(sw => {
            sw.classList.toggle('active', sw.style.background.toLowerCase() === c);
        });
    }
}

function applyPageBackground(color) {
    if (!currentPageId) return;
    canvas.backgroundColor = color;
    canvas.renderAll();
    scheduleSave();
    const page = pages.find(p => p.id === currentPageId);
    if (page) page.background_color = color;
    api.updatePage(currentPageId, { background_color: color }).catch(err => console.error(err));
}

const RES_KEY = 'revista_image_res';
const STD_KEY = 'revista_std';

function initImageResolution() {
    const sel = document.getElementById('imageResSel');
    if (!sel) return;
    const saved = localStorage.getItem(RES_KEY);
    if (saved && ['original', 'mayor', 'menor', 'encajar'].includes(saved)) sel.value = saved;
    sel.addEventListener('change', () => localStorage.setItem(RES_KEY, sel.value));
}

function getStoredImageRes() {
    const v = localStorage.getItem(RES_KEY);
    return ['mayor', 'menor', 'encajar'].includes(v) ? v : 'original';
}

function initCollapsiblePanels() {
    const left = document.getElementById('sidebarLeft');
    const right = document.getElementById('sidebarRight');
    const leftBtn = document.getElementById('collapseLeftBtn');
    const rightBtn = document.getElementById('collapseRightBtn');
    const tabs = {};
    const makeTab = (side) => {
        if (tabs[side]) return tabs[side];
        const tab = document.createElement('button');
        tab.className = `collapse-tab ${side}`;
        tab.title = 'Abrir panel';
        tab.textContent = side === 'left' ? '▶' : '◀';
        tab.addEventListener('click', () => toggleCollapse(side, false));
        document.body.appendChild(tab);
        tabs[side] = tab;
        return tab;
    };
    const toggleCollapse = (side, collapsed) => {
        const aside = side === 'left' ? left : right;
        const btn = side === 'left' ? leftBtn : rightBtn;
        const key = side === 'left' ? 'revista_sidebar_left' : 'revista_sidebar_right';
        if (collapsed === undefined) collapsed = !(aside.getAttribute('data-collapsed') === 'true');
        aside.classList.toggle('collapsed', collapsed);
        aside.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
        localStorage.setItem(key, collapsed ? '1' : '0');
        if (btn) btn.textContent = collapsed ? (side === 'left' ? '▶' : '◀') : (side === 'left' ? '◀' : '▶');
        if (collapsed) makeTab(side);
        else if (tabs[side]) { tabs[side].remove(); delete tabs[side]; }
        if (canvas && canvas.calcOffset) canvas.calcOffset();
    };
    const initSide = (side, aside, btn, key) => {
        const collapsed = localStorage.getItem(key) === '1';
        aside.classList.toggle('collapsed', collapsed);
        aside.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
        if (btn) btn.textContent = collapsed ? (side === 'left' ? '▶' : '◀') : (side === 'left' ? '◀' : '▶');
        if (collapsed) makeTab(side);
        if (btn) btn.addEventListener('click', () => toggleCollapse(side));
    };
    if (left) initSide('left', left, leftBtn, 'revista_sidebar_left');
    if (right) initSide('right', right, rightBtn, 'revista_sidebar_right');
    document.querySelectorAll('.tool-section[data-collapsible]').forEach(section => {
        const toggle = section.querySelector('.section-toggle');
        if (!toggle) return;
        const key = `revista_sec_${section.querySelector('h3').textContent.trim().toLowerCase().replace(/\s+/g, '_')}`;
        const collapsed = localStorage.getItem(key) === '1';
        section.classList.toggle('collapsed', collapsed);
        toggle.addEventListener('click', () => {
            section.classList.toggle('collapsed');
            localStorage.setItem(key, section.classList.contains('collapsed') ? '1' : '0');
        });
    });
}

function initCanvas() {
    canvas = new fabric.Canvas('editorCanvas', {
        width: 600,
        height: 850,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true
    });

    canvas.on('selection:created', () => { updatePropertiesPanel(); renderLayers(); });
    canvas.on('selection:updated', () => { updatePropertiesPanel(); renderLayers(); });
    canvas.on('selection:cleared', () => { clearPropertiesPanel(); renderLayers(); });

    canvas.on('object:modified', () => { pushUndo(); scheduleSave(); renderLayers(); });
    canvas.on('text:changed', () => scheduleSave());
    canvas.on('object:added', () => { scheduleSave(); renderLayers(); });
    canvas.on('object:removed', () => { scheduleSave(); renderLayers(); });

    canvas.on('mouse:down', (opt) => {
        if (opt.e.which === 3 || opt.e.button === 2) {
            opt.e.preventDefault();
            const target = opt.target;
            if (target) {
                canvas.setActiveObject(target);
                canvas.renderAll();
                openObjectMenu(target, { clientX: opt.e.clientX, clientY: opt.e.clientY });
            }
        }
    });
}

function openObjectMenu(obj, pos) {
    closeContextMenu();
    const menu = buildContextMenu([
        { label: 'Duplicar', icon: '⧉', action: () => duplicateObject(obj) },
        { label: 'Eliminar', icon: '🗑', danger: true, action: () => deleteActiveObject() }
    ]);
    const isShape = ['rect', 'circle', 'round', 'ellipse', 'triangle', 'polygon', 'line'].includes(obj.type);
    if (isShape) {
        const colors = document.createElement('div');
        colors.className = 'context-colors';
        colors.title = 'Cambiar color';
        SHAPE_FILLS.forEach(c => {
            const sw = document.createElement('button');
            sw.className = 'swatch' + (obj.fill === c || obj.fill === hexToRgba(c) ? ' active' : '');
            sw.style.background = c;
            sw.dataset.color = c;
            sw.addEventListener('click', (e) => {
                e.stopPropagation();
                applyShapeFill(obj, c);
                scheduleSave();
                closeContextMenu();
            });
            colors.appendChild(sw);
        });
        const label = document.createElement('div');
        label.className = 'context-colors-label';
        label.textContent = 'Cambiar color';
        menu.insertBefore(label, menu.firstChild);
        menu.insertBefore(colors, menu.firstChild);
    }
    menu.classList.remove('hidden');
    const menuRect = menu.getBoundingClientRect();
    let x = pos.clientX;
    let y = pos.clientY;
    if (x + menuRect.width > window.innerWidth) x = window.innerWidth - menuRect.width - 6;
    if (y + menuRect.height > window.innerHeight) y = window.innerHeight - menuRect.height - 6;
    menu.style.left = `${Math.max(4, x)}px`;
    menu.style.top = `${Math.max(4, y)}px`;
}

function duplicateObject(obj) {
    obj.clone((cloned) => {
        cloned.set({
            left: obj.left + 20,
            top: obj.top + 20,
            elementId: null
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        pushUndo();
        scheduleSave();
        saveNewElement(cloned, objType(cloned));
    });
}

function scheduleSave() {
    const btn = document.getElementById('saveBtn');
    if (btn && btn.textContent === 'Guardar') btn.classList.add('has-changes');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveAllElements, 800);
}

function initToolbar() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            handleTool(currentTool);
        });
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        saveAllElements().then(() => window.location.href = 'home.html');
    });

    document.getElementById('exportPdfBtn').addEventListener('click', exportPdf);
    document.getElementById('saveBtn').addEventListener('click', () => {
        const btn = document.getElementById('saveBtn');
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        saveAllElements().finally(() => {
            btn.disabled = false;
            btn.textContent = 'Guardado ✓';
            btn.classList.remove('has-changes');
            setTimeout(() => { btn.textContent = 'Guardar'; }, 1600);
        });
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await saveAllElements();
        api.clearToken();
        window.location.href = 'home.html';
    });
    const addPageBtn = document.getElementById('addPageBtn');
    if (addPageBtn) addPageBtn.addEventListener('click', addPage);
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const tag = (e.target.tagName || '').toUpperCase();
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
            const active = canvas.getActiveObject();
            if (active && !active.isEditing) {
                e.preventDefault();
                deleteActiveObject();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undoAction();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redoAction();
        }
        if (e.key === 'Escape') {
            closeContextMenu();
        }
    });
}

let undoStack = [];
let redoStack = [];

function pushUndo() {
    const state = JSON.stringify(canvas.toJSON(['elementId']));
    undoStack.push(state);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
}

function undoAction() {
    if (!undoStack.length) return;
    const current = JSON.stringify(canvas.toJSON(['elementId']));
    redoStack.push(current);
    const prev = undoStack.pop();
    restoreState(prev);
}

function redoAction() {
    if (!redoStack.length) return;
    const current = JSON.stringify(canvas.toJSON(['elementId']));
    undoStack.push(current);
    const next = redoStack.pop();
    restoreState(next);
}

function restoreState(state) {
    const obj = canvas.getActiveObject();
    if (obj) canvas.discardActiveObject();
    canvas.clear();
    canvas.loadFromJSON(JSON.parse(state), () => {
        canvas.renderAll();
        scheduleSave();
    });
}

// ===== Context menu (shared) =====
let contextMenuEl = null;
let activeMenuTarget = null;
let activeMenuType = null;

function initContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.className = 'context-menu hidden';
    document.body.appendChild(menu);

    document.addEventListener('click', (e) => {
        if (menu.classList.contains('hidden')) return;
        if (!menu.contains(e.target)) closeContextMenu();
    });
}

function buildContextMenu(items) {
    closeContextMenu();
    const menu = document.getElementById('contextMenu');
    menu.innerHTML = '';
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'context-item' + (item.danger ? ' danger' : '');
        btn.innerHTML = `<span class="context-icon">${item.icon}</span><span>${item.label}</span>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeContextMenu();
            item.action();
        });
        menu.appendChild(btn);
    });
    return menu;
}

function positionContextMenu(anchorEl, menu) {
    const rect = anchorEl.getBoundingClientRect();
    menu.classList.remove('hidden');
    const menuRect = menu.getBoundingClientRect();
    let x = rect.right + 6;
    if (x + menuRect.width > window.innerWidth) x = rect.left - menuRect.width - 6;
    let y = rect.top;
    if (y + menuRect.height > window.innerHeight) y = window.innerHeight - menuRect.height - 6;
    menu.style.left = `${Math.max(4, x)}px`;
    menu.style.top = `${Math.max(4, y)}px`;
}

function closeContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.classList.add('hidden');
}

function initTopbarButtons() {
    document.getElementById('undoBtn').addEventListener('click', undoAction);
    document.getElementById('redoBtn').addEventListener('click', redoAction);
}

// ===== Canvas context menu on objects =====
function initObjectContextMenu() {
    // bound in initCanvas via mouse:down
}


async function deleteActiveObject() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    if (obj.elementId) {
        try { await api.deleteElement(obj.elementId); } catch {}
    }
    canvas.remove(obj);
    canvas.renderAll();
    clearPropertiesPanel();
}

function handleTool(tool) {
    canvas.isDrawingMode = false;
    canvas.selection = true;

    if (tool === 'text') {
        addTextBox();
    } else if (tool === 'image') {
        document.getElementById('imageUpload').click();
    } else if (tool === 'rect') {
        addRect();
    } else if (tool === 'circle') {
        addCircle();
    }
}

function addTextBox() {
    const text = new fabric.Textbox('Escribe aquí', {
        left: 100,
        top: 100,
        fontSize: 24,
        fill: '#000000',
        fontFamily: 'Arial',
        width: 200,
        editable: true
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    saveNewElement(text, 'text');
}

function addRect() {
    const rect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 150,
        height: 100,
        fill: 'rgba(233, 30, 99, 0.3)',
        stroke: '#e91e63',
        strokeWidth: 2
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    saveNewElement(rect, 'rect');
}

function addCircle() {
    const circle = new fabric.Circle({
        left: 150,
        top: 150,
        radius: 50,
        fill: 'rgba(233, 30, 99, 0.3)',
        stroke: '#e91e63',
        strokeWidth: 2
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    saveNewElement(circle, 'circle');
}

async function addImageFromURL(url) {
    fabric.Image.fromURL(url, (img) => {
        let finalScale = 1;
        const resMode = getStoredImageRes();
        if (resMode === 'encajar') {
            finalScale = Math.min((canvas.width * 0.92) / img.width, (canvas.height * 0.92) / img.height);
        } else if (resMode !== 'original' && galleryImageSizes.length > 0) {
            const target = resMode === 'mayor'
                ? galleryImageSizes.reduce((a, b) => (a.width * a.height) >= (b.width * b.height) ? a : b)
                : galleryImageSizes.reduce((a, b) => (a.width * a.height) <= (b.width * b.height) ? a : b);
            const maxW = canvas.width * 0.8;
            const maxH = canvas.height * 0.8;
            let boundW = target.width, boundH = target.height;
            const boundScale = Math.min(maxW / boundW, maxH / boundH);
            if (boundScale < 1) { boundW *= boundScale; boundH *= boundScale; }
            finalScale = Math.min(boundW / img.width, boundH / img.height);
        }
        if (finalScale !== 1) img.scale(finalScale);
        const left = Math.max(8, (canvas.width - img.width * img.scaleX) / 2);
        const top = Math.max(8, (canvas.height - img.height * img.scaleY) / 2);
        img.set({ left, top, src: url });
        canvas.add(img);
        canvas.setActiveObject(img);
        saveNewElement(img, 'image');
    }, { crossOrigin: 'anonymous' });
}

function getObjectStyle(obj) {
    const imgSrc = typeof obj.getSrc === 'function' ? obj.getSrc() : null;
    return {
        fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
        stroke: typeof obj.stroke === 'string' ? obj.stroke : null,
        strokeWidth: obj.strokeWidth || null,
        fontSize: obj.fontSize || null,
        fontFamily: obj.fontFamily || null,
        fontWeight: obj.fontWeight || null,
        fontStyle: obj.fontStyle || null,
        textAlign: obj.textAlign || null,
        lineHeight: obj.lineHeight || null,
        src: obj.src || imgSrc || null,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY
    };
}

async function saveNewElement(obj, type) {
    if (!currentPageId || obj.elementId) return;
    try {
        const data = await api.createElement(currentPageId, {
            type,
            x: obj.left,
            y: obj.top,
            width: obj.width * (obj.scaleX || 1),
            height: obj.height * (obj.scaleY || 1),
            rotation: obj.angle || 0,
            z_index: canvas.getObjects().indexOf(obj),
            content: obj.text || '',
            style: JSON.stringify(getObjectStyle(obj))
        });
        obj.elementId = data.id;
    } catch (err) {
        console.error('Error saving element:', err);
    }
}

async function saveElement(obj) {
    if (!obj.elementId) return;
    try {
        await api.updateElement(obj.elementId, {
            x: obj.left,
            y: obj.top,
            width: obj.width * (obj.scaleX || 1),
            height: obj.height * (obj.scaleY || 1),
            rotation: obj.angle || 0,
            z_index: canvas.getObjects().indexOf(obj),
            content: obj.text || '',
            style: JSON.stringify(getObjectStyle(obj))
        });
    } catch (err) {
        console.error('Error updating element:', err);
    }
}

async function saveAllElements() {
    if (!canvas) return;
    const objects = canvas.getObjects();
    for (const obj of objects) {
        if (!obj.elementId) {
            await saveNewElement(obj, objType(obj));
        } else {
            await saveElement(obj);
        }
    }
}

function objType(obj) {
    if (obj.type === 'textbox' || obj.type === 'i-text') return 'text';
    if (obj.type === 'rect') return 'rect';
    if (obj.type === 'circle') return 'circle';
    if (obj.type === 'ellipse') return 'ellipse';
    if (obj.type === 'triangle') return 'triangle';
    if (obj.type === 'line') return 'line';
    if (obj.type === 'polygon') return 'polygon';
    return 'image';
}

function updatePropertiesPanel() {
    const obj = canvas.getActiveObject();
    if (!obj) return;

    const panel = document.getElementById('propertiesPanel');
    const isText = obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text';
    const isImage = obj.type === 'image';

    let html = `<div class="prop-group">
        <label>Posición X</label>
        <input type="number" id="propX" value="${Math.round(obj.left)}">
    </div>
    <div class="prop-group">
        <label>Posición Y</label>
        <input type="number" id="propY" value="${Math.round(obj.top)}">
    </div>
    <div class="prop-group">
        <label>Ancho (px)</label>
        <input type="number" id="propW" value="${Math.round(obj.width * (obj.scaleX || 1))}">
    </div>
    <div class="prop-group">
        <label>Alto (px)</label>
        <input type="number" id="propH" value="${Math.round(obj.height * (obj.scaleY || 1))}">
    </div>
    <div class="prop-group">
        <label>Rotación (°)</label>
        <input type="number" id="propR" value="${Math.round(obj.angle || 0)}">
    </div>`;

    // Align buttons for all objects
    html += `<div class="prop-group">
        <label>Alinear</label>
        <div class="align-buttons">
            <button class="align-btn" data-align="left" title="Izquierda">⇤</button>
            <button class="align-btn" data-align="center" title="Centro horizontal">↔</button>
            <button class="align-btn" data-align="right" title="Derecha">⇥</button>
            <button class="align-btn" data-align="top" title="Arriba">⇧</button>
            <button class="align-btn" data-align="middle" title="Centro vertical">↕</button>
            <button class="align-btn" data-align="bottom" title="Abajo">⇩</button>
        </div>
    </div>`;

    // Shape controls (rect & circle)
    if (obj.type === 'rect' || obj.type === 'circle') {
        html += `<div class="prop-group">
            <label>Color de relleno</label>
            <div class="color-swatches">
                ${SHAPE_FILLS.map(c => `<button class="swatch ${(obj.fill === c || obj.fill === hexToRgba(c)) ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
            </div>
            <label style="margin-top:6px">Personalizado</label>
            <input type="color" id="propFillColor" value="${typeof obj.fill === 'string' && obj.fill.startsWith('#') ? obj.fill : '#e91e63'}">
        </div>`;
        if (obj.type === 'rect') {
            html += `<div class="prop-group">
                <label>Forma</label>
                <select id="propShape">
                    <option value="rect">Rectángulo</option>
                    <option value="round">Rectángulo redondeado</option>
                    <option value="ellipse">Elipse</option>
                    <option value="triangle">Triángulo</option>
                    <option value="line">Línea</option>
                    <option value="polygon">Polígono (5 lados)</option>
                </select>
            </div>`;
        }
    }

    if (isText) {
        html += `<div class="prop-group">
            <label>Texto</label>
            <textarea id="propText" rows="3">${escapeHtml(obj.text || '')}</textarea>
        </div>
        <div class="prop-group">
            <label>Fuente</label>
            <select id="propFont">
                ${allFontList().map(f => `<option value="${f}" ${obj.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
        </div>
        <div class="prop-group">
            <label>Tamaño</label>
            <input type="number" id="propFontSize" value="${obj.fontSize || 24}" min="4" max="300">
        </div>
        <div class="prop-group">
            <label>Color</label>
            <input type="color" id="propColor" value="${typeof obj.fill === 'string' ? obj.fill : '#000000'}">
        </div>
        <div class="prop-group">
            <label>Estilo</label>
            <div class="style-buttons">
                <button class="style-btn ${obj.fontWeight === 'bold' ? 'active' : ''}" id="propBold" title="Negrita"><b>B</b></button>
                <button class="style-btn ${obj.fontStyle === 'italic' ? 'active' : ''}" id="propItalic" title="Cursiva"><i>I</i></button>
            </div>
        </div>
        <div class="prop-group">
            <label>Alineación de texto</label>
            <div class="align-buttons">
                <button class="align-btn" data-text-align="left" title="Izquierda">≡</button>
                <button class="align-btn" data-text-align="center" title="Centro">☰</button>
                <button class="align-btn" data-text-align="right" title="Derecha">≣</button>
            </div>
        </div>`;
    }

    if (isImage) {
        html += `<div class="prop-group">
            <label>Opacidad</label>
            <input type="range" id="propOpacity" min="0" max="100" value="${Math.round((obj.opacity || 1) * 100)}">
        </div>`;
    }

    html += `<button class="btn btn-small" style="margin-top:12px;background:var(--danger);color:white;width:100%" id="deleteObjBtn">Eliminar elemento</button>`;

    panel.innerHTML = html;

    // Bind events
    document.getElementById('propX').addEventListener('change', (e) => { obj.set('left', parseInt(e.target.value)); canvas.renderAll(); });
    document.getElementById('propY').addEventListener('change', (e) => { obj.set('top', parseInt(e.target.value)); canvas.renderAll(); });
    document.getElementById('propW').addEventListener('change', (e) => {
        const newW = parseInt(e.target.value);
        obj.set('scaleX', newW / obj.width);
        canvas.renderAll();
        scheduleSave();
    });
    document.getElementById('propH').addEventListener('change', (e) => {
        const newH = parseInt(e.target.value);
        obj.set('scaleY', newH / obj.height);
        canvas.renderAll();
        scheduleSave();
    });
    document.getElementById('propR').addEventListener('change', (e) => { obj.set('angle', parseInt(e.target.value)); canvas.renderAll(); scheduleSave(); });

    // Align buttons
    document.querySelectorAll('[data-align]').forEach(btn => {
        btn.addEventListener('click', () => {
            const align = btn.dataset.align;
            let left = obj.left, top = obj.top;
            if (align === 'left') left = 0;
            if (align === 'right') left = canvas.width - obj.width * (obj.scaleX || 1);
            if (align === 'center') left = (canvas.width - obj.width * (obj.scaleX || 1)) / 2;
            if (align === 'top') top = 0;
            if (align === 'bottom') top = canvas.height - obj.height * (obj.scaleY || 1);
            if (align === 'middle') top = (canvas.height - obj.height * (obj.scaleY || 1)) / 2;
            obj.set({ left, top });
            canvas.renderAll();
            scheduleSave();
        });
    });

    // Shape controls binding (rect/circle)
    if (obj.type === 'rect' || obj.type === 'circle') {
        document.querySelectorAll('.swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                const color = sw.dataset.color;
                applyShapeFill(obj, color);
                canvas.renderAll();
                scheduleSave();
                sw.parentElement.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s === sw));
            });
        });
        document.getElementById('propFillColor').addEventListener('input', (e) => {
            applyShapeFill(obj, e.target.value);
            canvas.renderAll();
            scheduleSave();
        });
        if (obj.type === 'rect') {
            document.getElementById('propShape').addEventListener('change', (e) => {
                changeShape(obj, e.target.value);
                canvas.renderAll();
                scheduleSave();
                pushUndo();
                updatePropertiesPanel();
            });
        }
    }

    if (isText) {
        document.getElementById('propText').addEventListener('input', (e) => {
            obj.set('text', e.target.value);
            canvas.renderAll();
        });
        document.getElementById('propFont').addEventListener('change', (e) => {
            obj.set('fontFamily', e.target.value);
            canvas.renderAll();
            scheduleSave();
        });
        document.getElementById('propFontSize').addEventListener('change', (e) => {
            obj.set('fontSize', parseInt(e.target.value));
            canvas.renderAll();
            scheduleSave();
        });
        document.getElementById('propColor').addEventListener('input', (e) => {
            obj.set('fill', e.target.value);
            canvas.renderAll();
        });
        document.getElementById('propBold').addEventListener('click', (e) => {
            obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
            e.target.classList.toggle('active');
            canvas.renderAll();
            scheduleSave();
        });
        document.getElementById('propItalic').addEventListener('click', (e) => {
            obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
            e.target.classList.toggle('active');
            canvas.renderAll();
            scheduleSave();
        });
        document.querySelectorAll('[data-text-align]').forEach(btn => {
            btn.addEventListener('click', () => {
                obj.set('textAlign', btn.dataset.textAlign);
                canvas.renderAll();
                scheduleSave();
            });
        });
    }

    if (isImage) {
        document.getElementById('propOpacity').addEventListener('input', (e) => {
            obj.set('opacity', parseInt(e.target.value) / 100);
            canvas.renderAll();
        });
    }

    document.getElementById('deleteObjBtn').addEventListener('click', deleteActiveObject);
}

function clearPropertiesPanel() {
    document.getElementById('propertiesPanel').innerHTML = '<p class="hint">Selecciona un elemento para editar sus propiedades</p>';
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha === undefined ? 1 : alpha})`;
}

function applyShapeFill(obj, color) {
    obj.set('fill', color === '#ffffff' ? color : hexToRgba(color, 0.6));
    obj.set('stroke', color);
    canvas.renderAll();
}

function changeShape(obj, shape) {
    const { left, top, angle, fill, stroke, strokeWidth } = obj;
    const w = obj.width * (obj.scaleX || 1) || 100;
    const h = obj.height * (obj.scaleY || 1) || 100;
    canvas.remove(obj);
    let newObj;
    switch (shape) {
        case 'round':
            newObj = new fabric.Rect({ left, top, width: w, height: h, rx: 20, ry: 20, angle, fill, stroke, strokeWidth });
            break;
        case 'ellipse':
            newObj = new fabric.Ellipse({ left, top, rx: w / 2, ry: h / 2, angle, fill, stroke, strokeWidth });
            break;
        case 'triangle':
            newObj = new fabric.Triangle({ left, top, width: w, height: h, angle, fill, stroke, strokeWidth });
            break;
        case 'line':
            newObj = new fabric.Line([left, top, left + w, top + h], { stroke: fill, strokeWidth: strokeWidth || 3 });
            break;
        case 'polygon':
            newObj = new fabric.Polygon([
                { x: 0, y: 0 }, { x: w * 0.5, y: h * 0.25 }, { x: w * 0.75, y: h * 0.5 },
                { x: w * 0.5, y: h * 0.75 }, { x: 0, y: h }
            ], { left, top, angle, fill, stroke, strokeWidth });
            break;
        default: // rect
            newObj = new fabric.Rect({ left, top, width: w, height: h, angle, fill, stroke, strokeWidth });
    }
    newObj.elementId = obj.elementId;
    canvas.add(newObj);
    canvas.setActiveObject(newObj);
    updatePropertiesPanel();
}

function initImageUpload() {
    const input = document.getElementById('imageUpload');
    document.getElementById('uploadImageBtn').addEventListener('click', () => input.click());

    input.addEventListener('change', async (e) => {
        for (const file of e.target.files) {
            try {
                const img = await api.upload(file);
                const url = `/uploads/${img.filename}`;
                addImageFromURL(url);
                await loadImageGallery();
            } catch (err) {
                console.error('Upload error:', err);
                alert('Error al subir imagen: ' + err.message);
            }
        }
        input.value = '';
    });
}

function initFontSection() {
    const fileInput = document.getElementById('fontUpload');
    const zipInput = document.getElementById('fontZipUpload');

    document.getElementById('addFontBtn').addEventListener('click', () => fileInput.click());
    document.getElementById('addFontZipBtn').addEventListener('click', () => zipInput.click());

    fileInput.addEventListener('change', async (e) => {
        const files = [...e.target.files];
        e.target.value = '';
        if (!files.length) return;
        try {
            await api.uploadFonts(files);
            await loadFonts();
            alert('Fuentes agregadas.');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    zipInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            const zip = await JSZip.loadAsync(file);
            const fontFiles = [];
            const allowed = ['.ttf', '.otf', '.woff', '.woff2'];
            const tasks = [];
            zip.forEach((path, entry) => {
                if (entry.dir) return;
                const ext = '.' + path.split('.').pop().toLowerCase();
                if (!allowed.includes(ext)) return;
                tasks.push(entry.async('blob').then(blob => {
                    fontFiles.push(new File([blob], path.split('/').pop(), { type: blob.type }));
                }));
            });
            await Promise.all(tasks);
            if (!fontFiles.length) {
                alert('No se encontraron fuentes válidas (.ttf, .otf, .woff, .woff2) en el ZIP.');
                return;
            }
            await api.uploadFonts(fontFiles);
            await loadFonts();
            alert(`${fontFiles.length} fuente(s) agregada(s).`);
        } catch (err) {
            alert('Error con el ZIP: ' + err.message);
        }
    });
}

async function loadFonts() {
    try {
        const fonts = await api.getFonts();
        customFonts = fonts;
        const list = document.getElementById('fontList');
        list.innerHTML = '';
        if (fonts.length === 0) {
            list.innerHTML = '<p class="hint">Sin fuentes. Sube .ttf, .otf, .woff o .woff2.</p>';
            return;
        }
        fonts.forEach(f => {
            const ff = new FontFace(f.name, `url(/uploads/fonts/${f.filename})`);
            ff.load().then(() => document.fonts.add(ff)).catch(err => console.error('Load font:', f.name, err));

            const item = document.createElement('div');
            item.className = 'font-item';
            item.innerHTML = `<span class="font-name">${escapeHtml(f.name)}</span>
                <button class="font-delete" title="Eliminar fuente" onclick="event.stopPropagation();deleteFont('${f.id}')">×</button>`;
            list.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading fonts:', err);
    }
}

async function deleteFont(id) {
    if (!confirm('¿Eliminar esta fuente?')) return;
    try {
        await api.deleteFont(id);
        await loadFonts();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function initFormatSection() {
    const fmtSel = document.getElementById('pageFormatSel');
    const dpiSel = document.getElementById('pageDpiSel');
    const customRow = document.getElementById('customSizeRow');

    dpiSel.value = String(getStoredDpi());

    fmtSel.addEventListener('change', () => {
        customRow.classList.toggle('hidden', fmtSel.value !== 'custom');
    });

    document.getElementById('applyFormatBtn').addEventListener('click', applyPageFormat);
    document.getElementById('fitToImageBtn').addEventListener('click', fitPageToImage);
}

function formatPx(key, dpi) {
    const f = PAGE_FORMATS[key];
    if (!f) return null;
    if (f.wpx) return [f.wpx, f.hpx];
    if (f.wmm) return [Math.round(f.wmm * dpi / 25.4), Math.round(f.hmm * dpi / 25.4)];
    if (f.win) return [Math.round(f.win * dpi), Math.round(f.hin * dpi)];
    return null;
}

async function applyPageFormat() {
    const key = document.getElementById('pageFormatSel').value;
    const dpi = parseInt(document.getElementById('pageDpiSel').value) || 150;
    localStorage.setItem(`revista_dpi_${currentMagazineId}`, dpi);

    let w, h;
    if (key === 'custom') {
        w = parseInt(document.getElementById('customW').value);
        h = parseInt(document.getElementById('customH').value);
        if (!w || !h || w < 50 || h < 50) {
            alert('Ingresá un ancho y alto válidos (mínimo 50 px).');
            return;
        }
    } else {
        const px = formatPx(key, dpi);
        if (!px) return;
        [w, h] = px;
    }

    try {
        for (const p of pages) {
            await api.updatePage(p.id, { width: w, height: h });
        }
        savePageStd(w, h);
        pages = await api.getPages(currentMagazineId);
        await selectPage(currentPageId);
        updateFormatInfo(w, h, dpi);
    } catch (err) {
        alert('Error aplicando formato: ' + err.message);
    }
}

function savePageStd(w, h) {
    try { localStorage.setItem(`${STD_KEY}_${currentMagazineId}`, JSON.stringify({ w, h })); } catch {}
}

function getPageStd() {
    try {
        const raw = localStorage.getItem(`${STD_KEY}_${currentMagazineId}`);
        if (!raw) return null;
        const std = JSON.parse(raw);
        if (std && std.w > 0 && std.h > 0) return std;
    } catch {}
    const first = pages[0];
    if (first && first.width > 0 && first.height > 0) return { w: first.width, h: first.height };
    return null;
}

async function fitPageToImage() {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'image') {
        alert('Seleccioná una imagen en el lienzo para ajustar el tamaño de página.');
        return;
    }
    const w = Math.max(1, Math.round(obj.width * (obj.scaleX || 1)));
    const h = Math.max(1, Math.round(obj.height * (obj.scaleY || 1)));
    const dpi = parseInt(document.getElementById('pageDpiSel').value) || parseInt(getStoredDpi()) || 150;
    localStorage.setItem(`revista_dpi_${currentMagazineId}`, dpi);

    try {
        for (const p of pages) {
            await api.updatePage(p.id, { width: w, height: h });
        }
        savePageStd(w, h);
        pages = await api.getPages(currentMagazineId);
        await selectPage(currentPageId);
        updateFormatInfo(w, h, dpi);
        alert(`Página ajustada a ${w} × ${h} px.`);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function updateFormatInfo(w, h, dpi) {
    const cmW = (w * 25.4 / dpi / 10).toFixed(1);
    const cmH = (h * 25.4 / dpi / 10).toFixed(1);
    document.getElementById('formatInfo').textContent = `${w} × ${h} px · ${dpi} dpi · ${cmW} × ${cmH} cm`;
}

async function setFormatSectionState() {
    const dpi = getStoredDpi();
    document.getElementById('pageDpiSel').value = String(dpi);

    const page = pages.find(p => p.id === currentPageId) || pages[0];
    if (!page) return;
    const w = page.width, h = page.height;
    const fmtSel = document.getElementById('pageFormatSel');
    const customRow = document.getElementById('customSizeRow');

    let matched = null;
    for (const key of Object.keys(PAGE_FORMATS)) {
        const px = formatPx(key, dpi);
        if (px && px[0] === w && px[1] === h) { matched = key; break; }
    }
    if (matched) {
        fmtSel.value = matched;
        customRow.classList.add('hidden');
    } else {
        fmtSel.value = 'custom';
        customRow.classList.remove('hidden');
        document.getElementById('customW').value = w;
        document.getElementById('customH').value = h;
    }
    updateFormatInfo(w, h, dpi);
}

async function loadMagazine() {
    const params = new URLSearchParams(window.location.search);
    currentMagazineId = params.get('id');

    if (!currentMagazineId) {
        try {
            const magazines = await api.getMagazines();
            if (magazines.length > 0) {
                currentMagazineId = magazines[0].id;
            } else {
                const m = await api.createMagazine('Nueva Revista', '');
                currentMagazineId = m.id;
            }
        } catch (err) {
            console.error(err);
            return;
        }
    }

    try {
        const magazine = await api.getMagazine(currentMagazineId);
        document.getElementById('magazineTitle').textContent = magazine.title;
        document.title = magazine.title + ' - Revista Editor';

        document.getElementById('magazineTitle').addEventListener('blur', async (e) => {
            const newTitle = e.target.textContent.trim();
            if (newTitle && newTitle !== magazine.title) {
                await api.updateMagazine(currentMagazineId, { title: newTitle, description: magazine.description });
                document.title = newTitle + ' - Revista Editor';
            }
        });

        await loadPages();
        await enforcePageStd();
        await loadImageGallery();
        await loadTemplates();
        await loadFonts();
        await setFormatSectionState();
    } catch (err) {
        console.error(err);
    }
}

async function enforcePageStd() {
    const std = getPageStd();
    if (!std) return;
    let changed = false;
    for (const p of pages) {
        if ((p.width || 0) !== std.w || (p.height || 0) !== std.h) {
            try {
                await api.updatePage(p.id, { width: std.w, height: std.h });
                p.width = std.w;
                p.height = std.h;
                changed = true;
            } catch {}
        }
    }
    if (changed) {
        await selectPage(currentPageId);
        setFormatSectionState();
    }
}

async function loadPages() {
    try {
        pages = await api.getPages(currentMagazineId);
        renderPageList();
        if (pages.length > 0) {
            await selectPage(pages[0].id);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderPageList() {
    const list = document.getElementById('pageList');
    list.innerHTML = '';
    pages.forEach((p) => {
        const item = document.createElement('div');
        item.className = 'page-item' + (p.id === currentPageId ? ' active' : '');
        item.dataset.pageId = p.id;
        item.innerHTML = `<div class="page-label">
                <span class="page-num">${p.page_number}</span>
                <span class="page-name">${escapeHtml(p.name || `Página ${p.page_number}`)}</span>
            </div>
            <div class="page-actions">
                <button class="action-btn" data-action="menu" title="Opciones">⋯</button>
            </div>`;
        item.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]');
            if (action) {
                e.stopPropagation();
                if (action.dataset.action === 'menu') {
                    openPageMenu(item, p);
                }
                return;
            }
            selectPage(p.id);
        });
        list.appendChild(item);
    });
    const idx = pages.findIndex(p => p.id === currentPageId);
    document.getElementById('pageIndicator').textContent = `Página ${idx + 1} de ${pages.length}`;
}

function renderLayers() {
    const list = document.getElementById('layersList');
    if (!list || !canvas) return;
    list.innerHTML = '';
    const objs = canvas.getObjects();
    for (let i = objs.length - 1; i >= 0; i--) {
        const obj = objs[i];
        const item = document.createElement('div');
        item.className = 'layer-item' + (canvas.getActiveObject() === obj ? ' active' : '');
        const label = layerLabel(obj);
        const icon = layerIcon(obj.type);
        item.innerHTML = `<span class="layer-icon">${icon}</span>
            <span class="layer-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
            <span class="layer-actions">
                <button class="layer-btn" data-lay="up" title="Subir nivel">↑</button>
                <button class="layer-btn" data-lay="down" title="Bajar nivel">↓</button>
                <button class="layer-btn danger" data-lay="del" title="Eliminar">×</button>
            </span>`;
        item.addEventListener('click', (e) => {
            const action = e.target.closest('[data-lay]');
            if (action) {
                e.stopPropagation();
                const lay = action.dataset.lay;
                if (lay === 'up') bringLayer(obj, 1);
                else if (lay === 'down') bringLayer(obj, -1);
                else if (lay === 'del') { canvas.remove(obj); }
                return;
            }
            canvas.setActiveObject(obj);
            canvas.renderAll();
            updatePropertiesPanel();
            renderLayers();
        });
        list.appendChild(item);
    }
}

function layerIcon(type) {
    const icons = {
        image: '🖼',
        textbox: 'T',
        'i-text': 'T',
        text: 'T',
        rect: '▭',
        circle: '◯',
        ellipse: '⬭',
        triangle: '△',
        line: '╱',
        polygon: '⬠'
    };
    return icons[type] || '•';
}

function layerLabel(obj) {
    if (obj.type === 'image') return obj.alt || obj.src ? 'Imagen' : 'Imagen';
    if (obj.text) return obj.text.trim().slice(0, 18) || 'Texto';
    return (obj.type || 'objeto').charAt(0).toUpperCase() + (obj.type || 'objeto').slice(1);
}

function bringLayer(obj, dir) {
    if (dir > 0) {
        obj.bringForward();
    } else {
        obj.sendBackwards();
    }
    canvas.renderAll();
    renderLayers();
    pushUndo();
    scheduleSave();
}

function openPageMenu(item, page) {
    closeContextMenu();
    const menu = buildContextMenu([
        { label: 'Renombrar', icon: '✎', action: () => renamePage(page) },
        { label: 'Duplicar', icon: '⧉', action: () => duplicatePage(page) },
        { label: 'Eliminar', icon: '🗑', danger: true, action: () => deletePage(page.id) }
    ]);
    positionContextMenu(item, menu);
}

async function renamePage(page) {
    const newName = prompt('Nuevo nombre de la página:', page.name || `Página ${page.page_number}`);
    if (newName === null) return;
    const name = newName.trim() || `Página ${page.page_number}`;
    try {
        await api.updatePage(page.id, { name });
        page.name = name;
        renderPageList();
    } catch (err) {
        alert('Error al renombrar: ' + err.message);
    }
}

async function duplicatePage(page) {
    try {
        // duplicate elements
        const elements = await api.getElements(page.id);
        const baseName = (page.name && page.name.trim()) ? page.name : `Página ${page.page_number}`;
        const newName = uniquePageName(baseName);
        const newPage = await api.createPage(currentMagazineId, { name: newName });
        for (const el of elements) {
            await api.createElement(newPage.id, {
                type: el.type,
                x: el.x, y: el.y,
                width: el.width, height: el.height,
                rotation: el.rotation, z_index: el.z_index,
                content: el.content,
                style: el.style
            });
        }
        pages = await api.getPages(currentMagazineId);
        renderPageList();
        await selectPage(newPage.id);
    } catch (err) {
        alert('Error al duplicar: ' + err.message);
    }
}

function uniquePageName(name) {
    const used = new Set(pages.map(p => p.name));
    if (!used.has(name)) return name;
    let i = 1;
    while (used.has(`${name} - ${i}`)) i++;
    return `${name} - ${i}`;
}

async function addPage() {
    try {
        const nextNum = pages.length + 1;
        const std = getPageStd();
        const page = await api.createPage(currentMagazineId, { name: `Página ${nextNum}` });
        if (std) {
            await api.updatePage(page.id, { width: std.w, height: std.h });
            page.width = std.w;
            page.height = std.h;
        }
        pages.push(page);
        renderPageList();
        await selectPage(page.id);
    } catch (err) {
        console.error(err);
    }
}

async function selectPage(pageId) {
    await saveAllElements();
    currentPageId = pageId;
    canvas.clear();

    const page = pages.find(p => p.id === pageId);
    if (page) {
        canvas.setWidth(page.width || 600);
        canvas.setHeight(page.height || 850);
        canvas.backgroundColor = page.background_color || '#ffffff';
    }
    syncBgPicker(canvas.backgroundColor || '#ffffff');

    try {
        const elements = await api.getElements(pageId);
        for (const el of elements) {
            await loadElementOnCanvas(el);
        }
    } catch (err) {
        console.error(err);
    }

    canvas.renderAll();
    renderPageList();
    renderLayers();
    clearPropertiesPanel();
}

async function loadElementOnCanvas(el) {
    const style = typeof el.style === 'string' ? JSON.parse(el.style || '{}') : (el.style || {});

    if (el.type === 'text') {
        const text = new fabric.Textbox(el.content || 'Texto', {
            left: el.x,
            top: el.y,
            fontSize: style.fontSize || 24,
            fill: style.fill || '#000000',
            fontFamily: style.fontFamily || 'Arial',
            fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal',
            textAlign: style.textAlign || 'left',
            lineHeight: style.lineHeight || 1.16,
            width: el.width || 200,
            editable: true
        });
        text.elementId = el.id;
        canvas.add(text);
    } else if (el.type === 'rect') {
        const rect = new fabric.Rect({
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            fill: style.fill || 'rgba(233,30,99,0.3)',
            stroke: style.stroke || '#e91e63',
            strokeWidth: style.strokeWidth || 2,
            angle: el.rotation || 0
        });
        rect.elementId = el.id;
        canvas.add(rect);
    } else if (el.type === 'circle') {
        const circle = new fabric.Circle({
            left: el.x,
            top: el.y,
            radius: el.width / 2,
            fill: style.fill || 'rgba(233,30,99,0.3)',
            stroke: style.stroke || '#e91e63',
            strokeWidth: style.strokeWidth || 2,
            angle: el.rotation || 0
        });
        circle.elementId = el.id;
        canvas.add(circle);
    } else if (el.type === 'ellipse') {
        const ellipse = new fabric.Ellipse({
            left: el.x,
            top: el.y,
            rx: el.width / 2,
            ry: el.height / 2,
            fill: style.fill || 'rgba(233,30,99,0.3)',
            stroke: style.stroke || '#e91e63',
            strokeWidth: style.strokeWidth || 2,
            angle: el.rotation || 0
        });
        ellipse.elementId = el.id;
        canvas.add(ellipse);
    } else if (el.type === 'triangle') {
        const triangle = new fabric.Triangle({
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            fill: style.fill || 'rgba(233,30,99,0.3)',
            stroke: style.stroke || '#e91e63',
            strokeWidth: style.strokeWidth || 2,
            angle: el.rotation || 0
        });
        triangle.elementId = el.id;
        canvas.add(triangle);
    } else if (el.type === 'line') {
        const line = new fabric.Line([el.x, el.y, el.x + el.width, el.y + el.height], {
            stroke: style.stroke || style.fill || '#e91e63',
            strokeWidth: style.strokeWidth || 3,
            angle: el.rotation || 0
        });
        line.elementId = el.id;
        canvas.add(line);
    } else if (el.type === 'polygon' || el.type === 'poly') {
        const points = [
            { x: 0, y: 0 }, { x: el.width / 2, y: el.height / 4 },
            { x: el.width * 0.75, y: el.height / 2 }, { x: el.width / 2, y: el.height * 0.75 },
            { x: 0, y: el.height }
        ];
        const poly = new fabric.Polygon(points, {
            left: el.x,
            top: el.y,
            fill: style.fill || 'rgba(233,30,99,0.3)',
            stroke: style.stroke || '#e91e63',
            strokeWidth: style.strokeWidth || 2,
            angle: el.rotation || 0
        });
        poly.elementId = el.id;
        canvas.add(poly);
    } else if (el.type === 'image' && style.src) {
        return new Promise((resolve) => {
            const imgEl = new Image();
            imgEl.crossOrigin = 'anonymous';
            imgEl.onload = () => {
                const img = new fabric.Image(imgEl, {
                    left: el.x,
                    top: el.y,
                    scaleX: style.scaleX || 1,
                    scaleY: style.scaleY || 1,
                    angle: el.rotation || 0,
                    opacity: style.opacity || 1
                });
                img.set({ src: style.src });
                img.elementId = el.id;
                canvas.add(img);
                resolve();
            };
            imgEl.onerror = () => resolve();
            imgEl.src = style.src;
        });
    }
}

async function deletePage(pageId) {
    if (pages.length <= 1) {
        alert('No puedes eliminar la última página');
        return;
    }
    if (!confirm('¿Eliminar esta página?')) return;
    try {
        await api.deletePage(pageId);
        pages = pages.filter(p => p.id !== pageId);
        renderPageList();
        if (currentPageId === pageId && pages.length > 0) {
            await selectPage(pages[0].id);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadImageGallery() {
    try {
        const images = await api.getImages();
        const gallery = document.getElementById('imageGallery');
        gallery.innerHTML = '';
        galleryImageSizes = [];
        if (images.length === 0) {
            gallery.innerHTML = '<p class="hint" style="grid-column:span 2">Sin imágenes. Sube algunas.</p>';
            return;
        }
        images.forEach(img => {
            const wrapper = document.createElement('div');
            wrapper.className = 'image-thumb';
            wrapper.innerHTML = `
                <img src="/uploads/${img.filename}" alt="${escapeHtml(img.original_name)}">
                <button class="thumb-delete" title="Eliminar imagen">×</button>`;
            const thumb = wrapper.querySelector('img');
            thumb.addEventListener('load', () => {
                if (thumb.naturalWidth > 0) {
                    galleryImageSizes.push({ width: thumb.naturalWidth, height: thumb.naturalHeight });
                }
            });
            wrapper.addEventListener('click', (e) => {
                if (e.target.classList.contains('thumb-delete')) return;
                addImageFromURL(`/uploads/${img.filename}`);
            });
            wrapper.querySelector('.thumb-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`¿Eliminar "${img.original_name}"?`)) return;
                try {
                    await api.deleteImage(img.id);
                    await loadImageGallery();
                } catch (err) {
                    alert('Error: ' + err.message);
                }
            });
            gallery.appendChild(wrapper);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadTemplates() {
    try {
        const templates = await api.getTemplates();
        const list = document.getElementById('templateList');
        list.innerHTML = '';
        if (templates.length === 0) {
            list.innerHTML = '<p class="hint">Sin plantillas. Guarda una.</p>';
            return;
        }
        templates.forEach(t => {
            const div = document.createElement('div');
            div.className = 'template-item';
            div.innerHTML = `<span>${t.name}</span>
                <button class="template-delete" title="Eliminar plantilla" onclick="event.stopPropagation();deleteTemplate('${t.id}')">×</button>`;
            div.addEventListener('click', () => applyTemplate(t));
            list.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function deleteTemplate(id) {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
        await api.deleteTemplate(id);
        await loadTemplates();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function applyTemplate(template) {
    try {
        const data = typeof template.data === 'string' ? JSON.parse(template.data) : template.data;
        if (data.objects) {
            canvas.clear();
            canvas.loadFromJSON({ objects: data.objects }, () => canvas.renderAll());
        }
    } catch (err) {
        console.error(err);
    }
}

function askExportName() {
    return new Promise(resolve => {
        const modal = document.getElementById('exportModal');
        const input = document.getElementById('exportNameInput');
        const remember = document.getElementById('rememberExportName');
        const dpiSel = document.getElementById('exportDpiSel');
        const confirmBtn = document.getElementById('exportConfirmBtn');
        const cancelBtn = document.getElementById('exportCancelBtn');

        const wasRemembering = localStorage.getItem('revista_export_remember') !== '0';
        remember.checked = wasRemembering;
        input.value = localStorage.getItem('revista_export_name') || (getMagazineTitle() + '.pdf');
        dpiSel.value = String(getStoredDpi());

        modal.classList.remove('hidden');
        setTimeout(() => input.select(), 10);

        const done = (result) => {
            modal.classList.add('hidden');
            document.removeEventListener('keydown', onKey);
            resolve(result);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') done(null);
            if (e.key === 'Enter') confirmBtn.click();
        };

        confirmBtn.onclick = () => {
            let name = input.value.trim();
            if (!name) name = getMagazineTitle() + '.pdf';
            if (remember.checked) {
                localStorage.setItem('revista_export_name', name);
                localStorage.setItem('revista_export_remember', '1');
            } else {
                localStorage.removeItem('revista_export_name');
                localStorage.setItem('revista_export_remember', '0');
            }
            done({ name, dpi: parseInt(dpiSel.value) || getStoredDpi() });
        };
        cancelBtn.onclick = () => done(null);

        document.addEventListener('keydown', onKey);
    });
}

async function exportPdf() {
    const ask = await askExportName();
    if (!ask) return;

    const btn = document.getElementById('exportPdfBtn');
    btn.disabled = true;
    btn.textContent = 'Generando...';
    try {
        await saveAllElements();

        const { jsPDF } = window.jspdf;
        const dpi = ask.dpi;
        const multiplier = Math.min(3, Math.max(2, dpi / 72));

        const pagesData = await api.getPages(currentMagazineId);
        if (pagesData.length === 0) {
            pagesData.push({
                id: currentPageId,
                width: canvas.width || 800,
                height: canvas.height || 1100
            });
        }

        let pdf = null;
        for (let i = 0; i < pagesData.length; i++) {
            const p = pagesData[i];
            const wpx = p.width || canvas.width || 800;
            const hpx = p.height || canvas.height || 1100;
            const wmm = +(wpx * 25.4 / dpi).toFixed(2);
            const hmm = +(hpx * 25.4 / dpi).toFixed(2);
            const orient = wpx > hpx ? 'l' : 'p';

            if (i === 0) {
                pdf = new jsPDF({ orientation: orient, unit: 'mm', format: [wmm, hmm] });
            } else {
                pdf.addPage([wmm, hmm], orient);
            }

            if (p.id !== currentPageId) {
                await selectPageInternal(p.id);
            }

            const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.92, multiplier });
            pdf.addImage(dataUrl, 'JPEG', 0, 0, wmm, hmm, undefined, 'FAST');
        }

        const clean = (ask.name || getMagazineTitle() + '.pdf').replace(/\.pdf$/i, '');
        pdf.save(clean + '.pdf');
    } catch (err) {
        console.error('Error exporting PDF:', err);
        alert('Error al exportar PDF: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Exportar PDF';
    }
}

function getMagazineTitle() {
    const el = document.getElementById('magazineTitle');
    return (el && el.textContent.trim()) || 'revista';
}

async function selectPageInternal(pageId) {
    await saveAllElements();
    currentPageId = pageId;
    canvas.clear();
    const page = pages.find(p => p.id === pageId);
    if (page) {
        canvas.setWidth(page.width || 800);
        canvas.setHeight(page.height || 1100);
        canvas.backgroundColor = page.background_color || '#ffffff';
    } else {
        canvas.backgroundColor = '#ffffff';
    }
    const elements = await api.getElements(pageId);
    for (const el of elements) {
        await loadElementOnCanvas(el);
    }
    canvas.renderAll();
}

document.getElementById('saveTemplateBtn')?.addEventListener('click', async () => {
    const name = prompt('Nombre de la plantilla:');
    if (!name) return;
    try {
        await saveAllElements();
        const data = JSON.stringify(canvas.toJSON(['elementId']));
        await api.createTemplate({ name, description: '', data: JSON.parse(data), is_public: false });
        await loadTemplates();
    } catch (err) {
        console.error(err);
    }
});
