const emailVerificationStep = document.getElementById('emailStep');
const passwordResetStep = document.getElementById('passwordResetStep');
const noAccountStep = document.getElementById('noAccountStep');
const accountStep = document.getElementById('accountStep');
const statusStep = document.getElementById('statusStep');
const feedbackStep = document.getElementById('feedbackStep');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackSubject = document.getElementById('feedbackSubject');
const feedbackMessageInput = document.getElementById('feedbackMessageInput');
const feedbackCharacterCount = document.getElementById('feedbackCharacterCount');
const feedbackFormMessage = document.getElementById('feedbackFormMessage');
const feedbackHistory = document.getElementById('feedbackHistory');
const feedbackLimitCount = document.getElementById('feedbackLimitCount');
const deleteMyFeedbackDialog = document.getElementById('deleteMyFeedbackDialog');
const deleteMyFeedbackTitle = document.getElementById('deleteMyFeedbackTitle');
const deleteMyFeedbackDescription = document.getElementById('deleteMyFeedbackDescription');
const sendFeedbackButton = document.getElementById('sendFeedbackButton');
const studentEmail = document.getElementById('studentEmail');
const otpCode = document.getElementById('otpCode');
const sendCodeButton = document.getElementById('sendCode');
const formMessage = document.getElementById('formMessage');
const recoverySignupLink = document.getElementById('recoverySignupLink');
const accountMessage = document.getElementById('accountMessage');
const statusNotice = document.getElementById('statusNotice');
const consent = document.getElementById('consent');
const isPasswordRecoveryMode = new URLSearchParams(window.location.search).get('mode') === 'recover';
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const passwordResetMessage = document.getElementById('passwordResetMessage');
const studentSitePassword = document.getElementById('studentSitePassword');
const confirmStudentSitePassword = document.getElementById('confirmStudentSitePassword');

let verifiedEmail = '';
let accessToken = '';
let refreshToken = '';
let countdownTimer;
let feedbackRefreshTimer;
let feedbackRefreshInFlight = false;
let feedbackDeleteInFlight = false;
let feedbackSubmissionInFlight = false;
let feedbackHistoryVersion = 0;
let currentFeedbackCount = 0;
let currentRegistration = null;
const MAX_FEEDBACK_COUNT = 3;

if (isPasswordRecoveryMode) {
  document.getElementById('formTitle').textContent = 'Đặt lại mật khẩu';
  document.getElementById('emailStepSubmit').textContent = 'Xác minh OTP để đặt mật khẩu mới';
  document.getElementById('consentText').textContent = 'Tôi đồng ý sử dụng email sinh viên để xác minh danh tính và đặt lại mật khẩu';
  sendCodeButton.textContent = 'Gửi email';
}

// hiện thông báo
function showMessage(element, message, state = 'error') {
  element.textContent = message;
  element.dataset.state = message ? state : '';
}

// đổi lỗi Supabase sang câu dễ hiểu
function friendlyRegistrationError(error, context) {
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();

  if (message.includes('for security purposes')) {
    const waitSeconds = message.match(/after\s+(\d+)\s+seconds?/);
    if (waitSeconds && Number(waitSeconds[1]) > 0) {
      return `Vì lý do bảo mật, bạn chỉ có thể yêu cầu gửi lại sau ${waitSeconds[1]} giây.`;
    }
    return 'Vì lý do bảo mật, hiện chưa thể gửi email xác minh. Vui lòng đợi một chút rồi thử lại.';
  }
  if (message.includes('token has expired') || message.includes('invalid token')) {
    return 'Mã OTP đã hết hạn hoặc không đúng. Hãy gửi mã mới nhất rồi nhập lại mã đó.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Bạn đã yêu cầu quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.';
  }
  if (
    message.includes('users_account_name_unique')
    || message.includes('users_account_name_key')
    || message.includes('account name already exists')
    || message.includes('minecraft account name already exists')
    || message.includes('duplicate key') && message.includes('account_name')
  ) {
    return 'Tên tài khoản này đã được sử dụng. Hãy chọn tên khác.';
  }
  if (
    message.includes('users_email_unique')
    || message.includes('users_pkey')
    || message.includes('email already exists')
    || message.includes('registration already exists')
    || message.includes('duplicate key') && message.includes('email')
  ) {
    return 'Email này đã có yêu cầu/tài khoản. Đang kiểm tra trạng thái đã lưu...';
  }
  if (message.includes('account name must be')) {
    return 'Tên tài khoản phải dài 3–16 ký tự, chỉ gồm chữ không dấu, số và dấu gạch dưới (_).';
  }
  if (message.includes('new password should be different from the old password')) {
    return 'Mật khẩu mới phải khác mật khẩu hiện tại. Vui lòng chọn mật khẩu khác.';
  }
  if (context === 'send' && (error.status === 429 || message.includes('email rate limit'))) {
    return 'Supabase đang giới hạn gửi email. Chờ một lúc rồi yêu cầu mã/link mới.';
  }
  return `${context}: ${error.message}`;
}

