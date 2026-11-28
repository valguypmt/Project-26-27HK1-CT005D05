
const SUPABASE_URL = 'https://jopyswntrgtgbsezgwkn.supabase.co';   
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcHlzd250cmd0Z2JzZXpnd2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTc2NDIsImV4cCI6MjEwNzYzMzY0Mn0.C0JTJwg_zgPqT7JCyPVqqR3-lKMb2EQHFOUpVGdZD1s';
// Replace the above values with your actual Supabase project URL and anon key. Do not share these values publicly.

window.SUPABASE_CONFIG = Object.freeze({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
});

const lookupForm = document.getElementById('lookupForm');
if (lookupForm) {
  const searchEmailInput = document.getElementById('searchEmailInput');
  const searchPasswordInput = document.getElementById('searchPasswordInput');
  const searchPasswordToggle = document.getElementById('searchPasswordToggle');
  const ctaView = document.getElementById('ctaView');
  const ctaMsg = document.getElementById('ctaMsg');
  const loadingView = document.getElementById('loadingView');
  const infoView = document.getElementById('infoView');
  const searchButton = lookupForm.querySelector('button[type="submit"]');

  function showLookupMessage(message, isError = false) {
    ctaMsg.textContent = message;
    ctaMsg.style.color = isError ? '#ef4444' : '';
    ctaView.classList.remove('hidden');
    infoView.classList.add('hidden');
  }

  async function readResponse(response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  function getResponseMessage(result, fallback) {
    const message = result && typeof result === 'object'
      ? result.msg
        || result.message
        || result.error_description
        || result.error
        || fallback
      : typeof result === 'string' ? result : fallback;

    if (/invalid login credentials|invalid email or password/i.test(message)) {
      return 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại hoặc chọn “Quên mật khẩu?” nếu bạn không nhớ mật khẩu.';
    }
    return message;
  }

  lookupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = searchEmailInput.value.trim().toLowerCase();
    const password = searchPasswordInput.value;
    if (!/^[^\s@]+@student\.ctu\.edu\.vn$/.test(email)) {
      showLookupMessage('Nhập email sinh viên hợp lệ có đuôi @student.ctu.edu.vn.', true);
      searchEmailInput.focus();
      return;
    }
    if (!password) {
      showLookupMessage('Nhập mật khẩu đăng nhập.', true);
      searchPasswordInput.focus();
      return;
    }

    ctaView.classList.add('hidden');
    infoView.classList.add('hidden');
    loadingView.classList.remove('hidden');
    searchButton.disabled = true;

    try {
      const authResponse = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        }
      );
      const session = await readResponse(authResponse);
      if (!authResponse.ok || !session?.access_token) {
        throw new Error(getResponseMessage(session, 'Email hoặc mật khẩu không đúng.'));
      }

      const statusResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_my_registration_status`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: '{}'
        }
      );
      const registrations = await readResponse(statusResponse);
      if (!statusResponse.ok) {
        throw new Error(getResponseMessage(registrations, `Supabase returned HTTP ${statusResponse.status}.`));
      }
      if (!Array.isArray(registrations) || !registrations[0]) {
        throw new Error('Chưa tìm thấy yêu cầu tài khoản cho email này.');
      }

      const account = registrations[0];
      const statusLabels = {
        verified: 'Đã xác minh',
        pending: 'Đang chờ',
        banned: 'Bị cấm sử dụng'
      };
      const status = String(account.status || 'unknown').toLowerCase();
      const statusTag = document.getElementById('resStatusTag');
      document.getElementById('resEmail').textContent = account.email || email;
      document.getElementById('resAccountName').textContent = account.account_name || '—';
      statusTag.textContent = statusLabels[status] || status.toUpperCase();
      statusTag.className = `status-tag status-${Object.prototype.hasOwnProperty.call(statusLabels, status) ? status : 'unknown'}`;
      infoView.classList.remove('hidden');
    } catch (error) {
      console.error('Không thể tra cứu tài khoản:', error);
      showLookupMessage(error.message || 'Không thể tra cứu tài khoản. Thử lại sau.', true);
    } finally {
      loadingView.classList.add('hidden');
      searchButton.disabled = false;
    }
  });

  searchPasswordToggle.addEventListener('click', () => {
    const isVisible = searchPasswordInput.type === 'password';
    searchPasswordInput.type = isVisible ? 'text' : 'password';
    searchPasswordToggle.querySelector('img').src = isVisible
      ? 'public/eye-open.png'
      : 'public/eye-closed.png';
    searchPasswordToggle.setAttribute('aria-label', `${isVisible ? 'Ẩn' : 'Hiện'} mật khẩu`);
    searchPasswordToggle.setAttribute('aria-pressed', String(isVisible));
  });
}

        const bgOverlay = document.getElementById('bgOverlay');
        const navbar = document.getElementById('navbar');

        // cuộn trang thì đổi độ tối nền + thanh điều hướng
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const heroHeight = window.innerHeight;
            const fadeProgress = Math.min(scrollY / (heroHeight * 0.8), 1);
            const overlayOpacity = 0.4 + (fadeProgress * 0.6);
            
            if (bgOverlay) bgOverlay.style.opacity = overlayOpacity;
            if (navbar) {
                if (scrollY > 50) {
                    navbar.classList.add('bg-[#0f1115]/90', 'shadow-lg');
                    navbar.classList.remove('bg-black/20');
                } else {
                    navbar.classList.remove('bg-[#0f1115]/90', 'shadow-lg');
                    navbar.classList.add('bg-black/20');
                }
            }
        });

// mở ảnh lớn và tự chuyển ảnh
const sectionTwoCarousel = document.querySelector('.section-two-carousel');
if (sectionTwoCarousel) {
  const lightbox = document.querySelector('.image-lightbox');
  const lightboxImage = lightbox.querySelector('.image-lightbox-main');
  const lightboxChoices = [...lightbox.querySelectorAll('.image-lightbox-choice')];
  const slides = lightboxChoices.map((choice) => {
    const thumbnail = choice.querySelector('img');
    return {
      src: thumbnail.getAttribute('src'),
      alt: thumbnail.alt
    };
  });
  const transitionDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 750;
  let currentImage = sectionTwoCarousel.querySelector('.section-two-image');
  let currentSlide = 0;

  if (slides.length > 0) {
    currentImage.src = slides[0].src;
    currentImage.alt = slides[0].alt;
  }

  const selectLightboxSlide = (slideIndex) => {
    lightboxImage.src = slides[slideIndex].src;
    lightboxImage.alt = slides[slideIndex].alt;
    lightboxChoices.forEach((choice, index) => {
      choice.setAttribute('aria-pressed', String(index === slideIndex));
    });
  };

  sectionTwoCarousel.addEventListener('click', (event) => {
    if (!event.target.closest('.section-two-image')) return;
    const displayedImage = event.target.closest('.section-two-image');
    const slideIndex = slides.findIndex((slide) => slide.src === displayedImage.getAttribute('src'));
    if (slideIndex < 0) return;
    selectLightboxSlide(slideIndex);
    lightbox.showModal();
  });

  lightbox.querySelector('.image-lightbox-close').addEventListener('click', () => {
    lightbox.close();
  });

  lightboxChoices.forEach((choice, index) => {
    choice.addEventListener('click', () => {
      selectLightboxSlide(index);
    });
  });

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) lightbox.close();
  });

  const showNextSlide = () => {
    const nextSlide = (currentSlide + 1) % slides.length;
    const nextImage = document.createElement('img');
    nextImage.className = 'section-two-image section-two-image-entering';
    nextImage.src = slides[nextSlide].src;
    nextImage.alt = slides[nextSlide].alt;
    sectionTwoCarousel.append(nextImage);

    requestAnimationFrame(() => {
      nextImage.classList.add('is-visible');
      currentImage.classList.add('is-exiting');

      window.setTimeout(() => {
        currentImage.remove();
        nextImage.classList.remove('section-two-image-entering', 'is-visible');
        currentImage = nextImage;
        currentSlide = nextSlide;
        window.setTimeout(showNextSlide, 5000);
      }, transitionDuration);
    });
  };

  window.setTimeout(showNextSlide, 5000);
}

// bấm câu hỏi để mở hoặc đóng câu trả lời
document.querySelectorAll('.faq-question').forEach((question) => {
  question.addEventListener('click', () => {
    const isExpanded = question.getAttribute('aria-expanded') === 'true';
    const answer = document.getElementById(question.getAttribute('aria-controls'));
    question.setAttribute('aria-expanded', String(!isExpanded));
    answer.setAttribute('aria-hidden', String(isExpanded));
    question.closest('.faq-item').classList.toggle('is-open', !isExpanded);
  });
});
 