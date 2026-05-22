// Optional logo preview for login/signup/forgot pages
(function () {
  function bind() {
    const input = document.getElementById('logo-input');
    const preview = document.getElementById('logo-preview');
    if (!input || !preview) return;

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) {
        preview.style.backgroundImage = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        preview.style.backgroundImage = 'url(' + reader.result + ')';
      };
      reader.readAsDataURL(file);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