// chuyển bước quản lý tk
function showStep(step) {
  emailVerificationStep.hidden = step !== 'email';
  passwordResetStep.hidden = step !== 'passwordReset';
  noAccountStep.hidden = step !== 'noAccount';
  accountStep.hidden = step !== 'account';
  statusStep.hidden = step !== 'status';
  feedbackStep.hidden = step !== 'feedback';
  recoverySignupLink.hidden = true;
  showMessage(formMessage, '');
  showMessage(accountMessage, '');
  showMessage(statusNotice, '');
}

studentEmail.addEventListener('input', () => {
  if (isPasswordRecoveryMode && !recoverySignupLink.hidden) {
    recoverySignupLink.hidden = true;
    showMessage(formMessage, '');
  }
});

// check mail sinh viên
function getValidEmail() {
  const email = studentEmail.value.trim().toLowerCase();
  if (!/^[^\s@]+@student\.ctu\.edu\.vn$/.test(email)) {
    showMessage(formMessage, 'Vui lòng nhập email sinh viên hợp lệ có đuôi @student.ctu.edu.vn.');
    studentEmail.focus();
    return '';
  }
  return email;
}

// link quay lại sau khi bấm email
function getRegistrationRedirectUrl() {
  const redirectUrl = new URL(window.location.href);
  redirectUrl.hash = '';
  redirectUrl.search = '';
  if (isPasswordRecoveryMode) {
    redirectUrl.searchParams.set('mode', 'recover');
  }
  return redirectUrl.href;
}

// gửi request lên Supabase
async function supabaseRequest(path, body, token = window.SUPABASE_CONFIG?.anonKey, method = 'POST') {
  const config = window.SUPABASE_CONFIG;
  if (!config?.url || !config.anonKey) {
    throw new Error('Thiếu cấu hình Supabase. Tải lại trang hoặc kiểm tra index.js.');
  }

  const response = await fetch(`${config.url}${path}`, {
    method,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token || config.anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const responseText = await response.text();
  let result = null;
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }
  }

  if (!response.ok) {
    const message = result && typeof result === 'object'
      ? result.msg || result.message || result.error_description || result.error
      : result;
    const error = new Error(message || `Supabase trả về HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  return result;
}

// lấy user theo access token
async function getAuthenticatedUser(token) {
  const config = window.SUPABASE_CONFIG;
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`
    }
  });
  const user = await response.json();
  if (!response.ok) {
    throw new Error(user.message || user.msg || `Supabase trả về HTTP ${response.status}.`);
  }
  return user;
}

// xử lý khi quay về từ link email
async function handleEmailLinkCallback() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const errorDescription = fragment.get('error_description')
    || query.get('error_description')
    || fragment.get('error')
    || query.get('error');
  let token = fragment.get('access_token') || query.get('access_token');
  const tokenHash = query.get('token_hash');

  if (!errorDescription && !token && !tokenHash) return;

  window.history.replaceState(
    {},
    document.title,
    `${window.location.pathname}${isPasswordRecoveryMode ? '?mode=recover' : ''}`
  );

  if (errorDescription) {
    showMessage(formMessage, `Liên kết xác minh không dùng được: ${errorDescription}`);
    return;
  }

  refreshToken = fragment.get('refresh_token') || query.get('refresh_token') || '';
  try {
    if (!token && tokenHash) {
      const verifiedSession = await supabaseRequest('/auth/v1/verify', {
        token_hash: tokenHash,
        type: query.get('type') || (isPasswordRecoveryMode ? 'recovery' : 'email')
      });
      token = verifiedSession?.access_token;
      refreshToken = verifiedSession?.refresh_token || refreshToken;
      if (!token) {
        throw new Error('Supabase không trả về phiên đăng nhập sau khi xác minh liên kết.');
      }
    }

    const user = await getAuthenticatedUser(token);
    const email = String(user.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@student\.ctu\.edu\.vn$/.test(email)) {
      throw new Error('Email đã xác minh không thuộc miền @student.ctu.edu.vn.');
    }

    accessToken = token;
    verifiedEmail = email;
    studentEmail.value = email;
    otpCode.value = '';
    showStep('email');
    showMessage(
      formMessage,
      isPasswordRecoveryMode
        ? 'Email đã được xác minh qua liên kết đặt lại. Tích vào ô đồng ý rồi bấm nút bên dưới để tiếp tục.'
        : 'Email đã được xác minh qua liên kết. Tích vào ô đồng ý rồi bấm “Xác minh & tiếp tục”.',
      'success'
    );
  } catch (error) {
    accessToken = '';
    refreshToken = '';
    console.error('Không thể xử lý liên kết xác minh Supabase:', error);
    showMessage(formMessage, `Không xử lý được liên kết xác minh: ${error.message}`);
  }
}

