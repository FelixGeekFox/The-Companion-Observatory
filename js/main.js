/*
  Ambient interactions for The Companion Observatory.
  Kept dependency-free for GitHub Pages.
*/

(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setYear = () => {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  };

  const initReveals = () => {
    const revealEls = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  };

  const initSky = () => {
    const canvas = document.getElementById('sky-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const pointer = { x: 0, y: 0 };
    let width = 0;
    let height = 0;
    let stars = [];
    let particles = [];
    let shootingStars = [];
    let lastShot = 0;
    let rafId = 0;

    const random = (min, max) => Math.random() * (max - min) + min;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const starCount = prefersReducedMotion ? 80 : Math.floor((width * height) / 5600);
      const particleCount = prefersReducedMotion ? 0 : Math.floor((width * height) / 24000);

      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: random(0.45, 1.55),
        alpha: random(0.25, 0.95),
        pulse: random(0.002, 0.009),
        phase: random(0, Math.PI * 2),
        tint: Math.random() > 0.78 ? 'blue' : Math.random() > 0.62 ? 'gold' : 'ivory'
      }));

      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: random(0.7, 2.0),
        vx: random(-0.025, 0.025),
        vy: random(-0.018, 0.035),
        alpha: random(0.08, 0.24)
      }));
    };

    const colorForStar = (tint, alpha) => {
      if (tint === 'blue') return `rgba(124, 183, 232, ${alpha})`;
      if (tint === 'gold') return `rgba(216, 183, 106, ${alpha})`;
      return `rgba(245, 241, 232, ${alpha})`;
    };

    const spawnShootingStar = (time) => {
      if (prefersReducedMotion) return;
      if (time - lastShot < random(5200, 9800)) return;
      lastShot = time;

      shootingStars.push({
        x: random(width * 0.15, width * 0.85),
        y: random(height * 0.05, height * 0.36),
        vx: random(7.5, 10.5),
        vy: random(3.2, 4.7),
        life: 0,
        maxLife: random(44, 70),
        length: random(110, 180)
      });
    };

    const drawNebula = () => {
      const gradient = ctx.createRadialGradient(width * 0.5, height * 0.18, 0, width * 0.5, height * 0.18, height * 0.72);
      gradient.addColorStop(0, 'rgba(124, 183, 232, 0.10)');
      gradient.addColorStop(0.42, 'rgba(183, 184, 255, 0.045)');
      gradient.addColorStop(1, 'rgba(6, 10, 18, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const animate = (time = 0) => {
      ctx.clearRect(0, 0, width, height);
      drawNebula();

      const driftX = pointer.x * 10;
      const driftY = pointer.y * 6;

      stars.forEach((star) => {
        const pulse = Math.sin(time * star.pulse + star.phase) * 0.22;
        const alpha = Math.max(0.08, star.alpha + pulse);
        ctx.beginPath();
        ctx.fillStyle = colorForStar(star.tint, alpha);
        ctx.arc(star.x + driftX * star.r * 0.08, star.y + driftY * star.r * 0.08, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y > height + 10) particle.y = -10;

        ctx.beginPath();
        ctx.fillStyle = `rgba(216, 183, 106, ${particle.alpha})`;
        ctx.arc(particle.x + driftX * 0.22, particle.y + driftY * 0.22, particle.r, 0, Math.PI * 2);
        ctx.fill();
      });

      spawnShootingStar(time);

      shootingStars = shootingStars.filter((shot) => {
        shot.x += shot.vx;
        shot.y += shot.vy;
        shot.life += 1;

        const progress = shot.life / shot.maxLife;
        const alpha = Math.sin(progress * Math.PI) * 0.85;
        const tailX = shot.x - shot.length;
        const tailY = shot.y - shot.length * 0.42;
        const gradient = ctx.createLinearGradient(tailX, tailY, shot.x, shot.y);
        gradient.addColorStop(0, 'rgba(216, 183, 106, 0)');
        gradient.addColorStop(0.7, `rgba(216, 183, 106, ${alpha * 0.44})`);
        gradient.addColorStop(1, `rgba(245, 241, 232, ${alpha})`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(shot.x, shot.y);
        ctx.stroke();

        return shot.life < shot.maxLife && shot.x < width + shot.length && shot.y < height + shot.length;
      });

      rafId = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event) => {
      pointer.x = (event.clientX / Math.max(width, 1) - 0.5);
      pointer.y = (event.clientY / Math.max(height, 1) - 0.5);
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    resize();
    animate();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.cancelAnimationFrame(rafId);
      } else {
        animate();
      }
    });
  };

  setYear();
  initReveals();
  initSky();
})();
