(() => {
  const data = window.ojtData || {};
  const gallery = document.getElementById('ojtPhotoGallery');
  const lightbox = document.getElementById('ojtLightbox');
  const lightboxImage = document.getElementById('ojtLightboxImage');
  const closeButton = document.getElementById('ojtLightboxClose');
  const previousButton = document.getElementById('ojtLightboxPrevious');
  const nextButton = document.getElementById('ojtLightboxNext');
  if (!gallery || !lightbox || !lightboxImage) return;

  const photos = (Array.isArray(data.photos) ? data.photos : []).filter(photo => {
    const src = String(photo?.src || '');
    return /^assets\/ojt\/[\w./ ~()-]+\.(?:jpe?g|png|webp|avif)$/i.test(src) && !src.split('/').includes('..');
  });
  let activeIndex = 0;

  gallery.innerHTML = photos.map((photo, index) => `<button class="ojt-polaroid" type="button" data-photo-index="${index}" aria-label="Open OJT photo ${index + 1}"><img src="${escapeAttribute(photo.src)}" alt="${escapeAttribute(photo.alt || 'OJT photo documentation from a computer laboratory.')}" loading="${index < 8 ? 'eager' : 'lazy'}" decoding="async"></button>`).join('');

  function escapeAttribute(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function showPhoto(index) {
    if (!photos.length) return;
    activeIndex = (index + photos.length) % photos.length;
    const photo = photos[activeIndex];
    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt || 'OJT photo documentation from a computer laboratory.';
    if (!lightbox.open) lightbox.showModal();
  }

  gallery.addEventListener('click', event => {
    const button = event.target.closest('[data-photo-index]');
    if (button) showPhoto(Number(button.dataset.photoIndex));
  });
  gallery.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) {
      event.target.hidden = true;
      event.target.closest('.ojt-polaroid')?.classList.add('is-missing');
    }
  }, true);
  lightboxImage.addEventListener('error', () => { lightboxImage.hidden = true; });
  lightboxImage.addEventListener('load', () => { lightboxImage.hidden = false; });
  closeButton.addEventListener('click', () => lightbox.close());
  previousButton.addEventListener('click', () => showPhoto(activeIndex - 1));
  nextButton.addEventListener('click', () => showPhoto(activeIndex + 1));
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(activeIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(activeIndex + 1); }
  });
})();
