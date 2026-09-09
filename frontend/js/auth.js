document.addEventListener('DOMContentLoaded', () => {
    if (api.token) {
        window.location.href = 'home.html';
        return;
    }

    const tabs = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorDiv = document.getElementById('authError');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            } else {
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            }
            errorDiv.classList.add('hidden');
        });
    });

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await api.login(
                document.getElementById('loginEmail').value,
                document.getElementById('loginPassword').value
            );
            api.setToken(data.token);
            window.location.href = 'home.html';
        } catch (err) {
            showError(err.message);
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await api.register(
                document.getElementById('registerName').value,
                document.getElementById('registerEmail').value,
                document.getElementById('registerPassword').value
            );
            api.setToken(data.token);
            window.location.href = 'home.html';
        } catch (err) {
            showError(err.message);
        }
    });
});
