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


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];


/* =========================================================
   CONFIG
========================================================= */

function getConfigValue(path) {
  return path
    .split('.')
    .reduce(
      (value, key) => value?.[key],
      WEDDING_CONFIG
    );
}

function populateConfiguredText() {
  $$('[data-config]').forEach((node) => {
    const value =
      getConfigValue(node.dataset.config);

    if (
      value !== undefined &&
      value !== null
    ) {
      node.textContent =
        String(value);
    }
  });

  const {
    bride,
    groom
  } = WEDDING_CONFIG.couple;

  if (
    isConfiguredValue(bride) &&
    isConfiguredValue(groom)
  ) {
    document.title =
      `${groom} & ${bride} — Wedding Invitation`;
  }
}


/* =========================================================
   GOOGLE MAPS + CALENDAR
========================================================= */

function setupExternalLinks() {
  const mapsLink =
    $('#maps-link');

  const eventMapsLink =
    $('#event-maps-link');

  const primaryCalendarLink =
    $('#calendar-link');

  const giftDeliveryLink =
    $('#gift-delivery-link');


  const eventMapsUrl =
    isConfiguredValue(
      WEDDING_CONFIG.event.mapsUrl
    )
      ? WEDDING_CONFIG.event.mapsUrl
      : buildGoogleMapsUrl(
          WEDDING_CONFIG.event.venueAddress
        );


  if (mapsLink) {
    mapsLink.href = eventMapsUrl;
  }

  if (eventMapsLink) {
    eventMapsLink.href =
      eventMapsUrl;
  }


  if (
    primaryCalendarLink &&
    !primaryCalendarLink.dataset.calendarEvent
  ) {
    primaryCalendarLink.href =
      buildGoogleCalendarUrl({
        title:
          WEDDING_CONFIG.event.title,

        start:
          WEDDING_CONFIG.event.start,

        end:
          WEDDING_CONFIG.event.end,

        location:
          WEDDING_CONFIG.event.venueAddress,

        description:
          WEDDING_CONFIG.event.description
      });
  }


  $$('[data-calendar-event]').forEach(
    (link) => {
      const event =
        WEDDING_CONFIG.events?.[
          link.dataset.calendarEvent
        ];

      if (!event) return;

      link.href =
        buildGoogleCalendarUrl({
          title:
            event.title,

          start:
            event.start,

          end:
            event.end,

          location:
            event.venueAddress,

          description:
            event.description
        });
    }
  );


  $$('[data-maps-event]').forEach(
    (link) => {
      const event =
        WEDDING_CONFIG.events?.[
          link.dataset.mapsEvent
        ];

      if (!event) return;

      link.href =
        isConfiguredValue(event.mapsUrl)
          ? event.mapsUrl
          : buildGoogleMapsUrl(
              event.venueAddress
            );
    }
  );


  if (giftDeliveryLink) {
    giftDeliveryLink.href =
      isConfiguredValue(
        WEDDING_CONFIG.gift
          .deliveryAddressUrl
      )
        ? WEDDING_CONFIG.gift
            .deliveryAddressUrl
        : buildGoogleMapsUrl(
            WEDDING_CONFIG.gift
              .deliveryAddress
          );
  }
}


/* =========================================================
   OPENING COVER
========================================================= */

function setupOpeningCover() {
  const cover =
    $('#opening-cover');

  const button =
    $('#open-invitation');

  const audio =
    $('#background-music');

  const musicToggle =
    $('#music-toggle');

  if (!cover || !button) return;


  button.addEventListener(
    'click',
    async () => {

      cover.classList.add(
        'is-open'
      );

      document.body.classList.remove(
        'is-locked'
      );


      if (!audio) return;


      try {
        await audio.play();

        if (musicToggle) {
          musicToggle.setAttribute(
            'aria-pressed',
            'true'
          );

          musicToggle.setAttribute(
            'aria-label',
            'Jeda musik latar'
          );
        }

      } catch {
        /*
         * Safari / Chrome dapat
         * menolak autoplay tertentu.
         * Tombol musik tetap tersedia.
         */
      }
    },
    { once: true }
  );
}


/* =========================================================
   MUSIC
========================================================= */

function setupMusic() {
  const button =
    $('#music-toggle');

  const audio =
    $('#background-music');

  if (!button || !audio) return;


  const syncButton = () => {
    const playing =
      !audio.paused;

    button.setAttribute(
      'aria-pressed',
      playing ? 'true' : 'false'
    );

    button.setAttribute(
      'aria-label',
      playing
        ? 'Jeda musik latar'
        : 'Putar musik latar'
    );
  };


  button.addEventListener(
    'click',
    async () => {

      if (audio.paused) {

        try {
          await audio.play();
        } catch {
          button.setAttribute(
            'aria-pressed',
            'false'
          );
        }

      } else {
        audio.pause();
      }

      syncButton();
    }
  );


  audio.addEventListener(
    'play',
    syncButton
  );

  audio.addEventListener(
    'pause',
    syncButton
  );

  audio.addEventListener(
    'ended',
    syncButton
  );

  syncButton();
}


