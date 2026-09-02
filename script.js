(function(){

  var MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var DAY_NAMES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var SLOTS       = ['09:00 am','10:00 am','11:00 am','01:00 pm','02:30 pm','04:00 pm'];
  var WHATSAPP_NUMBER = '51972498952';

  // ---------- Google Meet / Calendar (Google Apps Script) ----------
  // TODO: reemplaza estos dos valores después de desplegar el Apps Script
  // (ver samay_booking_apps_script.gs) — sin esto el botón no puede crear
  // la reunión real, solo mostrará el mensaje de respaldo por WhatsApp.
  var APPS_SCRIPT_URL = 'REEMPLAZA_CON_TU_URL_DE_APPS_SCRIPT';
  var APPS_SCRIPT_SECRET = 'REEMPLAZA_CON_TU_CLAVE_SECRETA';

  var viewDate = new Date();
  viewDate.setDate(1);
  var selectedDate = null; // día elegido en el calendario (paso 1)
  var activeDate = null;   // día activo entre las 3 pestañas del paso 2
  var selectedSlot = null;

  /* ---------- includes ---------- */
  function loadInclude(selector, url){
    var el = document.querySelector(selector);
    if(!el) return Promise.resolve();
    return fetch(url)
      .then(function(res){
        if(!res.ok) throw new Error('No se pudo cargar ' + url);
        return res.text();
      })
      .then(function(html){ el.innerHTML = html; })
      .catch(function(err){ console.error(err); });
  }

  /* ---------- dropdown "Servicios" ---------- */
  function initNavDropdown(){
    var dd = document.querySelector('.nav-dropdown');
    if(!dd) return;
    var trigger = dd.querySelector('.nav-dropdown-trigger');
    if(!trigger) return;

    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      var open = dd.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(e){
      if(!dd.contains(e.target)){
        dd.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        dd.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- header scroll ---------- */
  function initHeaderScroll(){
    var header = document.getElementById('siteHeader');
    if(!header) return;
    var onScroll = function(){ header.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });
  }

  /* ---------- scroll reveal ---------- */
  function initReveal(){
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = document.querySelectorAll('.reveal');
    if(!reduced && 'IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });
      els.forEach(function(el){ io.observe(el); });
    } else {
      els.forEach(function(el){ el.classList.add('in'); });
    }
  }

  /* ---------- FAQ: only one open at a time ---------- */
  function initFaq(){
    var items = document.querySelectorAll('.faq-item');
    items.forEach(function(item){
      item.addEventListener('toggle', function(){
        if(item.open){
          items.forEach(function(other){
            if(other !== item) other.open = false;
          });
        }
      });
    });
  }

  /* ---------- booking calendar ---------- */
  function isPast(date){
    var today = new Date();
    today.setHours(0,0,0,0);
    return date < today;
  }
  function isWeekend(date){
    var d = date.getDay();
    return d === 0 || d === 6;
  }
  function isSameDay(a, b){
    return a && b && a.toDateString() === b.toDateString();
  }

  function renderCalendar(){
    var label = document.getElementById('bookingMonthLabel');
    var daysEl = document.getElementById('bookingDays');
    if(!label || !daysEl) return;

    label.textContent = MONTH_NAMES[viewDate.getMonth()] + ' ' + viewDate.getFullYear();
    daysEl.innerHTML = '';

    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();
    var firstDay = new Date(year, month, 1);
    var startOffset = firstDay.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();
    var today = new Date();

    var cells = [];
    for(var i = startOffset - 1; i >= 0; i--){
      cells.push({ day: prevMonthDays - i, current:false, date:null });
    }
    for(var d = 1; d <= daysInMonth; d++){
      cells.push({ day:d, current:true, date:new Date(year, month, d) });
    }
    while(cells.length % 7 !== 0){
      cells.push({ day: cells.length, current:false, date:null });
    }

    cells.forEach(function(cell){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-day';
      btn.textContent = cell.day;

      if(!cell.current){
        btn.classList.add('is-muted');
        btn.disabled = true;
      } else {
        var disabled = isPast(cell.date) || isWeekend(cell.date);
        if(isSameDay(cell.date, today)) btn.classList.add('is-today');
        if(disabled){
          btn.disabled = true;
          btn.classList.add('is-disabled');
        } else {
          btn.addEventListener('click', (function(dateForCell){
            return function(){ selectDate(dateForCell); };
          })(cell.date));
        }
        if(isSameDay(selectedDate, cell.date)){
          btn.classList.add('is-selected');
        }
      }
      daysEl.appendChild(btn);
    });
  }

  /* ---------- paso 1 → paso 2 ---------- */
  function isEnabledDay(date){
    return !isPast(date) && !isWeekend(date);
  }

  function selectDate(date){
    selectedDate = new Date(date);
    selectedDate.setHours(0,0,0,0);
    activeDate = new Date(selectedDate);
    selectedSlot = null;
    renderCalendar();
    goToTimeStep();
  }

  function goToTimeStep(){
    document.getElementById('bookingStepDetails').hidden = true;
    document.getElementById('bookingStepDay').hidden = true;
    document.getElementById('bookingStepTime').hidden = false;
    document.getElementById('bookingFooter').hidden = false;
    var btn = document.getElementById('bookingConfirm');
    btn.textContent = 'Continuar';
    document.getElementById('bookingNote').textContent = 'Elige un horario para continuar.';
    renderDayTabs();
    renderSlots();
  }

  function goToDayStep(){
    document.getElementById('bookingStepDetails').hidden = true;
    document.getElementById('bookingStepTime').hidden = true;
    document.getElementById('bookingStepDay').hidden = false;
    document.getElementById('bookingFooter').hidden = true;
    renderCalendar();
  }

  /* ---------- paso 2 → paso 3 (datos de contacto) ---------- */
  function goToDetailsStep(){
    document.getElementById('bookingStepTime').hidden = true;
    document.getElementById('bookingStepDetails').hidden = false;
    renderSummary();
    document.getElementById('bookingError').hidden = true;
    var btn = document.getElementById('bookingConfirm');
    btn.textContent = 'Confirmar y enviar invitación';
    btn.disabled = false;
    document.getElementById('bookingNote').textContent = 'Te enviaremos la invitación con el enlace de Google Meet a tu correo.';
  }

  function renderSummary(){
    var el = document.getElementById('bookingSummary');
    if(!el || !activeDate || !selectedSlot) return;
    var fecha = DAY_NAMES[activeDate.getDay()] + ' ' + activeDate.getDate() + ' de ' + MONTH_NAMES[activeDate.getMonth()];
    el.textContent = fecha + ' · ' + selectedSlot + ' (hora de Perú)';
  }

  /* ---------- paso 2: 3 pestañas de día (anterior, elegido, siguiente) ---------- */
  function renderDayTabs(){
    var wrap = document.getElementById('bookingDayTabs');
    if(!wrap || !selectedDate) return;
    wrap.innerHTML = '';

    [-1, 0, 1].forEach(function(offset){
      var d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'daytab';
      btn.innerHTML =
        '<span class="daytab-weekday">' + DAY_NAMES[d.getDay()].slice(0,3).toUpperCase() + '</span>' +
        '<span class="daytab-num">' + d.getDate() + '</span>';

      if(!isEnabledDay(d)){
        btn.disabled = true;
      } else {
        if(isSameDay(d, activeDate)) btn.classList.add('is-active');
        btn.addEventListener('click', (function(dateForTab){
          return function(){
            activeDate = dateForTab;
            selectedSlot = null;
            renderDayTabs();
            renderSlots();
          };
        })(d));
      }
      wrap.appendChild(btn);
    });
  }

  /* ---------- paso 2: horarios del día activo ---------- */
  function renderSlots(){
    var wrap = document.getElementById('bookingSlots');
    var confirmBtn = document.getElementById('bookingConfirm');
    if(!wrap || !confirmBtn) return;
    wrap.innerHTML = '';

    SLOTS.forEach(function(slot){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'booking-slot';
      b.textContent = slot;
      if(slot === selectedSlot) b.classList.add('is-selected');
      b.addEventListener('click', function(){
        selectedSlot = slot;
        renderSlots();
      });
      wrap.appendChild(b);
    });

    confirmBtn.disabled = !selectedSlot;
  }

  function openBookingModal(){
    var overlay = document.getElementById('bookingOverlay');
    if(!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    selectedDate = null;
    activeDate = null;
    selectedSlot = null;
    viewDate = new Date();
    viewDate.setDate(1);

    goToDayStep();
  }

  function closeBookingModal(){
    var overlay = document.getElementById('bookingOverlay');
    if(!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ---------- paso 3: crear la reunión (Google Meet) y notificar por correo ---------- */
  function submitBooking(){
    var nameEl = document.getElementById('bkName');
    var emailEl = document.getElementById('bkEmail');
    var errorEl = document.getElementById('bookingError');
    var btn = document.getElementById('bookingConfirm');

    var name = nameEl.value.trim();
    var email = emailEl.value.trim();

    if(!name || !email || email.indexOf('@') === -1){
      errorEl.textContent = 'Completa tu nombre y un correo válido para continuar.';
      errorEl.hidden = false;
      return;
    }

    errorEl.hidden = true;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.textContent = 'Agendando...';

    var payload = {
      secret: APPS_SCRIPT_SECRET,
      name: name,
      email: email,
      date: activeDate.getFullYear() + '-' + String(activeDate.getMonth() + 1).padStart(2, '0') + '-' + String(activeDate.getDate()).padStart(2, '0'),
      time: selectedSlot
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // text/plain evita el preflight CORS que Apps Script no maneja bien
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if(data && data.ok){
          showBookingSuccess();
        } else {
          showBookingError();
        }
      })
      .catch(function(){
        showBookingError();
      });
  }

  function showBookingSuccess(){
    var body = document.querySelector('.booking-body');
    var footer = document.getElementById('bookingFooter');
    if(!body) return;
    body.innerHTML =
      '<div class="booking-success">' +
        '<div class="booking-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>' +
        '<h3>¡Listo!</h3>' +
        '<p>Te enviamos la invitación con el enlace de Google Meet a tu correo. Revisa también la carpeta de spam por si acaso.</p>' +
      '</div>';
    if(footer) footer.hidden = true;
  }

  function showBookingError(){
    var errorEl = document.getElementById('bookingError');
    var btn = document.getElementById('bookingConfirm');
    if(!errorEl || !btn) return;

    var fecha = activeDate ? (DAY_NAMES[activeDate.getDay()] + ' ' + activeDate.getDate() + ' de ' + MONTH_NAMES[activeDate.getMonth()]) : '';
    var name = document.getElementById('bkName').value.trim();
    var msg = 'Hola, quiero agendar una llamada el ' + fecha + ' a las ' + selectedSlot + '. Mi nombre es ' + (name || '___');
    var waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);

    errorEl.innerHTML = 'No pudimos agendar automáticamente. <a href="' + waUrl + '" target="_blank" rel="noopener">Escríbenos por WhatsApp</a> y coordinamos al toque.';
    errorEl.hidden = false;

    btn.disabled = false;
    btn.classList.remove('is-loading');
    btn.textContent = 'Confirmar y enviar invitación';
  }

  function initBooking(){
    var prevBtn = document.getElementById('bookingPrev');
    var nextBtn = document.getElementById('bookingNext');
    var backBtn = document.getElementById('bookingBack');
    var backDetailsBtn = document.getElementById('bookingBackDetails');
    var confirmBtn = document.getElementById('bookingConfirm');
    var closeBtn = document.getElementById('bookingClose');
    var overlay = document.getElementById('bookingOverlay');
    if(!overlay) return;

    prevBtn.addEventListener('click', function(){
      viewDate.setMonth(viewDate.getMonth() - 1);
      renderCalendar();
    });
    nextBtn.addEventListener('click', function(){
      viewDate.setMonth(viewDate.getMonth() + 1);
      renderCalendar();
    });
    backBtn.addEventListener('click', goToDayStep);
    backDetailsBtn.addEventListener('click', goToTimeStep);
    confirmBtn.addEventListener('click', function(){
      var detailsVisible = !document.getElementById('bookingStepDetails').hidden;
      if(detailsVisible){
        submitBooking();
      } else if(selectedSlot){
        goToDetailsStep();
      }
    });
    closeBtn.addEventListener('click', closeBookingModal);
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) closeBookingModal();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeBookingModal();
    });
  }

  /* ---------- global open triggers (event delegation) ---------- */
  document.addEventListener('click', function(e){
    var trigger = e.target.closest('.js-open-booking');
    if(trigger){
      e.preventDefault();
      openBookingModal();
    }
  });

  document.addEventListener('DOMContentLoaded', function(){
    initReveal();
    initFaq();
    loadInclude('#header-placeholder', 'header.html').then(function(){
      initHeaderScroll();
      initNavDropdown();
    });
    loadInclude('#footer-placeholder', 'footer.html');
    loadInclude('#booking-placeholder', 'booking.html').then(initBooking);
  });

})();
