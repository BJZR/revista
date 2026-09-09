const API_BASE = '/api';

const api = {
    token: localStorage.getItem('token'),

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    },

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    },

    async request(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

        const opts = { method, headers };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`${API_BASE}${path}`, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    async upload(file) {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(`${API_BASE}/images/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
    },

    async uploadFonts(files) {
        const formData = new FormData();
        for (const f of files) formData.append('fontFiles', f);

        const res = await fetch(`${API_BASE}/fonts/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
    },

    // Auth
    login: (email, password) => api.request('POST', '/auth/login', { email, password }),
    register: (name, email, password) => api.request('POST', '/auth/register', { name, email, password }),
    me: () => api.request('GET', '/auth/me'),

    // Magazines
    getMagazines: () => api.request('GET', '/magazines'),
    createMagazine: (title, description) => api.request('POST', '/magazines', { title, description }),
    getMagazine: (id) => api.request('GET', `/magazines/${id}`),
    updateMagazine: (id, data) => api.request('PUT', `/magazines/${id}`, data),
    deleteMagazine: (id) => api.request('DELETE', `/magazines/${id}`),
    setCover: (id, imageId) => api.request('PUT', `/magazines/${id}/cover`, { image_id: imageId }),

    // Pages
    getPages: (magazineId) => api.request('GET', `/magazines/${magazineId}/pages`),
    createPage: (magazineId, data = {}) => api.request('POST', `/magazines/${magazineId}/pages`, data),
    updatePage: (pageId, data) => api.request('PUT', `/pages/${pageId}`, data),
    deletePage: (pageId) => api.request('DELETE', `/pages/${pageId}`),
    reorderPages: (magazineId, pageIds) => api.request('PUT', `/magazines/${magazineId}/pages/reorder`, { page_ids: pageIds }),

    // Elements
    getElements: (pageId) => api.request('GET', `/pages/${pageId}/elements`),
    createElement: (pageId, data) => api.request('POST', `/pages/${pageId}/elements`, data),
    updateElement: (elementId, data) => api.request('PUT', `/elements/${elementId}`, data),
    deleteElement: (elementId) => api.request('DELETE', `/elements/${elementId}`),

    // Images
    getImages: () => api.request('GET', '/images'),
    deleteImage: (id) => api.request('DELETE', `/images/${id}`),

    // Templates
    getTemplates: () => api.request('GET', '/templates'),
    createTemplate: (data) => api.request('POST', '/templates', data),
    getTemplate: (id) => api.request('GET', `/templates/${id}`),
    deleteTemplate: (id) => api.request('DELETE', `/templates/${id}`),

    // Fonts
    getFonts: () => api.request('GET', '/fonts'),
    deleteFont: (id) => api.request('DELETE', `/fonts/${id}`),
};
