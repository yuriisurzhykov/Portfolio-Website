// Theme toggle
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
const key = 'yurii.theme';
const saved = localStorage.getItem(key);
if (saved) root.setAttribute('data-theme', saved);
toggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem(key, next);
});

// On-scroll reveal
const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
        }
    });
}, {threshold: .12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Year
document.getElementById('year').textContent = new Date().getFullYear();
