import { WEDDING_CONFIG } from './config.js';
import {
  buildGoogleCalendarUrl,
  buildGoogleMapsUrl,
  getCountdownParts,
  isConfiguredValue
} from './wedding-utils.js';
import {
  buildRsvpPayload,
  fetchWishes,
  fetchWishesJsonp,
  submitRsvp,
  validateRsvp
} from './rsvp-api.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function getConfigValue(path) {
  return path.split('.').reduce((value, key) => value?.[key], WEDDING_CONFIG);
}

function populateConfiguredText() {
  $$('[data-config]').forEach((node) => {
    const value = getConfigValue(node.dataset.config);
    if (value !== undefined && value !== null) {
      node.textContent = String(value);
    }
  });

  const { bride, groom } = WEDDING_CONFIG.couple;
  if (isConfiguredValue(bride) && isConfiguredValue(groom)) {
    document.title = `${bride} & ${groom} — Wedding Invitation`;
  }
}

function setupExternalLinks() {
  const mapsLink = $('#maps-link');
  const calendarLink = $('#calendar-link');

  if (mapsLink) {
    mapsLink.href = buildGoogleMapsUrl(WEDDING_CONFIG.event.venueAddress);
  }

  if (calendarLink) {
    calendarLink.href = buildGoogleCalendarUrl({
      title: WEDDING_CONFIG.event.title,
      start: WEDDING_CONFIG.event.start,
      end: WEDDING_CONFIG.event.end,
      location: WEDDING_CONFIG.event.venueAddress,
      description: WEDDING_CONFIG.event.description
    });
  }
}

function setupOpeningCover() {
  const cover = $('#opening-cover');
  const button = $('#open-invitation');
  const audio = $('#background-music');
  const musicToggle = $('#music-toggle');

  if (!cover || !button) return;

  button.addEventListener('click', async () => {
    cover.classList.add('is-open');
    document.body.classList.remove('is-locked');

    if (audio) {
      try {
        await audio.play();
        if (musicToggle) {
          musicToggle.setAttribute('aria-pressed', 'true');
          musicToggle.setAttribute('aria-label', 'Pause background music');
        }
      } catch {
        // Some browsers may still block media playback; the manual toggle remains available.
      }
    }
  });
}

function setupMusic() {
  const button = $('#music-toggle');
  const audio = $('#background-music');
  if (!button || !audio) return;

  button.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
        button.setAttribute('aria-pressed', 'true');
        button.setAttribute('aria-label', 'Pause background music');
      } catch {
        button.setAttribute('aria-pressed', 'false');
      }
    } else {
      audio.pause();
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Play background music');
    }
  });

  audio.addEventListener('pause', () => {
    button.setAttribute('aria-pressed', 'false');
  });

  audio.addEventListener('play', () => {
    button.setAttribute('aria-pressed', 'true');
  });
}

function updateCountdown() {
  const parts = getCountdownParts(WEDDING_CONFIG.event.start);
  const fields = {
    days: $('#countdown-days'),
    hours: $('#countdown-hours'),
    minutes: $('#countdown-minutes'),
    seconds: $('#countdown-seconds')
  };
  const note = $('#countdown-note');

  if (!parts.valid) {
    Object.values(fields).forEach((node) => {
      if (node) node.textContent = '--';
    });
    if (note) note.textContent = 'Wedding date will be announced soon.';
    return;
  }

  Object.entries(fields).forEach(([key, node]) => {
    if (node) node.textContent = String(parts[key]).padStart(2, '0');
  });

  if (note) {
    note.textContent = parts.complete ? 'Today is the day. See you there!' : '';
  }
}

function setupCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function setupRevealAnimations() {
  const elements = $$('.reveal');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.14,
    rootMargin: '0px 0px -4% 0px'
  });

  elements.forEach((element) => observer.observe(element));
}

function setFieldError(field, message = '') {
  const errorMap = {
    fullName: $('#full-name-error'),
    attendance: $('#attendance-error')
  };
  if (errorMap[field]) errorMap[field].textContent = message;
}

