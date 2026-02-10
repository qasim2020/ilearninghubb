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
// AJAX submit for contact form (updates button text to 'Sending...' and shows inline message)
$(document).on('submit', '#contact-form', function (e) {
	e.preventDefault();
	var $form = $(this);

	if ($.fn.validate && $form.closest('.contact-form').length && $form.closest('.contact-form').find('form').length) {
		// If the validate plugin is present and validation fails, stop
		if ($form.valid && !$form.valid()) return;
	}

	var $btn = $form.find('button[type="submit"]');
	var $textOne = $btn.find('.text-one');
	var $textTwo = $btn.find('.text-two');
	var origOne = $textOne.length ? $textOne.text() : $btn.text();
	var origTwo = $textTwo.length ? $textTwo.text() : $btn.text();

	if ($textOne.length) $textOne.text('Sending...');
	if ($textTwo.length) $textTwo.text('Sending...');
	$btn.prop('disabled', true).addClass('loading');

	$.ajax({
		url: $form.attr('action'),
		method: ($form.attr('method') || 'POST'),
		data: $form.serialize(),
		dataType: 'json'
	}).done(function (resp) {
		if (resp && resp.success) {
			$('#contact-form-message').html('<div class="alert alert-success">Thank you! Your message has been sent successfully.</div>');
			$form[0].reset();
		} else {
			$('#contact-form-message').html('<div class="alert alert-danger">Sorry, there was an error sending your message. Please try again later.</div>');
		}
	}).fail(function () {
		$('#contact-form-message').html('<div class="alert alert-danger">Sorry, there was an error sending your message. Please try again later.</div>');
	}).always(function () {
		if ($textOne.length) $textOne.text(origOne);
		if ($textTwo.length) $textTwo.text(origTwo);
		$btn.prop('disabled', false).removeClass('loading');
	});
});
// ... existing code ... 