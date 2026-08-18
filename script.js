(function(){

  var MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var DAY_NAMES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var SLOTS       = ['09:00 am','10:00 am','11:00 am','01:00 pm','02:30 pm','04:00 pm'];
  var WHATSAPP_NUMBER = '51972498952';

  var viewDate = new Date();
  viewDate.setDate(1);
  var selectedDate = null;
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

  function selectDate(date){
    selectedDate = date;
    selectedSlot = null;
    renderCalendar();
    renderSlots();
  }

  function renderSlots(){
    var dateLabel = document.getElementById('bookingSelectedDate');
    var list = document.getElementById('bookingSlotList');
    var confirmBtn = document.getElementById('bookingConfirm');
    if(!dateLabel || !list || !confirmBtn) return;

    if(!selectedDate){
      dateLabel.textContent = 'Elige un día disponible';
      list.innerHTML = '';
      confirmBtn.disabled = true;
      return;
    }

    dateLabel.textContent = DAY_NAMES[selectedDate.getDay()] + ', ' + selectedDate.getDate() + ' de ' + MONTH_NAMES[selectedDate.getMonth()];
    list.innerHTML = '';

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
      list.appendChild(b);
    });

    confirmBtn.disabled = !selectedSlot;
  }

  function openBookingModal(){
    var overlay = document.getElementById('bookingOverlay');
    if(!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderCalendar();
    renderSlots();
  }

  function closeBookingModal(){
    var overlay = document.getElementById('bookingOverlay');
    if(!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function confirmBooking(){
    if(!selectedDate || !selectedSlot) return;
    var fecha = DAY_NAMES[selectedDate.getDay()] + ' ' + selectedDate.getDate() + ' de ' + MONTH_NAMES[selectedDate.getMonth()];
    var msg = 'Hola, quiero agendar una llamada el ' + fecha + ' a las ' + selectedSlot + '. Mi nombre es ___';
    var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank', 'noopener');
    closeBookingModal();
  }

  function initBooking(){
    var prevBtn = document.getElementById('bookingPrev');
    var nextBtn = document.getElementById('bookingNext');
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
    confirmBtn.addEventListener('click', confirmBooking);
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
    loadInclude('#header-placeholder', 'header.html').then(initHeaderScroll);
    loadInclude('#footer-placeholder', 'footer.html');
    loadInclude('#booking-placeholder', 'booking.html').then(initBooking);
  });

})();