function clearFormErrors() {
  setFieldError('fullName');
  setFieldError('attendance');
}

function getFormValues(form) {
  const data = new FormData(form);
  return {
    fullName: data.get('fullName'),
    attendance: data.get('attendance') || '',
    guests: data.get('guests'),
    message: data.get('message')
  };
}

function setupAttendanceToggle() {
  const group = $('#guest-count-group');
  const radios = $$('input[name="attendance"]');
  if (!group || !radios.length) return;

  const sync = () => {
    const checked = $('input[name="attendance"]:checked');
    group.hidden = checked?.value === 'not-attending';
  };

  radios.forEach((radio) => radio.addEventListener('change', sync));
  sync();
}

function createWishCard(wish) {
  const card = document.createElement('article');
  card.className = 'wish-card';

  const name = document.createElement('h3');
  name.textContent = String(wish.name || 'Guest');

  const message = document.createElement('p');
  message.textContent = String(wish.message || '');

  card.append(name, message);

  if (wish.timestamp) {
    const date = new Date(wish.timestamp);
    if (!Number.isNaN(date.getTime())) {
      const time = document.createElement('time');
      time.dateTime = date.toISOString();
      time.textContent = new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
      card.append(time);
    }
  }

  return card;
}

function renderWishes(wishes) {
  const wishesList = $('#wishes-list');
  if (!wishesList) return;

  wishesList.replaceChildren();

  if (!wishes.length) {
    const empty = document.createElement('p');
    empty.className = 'wishes-empty';
    empty.textContent = isConfiguredValue(WEDDING_CONFIG.integration.appsScriptUrl)
      ? 'No wishes yet. Be the first to leave a message.'
      : 'Wedding wishes will appear here after RSVP setup is connected.';
    wishesList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  wishes.forEach((wish) => fragment.append(createWishCard(wish)));
  wishesList.append(fragment);
}

async function loadWishes() {
  try {
    const wishes = await fetchWishes(WEDDING_CONFIG.integration.appsScriptUrl);
    renderWishes(wishes);
  } catch (error) {
    try {
      const wishes = await fetchWishesJsonp(WEDDING_CONFIG.integration.appsScriptUrl);
      renderWishes(wishes);
    } catch (fallbackError) {
      console.warn('Unable to refresh wedding wishes.', error, fallbackError);
    }
  }
}

function setupWishesPolling() {
  loadWishes();
  setInterval(loadWishes, 15000);
}

function setupRsvp() {
  const form = $('#rsvp-form');
  const submitButton = $('#rsvp-submit');
  const status = $('#rsvp-status');
  if (!form || !submitButton || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors();
    status.textContent = '';
    status.className = 'form-status';

    const values = getFormValues(form);
    const validation = validateRsvp(values);
    if (!validation.valid) {
      Object.entries(validation.errors).forEach(([field, message]) => setFieldError(field, message));
      status.textContent = 'Please complete the required fields.';
      status.classList.add('is-error');
      return;
    }

    if (!isConfiguredValue(WEDDING_CONFIG.integration.appsScriptUrl)) {
      status.textContent = 'RSVP is not connected yet. Please configure the Apps Script Web App URL.';
      status.classList.add('is-error');
      return;
    }

    const payload = buildRsvpPayload(values);
    const originalLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';

    try {
      await submitRsvp(WEDDING_CONFIG.integration.appsScriptUrl, payload);
      status.textContent = payload.attendance === 'attending'
        ? 'Thank you. We cannot wait to celebrate with you.'
        : 'Thank you for letting us know. Your wishes mean a lot to us.';
      status.classList.add('is-success');
      form.reset();
      setupAttendanceToggle();
      await loadWishes();
    } catch (error) {
      console.error(error);
      status.textContent = 'We could not save your RSVP. Please try again in a moment.';
      status.classList.add('is-error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
}

function init() {
  populateConfiguredText();
  setupExternalLinks();
  setupOpeningCover();
  setupMusic();
  setupCountdown();
  setupRevealAnimations();
  setupAttendanceToggle();
  setupRsvp();
  setupWishesPolling();
}

init();