// request có thử làm mới phiên nếu hết hạn
async function authenticatedRequest(path, body, method = 'POST') {
  try {
    return await supabaseRequest(path, body, accessToken, method);
  } catch (error) {
    if (error.status !== 401 || !refreshToken) throw error;

    const session = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
      refresh_token: refreshToken
    });
    accessToken = session.access_token;
    refreshToken = session.refresh_token || refreshToken;
    return supabaseRequest(path, body, accessToken, method);
  }
}

// đếm ngược trước khi gửi lại mail
function startSendCooldown() {
  window.clearInterval(countdownTimer);
  let secondsRemaining = 60;
  sendCodeButton.disabled = true;
  sendCodeButton.textContent = `Chờ (${secondsRemaining}s)`;
  countdownTimer = window.setInterval(() => {
    secondsRemaining -= 1;
    if (secondsRemaining <= 0) {
      window.clearInterval(countdownTimer);
      sendCodeButton.disabled = false;
      sendCodeButton.textContent = isPasswordRecoveryMode ? 'Gửi lại mã' : 'Gửi lại';
      return;
    }
    sendCodeButton.textContent = `Chờ (${secondsRemaining}s)`;
  }, 1000);
}

// gửi mã xác minh
sendCodeButton.addEventListener('click', async () => {
  const email = getValidEmail();
  if (!email || sendCodeButton.disabled) return;

  recoverySignupLink.hidden = true;
  verifiedEmail = '';
  otpCode.value = '';
  sendCodeButton.disabled = true;
  sendCodeButton.textContent = 'Đang gửi...';
  showMessage(
    formMessage,
    isPasswordRecoveryMode ? 'Đang yêu cầu gửi mã đặt lại mật khẩu...' : 'Đang yêu cầu gửi mã xác minh...',
    'info'
  );

  try {
    const redirectTo = encodeURIComponent(getRegistrationRedirectUrl());
    if (isPasswordRecoveryMode) {
      await supabaseRequest(`/auth/v1/recover?redirect_to=${redirectTo}`, { email });
    } else {
      await supabaseRequest(`/auth/v1/otp?redirect_to=${redirectTo}`, {
        email,
        create_user: true
      });
    }
    verifiedEmail = email;
    otpCode.value = '';
    showMessage(
      formMessage,
      isPasswordRecoveryMode
        ? 'Nếu email có tài khoản, mã đặt lại đã được gửi. Kiểm tra hộp thư đến và thư mục Spam.'
        : 'Đã gửi email xác minh. Kiểm tra hộp thư đến và thư mục Spam.',
      'success'
    );
    recoverySignupLink.hidden = !isPasswordRecoveryMode;
    startSendCooldown();
    otpCode.focus();
  } catch (error) {
    console.error('Không thể gửi email xác minh Supabase:', error);
    showMessage(
      formMessage,
      friendlyRegistrationError(
        error,
        isPasswordRecoveryMode ? 'Không gửi được email đặt lại mật khẩu' : 'Không gửi được email xác minh'
      )
    );
    sendCodeButton.disabled = false;
    sendCodeButton.textContent = isPasswordRecoveryMode ? 'Gửi mã đặt lại' : 'Gửi email';
  }
});

