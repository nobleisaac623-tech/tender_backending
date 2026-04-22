<?php
require_once '../../config/cors.php';
require_once '../../config/auth-middleware.php';
require_once '../../helpers/response.php';

requireRole(['admin']);
$pdo = $GLOBALS['pdo'];

$totalToday = (int) $pdo->query("SELECT COUNT(*) FROM audit_log WHERE DATE(created_at) = CURDATE()")->fetchColumn();
$totalWeek = (int) $pdo->query("SELECT COUNT(*) FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
$totalMonth = (int) $pdo->query("SELECT COUNT(*) FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
$totalAll = (int) $pdo->query("SELECT COUNT(*) FROM audit_log")->fetchColumn();
$uniqueUsers = (int) $pdo->query("SELECT COUNT(DISTINCT user_id) FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();

$stmt = $pdo->query("SELECT action, COUNT(*) as cnt FROM audit_log GROUP BY action ORDER BY cnt DESC LIMIT 6");
$topActions = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->query(
    "SELECT DATE(created_at) as date, COUNT(*) as cnt
     FROM audit_log
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC"
);
$activityByDay = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stats = [
    'total_today' => $totalToday,
    'total_week' => $totalWeek,
    'total_month' => $totalMonth,
    'total_all' => $totalAll,
    'unique_users' => $uniqueUsers,
    'top_actions' => $topActions,
    'activity_by_day' => $activityByDay,
];

jsonSuccess($stats);
