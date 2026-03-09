<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/tender_image.php';

$db = Database::getInstance();
$tenders = $db->query("SELECT t.id, t.title, t.description, tc.name as category FROM tenders t LEFT JOIN tender_categories tc ON t.category_id = tc.id ORDER BY t.id ASC");

echo "Seeding images for " . count($tenders) . " tenders...\n\n";

$success = 0;
$skipped = 0;

foreach ($tenders as $tender) {
    $cacheKey = 'tender_img_' . $tender['id'];
    $existing = getCachedImage($cacheKey);

    if ($existing) {
        echo "⏭  #{$tender['id']} already cached via {$existing['source']}\n";
        $skipped++;
        continue;
    }

    $image = fetchTenderImage(
        $tender['id'],
        $tender['title'],
        $tender['description'] ?? '',
        $tender['category'] ?? ''
    );

    echo "✓  #{$tender['id']} '{$tender['title']}'\n";
    echo "   → Source: {$image['source']} | Query: {$image['query']}\n\n";

    $success++;
    sleep(1); // respect rate limits
}

echo "\nDone! {$success} fetched, {$skipped} already cached.\n";