// xác minh email rồi qua bước quản lý tk
emailVerificationStep.addEventListener('submit', async event => {
  event.preventDefault();

  const email = getValidEmail();
  if (!email) return;
  if (!verifiedEmail || email !== verifiedEmail) {
    showMessage(
      formMessage,
      isPasswordRecoveryMode
        ? 'Hãy gửi mã đặt lại cho email này trước khi tiếp tục.'
        : 'Hãy gửi mã xác minh cho email này trước khi tiếp tục.'
    );
    return;
  }
  if (!consent.checked) {
    showMessage(
      formMessage,
      isPasswordRecoveryMode
        ? 'Vui lòng xác nhận đồng ý sử dụng email để xác minh và đặt lại mật khẩu.'
        : 'Vui lòng xác nhận đồng ý sử dụng email để xác minh và xét duyệt yêu cầu tài khoản.'
    );
    consent.focus();
    return;
  }
  if (!accessToken && !/^\d{8}$/.test(otpCode.value.trim())) {
    showMessage(formMessage, 'Nhập đủ mã OTP 8 chữ số trong email hoặc mở liên kết xác minh được gửi tới email.');
    otpCode.focus();
    return;
  }

  const submitButton = emailVerificationStep.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage(formMessage, accessToken ? 'Đang tiếp tục...' : 'Đang xác minh mã...', 'info');

  try {
    if (!accessToken) {
      const result = await supabaseRequest('/auth/v1/verify', {
        email,
        token: otpCode.value.trim(),
        type: isPasswordRecoveryMode ? 'recovery' : 'email'
      });
      if (!result?.access_token) {
        throw new Error('Supabase không trả về phiên đăng nhập sau khi xác minh.');
      }

      accessToken = result.access_token;
      refreshToken = result.refresh_token || '';
    }

    if (isPasswordRecoveryMode) {
      const registration = await loadRegistrationStatus();
      if (!registration) {
        document.getElementById('noAccountEmail').textContent = email;
        showStep('noAccount');
        return;
      }
      document.getElementById('passwordResetEmail').textContent = email;
      showStep('passwordReset');
      newPasswordInput.focus();
      return;
    }

    document.getElementById('verifiedEmail').value = email;
    const existingRegistration = await loadRegistrationStatus();
    if (existingRegistration) {
      showExistingRegistration(existingRegistration);
      return;
    }

    showStep('account');
    document.getElementById('accountName').focus();
  } catch (error) {
    console.error('Không thể xác minh OTP Supabase:', error);
    showMessage(formMessage, friendlyRegistrationError(error, 'Không thể tiếp tục xác minh'));
    otpCode.focus();
  } finally {
    submitButton.disabled = false;
  }
});

passwordResetStep.addEventListener('submit', async event => {
  event.preventDefault();
  const password = newPasswordInput.value;
  if (password.length < 8) {
    showMessage(passwordResetMessage, 'Mật khẩu mới phải có ít nhất 8 ký tự.');
    newPasswordInput.focus();
    return;
  }
  if (password !== confirmNewPasswordInput.value) {
    showMessage(passwordResetMessage, 'Hai mật khẩu không khớp.');
    confirmNewPasswordInput.focus();
    return;
  }
  if (!accessToken) {
    showMessage(passwordResetMessage, 'Phiên xác minh đã hết. Hãy yêu cầu mã đặt lại mới.');
    return;
  }

  const submitButton = passwordResetStep.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage(passwordResetMessage, 'Đang cập nhật mật khẩu', 'info');
  try {
    await authenticatedRequest('/auth/v1/user', { password }, 'PUT');
    newPasswordInput.value = '';
    confirmNewPasswordInput.value = '';
    if (!currentRegistration) {
      document.getElementById('noAccountEmail').textContent = verifiedEmail;
      showStep('noAccount');
      return;
    }
    showExistingRegistration(currentRegistration);
    showMessage(statusNotice, 'Cảm ơn bạn đã cập nhật mật khẩu. Mật khẩu website mới đã được lưu thành công.', 'success');
  } catch (error) {
    console.error('Không thể đặt lại mật khẩu Supabase Auth:', error);
    showMessage(passwordResetMessage, friendlyRegistrationError(error, 'Không thể đặt mật khẩu mới'));
  } finally {
    submitButton.disabled = false;
  }
});

// hiện trạng thái yêu cầu
function renderRegistrationStatus(registration) {
  const statusLabels = {
    pending: 'ĐANG CHỜ DUYỆT',
    verified: 'ĐÃ XÁC MINH',
    banned: 'ĐÃ VÔ HIỆU HÓA'
  };
  const status = String(registration.status || 'pending').toLowerCase();
  const badge = document.getElementById('registrationStatusBadge');
  badge.textContent = statusLabels[status] || status.toUpperCase();
  badge.dataset.status = status;
  document.getElementById('submittedAccount').textContent = registration.account_name;
  document.getElementById('submittedEmail').textContent = registration.email;

  const descriptions = {
    pending: 'Yêu cầu đã được gửi đến quản trị viên và sẽ được xét duyệt thủ công. Quá trình này có thể mất vài ngày tùy theo số lượng yêu cầu đang chờ; tài khoản sẽ được kích hoạt sau khi hoàn tất xét duyệt.',
    verified: 'Tài khoản đã được quản trị viên xác minh.',
    banned: 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.'
  };
  document.querySelector('.status-copy').textContent = descriptions[status]
    || 'Trạng thái tài khoản đã được cập nhật.';
}

