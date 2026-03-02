/* ============================================================
   PORTFOLIO — Benyahia Amir
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

    // ==================== MOBILE MENU ====================
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('open');
    });

    // Close menu on link click
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });

    // ==================== NAVBAR SCROLL ====================
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('.section');
    const navLinkElements = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        // Navbar background
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Active nav link
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            if (window.scrollY >= sectionTop) {
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

    // ==================== REVEAL ON SCROLL ====================
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.getAttribute('data-delay') || 0;
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, parseInt(delay));
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => revealObserver.observe(el));

    // ==================== SKILL BARS ====================
    const skillBars = document.querySelectorAll('.skill-progress');
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const width = entry.target.getAttribute('data-width');
                entry.target.style.setProperty('--progress', `${width}%`);
                entry.target.classList.add('animated');
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    skillBars.forEach(bar => skillObserver.observe(bar));

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
        const target = parseInt(el.getAttribute('data-count'));
        const duration = 1500;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            el.textContent = Math.round(target * eased);
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ==================== TYPED EFFECT ====================
    const typedEl = document.getElementById('typed-text');
    const phrases = [
        'Étudiant en Master 1 Informatique',
        'Développeur Full-Stack',
        'Passionné de Web & Software Engineering',
        'Université Côte d\'Azur — DS4H'
    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    // Add cursor
    const cursor = document.createElement('span');
    cursor.classList.add('cursor');
    typedEl.appendChild(cursor);

    function typeEffect() {
        const currentPhrase = phrases[phraseIndex];
        const textNode = typedEl.childNodes[0] || document.createTextNode('');
        if (!typedEl.childNodes[0]) typedEl.insertBefore(textNode, cursor);

        if (!isDeleting) {
            charIndex++;
            textNode.textContent = currentPhrase.substring(0, charIndex);
            if (charIndex === currentPhrase.length) {
                isDeleting = true;
                setTimeout(typeEffect, 2000);
                return;
            }
            setTimeout(typeEffect, 60);
        } else {
            charIndex--;
            textNode.textContent = currentPhrase.substring(0, charIndex);
            if (charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                setTimeout(typeEffect, 400);
                return;
            }
            setTimeout(typeEffect, 30);
        }
    }

    typeEffect();

    // ==================== GITHUB PROJECTS ====================
    const projectsGrid = document.getElementById('projects-grid');
    const loader = document.getElementById('projects-loader');

    const projectDescriptions = {
        'Projet-Web-Sampler-Benyahia-Kadri': 'Application web full-stack de Sampler musical développée en collaboration. Interface interactive avec TypeScript/JavaScript, HTML et CSS. Déployée sur Render.',
        'TER_S1_N': 'Projet de recherche (Travail d\'Étude et de Recherche) combinant JavaScript et Python. Application full-stack avec Docker pour le déploiement. Déployée sur Render.',
        'Sampler-Benyahia-Amir': 'Application de sampler audio construite en JavaScript. Permet la création et manipulation de sons avec une interface web intuitive.',
        'Software-Engenering-Project': 'Projet d\'ingénierie logicielle en Python, mettant en pratique les principes de conception et les bonnes pratiques de développement.',
        'aima-embedding': 'Projet d\'Intelligence Artificielle explorant les techniques d\'embedding et de représentation vectorielle. Développé en Python dans le cadre d\'un travail collaboratif.',
        'Projet-Computability': 'Projet académique sur la théorie de la calculabilité et de la complexité. Exploration des fondements théoriques de l\'informatique.'
    };

    // Extra projects not under Amir's GitHub account or private repos
    const extraProjects = [
        {
            name: 'aima-embedding',
            html_url: 'https://github.com/Oussama-belhout/aima-embedding',
            homepage: null,
            languages: { 'Python': 55355 },
            stargazers_count: 0,
            description: null
        },
        {
            name: 'Projet-Computability',
            html_url: 'https://github.com/Amir-Benyahia/Projet-Computability',
            homepage: null,
            languages: { 'Python': 1 },
            stargazers_count: 0,
            description: null
        }
    ];

    async function fetchProjects() {
        try {
            const response = await fetch('https://api.github.com/users/Amir-Benyahia/repos?sort=updated&per_page=10');
            if (!response.ok) throw new Error('GitHub API error');
            const repos = response.ok ? await response.json() : [];

            // Fetch languages for each repo
            const reposWithLangs = await Promise.all(repos.map(async (repo) => {
                try {
                    const langResponse = await fetch(repo.languages_url);
                    const languages = langResponse.ok ? await langResponse.json() : {};
                    return { ...repo, languages };
                } catch {
                    return { ...repo, languages: {} };
                }
            }));

            // Append extra projects
            const allRepos = [...reposWithLangs, ...extraProjects];
            renderProjects(allRepos);
        } catch (err) {
            console.error('Error fetching repos:', err);
            loader.innerHTML = '<p>Impossible de charger les projets. <a href="https://github.com/Amir-Benyahia" target="_blank" style="color: #8b5cf6;">Voir sur GitHub →</a></p>';
        }
    }

    function getLanguageColor(lang) {
        const colors = {
            'JavaScript': '#f1e05a',
            'TypeScript': '#3178c6',
            'Python': '#3572A5',
            'HTML': '#e34c26',
            'CSS': '#563d7c',
            'Dockerfile': '#384d54',
        };
        return colors[lang] || '#8b5cf6';
    }

    function formatRepoName(name) {
        return name
            .replace(/-/g, ' ')
            .replace(/Benyahia|Kadri|Amir/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function renderProjects(repos) {
        loader.remove();

        repos.forEach(repo => {
            const topLangs = Object.entries(repo.languages).slice(0, 3);
            const description = projectDescriptions[repo.name] || repo.description || 'Projet développé dans le cadre de mes études en informatique.';
            const displayName = formatRepoName(repo.name) || repo.name;

            const card = document.createElement('article');
            card.className = 'project-card';
            card.innerHTML = `
                <div class="project-header">
                    <div class="project-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
                    </div>
                    <div class="project-links">
                        <a href="${repo.html_url}" target="_blank" rel="noopener" aria-label="Code source" title="Code source">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        </a>
                        ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" aria-label="Démo live" title="Démo live">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                        </a>` : ''}
                    </div>
                </div>
                <h3>${displayName}</h3>
                <p class="project-description">${description}</p>
                <div class="project-meta">
                    ${topLangs.map(([lang]) => `
                        <span class="project-lang">
                            <span class="lang-dot" style="background-color: ${getLanguageColor(lang)}"></span>
                            ${lang}
                        </span>
                    `).join('')}
                    <span class="project-stat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ${repo.stargazers_count}
                    </span>
                </div>
            `;

            projectsGrid.appendChild(card);
        });
    }

    fetchProjects();

    // ==================== CONTACT FORM ====================
    const contactForm = document.getElementById('contact-form');
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('.btn-submit');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span>Message envoye !</span>';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            contactForm.reset();
        }, 3000);
    });

    // ==================== PARTICLE BACKGROUND ====================
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.4 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > canvas.width ||
                this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }

        draw() {
            const theme = html.getAttribute('data-theme');
            const color = theme === 'dark' ? '255, 255, 255' : '100, 100, 130';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color}, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 80);
        particles = Array.from({ length: count }, () => new Particle());
    }

    function drawConnections() {
        const theme = html.getAttribute('data-theme');
        const color = theme === 'dark' ? '139, 92, 246' : '99, 102, 241';
        const maxDist = 120;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < maxDist) {
                    const opacity = (1 - dist / maxDist) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${color}, ${opacity})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        drawConnections();
        animId = requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();

    // Pause particles when hero is out of view
    const heroSection = document.getElementById('hero');
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animId) animateParticles();
            } else {
                cancelAnimationFrame(animId);
                animId = null;
            }
        });
    }, { threshold: 0 });

    heroObserver.observe(heroSection);
});
