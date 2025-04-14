<?php

// Define some constants
define( "RECIPIENT_NAME", "iLearningHubb Team" );
define( "RECIPIENT_EMAIL", "info@ilearninghubb.com" ); // Change this to your actual email

// Read the form values
$success = false;
$userName = isset( $_POST['username'] ) ? preg_replace( "/[^\.\-\' a-zA-Z0-9]/", "", $_POST['username'] ) : "";
$senderEmail = isset( $_POST['email'] ) ? preg_replace( "/[^\.\-\' a-zA-Z0-9@]/", "", $_POST['email'] ) : "";
$phone = isset( $_POST['phone'] ) ? preg_replace( "/[^\.\-\' 0-9+]/", "", $_POST['phone'] ) : "";
$service = isset( $_POST['service'] ) ? preg_replace( "/[^\.\-\' a-zA-Z0-9]/", "", $_POST['service'] ) : "";
$message = isset( $_POST['message'] ) ? preg_replace( "/(From:|To:|BCC:|CC:|Message:|Content-Type:)/", "", $_POST['message'] ) : "";

// If all values exist, send the email
if ( $userName && $senderEmail && $message) {
  $recipient = RECIPIENT_NAME . " <" . RECIPIENT_EMAIL . ">";
  $headers = "From: " . $userName . " <" . $senderEmail . ">";
  $subject = "New contact form submission from iLearningHubb website";
  $msgBody = "Name: " . $userName . "\n" . 
             "Email: " . $senderEmail . "\n" .
             "Phone: " . $phone . "\n" .
             "Service: " . $service . "\n\n" .
             "Message: " . $message;
  
  $success = mail( $recipient, $subject, $msgBody, $headers );

  if($success) {
    // Set Location After Successful Submission
    header('Location: contact.html?message=success');
    exit;
  } else {
    // Set Location After Unsuccessful Submission
    header('Location: contact.html?message=error');
    exit;
  }
} else {
  // Set Location After Missing Fields
  header('Location: contact.html?message=missing');
  exit;
}

?>