// đọc trạng thái đã lưu
async function loadRegistrationStatus() {
  const result = await authenticatedRequest(
    '/rest/v1/rpc/get_my_registration_status',
    {}
  );
  const registration = Array.isArray(result) ? result[0] : result;
  currentRegistration = registration || null;
  if (registration) {
    renderRegistrationStatus(registration);
  }
  return registration || null;
}

const feedbackStatusLabels = {
  submitted: 'Đã gửi',
  new: 'Đã gửi',
  in_progress: 'Đang xem xét',
  resolved: 'Đã hoàn tất',
  cancelled: 'Đã hủy'
};

const feedbackSubjectLabels = {
  password: 'Thay đổi mật khẩu',
  username: 'Thay đổi tên tài khoản',
  account: 'Hỗ trợ hệ thống',
  other: 'Vấn đề khác'
};

function updateFeedbackLimit(count) {
  currentFeedbackCount = count;
  const limitReached = count >= MAX_FEEDBACK_COUNT;
  feedbackLimitCount.textContent = `${count}/${MAX_FEEDBACK_COUNT} phản hồi đã gửi`;
  feedbackLimitCount.dataset.limitReached = String(limitReached);
  feedbackMessageInput.disabled = limitReached;
  document.querySelectorAll('.feedback-preset').forEach(button => {
    button.disabled = limitReached;
  });
  sendFeedbackButton.disabled = limitReached || feedbackSubmissionInFlight;
}

function renderFeedbackHistory(feedbackItems) {
  updateFeedbackLimit(feedbackItems.length);
  feedbackHistory.replaceChildren();
  if (feedbackItems.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'feedback-empty';
    emptyMessage.textContent = 'Bạn chưa gửi phản hồi nào.';
    feedbackHistory.append(emptyMessage);
    return;
  }

  for (const item of feedbackItems) {
    const card = document.createElement('article');
    card.className = 'feedback-history-card';
    const heading = document.createElement('div');
    heading.className = 'feedback-history-card-heading';
    const subject = document.createElement('h3');
    subject.textContent = feedbackSubjectLabels[item.subject] || item.subject;
    const status = document.createElement('span');
    status.className = `feedback-status-badge feedback-status-${item.status}`;
    status.textContent = feedbackStatusLabels[item.status] || item.status;
    heading.append(subject, status);

    const message = document.createElement('p');
    message.className = 'feedback-history-message';
    message.textContent = item.message;
    const createdAt = document.createElement('time');
    createdAt.className = 'feedback-history-date';
    createdAt.dateTime = item.created_at;
    createdAt.textContent = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(item.created_at));
    const footer = document.createElement('div');
    footer.className = 'feedback-history-card-footer';
    footer.append(createdAt);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'feedback-delete-button';
    deleteButton.dataset.feedbackId = item.id;
    if (item.status === 'resolved') {
      deleteButton.classList.add('is-completed');
      deleteButton.textContent = 'Xóa phản hồi đã hoàn tất (khuyến nghị)';
      deleteButton.setAttribute('aria-label', `Xóa phản hồi đã hoàn tất: ${feedbackSubjectLabels[item.subject] || item.subject}`);
    } else if (item.status === 'cancelled') {
      deleteButton.classList.add('is-cancelled');
      deleteButton.textContent = 'Xóa phản hồi đã bị hủy (khuyến nghị)';
      deleteButton.setAttribute('aria-label', `Xóa phản hồi đã bị hủy: ${feedbackSubjectLabels[item.subject] || item.subject}`);
    } else {
      deleteButton.textContent = 'Xóa';
      deleteButton.setAttribute('aria-label', `Xóa phản hồi: ${feedbackSubjectLabels[item.subject] || item.subject}`);
    }
    footer.append(deleteButton);
    card.append(heading, message);

    if (item.moderator_reply) {
      const reply = document.createElement('div');
      reply.className = 'feedback-moderator-reply';
      const replyHeading = document.createElement('strong');
      replyHeading.textContent = item.moderator_reply_by
        ? `Phản hồi từ ${item.moderator_reply_by}`
        : 'Phản hồi từ quản trị viên';
      const replyText = document.createElement('p');
      replyText.textContent = item.moderator_reply;
      reply.append(replyHeading, replyText);
      card.append(reply);
    }
    card.append(footer);
    feedbackHistory.append(card);
  }
}

