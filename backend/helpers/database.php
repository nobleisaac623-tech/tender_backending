<?php
/**
 * Simple Database wrapper class
 */

class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        // Use existing PDO connection if available
        global $pdo;
        if (isset($GLOBALS['pdo'])) {
            $this->pdo = $GLOBALS['pdo'];
        } else {
            // Load database config
            require_once __DIR__ . '/../config/database.php';
            $this->pdo = $GLOBALS['pdo'];
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function queryOne($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function query($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
