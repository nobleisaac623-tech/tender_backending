<?php
require_once '../../config/cors.php';
require_once '../../config/auth-middleware.php';
require_once '../../helpers/response.php';

requireRole(['admin']);

$stats = [
    'total_today'   => $db->queryOne("SELECT COUNT(*) as cnt FROM audit_log WHERE DATE(created_at) = CURDATE()")['cnt'],
    'total_week'    => $db->queryOne("SELECT COUNT(*) as cnt FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")['cnt'],
    'total_month'   => $db->queryOne("SELECT COUNT(*) as cnt FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")['cnt'],
    'total_all'     => $db->queryOne("SELECT COUNT(*) as cnt FROM audit_log")['cnt'],
    'unique_users'  => $db->queryOne("SELECT COUNT(DISTINCT user_id) as cnt FROM audit_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")['cnt'],
    'top_actions'   => $db->query("SELECT action, COUNT(*) as cnt FROM audit_log GROUP BY action ORDER BY cnt DESC LIMIT 6"),
    'activity_by_day' => $db->query(
        "SELECT DATE(created_at) as date, COUNT(*) as cnt
         FROM audit_log
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC"
    ),
];

jsonSuccess($stats);