async function loadMyFeedback() {
  const version = feedbackHistoryVersion;
  const result = await authenticatedRequest('/rest/v1/rpc/list_my_feedback', {});
  if (!Array.isArray(result)) {
    throw new Error('Danh sách phản hồi từ Supabase không đúng định dạng.');
  }
  if (version === feedbackHistoryVersion) {
    renderFeedbackHistory(result);
  }
  return result;
}

async function refreshFeedbackHistory() {
  if (feedbackRefreshInFlight || feedbackDeleteInFlight || feedbackStep.hidden) return false;
  feedbackRefreshInFlight = true;
  try {
    await loadMyFeedback();
    return true;
  } catch (error) {
    console.error('Không thể cập nhật lịch sử phản hồi:', error);
    showMessage(
      feedbackFormMessage,
      `Không thể cập nhật phản hồi: ${feedbackActionErrorMessage(error)}`
    );
    return false;
  } finally {
    feedbackRefreshInFlight = false;
  }
}

function startFeedbackRefresh() {
  window.clearInterval(feedbackRefreshTimer);
  feedbackRefreshTimer = window.setInterval(() => {
    if (!document.hidden) void refreshFeedbackHistory();
  }, 5000);
}

function confirmFeedbackDeletion(item, status) {
  const isCompleted = status === 'resolved';
  const isCancelled = status === 'cancelled';
  const subject = feedbackSubjectLabels[item.subject] || item.subject;
  deleteMyFeedbackDialog.classList.toggle('is-completed', isCompleted);
  deleteMyFeedbackDialog.classList.toggle('is-cancelled', isCancelled);
  deleteMyFeedbackTitle.textContent = isCompleted || isCancelled
    ? 'Dọn phản hồi này?'
    : 'Xóa phản hồi này?';
  deleteMyFeedbackDescription.textContent = isCompleted
    ? `“${subject}” đã hoàn tất. Bạn có thể xóa phản hồi này để dọn dữ liệu không còn cần thiết. Thao tác này không thể hoàn tác.`
    : isCancelled
      ? `“${subject}” đã bị hủy. Bạn có thể xóa phản hồi này để dọn dữ liệu không còn cần thiết. Thao tác này không thể hoàn tác.`
      : `Bạn sắp xóa phản hồi “${subject}”. Thao tác này không thể hoàn tác.`;
  deleteMyFeedbackDialog.returnValue = '';

  return new Promise(resolve => {
    deleteMyFeedbackDialog.addEventListener('close', () => {
      resolve(deleteMyFeedbackDialog.returnValue === 'delete');
    }, { once: true });
    deleteMyFeedbackDialog.showModal();
  });
}

function feedbackActionErrorMessage(error) {
  const message = String(error?.message || error);
  const normalized = message.toLowerCase();
  if (normalized.includes('feedback item not found')) {
    return 'Phản hồi này không còn tồn tại. Có thể bạn hoặc quản trị viên đã xóa phản hồi; danh sách sẽ được làm mới.';
  }
  if (normalized.includes('could not find the function')
    || normalized.includes('function') && normalized.includes('schema cache')) {
    return 'Supabase chưa nhận diện chức năng này. Hãy áp dụng migration trong supabase/migrations rồi tải lại trang.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
    return 'Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng rồi thử lại.';
  }
  if (normalized.includes('moderator reply cannot exceed 200 characters')) {
    return 'Phản hồi của quản trị viên vượt quá giới hạn 200 ký tự.';
  }
  if (error?.status === 400) {
    return 'Yêu cầu không hợp lệ hoặc phản hồi đã thay đổi. Hãy tải lại trang rồi thử lại.';
  }
  if (error?.status >= 500) {
    return 'Máy chủ đang gặp sự cố khi xử lý phản hồi. Vui lòng thử lại sau.';
  }
  return 'Không thể xử lý phản hồi lúc này. Vui lòng thử lại; nếu lỗi tiếp diễn, hãy liên hệ quản trị viên.';
}

