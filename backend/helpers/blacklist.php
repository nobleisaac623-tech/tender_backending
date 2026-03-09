<?php
/**
 * Blacklist helper: check if a supplier is currently blacklisted.
 *
 * @return array{id: int, reason: string, blacklisted_at?: string}|null
 */
function getActiveBlacklist(PDO $pdo, int $supplierId): ?array
{
    $stmt = $pdo->prepare("SELECT id, reason, blacklisted_at FROM supplier_blacklist WHERE supplier_id = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$supplierId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return null;
    }
    $row['id'] = (int) $row['id'];
    return $row;
}

function isSupplierBlacklisted(PDO $pdo, int $supplierId): bool
{
    return getActiveBlacklist($pdo, $supplierId) !== null;
}
