document.addEventListener('DOMContentLoaded', () => {
  const changePinForm = document.getElementById('changePinForm');
  if (!changePinForm) return;

  const oldPinInput = document.getElementById('oldPin');
  const newPinInput = document.getElementById('newPin');
  const confirmPinInput = document.getElementById('confirmPin');

  const errorOldPin = document.getElementById('errorOldPin');
  const errorNewPin = document.getElementById('errorNewPin');
  const errorConfirmPin = document.getElementById('errorConfirmPin');
  const formError = document.getElementById('formError');
  const cancelBtn = document.getElementById('cancelBtn');
  const changePinModal = document.getElementById('changePinModal');

  const BASE_URL = 'http://localhost:4000';
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login first');
    window.location.href = '/lineman/login_lineman.html';
    return;
  }

  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  function clearErrors() {
    errorOldPin.textContent = '';
    errorOldPin.style.display = 'none';
    errorNewPin.textContent = '';
    errorNewPin.style.display = 'none';
    errorConfirmPin.textContent = '';
    errorConfirmPin.style.display = 'none';
    formError.textContent = '';
    formError.style.display = 'none';
  }

  function closePinModal() {
    clearErrors();
    changePinForm.reset();
    changePinModal.classList.add('hidden');
  }

  cancelBtn.addEventListener('click', () => {
    closePinModal();
  });

  changePinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const oldPin = oldPinInput.value.trim();
    const newPin = newPinInput.value.trim();
    const confirmPin = confirmPinInput.value.trim();

    let hasError = false;

    if (!oldPin) {
      errorOldPin.textContent = 'Current PIN is required';
      errorOldPin.style.display = 'block';
      hasError = true;
    }

    if (!newPin) {
      errorNewPin.textContent = 'New PIN is required';
      errorNewPin.style.display = 'block';
      hasError = true;
    } else if (newPin.length < 4) {
      errorNewPin.textContent = 'New PIN must be at least 4 digits';
      errorNewPin.style.display = 'block';
      hasError = true;
    }

    if (!confirmPin) {
      errorConfirmPin.textContent = 'Confirm PIN is required';
      errorConfirmPin.style.display = 'block';
      hasError = true;
    } else if (confirmPin !== newPin) {
      errorConfirmPin.textContent = 'PINs do not match';
      errorConfirmPin.style.display = 'block';
      hasError = true;
    }

    if (hasError) return;

    try {
      const res = await fetch(`${BASE_URL}/api/pin/change`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ oldPin, newPin })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Show server error inline
        if (data.message.includes('Old PIN')) {
          errorOldPin.textContent = data.message;
          errorOldPin.style.display = 'block';
        } else if (data.message.includes('New PIN must be different')) {
          errorNewPin.textContent = data.message;
          errorNewPin.style.display = 'block';
        } else {
          formError.textContent = data.message || 'Something went wrong';
          formError.style.display = 'block';
        }
        return;
      }

      alert('PIN changed successfully!');
      closePinModal();

    } catch (err) {
      formError.textContent = 'Network error, please try again.';
      formError.style.display = 'block';
    }
  });
});