feedbackHistory.addEventListener('click', async event => {
  const button = event.target instanceof Element
    ? event.target.closest('.feedback-delete-button')
    : null;
  if (!button || feedbackDeleteInFlight) return;

  const feedbackId = button.dataset.feedbackId;
  const card = button.closest('.feedback-history-card');
  if (!feedbackId) {
    showMessage(feedbackFormMessage, 'Không xác định được phản hồi cần xóa.');
    return;
  }
  const item = { subject: card?.querySelector('h3')?.textContent || 'phản hồi này' };
  const status = button.classList.contains('is-completed')
    ? 'resolved'
    : button.classList.contains('is-cancelled')
      ? 'cancelled'
      : '';
  if (!(await confirmFeedbackDeletion(item, status))) return;

  feedbackDeleteInFlight = true;
  feedbackHistoryVersion += 1;
  button.disabled = true;
  showMessage(feedbackFormMessage, 'Đang xóa phản hồi...', 'info');
  let deleted = false;
  try {
    await authenticatedRequest('/rest/v1/rpc/delete_my_feedback', {
      p_feedback_id: feedbackId
    });
    deleted = true;
    button.closest('.feedback-history-card')?.remove();
    await loadMyFeedback();
    showMessage(feedbackFormMessage, 'Đã xóa phản hồi.', 'success');
  } catch (error) {
    console.error(deleted ? 'Đã xóa phản hồi nhưng không thể tải lại lịch sử:' : 'Không thể xóa phản hồi:', error);
    const isMissing = String(error?.message || error).toLowerCase().includes('feedback item not found');
    if (isMissing) {
      card?.remove();
      let refreshErrorMessage = '';
      try {
        await loadMyFeedback();
      } catch (refreshError) {
        console.error('Không thể làm mới lịch sử phản hồi:', refreshError);
        refreshErrorMessage = ' Không thể tải lại lịch sử; vui lòng thử làm mới trang.';
      }
      showMessage(
        feedbackFormMessage,
        `Phản hồi này không còn tồn tại. Có thể bạn hoặc quản trị viên đã xóa phản hồi.${refreshErrorMessage}`,
        refreshErrorMessage ? 'error' : 'info'
      );
      if (!deleted) button.disabled = false;
      return;
    }
    showMessage(
      feedbackFormMessage,
      deleted
        ? `Đã xóa phản hồi nhưng không thể tải lại lịch sử: ${feedbackActionErrorMessage(error)}`
        : `Không thể xóa phản hồi: ${feedbackActionErrorMessage(error)}`
    );
    if (!deleted) button.disabled = false;
  } finally {
    feedbackDeleteInFlight = false;
  }
});

// hiện yêu cầu đã có sẵn
function showExistingRegistration(registration) {
  currentRegistration = registration;
  renderRegistrationStatus(registration);
  showStep('status');
}

document.getElementById('createAccountFromRecovery').addEventListener('click', () => {
  document.getElementById('verifiedEmail').value = verifiedEmail;
  showStep('account');
  document.getElementById('accountName').focus();
});

// gửi yêu cầu thay đổi tk
accountStep.addEventListener('submit', async event => {
  event.preventDefault();

  const accountName = document.getElementById('accountName').value.trim();
  const password = studentSitePassword.value;
  if (!/^[A-Za-z0-9_]{3,16}$/.test(accountName)) {
    showMessage(accountMessage, 'Tên tài khoản phải dài 3–16 ký tự, chỉ gồm chữ không dấu, số và dấu gạch dưới (_), không có dấu cách.');
    document.getElementById('accountName').focus();
    return;
  }
  if (password.length < 8) {
    showMessage(accountMessage, 'Mật khẩu đăng nhập phải có ít nhất 8 ký tự.');
    studentSitePassword.focus();
    return;
  }
  if (password !== confirmStudentSitePassword.value) {
    showMessage(accountMessage, 'Hai mật khẩu không khớp.');
    confirmStudentSitePassword.focus();
    return;
  }
  if (!accessToken) {
    showMessage(accountMessage, 'Phiên xác minh đã hết. Hãy xác minh email lại.');
    return;
  }

  const submitButton = accountStep.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  showMessage(accountMessage, 'Đang thiết lập mật khẩu và gửi yêu cầu tài khoản...', 'info');

  try {
    await authenticatedRequest('/auth/v1/user', { password }, 'PUT');
    await authenticatedRequest(
      '/rest/v1/rpc/submit_registration_request',
      { p_account_name: accountName }
    );
    const registration = await loadRegistrationStatus();
    if (!registration) {
      throw new Error('Yêu cầu đã gửi nhưng chưa tìm thấy trạng thái lưu. Hãy làm mới trạng thái hoặc liên hệ quản trị viên.');
    }
    studentSitePassword.value = '';
    confirmStudentSitePassword.value = '';
    showStep('status');
  } catch (error) {
    console.error('Không thể gửi yêu cầu tài khoản:', error);
    if (friendlyRegistrationError(error, '').startsWith('Email này đã có')) {
      try {
        const existingRegistration = await loadRegistrationStatus();
        if (existingRegistration) {
          showExistingRegistration(existingRegistration);
          return;
        }
      } catch (statusError) {
        console.error('Không thể kiểm tra trạng thái email đã lưu:', statusError);
      }
    }
    showMessage(accountMessage, friendlyRegistrationError(error, 'Không gửi được yêu cầu tài khoản'));
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById('openFeedbackButton').addEventListener('click', async () => {
  showStep('feedback');
  feedbackHistory.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'feedback-empty';
  loading.textContent = 'Đang tải phản hồi...';
  feedbackHistory.append(loading);
  await refreshFeedbackHistory();
  startFeedbackRefresh();
});

document.getElementById('backToStatusButton').addEventListener('click', () => {
  window.clearInterval(feedbackRefreshTimer);
  showStep('status');
});

document.querySelectorAll('.password-visibility-toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const input = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!input) return;
    const isVisible = input.type === 'password';
    input.type = isVisible ? 'text' : 'password';
    toggle.querySelector('img').src = isVisible
      ? 'public/eye-open.png'
      : 'public/eye-closed.png';
    toggle.setAttribute('aria-label', `${isVisible ? 'Ẩn' : 'Hiện'} mật khẩu`);
    toggle.setAttribute('aria-pressed', String(isVisible));
  });
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !feedbackStep.hidden) {
    void refreshFeedbackHistory();
  }
});

