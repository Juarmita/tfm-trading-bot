/* ==========================================================================
   TFM Trading Bot - Slide Deck Interactive Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;
  let currentSlideIndex = 0;

  const currentSlideEl = document.getElementById('current-slide');
  const totalSlidesEl = document.getElementById('total-slides');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnNotes = document.getElementById('btn-notes');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const speakerNotesDrawer = document.getElementById('speaker-notes-drawer');
  const speakerNotesText = document.getElementById('speaker-notes-text');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalImage = document.getElementById('modal-image');

  // Initialize count
  if (totalSlidesEl) totalSlidesEl.textContent = totalSlides;

  function updateSlide(index) {
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;

    currentSlideIndex = index;

    slides.forEach((slide, i) => {
      if (i === currentSlideIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    // Update Counter & Progress Bar
    if (currentSlideEl) currentSlideEl.textContent = currentSlideIndex + 1;
    const progressPercent = ((currentSlideIndex + 1) / totalSlides) * 100;
    if (progressBarFill) progressBarFill.style.width = `${progressPercent}%`;

    // Update Speaker Notes
    const activeSlide = slides[currentSlideIndex];
    const notes = activeSlide.getAttribute('data-notes') || 'Sin notas específicas para esta diapositiva.';
    if (speakerNotesText) speakerNotesText.textContent = notes;

    // Render Mermaid diagrams if present in active slide
    if (window.mermaid && activeSlide.querySelector('.mermaid')) {
      try {
        window.mermaid.contentLoaded();
      } catch (e) {
        console.log('Mermaid render info:', e);
      }
    }
  }

  function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
      updateSlide(currentSlideIndex + 1);
    }
  }

  function prevSlide() {
    if (currentSlideIndex > 0) {
      updateSlide(currentSlideIndex - 1);
    }
  }

  function toggleNotes() {
    if (speakerNotesDrawer) {
      speakerNotesDrawer.classList.toggle('open');
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Button Listeners
  if (btnNext) btnNext.addEventListener('click', nextSlide);
  if (btnPrev) btnPrev.addEventListener('click', prevSlide);
  if (btnNotes) btnNotes.addEventListener('click', toggleNotes);
  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

  // Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'Space':
      case 'PageDown':
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        prevSlide();
        break;
      case 'n':
      case 'N':
        toggleNotes();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'Escape':
        if (modalOverlay && modalOverlay.classList.contains('active')) {
          modalOverlay.classList.remove('active');
        }
        break;
    }
  });

  // Touch Swipe Navigation for Mobile
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 50) {
      nextSlide();
    } else if (touchEndX - touchStartX > 50) {
      prevSlide();
    }
  });

  // Image Modal Zoom
  document.querySelectorAll('.media-container img').forEach(img => {
    img.addEventListener('click', () => {
      if (modalOverlay && modalImage) {
        modalImage.src = img.src;
        modalOverlay.classList.add('active');
      }
    });
  });

  if (modalOverlay) {
    modalOverlay.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });
  }

  // Initial Load
  updateSlide(0);
});
