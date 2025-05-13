 document.addEventListener('DOMContentLoaded', () => {
    const regLink = document.getElementById('register-link');
    const widgetContainer = document.getElementById('ticket-widget-container');

    if (!regLink) {
      console.error('❌ register-link not found');
      return;
    }
    if (!widgetContainer) {
      console.error('❌ widget container not found');
      return;
    }

    regLink.addEventListener('click', e => {
      e.preventDefault();
      console.log('✅ link clicked, showing widget');
      widgetContainer.style.display = 'block';
      widgetContainer.scrollIntoView({ behavior: 'smooth' });
    });
  });