document.querySelectorAll('.feedback-preset').forEach(button => {
  button.addEventListener('click', () => {
    feedbackSubject.value = button.dataset.subject;
    feedbackMessageInput.value = button.dataset.template;
    feedbackCharacterCount.textContent = `${feedbackMessageInput.value.length}/200`;
    document.querySelectorAll('.feedback-preset').forEach(preset => {
      const isSelected = preset === button;
      preset.setAttribute('aria-pressed', String(isSelected));
      preset.classList.toggle('is-selected', isSelected);
    });
    feedbackMessageInput.focus();
  });
});

feedbackMessageInput.addEventListener('input', () => {
  feedbackCharacterCount.textContent = `${feedbackMessageInput.value.length}/200`;
});

feedbackForm.addEventListener('submit', async event => {
  event.preventDefault();
  const subject = feedbackSubject.value;
  const message = feedbackMessageInput.value.trim();
  if (!message) {
    showMessage(feedbackFormMessage, 'Vui lòng nhập nội dung phản hồi.');
    feedbackMessageInput.focus();
    return;
  }
  if (message.length > 200) {
    showMessage(feedbackFormMessage, 'Nội dung phản hồi không được vượt quá 200 ký tự.');
    return;
  }

  feedbackSubmissionInFlight = true;
  sendFeedbackButton.disabled = true;
  showMessage(feedbackFormMessage, 'Đang gửi phản hồi...', 'info');
  try {
    const existingFeedback = await loadMyFeedback();
    if (existingFeedback.length >= MAX_FEEDBACK_COUNT) {
      updateFeedbackLimit(existingFeedback.length);
      showMessage(feedbackFormMessage, 'Bạn đã đạt giới hạn 3 phản hồi. Hãy xóa một phản hồi cũ nếu cần gửi phản hồi mới.');
      return;
    }
    await authenticatedRequest('/rest/v1/rpc/submit_my_feedback', {
      p_subject: subject,
      p_message: message
    });
    feedbackForm.reset();
    document.querySelectorAll('.feedback-preset').forEach(preset => {
      preset.setAttribute('aria-pressed', 'false');
      preset.classList.remove('is-selected');
    });
    await loadMyFeedback();
    feedbackCharacterCount.textContent = '0/200';
    showMessage(feedbackFormMessage, 'Đã gửi phản hồi. Bạn có thể theo dõi cập nhật tại đây.', 'success');
  } catch (error) {
    console.error('Không thể gửi phản hồi:', error);
    showMessage(feedbackFormMessage, `Không thể gửi phản hồi: ${error.message}`);
  } finally {
    feedbackSubmissionInFlight = false;
    updateFeedbackLimit(currentFeedbackCount);
  }
});

// chỉ nhận số, tối đa 8 số
otpCode.addEventListener('input', () => {
  otpCode.value = otpCode.value.replace(/\D/g, '').slice(0, 8);
});

// xử lý link xác minh nếu có
void handleEmailLinkCallback();
