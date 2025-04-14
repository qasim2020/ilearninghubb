// ... existing code ...
	if($('.contact-form').length){
		$('.contact-form').validate({
			rules: {
				username: {
					required: true
				},
				email: {
					required: true,
					email: true
				},
				phone: {
					required: true
				},
				service: {
					required: true
				},
				message: {
					required: true
				}
			}
		});
	}
// ... existing code ...

// Add a function to handle form submission success and error messages
$(document).ready(function() {
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    
    if (message === 'success') {
        // Show success message
        alert('Thank you! Your message has been sent successfully.');
    } else if (message === 'error') {
        // Show error message
        alert('Sorry, there was an error sending your message. Please try again later.');
    } else if (message === 'missing') {
        // Show missing fields message
        alert('Please fill out all required fields.');
    }
});
// ... existing code ... 