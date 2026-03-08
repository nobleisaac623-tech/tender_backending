<?php
require_once '../../config/cors.php';
require_once '../../config/auth-middleware.php';
require_once '../../helpers/response.php';

requireRole(['admin']);

$data = [

  // ── Tender Stats ──────────────────────────────────────────
  'tenders' => [
    'total'       => $db->queryOne("SELECT COUNT(*) as c FROM tenders")['c'],
    'open'        => $db->queryOne("SELECT COUNT(*) as c FROM tenders WHERE status = 'published'")['c'],
    'closed'      => $db->queryOne("SELECT COUNT(*) as c FROM tenders WHERE status = 'closed'")['c'],
    'awarded'     => $db->queryOne("SELECT COUNT(*) as c FROM tenders WHERE status = 'awarded'")['c'],
    'draft'       => $db->queryOne("SELECT COUNT(*) as c FROM tenders WHERE status = 'draft'")['c'],
    'total_value' => $db->queryOne("SELECT COALESCE(SUM(budget),0) as s FROM tenders WHERE status != 'draft'")['s'],
    'by_category' => $db->query(
      "SELECT COALESCE(category,'Uncategorised') as name, COUNT(*) as value
       FROM tenders GROUP BY category ORDER BY value DESC LIMIT 8"
    ),
    'by_month' => $db->query(
      "SELECT DATE_FORMAT(created_at,'%b %Y') as month,
              DATE_FORMAT(created_at,'%Y-%m') as sort_key,
              COUNT(*) as count
       FROM tenders
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month, sort_key ORDER BY sort_key ASC"
    ),
  ],

  // ── Bid Stats ─────────────────────────────────────────────
  'bids' => [
    'total'       => $db->queryOne("SELECT COUNT(*) as c FROM bids")['c'],
    'submitted'   => $db->queryOne("SELECT COUNT(*) as c FROM bids WHERE status = 'submitted'")['c'],
    'accepted'    => $db->queryOne("SELECT COUNT(*) as c FROM bids WHERE status = 'accepted'")['c'],
    'rejected'    => $db->queryOne("SELECT COUNT(*) as c FROM bids WHERE status = 'rejected'")['c'],
    'avg_per_tender' => $db->queryOne(
      "SELECT ROUND(COUNT(*) / NULLIF((SELECT COUNT(*) FROM tenders WHERE status != 'draft'),0), 1) as avg FROM bids"
    )['avg'],
    'by_month' => $db->query(
      "SELECT DATE_FORMAT(created_at,'%b %Y') as month,
              DATE_FORMAT(created_at,'%Y-%m') as sort_key,
              COUNT(*) as count
       FROM bids
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month, sort_key ORDER BY sort_key ASC"
    ),
  ],

  // ── Supplier Stats ────────────────────────────────────────
  'suppliers' => [
    'total'     => $db->queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'supplier'")['c'],
    'active'    => $db->queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'supplier' AND status = 'active'")['c'],
    'pending'   => $db->queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'supplier' AND status = 'pending'")['c'],
    'suspended' => $db->queryOne("SELECT COUNT(*) as c FROM users WHERE role = 'supplier' AND status = 'suspended'")['c'],
    'by_month'  => $db->query(
      "SELECT DATE_FORMAT(created_at,'%b %Y') as month,
              DATE_FORMAT(created_at,'%Y-%m') as sort_key,
              COUNT(*) as count
       FROM users WHERE role = 'supplier'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month, sort_key ORDER BY sort_key ASC"
    ),
    'top_bidders' => $db->query(
      "SELECT sp.company_name, COUNT(b.id) as bid_count,
              SUM(CASE WHEN b.status='accepted' THEN 1 ELSE 0 END) as wins
       FROM supplier_profiles sp
       JOIN users u ON u.id = sp.user_id
       LEFT JOIN bids b ON b.supplier_id = u.id
       GROUP BY sp.user_id ORDER BY bid_count DESC LIMIT 5"
    ),
  ],

  // ── Contract Stats ────────────────────────────────────────
  'contracts' => [
    'total'     => $db->queryOne("SELECT COUNT(*) as c FROM contracts")['c'],
    'active'    => $db->queryOne("SELECT COUNT(*) as c FROM contracts WHERE status = 'active'")['c'],
    'completed' => $db->queryOne("SELECT COUNT(*) as c FROM contracts WHERE status = 'completed'")['c'],
    'draft'     => $db->queryOne("SELECT COUNT(*) as c FROM contracts WHERE status = 'draft'")['c'],
    'total_value' => $db->queryOne("SELECT COALESCE(SUM(value),0) as s FROM contracts")['s'],
  ],

];

jsonSuccess($data);
