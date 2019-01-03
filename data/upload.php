<?php

if(!empty($_FILES['pdf'])) {

	$content = file_get_contents($_FILES['pdf']['tmp_name']);

	$uploads_dir = './';
	$name = 'Chart.pdf';
	
	$muf = move_uploaded_file($_FILES['pdf']['tmp_name'], "$uploads_dir/$name");

    echo "File Saved - ". $_FILES['pdf']['tmp_name'].PHP_EOL;

} else {
    echo "No Data Sent";
}

?>