/* =========================================================
   STORY SLIDER
========================================================= */

function setupStorySlider() {
  const slider =
    $('#story-slider');

  if (!slider) return;


  const track =
    $('.story-slider__track', slider);

  const slides =
    $$('[data-story-slide]', slider);

  const dots =
    $$('[data-story-dot]', slider);

  const prev =
    $('[data-story-prev]', slider);

  const next =
    $('[data-story-next]', slider);


  if (
    !track ||
    slides.length < 2
  ) {
    return;
  }


  let index = 0;
  let timer = null;


  const reduceMotion =
    window
      .matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )
      .matches;


  const render = () => {
    track.style.transform =
      `translateX(-${index * 100}%)`;

    dots.forEach(
      (dot, dotIndex) => {

        dot.setAttribute(
          'aria-current',
          dotIndex === index
            ? 'true'
            : 'false'
        );

      }
    );
  };


  const goTo = (nextIndex) => {
    index =
      (
        nextIndex +
        slides.length
      ) %
      slides.length;

    render();
  };


  const stopAuto = () => {
    if (!timer) return;

    clearInterval(timer);
    timer = null;
  };


  const startAuto = () => {
    stopAuto();

    if (
      reduceMotion ||
      document.hidden
    ) {
      return;
    }

    timer =
      setInterval(
        () => goTo(index + 1),
        5000
      );
  };


  prev?.addEventListener(
    'click',
    () => {
      goTo(index - 1);
      startAuto();
    }
  );


  next?.addEventListener(
    'click',
    () => {
      goTo(index + 1);
      startAuto();
    }
  );


  dots.forEach((dot) => {
    dot.addEventListener(
      'click',
      () => {
        goTo(
          Number(
            dot.dataset.storyDot
          )
        );

        startAuto();
      }
    );
  });


  slider.addEventListener(
    'mouseenter',
    stopAuto
  );

  slider.addEventListener(
    'mouseleave',
    startAuto
  );

  slider.addEventListener(
    'focusin',
    stopAuto
  );

  slider.addEventListener(
    'focusout',
    startAuto
  );


  document.addEventListener(
    'visibilitychange',
    () => {
      document.hidden
        ? stopAuto()
        : startAuto();
    }
  );


  render();
  startAuto();
}


/* =========================================================
   STORY GALLERY / LIGHTBOX
========================================================= */

function setupStoryGallery() {
  const gallery =
    $('#story-gallery');

  const lightbox =
    $('#story-lightbox');

  const lightboxImage =
    $('#story-lightbox-image');

  const closeButton =
    $(
      '[data-story-lightbox-close]',
      lightbox || document
    );


  if (
    !gallery ||
    !lightbox ||
    !lightboxImage
  ) {
    return;
  }


  const closeLightbox = () => {

    if (lightbox.open) {

      if (
        typeof lightbox.close ===
        'function'
      ) {
        lightbox.close();

      } else {
        lightbox.removeAttribute(
          'open'
        );
      }

    }

    lightboxImage.removeAttribute(
      'src'
    );

    lightboxImage.alt = '';
  };


  $$(
    '[data-story-frame]',
    gallery
  ).forEach((frame) => {

    frame.addEventListener(
      'click',
      () => {

        const image =
          $('img', frame);

        if (!image) return;


        lightboxImage.src =
          frame.dataset.fullSrc ||
          image.src;

        lightboxImage.alt =
          image.alt ||
          'Foto pranikah';


        if (
          typeof lightbox.showModal ===
          'function'
        ) {
          lightbox.showModal();

        } else {
          lightbox.setAttribute(
            'open',
            ''
          );
        }

      }
    );

  });


  closeButton?.addEventListener(
    'click',
    closeLightbox
  );


  lightbox.addEventListener(
    'click',
    (event) => {

      if (
        event.target === lightbox
      ) {
        closeLightbox();
      }

    }
  );


  lightbox.addEventListener(
    'close',
    () => {
      lightboxImage.removeAttribute(
        'src'
      );

      lightboxImage.alt = '';
    }
  );
}


/* =========================================================
   COUNTDOWN
========================================================= */

