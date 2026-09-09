document.addEventListener('DOMContentLoaded', async () => {
    if (!api.token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const me = await api.me();
        document.getElementById('homeUserName').textContent = me.name;
        document.getElementById('homeAvatar').textContent = (me.name || '?').trim().charAt(0).toUpperCase();
    } catch {
        api.clearToken();
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        api.clearToken();
        window.location.href = 'index.html';
    });

    const openEditor = (id) => { window.location.href = `editor.html?id=${id}`; };

    const newProject = async () => {
        const title = prompt('Nombre del proyecto:');
        if (!title || !title.trim()) return;
        try {
            const m = await api.createMagazine(title.trim(), '');
            openEditor(m.id);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    document.getElementById('newProjectBtn').addEventListener('click', newProject);
    document.getElementById('emptyNewBtn').addEventListener('click', newProject);

    await loadProjects(openEditor, newProject);
});

async function loadProjects(openEditor, newProject) {
    const grid = document.getElementById('projectsGrid');
    const empty = document.getElementById('homeEmpty');
    grid.innerHTML = '';

    try {
        const [magazines, images] = await Promise.all([api.getMagazines(), api.getImages()]);
        const imageUrl = {};
        images.forEach(img => { imageUrl[img.id] = `/uploads/${img.filename}`; });

        if (magazines.length === 0) {
            empty.classList.remove('hidden');
            grid.classList.add('hidden');
            return;
        }

        empty.classList.add('hidden');
        grid.classList.remove('hidden');

        const tile = document.createElement('div');
        tile.className = 'new-project-tile';
        tile.innerHTML = '<div class="plus">+</div><span>Nuevo proyecto</span>';
        tile.addEventListener('click', newProject);
        grid.appendChild(tile);

        magazines.forEach(m => {
            const card = document.createElement('div');
            card.className = 'project-card';

            const cover = imageUrl[m.cover_image_id]
                ? `<img src="${imageUrl[m.cover_image_id]}" alt="">`
                : '<div class="placeholder">📰</div>';

            const date = new Date(m.updated_at || m.created_at);
            const dateStr = date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

            card.innerHTML = `
                <div class="project-cover">${cover}</div>
                <div class="project-info">
                    <div class="project-title"></div>
                    <div class="project-meta">Editado ${dateStr}</div>
                </div>
                <div class="project-actions">
                    <button class="rename" title="Renombrar">✎</button>
                    <button class="delete" title="Eliminar">×</button>
                </div>`;

            card.querySelector('.project-title').textContent = m.title;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.project-actions')) return;
                openEditor(m.id);
            });

            card.querySelector('.rename').addEventListener('click', async (e) => {
                e.stopPropagation();
                const title = prompt('Nuevo nombre:', m.title);
                if (!title || !title.trim()) return;
                try {
                    await api.updateMagazine(m.id, { title: title.trim(), description: m.description });
                    e.target.closest('.project-card').querySelector('.project-title').textContent = title.trim();
                } catch (err) {
                    alert('Error: ' + err.message);
                }
            });

            card.querySelector('.delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(`¿Eliminar "${m.title}"? No se puede deshacer.`)) return;
                try {
                    await api.deleteMagazine(m.id);
                    await loadProjects(openEditor);
                } catch (err) {
                    alert('Error: ' + err.message);
                }
            });

            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading projects:', err);
        grid.innerHTML = '<p class="home-empty">Error cargando proyectos.</p>';
    }
}