/* ============================================================
   PORTFOLIO — Amir Benyahia
   JavaScript — Interactivity & GitHub API
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ==================== THEME TOGGLE ====================
    const html = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('portfolio-theme') || 'dark';

    html.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('portfolio-theme', next);
    });

    // ==================== NAVBAR SCROLL ====================
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('.section');
    const navLinkElements = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 100;
            if (window.scrollY >= top) {
                current = section.getAttribute('id');
            }
        });

        navLinkElements.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // ==================== MOBILE MENU ====================
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });

    // ==================== REVEAL ON SCROLL ====================
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => revealObserver.observe(el));

    // ==================== STAT COUNTERS ====================
    const statNumbers = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(stat => statsObserver.observe(stat));

    function animateCounter(el) {
        const target = parseInt(el.dataset.count);
        const duration = 1500;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            el.textContent = Math.round(target * eased);
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ==================== GITHUB PROJECTS ====================
    const projectsGrid = document.getElementById('projects-grid');

    const projectDescriptions = {
        'Projet-Web-Sampler-Benyahia-Kadri': {
            description: 'Station de création musicale complète : séquenceur, presets audio, visualisation d\'ondes et effets en temps réel. API REST Node.js.',
            category: 'web'
        },
        'Portfolio-Amir': {
            description: 'Ce portfolio minimaliste conçu pour mettre en avant l\'expérience utilisateur et le contenu. HTML/CSS/JS vanilla.',
            category: 'web'
        },
        'aima-embedding': {
            description: 'Recherche en IA sur les techniques d\'embedding et la représentation vectorielle. Développement en Python.',
            category: 'ia'
        },
        'Projet-Computability': {
            description: 'Exploration théorique des fondements de l\'informatique, calculabilité et complexité algorithmique.',
            category: 'theory'
        }
    };

    const extraProjects = [
        {
            name: 'FluxStock',
            html_url: 'https://github.com/Amir-Benyahia/FluxStock',
            homepage: null,
            languages: { 'React': 1, 'Python': 1 },
            stargazers_count: 0,
            description: 'Dashboard SaaS de gestion de stock : scan de codes-barres, Stripe integration, prévision de ruptures via Data Science.',
            category: 'web'
        },
        {
            name: 'Pac-Man IA',
            html_url: null,
            homepage: null,
            languages: { 'JavaScript': 1, 'Python': 1 },
            stargazers_count: 0,
            description: 'Plateforme de simulation pour évaluer des stratégies d\'IA (Minimax, A*). Pont temps-réel entre moteur Python et vue JS.',
            category: 'ia'
        }
    ];

    async function fetchProjects() {
        try {
            const res = await fetch('https://api.github.com/users/Amir-Benyahia/repos?sort=updated&per_page=20');
            if (!res.ok) throw new Error();
            const repos = await res.json();

            const filtered = repos.filter(repo =>
                !repo.fork && repo.name !== '.github' && repo.name !== 'Amir-Benyahia'
            );

            const withLanguages = await Promise.all(filtered.map(async repo => {
                try {
                    const lRes = await fetch(repo.languages_url);
                    return { ...repo, languages: await lRes.json() };
                } catch {
                    return { ...repo, languages: {} };
                }
            }));

            renderProjects([...withLanguages, ...extraProjects]);
        } catch {
            projectsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--tx3);">Chargement des projets via API GitHub...</p>';
            renderProjects(extraProjects);
        }
    }

    function getLanguageColor(lang) {
        const colors = {
            'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5',
            'HTML': '#e34c26', 'CSS': '#563d7c', 'React': '#61dafb'
        };
        return colors[lang] || 'var(--accent)';
    }

    function renderProjects(repos) {
        projectsGrid.innerHTML = '';
        repos.forEach(repo => {
            const desc = projectDescriptions[repo.name];
            const description = desc?.description || repo.description || '';
            const category = desc?.category || repo.category || 'web';
            const langs = repo.languages ? Object.keys(repo.languages) : [];
            const mainLang = langs[0] || 'Code';

            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.category = category;

            card.innerHTML = `
                <div class="project-header">
                    <div class="project-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div class="project-links">
                        ${repo.html_url ? `<a href="${repo.html_url}" target="_blank" rel="noopener" aria-label="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>` : ''}
                        ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" aria-label="Live"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>` : ''}
                    </div>
                </div>
                <h3>${repo.name.replace(/-/g, ' ')}</h3>
                <p class="project-description">${description}</p>
                <div class="project-meta">
                    <span class="project-lang">
                        <span class="lang-dot" style="background-color: ${getLanguageColor(mainLang)}"></span>
                        ${mainLang}
                    </span>
                </div>
            `;
            projectsGrid.appendChild(card);
        });
    }

    fetchProjects();

    // ==================== FILTERS ====================
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            document.querySelectorAll('.project-card').forEach(c => {
                c.classList.toggle('filter-hidden', f !== 'all' && c.dataset.category !== f);
            });
        });
    });

    // ==================== CONTACT ====================
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('.btn-submit');
            const original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>Envoi...</span>';

            try {
                const res = await fetch('https://formspree.io/f/meelbedz', {
                    method: 'POST', body: new FormData(contactForm), headers: { 'Accept': 'application/json' }
                });
                if (res.ok) {
                    btn.innerHTML = '<span>✓ Envoyé</span>';
                    contactForm.reset();
                } else { throw new Error(); }
            } catch {
                btn.innerHTML = '<span>Erreur</span>';
            }
            setTimeout(() => { btn.disabled = false; btn.innerHTML = original; }, 3000);
        });
    }
});
