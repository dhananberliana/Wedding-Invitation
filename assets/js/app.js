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

function populateInvitationGuest() {
  const guest = $('#invitation-guest-name');
  if (!guest) return;
  const name = new URLSearchParams(window.location.search).get('to')?.trim();
  guest.textContent = name || 'Bapak/Ibu/Saudara/i';
}

function populateConfiguredText() {
  $$('[data-config]').forEach((node) => {
    const value = getConfigValue(node.dataset.config);
    if (value !== undefined && value !== null) {
      node.textContent = String(value);
    }
  });

  const browserTitle = WEDDING_CONFIG.site?.browserTitle;
  document.title = browserTitle || 'Dhanan & Berliana | Undangan Pernikahan';
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
  const cover = $('#opening-cover');
  const button = $('#open-invitation');
  const hero = $('#home');
  const audio = $('#background-music');
  const musicToggle = $('#music-toggle');

  if (!cover || !button) return;

  button.addEventListener(
    'click',
    () => {
      // Tutup cover utama.
      cover.classList.add('is-open');
      cover.setAttribute('aria-hidden', 'true');
      cover.style.pointerEvents = 'none';

      // Lepas semua scroll lock, termasuk fallback untuk Safari/iPhone.
      document.body.classList.remove('is-locked');
      document.documentElement.classList.remove('is-locked');

      [document.body, document.documentElement].forEach((element) => {
        element.style.removeProperty('overflow');
        element.style.removeProperty('overflow-y');
        element.style.removeProperty('position');
        element.style.removeProperty('top');
        element.style.removeProperty('height');
        element.style.removeProperty('touch-action');
      });

      // Pastikan hero/home aktif dan viewport kembali ke awal halaman.
      hero?.classList.add('hero--entered');

      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto'
        });
      });

      // Musik tidak boleh menggagalkan proses membuka undangan.
      if (!audio) return;

      audio.volume = 0.65;
      audio.muted = false;

      const playPromise = audio.play();

      if (
        playPromise &&
        typeof playPromise.then === 'function'
      ) {
        playPromise
          .then(() => {
            if (!musicToggle) return;

            musicToggle.setAttribute(
              'aria-pressed',
              'true'
            );

            musicToggle.setAttribute(
              'aria-label',
              'Jeda musik latar'
            );
          })
          .catch((error) => {
            console.warn(
              'Browser memblokir musik otomatis:',
              error
            );

            if (!musicToggle) return;

            musicToggle.setAttribute(
              'aria-pressed',
              'false'
            );

            musicToggle.setAttribute(
              'aria-label',
              'Putar musik latar'
            );
          });
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
  const stackCard =
    $('#story-stack-card');

  const trigger =
    $('#story-gallery-trigger');

  const openButton =
    $('[data-story-stack-open]');

  const frontImage =
    $('#story-stack-front');

  const middleImage =
    $('#story-stack-middle');

  const backImage =
    $('#story-stack-back');

  const stackProgress =
    $('#story-stack-progress');

  const modal =
    $('#story-gallery-modal');

  const viewport =
    $('[data-story-modal-viewport]', modal);

  const detailImage =
    $('#story-detail-image');

  const prev =
    $('[data-story-modal-prev]', modal);

  const next =
    $('[data-story-modal-next]', modal);

  const closeButton =
    $('[data-story-modal-close]', modal);

  const counter =
    $('[data-story-modal-counter]', modal);

  if (
    !stackCard ||
    !trigger ||
    !frontImage ||
    !middleImage ||
    !backImage ||
    !modal ||
    !viewport ||
    !detailImage
  ) {
    return;
  }

  const gallery = [
    {
      src: 'assets/images/story-frame-01.webp',
      alt: 'Dhanan dan Berliana berpelukan dalam busana adat Bali'
    },
    {
      src: 'assets/images/story-frame-02.webp',
      alt: 'Dhanan dan Berliana berbagi momen bahagia'
    },
    {
      src: 'assets/images/story-frame-03.webp',
      alt: 'Potret formal pranikah Dhanan dan Berliana'
    },
    {
      src: 'assets/images/story-frame-04.webp',
      alt: 'Dhanan dan Berliana di dekat pintu kayu berukir'
    },
    {
      src: 'assets/images/story-frame-05.webp',
      alt: 'Potret romantis di balik selendang tipis'
    },
    {
      src: 'assets/images/story-frame-06.webp',
      alt: 'Potret close-up pranikah'
    },
    {
      src: 'assets/images/story-frame-07.webp',
      alt: 'Potret Berliana menatap kamera'
    },
    {
      src: 'assets/images/story-frame-08.webp',
      alt: 'Potret artistik Dhanan dan Berliana'
    },
    {
      src: 'assets/images/story-frame-09.webp',
      alt: 'Potret pranikah tradisional Dhanan dan Berliana'
    },
    {
      src: 'assets/images/story-frame-10.webp',
      alt: 'Potret solo Dhanan dalam busana adat Bali'
    },
    {
      src: 'assets/images/bride.webp',
      alt: 'Potret solo Berliana dalam busana adat Bali'
    },
    {
      src: 'assets/images/story-frame-11-v1.webp',
      alt: 'Potret Berliana dalam busana adat Bali'
    },
    {
      src: 'assets/images/story-frame-12-v1.webp',
      alt: 'Potret studio Dhanan dan Berliana bergandengan tangan'
    }
  ];

  let stackIndex = 0;
  let modalIndex = 0;

  let stackTimer = null;
  let modalTimer = null;

  let touchStartX = null;
  let touchStartY = null;

  const reduceMotion =
    window
      .matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )
      .matches;


  /* =====================================================
     AUTO STACK PREVIEW
  ====================================================== */

  const renderStack = () => {
    const frontIndex =
      stackIndex % gallery.length;

    const middleIndex =
      (stackIndex + 1) % gallery.length;

    const backIndex =
      (stackIndex + 2) % gallery.length;

    frontImage.src =
      gallery[frontIndex].src;

    middleImage.src =
      gallery[middleIndex].src;

    backImage.src =
      gallery[backIndex].src;

    frontImage.alt =
      gallery[frontIndex].alt;

    if (stackProgress) {
      const ratio =
        (frontIndex + 1) /
        gallery.length;

      stackProgress.style.transform =
        `scaleX(${ratio})`;
    }

    stackCard.classList.remove(
      'is-changing'
    );

    void stackCard.offsetWidth;

    stackCard.classList.add(
      'is-changing'
    );
  };


  const stopStackAuto = () => {
    if (!stackTimer) return;

    window.clearInterval(
      stackTimer
    );

    stackTimer = null;
  };


  const startStackAuto = () => {
    stopStackAuto();

    if (
      reduceMotion ||
      document.hidden ||
      modal.open
    ) {
      return;
    }

    stackTimer =
      window.setInterval(
        () => {
          stackIndex =
            (
              stackIndex + 1
            ) %
            gallery.length;

          renderStack();
        },
        3200
      );
  };


  /* =====================================================
     DETAIL IMAGE SLIDER
     Satu image element, src diganti.
     Lebih stabil untuk mobile / Safari.
  ====================================================== */

  const renderModal = () => {
    const item =
      gallery[modalIndex];

    /*
      Fade ringan saat ganti foto.
    */
    detailImage.classList.add(
      'is-changing'
    );

    const nextImage =
      new Image();

    nextImage.onload = () => {
      detailImage.src =
        item.src;

      detailImage.alt =
        item.alt;

      window.requestAnimationFrame(
        () => {
          detailImage.classList.remove(
            'is-changing'
          );
        }
      );
    };

    nextImage.onerror = () => {
      /*
        Jika satu file foto bermasalah,
        jangan biarkan layar blank.
        Lompat ke foto berikutnya.
      */
      detailImage.classList.remove(
        'is-changing'
      );

      modalIndex =
        (
          modalIndex + 1
        ) %
        gallery.length;

      if (counter) {
        counter.textContent =
          `${modalIndex + 1} / ${gallery.length}`;
      }

      detailImage.src =
        gallery[modalIndex].src;

      detailImage.alt =
        gallery[modalIndex].alt;
    };

    nextImage.src =
      item.src;

    if (counter) {
      counter.textContent =
        `${modalIndex + 1} / ${gallery.length}`;
    }
  };


  const goToModal = (index) => {
    modalIndex =
      (
        index +
        gallery.length
      ) %
      gallery.length;

    renderModal();
  };


  const stopModalAuto = () => {
    if (!modalTimer) return;

    window.clearInterval(
      modalTimer
    );

    modalTimer = null;
  };


  const startModalAuto = () => {
    stopModalAuto();

    if (
      reduceMotion ||
      document.hidden ||
      !modal.open
    ) {
      return;
    }

    modalTimer =
      window.setInterval(
        () => {
          goToModal(
            modalIndex + 1
          );
        },
        5000
      );
  };


  const openModal = () => {
    stopStackAuto();

    goToModal(
      stackIndex %
      gallery.length
    );

    if (
      typeof modal.showModal ===
      'function'
    ) {
      modal.showModal();
    } else {
      modal.setAttribute(
        'open',
        ''
      );
    }

    document.body.classList.add(
      'is-story-detail-open'
    );

    startModalAuto();
  };


  const closeModal = () => {
    stopModalAuto();

    document.body.classList.remove(
      'is-story-detail-open'
    );

    if (
      typeof modal.close ===
        'function' &&
      modal.open
    ) {
      modal.close();
    } else {
      modal.removeAttribute(
        'open'
      );
    }

    startStackAuto();
  };


  trigger.addEventListener(
    'click',
    openModal
  );

  openButton?.addEventListener(
    'click',
    openModal
  );


  prev?.addEventListener(
    'click',
    () => {
      goToModal(
        modalIndex - 1
      );

      startModalAuto();
    }
  );


  next?.addEventListener(
    'click',
    () => {
      goToModal(
        modalIndex + 1
      );

      startModalAuto();
    }
  );


  closeButton?.addEventListener(
    'click',
    closeModal
  );


  modal.addEventListener(
    'click',
    (event) => {
      if (
        event.target === modal
      ) {
        closeModal();
      }
    }
  );


  modal.addEventListener(
    'close',
    () => {
      stopModalAuto();

      document.body.classList.remove(
        'is-story-detail-open'
      );

      startStackAuto();
    }
  );


  /* =====================================================
     MOBILE SWIPE
  ====================================================== */

  viewport.addEventListener(
    'touchstart',
    (event) => {
      const touch =
        event.touches[0];

      touchStartX =
        touch.clientX;

      touchStartY =
        touch.clientY;

      stopModalAuto();
    },
    { passive: true }
  );


  viewport.addEventListener(
    'touchend',
    (event) => {
      if (
        touchStartX === null ||
        touchStartY === null
      ) {
        startModalAuto();
        return;
      }

      const touch =
        event.changedTouches[0];

      const deltaX =
        touch.clientX -
        touchStartX;

      const deltaY =
        touch.clientY -
        touchStartY;

      touchStartX = null;
      touchStartY = null;

      if (
        Math.abs(deltaX) > 45 &&
        Math.abs(deltaX) >
          Math.abs(deltaY)
      ) {
        deltaX < 0
          ? goToModal(
              modalIndex + 1
            )
          : goToModal(
              modalIndex - 1
            );
      }

      startModalAuto();
    },
    { passive: true }
  );


  /* =====================================================
     KEYBOARD
  ====================================================== */

  document.addEventListener(
    'keydown',
    (event) => {
      if (!modal.open) return;

      if (
        event.key ===
        'ArrowLeft'
      ) {
        goToModal(
          modalIndex - 1
        );

        startModalAuto();
      }

      if (
        event.key ===
        'ArrowRight'
      ) {
        goToModal(
          modalIndex + 1
        );

        startModalAuto();
      }

      if (
        event.key ===
        'Escape'
      ) {
        closeModal();
      }
    }
  );


  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        stopStackAuto();
        stopModalAuto();
        return;
      }

      if (modal.open) {
        startModalAuto();
      } else {
        startStackAuto();
      }
    }
  );


  /*
    Preload semua foto untuk perpindahan lebih mulus.
  */
  gallery.forEach((item) => {
    const image =
      new Image();

    image.src =
      item.src;
  });


  renderStack();
  renderModal();
  startStackAuto();
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

  const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, {
  threshold: 0.22,
  rootMargin: '0px 0px -8% 0px'
});


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
   BANK COPY
========================================================= */

function setupBankAccountCopy() {
  $$('[data-gift-account]').forEach((card) => {
    const button = $('[data-copy-account]', card);
    const account = $('[data-account-number]', card);
    const status = $('[data-copy-status]', card);
    if (!button || !account || !status) return;
    let resetTimer;
    button.addEventListener('click', async () => {
      const value = account.textContent.trim();
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = 'Tersalin ✓';
        status.textContent = 'Nomor rekening berhasil disalin.';
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          button.textContent = 'Salin Nomor Rekening';
          status.textContent = '';
        }, 1800);
      } catch {
        status.textContent = 'Tidak dapat menyalin otomatis. Tekan dan tahan nomor rekening untuk menyalin.';
      }
    });
  });
}

/* =========================================================
   INITIALISATION
========================================================= */

function init() {
  // Daftarkan tombol pembuka lebih dulu supaya tetap bekerja
  // walaupun ada konfigurasi fitur lain yang belum lengkap.
  setupOpeningCover();

  setupMusic();

  populateConfiguredText();

  populateInvitationGuest();

  setupExternalLinks();

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

  setupBankAccountCopy();
}


init();