function updateCountdown() {
  const fields = {
    days:
      $('#countdown-days'),

    hours:
      $('#countdown-hours'),

    minutes:
      $('#countdown-minutes'),

    seconds:
      $('#countdown-seconds')
  };


  const note =
    $('#countdown-note');


  const parts =
    getCountdownParts(
      WEDDING_CONFIG.event.start
    );


  if (!parts.valid) {

    Object.values(fields)
      .forEach((node) => {

        if (node) {
          node.textContent = '--';
        }

      });


    if (note) {
      note.textContent =
        'Tanggal pernikahan akan segera diumumkan.';
    }

    return;
  }


  Object.entries(fields)
    .forEach(([key, node]) => {

      if (!node) return;

      node.textContent =
        String(parts[key])
          .padStart(2, '0');

    });


  if (note) {
    note.textContent =
      parts.complete
        ? 'Hari bahagia kami telah tiba. Sampai bertemu!'
        : '';
  }
}


function setupCountdown() {
  const countdown =
    $('#countdown');

  if (!countdown) return;


  updateCountdown();

  window.setInterval(
    updateCountdown,
    1000
  );
}


/* =========================================================
   REVEAL ANIMATION
========================================================= */

function setupRevealAnimations() {
  const elements =
    $$('.reveal');

  if (!elements.length) return;


  if (
    !(
      'IntersectionObserver'
      in window
    )
  ) {

    elements.forEach(
      (element) =>
        element.classList.add(
          'is-visible'
        )
    );

    return;
  }


  const observer =
    new IntersectionObserver(
      (entries) => {

        entries.forEach(
          (entry) => {

            if (
              !entry.isIntersecting
            ) {
              return;
            }

            entry.target.classList.add(
              'is-visible'
            );

            observer.unobserve(
              entry.target
            );

          }
        );

      },
      {
        threshold: .14,
        rootMargin:
          '0px 0px -4% 0px'
      }
    );


  elements.forEach(
    (element) =>
      observer.observe(element)
  );
}


/* =========================================================
   RSVP FORM
========================================================= */

function setFieldError(
  field,
  message = ''
) {

  const errorMap = {
    fullName:
      $('#full-name-error'),

    attendance:
      $('#attendance-error')
  };


  if (errorMap[field]) {
    errorMap[field].textContent =
      message;
  }
}


function clearFormErrors() {
  setFieldError('fullName');
  setFieldError('attendance');
}


function getFormValues(form) {
  const data =
    new FormData(form);


  const attendance =
    data.get('attendance') || '';


  let guests =
    Number(
      data.get('guests') || 1
    );


  if (
    attendance ===
    'not-attending'
  ) {
    guests = 0;
  }


  return {
    fullName:
      String(
        data.get('fullName') || ''
      ).trim(),

    attendance,

    guests,

    message:
      String(
        data.get('message') || ''
      ).trim()
  };
}


/* =========================================================
   ATTENDANCE TOGGLE
========================================================= */

function setupAttendanceToggle() {
  const group =
    $('#guest-count-group');

  const guestInput =
    $('#guest-count');

  const radios =
    $$(
      'input[name="attendance"]'
    );


  if (
    !group ||
    !radios.length
  ) {
    return;
  }


  const sync = () => {

    const checked =
      $(
        'input[name="attendance"]:checked'
      );


    const notAttending =
      checked?.value ===
      'not-attending';


    group.hidden =
      notAttending;


    if (guestInput) {

      if (notAttending) {
        guestInput.value = '1';

      } else if (
        Number(guestInput.value) < 1
      ) {
        guestInput.value = '1';
      }

    }
  };


  radios.forEach(
    (radio) => {
      radio.addEventListener(
        'change',
        sync
      );
    }
  );


  sync();


  return sync;
}


/* =========================================================
   WISH CARDS
========================================================= */

function createWishCard(wish) {
  const card =
    document.createElement(
      'article'
    );

  card.className =
    'wish-card';


  const name =
    document.createElement(
      'h3'
    );

  name.textContent =
    String(
      wish.name ||
      'Tamu'
    );


  const message =
    document.createElement(
      'p'
    );

  message.textContent =
    String(
      wish.message || ''
    );


  card.append(
    name,
    message
  );


  if (wish.timestamp) {

    const date =
      new Date(
        wish.timestamp
      );


    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      const time =
        document.createElement(
          'time'
        );


      time.dateTime =
        date.toISOString();


      time.textContent =
        new Intl.DateTimeFormat(
          'id-ID',
          {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }
        ).format(date);


      card.append(time);
    }
  }


  return card;
}


/* =========================================================
   RENDER WISHES
========================================================= */

function renderWishes(wishes = []) {
  const wishesList =
    $('#wishes-list');

  if (!wishesList) return;


  wishesList.replaceChildren();


  if (!wishes.length) {

    const empty =
      document.createElement(
        'p'
      );

    empty.className =
      'wishes-empty';


    empty.textContent =
      isConfiguredValue(
        WEDDING_CONFIG.integration
          .appsScriptUrl
      )
        ? 'Belum ada ucapan. Jadilah yang pertama memberikan doa dan pesan.'
        : 'Ucapan pernikahan akan tampil setelah integrasi RSVP tersambung.';


    wishesList.append(empty);

    return;
  }


  const fragment =
    document.createDocumentFragment();


  wishes.forEach(
    (wish) => {
      fragment.append(
        createWishCard(wish)
      );
    }
  );


  wishesList.append(fragment);
}


/* =========================================================
   LOAD WISHES
========================================================= */

let isLoadingWishes = false;


async function loadWishes() {

  if (isLoadingWishes) return;


  if (
    !isConfiguredValue(
      WEDDING_CONFIG.integration
        .appsScriptUrl
    )
  ) {

    renderWishes([]);

    return;
  }


  isLoadingWishes = true;


  try {

    const wishes =
      await fetchWishes(
        WEDDING_CONFIG.integration
          .appsScriptUrl
      );


    renderWishes(
      Array.isArray(wishes)
        ? wishes
        : []
    );


  } catch (error) {

    try {

      const wishes =
        await fetchWishesJsonp(
          WEDDING_CONFIG.integration
            .appsScriptUrl
        );


      renderWishes(
        Array.isArray(wishes)
          ? wishes
          : []
      );


    } catch (fallbackError) {

      console.warn(
        'Tidak dapat memperbarui ucapan pernikahan.',
        error,
        fallbackError
      );

    }

  } finally {

    isLoadingWishes = false;

  }
}


/* =========================================================
   WISH POLLING
========================================================= */

function setupWishesPolling() {
  loadWishes();


  window.setInterval(
    () => {

      if (!document.hidden) {
        loadWishes();
      }

    },
    15000
  );


  document.addEventListener(
    'visibilitychange',
    () => {

      if (!document.hidden) {
        loadWishes();
      }

    }
  );
}


/* =========================================================
   RSVP SUBMISSION
========================================================= */

function setupRsvp(
  syncAttendance
) {

  const form =
    $('#rsvp-form');

  const submitButton =
    $('#rsvp-submit');

  const status =
    $('#rsvp-status');


  if (
    !form ||
    !submitButton ||
    !status
  ) {
    return;
  }


  form.addEventListener(
    'submit',
    async (event) => {

      event.preventDefault();


      clearFormErrors();


      status.textContent = '';
      status.className =
        'form-status';


      const values =
        getFormValues(form);


      const validation =
        validateRsvp(values);


      if (!validation.valid) {

        Object.entries(
          validation.errors
        ).forEach(
          ([field, message]) => {
            setFieldError(
              field,
              message
            );
          }
        );


        status.textContent =
          'Mohon lengkapi data yang diperlukan.';

        status.classList.add(
          'is-error'
        );

        return;
      }


      if (
        !isConfiguredValue(
          WEDDING_CONFIG.integration
            .appsScriptUrl
        )
      ) {

        status.textContent =
          'RSVP belum terhubung ke Google Sheets. Silakan konfigurasi URL Apps Script terlebih dahulu.';

        status.classList.add(
          'is-error'
        );

        return;
      }


      const payload =
        buildRsvpPayload(values);


      const originalLabel =
        submitButton.textContent;


      submitButton.disabled =
        true;

      submitButton.textContent =
        'Mengirim…';


      try {

        await submitRsvp(
          WEDDING_CONFIG.integration
            .appsScriptUrl,
          payload
        );


        status.textContent =
          payload.attendance ===
          'attending'
            ? 'Terima kasih. Kami tidak sabar merayakan hari bahagia ini bersama Anda.'
            : 'Terima kasih sudah memberikan konfirmasi. Doa dan ucapan Anda sangat berarti bagi kami.';


        status.classList.add(
          'is-success'
        );


        form.reset();


        const guestInput =
          $('#guest-count');

        if (guestInput) {
          guestInput.value = '1';
        }


        if (
          typeof syncAttendance ===
          'function'
        ) {
          syncAttendance();
        }


        await loadWishes();


      } catch (error) {

        console.error(
          'RSVP submission error:',
          error
        );


        status.textContent =
          'Konfirmasi belum berhasil disimpan. Silakan coba beberapa saat lagi.';

        status.classList.add(
          'is-error'
        );


      } finally {

        submitButton.disabled =
          false;

        submitButton.textContent =
          originalLabel;

      }

    }
  );
}


/* =========================================================
   INITIALISATION
========================================================= */

function init() {
  populateConfiguredText();

  setupExternalLinks();

  setupOpeningCover();

  setupMusic();

  setupStorySlider();

  setupStoryGallery();

  setupCountdown();

  setupRevealAnimations();

  const syncAttendance =
    setupAttendanceToggle();

  setupRsvp(
    syncAttendance
  );

  setupWishesPolling();
}


init();